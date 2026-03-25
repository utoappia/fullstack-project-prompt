## Lambda Deployment, Versioning & Aliases

### Core concepts

- **$LATEST**: The mutable, current version of your Lambda function. Every deploy updates `$LATEST`.
- **Version**: An immutable snapshot of your code + configuration at the time you publish. Versions are numbered (1, 2, 3...) and cannot be changed once published.
- **Alias**: A named pointer (like `dev`, `prod`) to a specific version. Aliases can be moved to point to any version. Each alias can have its own environment variable overrides.
- **ARN**: Every alias and version has a unique ARN that any AWS service or SDK can invoke directly.

```
my-app (function)
  ├── $LATEST              ← mutable, what you deploy to
  ├── Version 1            ← immutable snapshot
  ├── Version 2            ← immutable snapshot
  ├── Version 3            ← immutable snapshot
  │
  ├── Alias: dev  → Version 3  (dev env vars)
  └── Alias: prod → Version 2  (prod env vars)
```

### Invoking a specific alias or version

Every alias and version has its own ARN. Any AWS service or SDK can target them directly — no API Gateway required.

```
# Alias ARNs
arn:aws:lambda:us-east-1:123456789:function:my-app:dev
arn:aws:lambda:us-east-1:123456789:function:my-app:prod

# Version ARNs
arn:aws:lambda:us-east-1:123456789:function:my-app:3
```

| Trigger source | How to target an alias |
|---|---|
| AWS CLI | `aws lambda invoke --function-name my-app:prod` |
| AWS SDK (from app) | `FunctionName: 'my-app:dev'` |
| S3 event notification | Bucket notification points to alias ARN |
| SQS / SNS | Subscription points to alias ARN |
| EventBridge (cron) | Rule target is the alias ARN |
| Another Lambda | Invokes with alias-qualified function name |
| API Gateway | Stage variable maps to alias ARN |

From a React Native app invoking Lambda directly:

```typescript
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({ region: 'us-east-1' });
const alias = __DEV__ ? 'dev' : 'prod';

const response = await lambda.send(new InvokeCommand({
  FunctionName: `my-app:${alias}`,
  Payload: JSON.stringify({ action: 'getUser', params: { token } }),
}));
```

### Deployment workflow (aliases)

#### Initial setup (one-time)

```bash
# Create the dev alias pointing to $LATEST initially
aws lambda create-alias \
  --function-name my-app \
  --name dev \
  --function-version '$LATEST'

# Set dev env vars on the alias
aws lambda update-function-configuration \
  --function-name my-app:dev \
  --environment '{"Variables":{"ENV":"dev","DATABASE_URL":"postgres://dev-db/...","AWS_REGION":"us-east-1","S3_BUCKET":"myapp-dev"}}'

# Publish first version and create prod alias
aws lambda publish-version --function-name my-app
# Returns: Version 1

aws lambda create-alias \
  --function-name my-app \
  --name prod \
  --function-version 1

aws lambda update-function-configuration \
  --function-name my-app:prod \
  --environment '{"Variables":{"ENV":"prod","DATABASE_URL":"postgres://prod-db/...","AWS_REGION":"us-east-1","S3_BUCKET":"myapp-prod"}}'
```

#### Regular deployment cycle

```bash
# 1. Deploy new code to $LATEST
#    (via SAM, CDK, Terraform, or direct zip upload)

# 2. Publish an immutable version
aws lambda publish-version --function-name my-app
# Returns: Version 6

# 3. Point dev alias to the new version
aws lambda update-alias \
  --function-name my-app \
  --name dev \
  --function-version 6

# 4. Test against the dev alias
aws lambda invoke --function-name my-app:dev \
  --payload '{"action":"healthCheck"}' \
  response.json

# 5. Test from your React Native app (__DEV__=true hits my-app:dev)

# 6. Satisfied? Promote to prod — just move the pointer
aws lambda update-alias \
  --function-name my-app \
  --name prod \
  --function-version 6

# 7. Something broke? Instant rollback
aws lambda update-alias \
  --function-name my-app \
  --name prod \
  --function-version 5
```

#### Testing a specific version before aliasing

You can invoke any version directly without affecting any alias:

```bash
# Test Version 6 directly — dev and prod aliases are untouched
aws lambda invoke --function-name my-app:6 \
  --payload '{"action":"getUser","params":{"token":"test-token"}}' \
  response.json
```

This is useful when you want to test a new version before pointing even the `dev` alias to it.

### Deployment workflow (separate functions)

If using separate Lambda functions instead of aliases:

```bash
# Deploy to dev
sam deploy --stack-name my-app-dev --parameter-overrides Env=dev

# Test dev
aws lambda invoke --function-name my-app-dev \
  --payload '{"action":"healthCheck"}' \
  response.json

# Deploy same code to prod
sam deploy --stack-name my-app-prod --parameter-overrides Env=prod
```

SAM template example:

```yaml
Parameters:
  Env:
    Type: String
    AllowedValues: [dev, prod]

Mappings:
  EnvConfig:
    dev:
      DatabaseUrl: postgresql://user:pass@dev-host:5432/myapp_dev
      S3Bucket: myapp-uploads-dev
    prod:
      DatabaseUrl: postgresql://user:pass@prod-host:5432/myapp_prod
      S3Bucket: myapp-uploads-prod

Resources:
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub my-app-${Env}
      Handler: lambda/index.handler
      Runtime: nodejs20.x
      Environment:
        Variables:
          ENV: !Ref Env
          DATABASE_URL: !FindInMap [EnvConfig, !Ref Env, DatabaseUrl]
          AWS_REGION: !Ref AWS::Region
          S3_BUCKET: !FindInMap [EnvConfig, !Ref Env, S3Bucket]
```

### Deployment workflow (API Gateway + aliases)

When using API Gateway stages with Lambda aliases:

```yaml
Resources:
  Api:
    Type: AWS::Serverless::Api
    Properties:
      StageName: !Ref Env

  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: my-app
      AutoPublishAlias: !Ref Env  # SAM auto-creates alias per stage
      Events:
        ApiEvent:
          Type: Api
          Properties:
            RestApiId: !Ref Api
            Path: /{proxy+}
            Method: ANY
```

With custom domains:
```
api-dev.myapp.com → dev stage  → my-app:dev alias
api.myapp.com     → prod stage → my-app:prod alias
```

### Key rules

- **Prod alias never moves until you explicitly move it.** Publishing new versions and testing them has zero effect on production traffic.
- **Env vars are per-alias, not per-version.** The alias configuration holds the env vars, so dev and prod can have different `DATABASE_URL` values even when pointing to the same code version.
- **Rollback is instant with aliases.** Move the prod alias pointer to a previous version — no redeployment needed.
- **`config.ts` doesn't change.** It always reads from `process.env`. The infrastructure decides which values are in `process.env`.
- **`__DEV__` in React Native** naturally maps to dev/prod aliases when invoking Lambda directly from the app.
