## CI/CD for Lambda

- Manual deployments are error-prone, unrepeatable, and depend on one person's machine. A CI/CD pipeline ensures every deploy goes through the same build, test, and release process.
- A pipeline catches broken code before it reaches production. Automated tests, typechecks, and build steps run on every push.
- CI/CD ties into Lambda versioning and aliases (see `deployment.md`) — deploy to dev alias automatically, promote to prod with approval.

### Tier 1: Manual CLI deploy with npm scripts (zero infrastructure)

- When to use: solo developer, early project, deploying once a week or less.

This is what the project already supports via `package.json` scripts:

```bash
# 1. Typecheck
npx tsc --noEmit

# 2. Build the Lambda bundle
npm run make_lambda_build

# 3. Deploy code to Lambda
aws lambda update-function-code \
  --function-name my-app \
  --zip-file fileb://_aws_lambda_build/lambda.zip

# 4. Publish a new version
aws lambda publish-version --function-name my-app
# Returns: Version 7

# 5. Point dev alias to the new version
aws lambda update-alias --function-name my-app --name dev --function-version 7

# 6. Test on dev, then promote to prod
aws lambda update-alias --function-name my-app --name prod --function-version 7
```

Wrap this in a deploy script:
```json
{
  "scripts": {
    "deploy:dev": "npm run typecheck && npm run make_lambda_build && aws lambda update-function-code --function-name my-app --zip-file fileb://_aws_lambda_build/lambda.zip && aws lambda publish-version --function-name my-app",
    "promote:prod": "aws lambda update-alias --function-name my-app --name prod --function-version"
  }
}
```

Usage: `npm run deploy:dev`, then after testing: `npm run promote:prod 7`

- **Limitations**: depends on your local machine, no automated tests in the deploy path, no approval gates, no audit trail, easy to skip steps.

### Tier 2: GitHub Actions pipeline (recommended for most projects)

- When to use: team of 1-5, want automated build + test + deploy on every push, with manual promotion to prod.

```yaml
# .github/workflows/deploy.yml
name: Deploy Lambda

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'

permissions:
  id-token: write   # for OIDC auth with AWS
  contents: read

env:
  FUNCTION_NAME: my-app
  AWS_REGION: us-east-1

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        working-directory: backend
        run: npm ci

      - name: Typecheck
        working-directory: backend
        run: npx tsc --noEmit

      - name: Run tests
        working-directory: backend
        run: npm test

      - name: Build Lambda bundle
        working-directory: backend
        run: npm run make_lambda_build

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Deploy to Lambda
        working-directory: backend
        run: |
          cd _aws_lambda_build
          zip -r lambda.zip .
          aws lambda update-function-code \
            --function-name $FUNCTION_NAME \
            --zip-file fileb://lambda.zip
          aws lambda wait function-updated --function-name $FUNCTION_NAME

      - name: Publish version and update dev alias
        id: publish
        run: |
          VERSION=$(aws lambda publish-version \
            --function-name $FUNCTION_NAME \
            --query 'Version' --output text)
          echo "version=$VERSION" >> $GITHUB_OUTPUT
          aws lambda update-alias \
            --function-name $FUNCTION_NAME \
            --name dev \
            --function-version $VERSION
          echo "Deployed version $VERSION to dev alias"

      - name: Summary
        run: echo "Version ${{ steps.publish.outputs.version }} deployed to dev" >> $GITHUB_STEP_SUMMARY
```

```yaml
# .github/workflows/promote-prod.yml
name: Promote to Production

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Lambda version number to promote'
        required: true

env:
  FUNCTION_NAME: my-app
  AWS_REGION: us-east-1

jobs:
  promote:
    runs-on: ubuntu-latest
    environment: production  # requires approval in GitHub Settings
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Promote to prod
        run: |
          aws lambda update-alias \
            --function-name $FUNCTION_NAME \
            --name prod \
            --function-version ${{ inputs.version }}
          echo "Version ${{ inputs.version }} promoted to prod" >> $GITHUB_STEP_SUMMARY
```

**AWS authentication**: use OIDC (OpenID Connect) instead of long-lived access keys. Create an IAM role with a trust policy for GitHub Actions:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      },
      "StringLike": {
        "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/YOUR_REPO:*"
      }
    }
  }]
}
```

**GitHub environment protection**: create a `production` environment in GitHub repo Settings → Environments, add required reviewers. The `promote-prod` workflow will pause for approval before running.

- **Advantages over Tier 1**: automated on every push, tests must pass before deploy, OIDC auth (no stored keys), manual prod promotion with approval, audit trail in GitHub Actions history.

### Tier 3: SAM/CDK pipeline with gradual deployment (production-grade)

- When to use: team environments, need canary/linear deployments, automatic rollback on CloudWatch alarms, multi-environment stacks.

#### SAM-based pipeline

SAM manages the Lambda function, API Gateway, and deployment preferences as infrastructure-as-code:

```yaml
# template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Parameters:
  Env:
    Type: String
    AllowedValues: [dev, prod]

Globals:
  Function:
    Runtime: nodejs20.x
    Architectures: [arm64]
    Timeout: 30
    MemorySize: 512

Resources:
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub my-app-${Env}
      CodeUri: _aws_lambda_build/
      Handler: nodejs/node_modules/@project/backend/lambda/index.handler
      AutoPublishAlias: live
      DeploymentPreference:
        Type: Canary10Percent5Minutes  # deploy to 10%, wait 5 min, then 100%
        Alarms:
          - !Ref MyFunctionErrorAlarm

  MyFunctionErrorAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub my-app-${Env}-errors
      Namespace: AWS/Lambda
      MetricName: Errors
      Dimensions:
        - Name: FunctionName
          Value: !Ref MyFunction
      Statistic: Sum
      Period: 60
      EvaluationPeriods: 1
      Threshold: 5
      ComparisonOperator: GreaterThanThreshold
```

**Deployment strategies** (set in `DeploymentPreference.Type`):

| Strategy | Behavior | Use case |
|---|---|---|
| `AllAtOnce` | 100% traffic immediately | Dev environment |
| `Canary10Percent5Minutes` | 10% for 5 min, then 100% | Standard production |
| `Canary10Percent30Minutes` | 10% for 30 min, then 100% | High-risk changes |
| `Linear10PercentEvery1Minute` | +10% every minute | Gradual rollout |
| `Linear10PercentEvery10Minutes` | +10% every 10 min | Conservative rollout |

**Automatic rollback**: if the CloudWatch alarm fires during the canary window, CodeDeploy automatically rolls back to the previous version. Zero manual intervention.

#### GitHub Actions workflow for SAM

```yaml
# .github/workflows/sam-deploy.yml
name: SAM Deploy

on:
  push:
    branches: [main]
    paths: ['backend/**']

jobs:
  deploy-dev:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - uses: aws-actions/setup-sam@v2
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
          aws-region: us-east-1

      - name: Build backend
        working-directory: backend
        run: npm ci && npm test && npm run make_lambda_build

      - name: SAM deploy to dev
        run: |
          sam deploy \
            --template-file template.yaml \
            --stack-name my-app-dev \
            --parameter-overrides Env=dev \
            --capabilities CAPABILITY_IAM \
            --no-confirm-changeset

  deploy-prod:
    needs: deploy-dev
    runs-on: ubuntu-latest
    environment: production  # requires approval
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/setup-sam@v2
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
          aws-region: us-east-1

      - name: Build backend
        working-directory: backend
        run: npm ci && npm run make_lambda_build

      - name: SAM deploy to prod (canary)
        run: |
          sam deploy \
            --template-file template.yaml \
            --stack-name my-app-prod \
            --parameter-overrides Env=prod \
            --capabilities CAPABILITY_IAM \
            --no-confirm-changeset
```

- **Advantages over Tier 2**: infrastructure-as-code (Lambda + API Gateway + alarms in one template), gradual deployments (canary/linear), automatic rollback on alarm, multi-environment stacks, CodeDeploy manages traffic shifting.
- **Note**: SAM requires the `sam` CLI and an S3 bucket for artifacts. First deploy creates the CloudFormation stack.

### Tier comparison

| Aspect | Tier 1 (CLI) | Tier 2 (GitHub Actions) | Tier 3 (SAM pipeline) |
|---|---|---|---|
| Infrastructure | None | GitHub Actions | SAM + CloudFormation + CodeDeploy |
| Automation | Manual | On push to main | On push to main |
| Tests in pipeline | Skippable | Required (blocks deploy) | Required |
| Deployment strategy | All-at-once | All-at-once | Canary / linear |
| Auto-rollback | No | No | Yes (CloudWatch alarm) |
| Prod approval | Honor system | GitHub environment gate | GitHub environment gate |
| Audit trail | None | GitHub Actions logs | CloudFormation + CodeDeploy |
| Best for | Solo, early stage | Most projects | Production / teams |

### Key rules

- Never deploy from a local machine in a team setting. Use a pipeline.
- Always run typecheck (`tsc --noEmit`) and tests before deploying.
- Use OIDC for AWS authentication in GitHub Actions. Never store long-lived AWS access keys in GitHub Secrets.
- Deploy to dev automatically on push. Require manual approval for prod.
- Use canary deployments for production — route 10% of traffic first, then promote after validation.
- Tie CloudWatch alarms to deployments so bad deploys auto-rollback. See `observability.md` for alarm setup.
- The deploy pipeline should match what you'd do manually (typecheck → test → build → deploy → publish version → update alias). The pipeline just ensures you never skip a step.
