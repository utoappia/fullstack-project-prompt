## AWS CLI Quick Reference

Commands the coding agent needs when working with the Lambda backend. Organized by workflow, not by service.

### Deploy code to Lambda

```bash
# Build, deploy, publish version, update dev alias
npm run make_lambda_build
cd _aws_lambda_build && zip -r lambda.zip .

aws lambda update-function-code \
  --function-name my-app \
  --zip-file fileb://lambda.zip

aws lambda wait function-updated --function-name my-app

aws lambda publish-version \
  --function-name my-app \
  --query 'Version' --output text
# Returns: 7

aws lambda update-alias \
  --function-name my-app \
  --name dev \
  --function-version 7
```

### Promote to production / rollback

```bash
# Promote version 7 to prod (all traffic at once)
aws lambda update-alias --function-name my-app --name prod --function-version 7

# Canary: send 10% traffic to version 7, 90% stays on current (version 6)
aws lambda update-alias --function-name my-app --name prod \
  --function-version 6 \
  --routing-config 'AdditionalVersionWeights={"7"=0.1}'

# Finish canary: shift 100% to version 7
aws lambda update-alias --function-name my-app --name prod --function-version 7 \
  --routing-config '{}'

# Rollback prod to version 6
aws lambda update-alias --function-name my-app --name prod --function-version 6

# Check which version each alias points to
aws lambda get-alias --function-name my-app --name prod --query 'FunctionVersion'
aws lambda get-alias --function-name my-app --name dev --query 'FunctionVersion'

# List all versions
aws lambda list-versions-by-function --function-name my-app \
  --query 'Versions[*].[Version,Description,LastModified]' --output table
```

### Create a new Lambda function

```bash
aws lambda create-function \
  --function-name my-app \
  --runtime nodejs22.x \
  --architectures arm64 \
  --handler lambda/index.handler \
  --role arn:aws:iam::ACCOUNT_ID:role/my-app-role \
  --zip-file fileb://lambda.zip \
  --memory-size 512 \
  --timeout 30 \
  --environment 'Variables={ENV=dev,DATABASE_URL=postgres://...}' \
  --tracing-config Mode=Active
```

### Update function configuration

```bash
aws lambda update-function-configuration \
  --function-name my-app \
  --memory-size 1024 \
  --timeout 60 \
  --environment 'Variables={ENV=prod,DATABASE_URL=postgres://prod-db/...}'

# Update per-alias environment variables
aws lambda update-function-configuration \
  --function-name my-app:dev \
  --environment 'Variables={ENV=dev,DATABASE_URL=postgres://dev-db/...}'
```

### Invoke a function

```bash
# Synchronous invoke (wait for response)
aws lambda invoke \
  --function-name my-app:prod \
  --payload '{"action":"getUser","params":{"token":"abc"}}' \
  --cli-binary-format raw-in-base64-out \
  response.json
cat response.json

# Async invoke (fire-and-forget, for scripts)
aws lambda invoke \
  --function-name my-app:dev \
  --invocation-type Event \
  --payload '{"script":"cleanupOldRecords","params":{}}' \
  --cli-binary-format raw-in-base64-out \
  /dev/null

# Invoke a specific version directly (for testing before promoting)
aws lambda invoke \
  --function-name my-app --qualifier 7 \
  --payload '{"action":"healthCheck"}' \
  --cli-binary-format raw-in-base64-out \
  response.json
```

### Provisioned concurrency

```bash
# Set 5 always-warm environments on prod alias
aws lambda put-provisioned-concurrency-config \
  --function-name my-app \
  --qualifier prod \
  --provisioned-concurrent-executions 5

# Check status
aws lambda get-provisioned-concurrency-config \
  --function-name my-app \
  --qualifier prod

# Remove provisioned concurrency
aws lambda delete-provisioned-concurrency-config \
  --function-name my-app \
  --qualifier prod
```

### View function info and logs

```bash
# Get function details
aws lambda get-function --function-name my-app

# Get configuration only
aws lambda get-function-configuration --function-name my-app:prod

# View recent CloudWatch logs
aws logs tail /aws/lambda/my-app --follow
aws logs tail /aws/lambda/my-app --since 1h

# Filter logs for errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/my-app \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s000)

# CloudWatch Logs Insights query
aws logs start-query \
  --log-group-name /aws/lambda/my-app \
  --start-time $(date -d '24 hours ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, level, message | filter level = "error" | sort @timestamp desc | limit 50'
```

### IAM role for Lambda

```bash
# Create execution role
aws iam create-role \
  --role-name my-app-role \
  --assume-role-policy-document '{
    "Version":"2012-10-17",
    "Statement":[{
      "Effect":"Allow",
      "Principal":{"Service":"lambda.amazonaws.com"},
      "Action":"sts:AssumeRole"
    }]
  }'

# Attach basic execution policy (CloudWatch Logs)
aws iam attach-role-policy \
  --role-name my-app-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Attach VPC access (if Lambda is in VPC)
aws iam attach-role-policy \
  --role-name my-app-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole
```

### S3 operations

```bash
# Upload a file
aws s3 cp local-file.png s3://my-bucket/uploads/file.png

# Download a file
aws s3 cp s3://my-bucket/uploads/file.png ./downloaded.png

# Generate a presigned URL (valid 1 hour)
aws s3 presign s3://my-bucket/uploads/file.png --expires-in 3600

# List bucket contents
aws s3 ls s3://my-bucket/uploads/

# Sync a directory
aws s3 sync ./build s3://my-bucket/static/ --delete
```

### DynamoDB operations

```bash
# Create a table (e.g., for idempotency)
aws dynamodb create-table \
  --table-name idempotency \
  --attribute-definitions AttributeName=pk,AttributeType=S \
  --key-schema AttributeName=pk,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Enable TTL
aws dynamodb update-time-to-live \
  --table-name idempotency \
  --time-to-live-specification 'Enabled=true,AttributeName=ttl'

# Put an item
aws dynamodb put-item \
  --table-name idempotency \
  --item '{"pk":{"S":"key-123"},"result":{"S":"{}"},"ttl":{"N":"1700000000"}}'

# Get an item
aws dynamodb get-item \
  --table-name idempotency \
  --key '{"pk":{"S":"key-123"}}'

# Query by partition key (efficient — uses index)
aws dynamodb query \
  --table-name orders \
  --key-condition-expression "userId = :uid" \
  --expression-attribute-values '{":uid":{"S":"user-123"}}'

# Scan (use sparingly — reads entire table)
aws dynamodb scan --table-name idempotency --limit 10
```

### Secrets Manager

```bash
# Create a secret
aws secretsmanager create-secret \
  --name my-app/prod/database-url \
  --secret-string 'postgres://user:pass@host/db'

# Get a secret value
aws secretsmanager get-secret-value \
  --secret-id my-app/prod/database-url \
  --query 'SecretString' --output text

# Update a secret
aws secretsmanager update-secret \
  --secret-id my-app/prod/database-url \
  --secret-string 'postgres://newuser:newpass@host/db'
```

### SSM Parameter Store

```bash
# Store a parameter (free, no rotation)
aws ssm put-parameter \
  --name /my-app/dev/database-url \
  --type SecureString \
  --value 'postgres://user:pass@host/db'

# Get a parameter
aws ssm get-parameter \
  --name /my-app/dev/database-url \
  --with-decryption \
  --query 'Parameter.Value' --output text
```

### CloudWatch alarms

```bash
# Create error rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name my-app-errors \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=my-app \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:alerts

# List alarms
aws cloudwatch describe-alarms --alarm-names my-app-errors

# Get metric statistics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=my-app \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 3600 \
  --statistics p99
```

### SQS (dead-letter queues, event sources)

```bash
# Create a DLQ
aws sqs create-queue --queue-name my-app-dlq

# Get queue URL
aws sqs get-queue-url --queue-name my-app-dlq --query 'QueueUrl' --output text

# Create event source mapping (Lambda polls SQS)
aws lambda create-event-source-mapping \
  --function-name my-app:prod \
  --event-source-arn arn:aws:sqs:us-east-1:ACCOUNT_ID:my-queue \
  --batch-size 10

# Read messages from DLQ (for debugging)
aws sqs receive-message \
  --queue-url https://sqs.us-east-1.amazonaws.com/ACCOUNT_ID/my-app-dlq \
  --max-number-of-messages 5
```

### SNS (notifications, alarms)

```bash
# Create a topic for alerts
aws sns create-topic --name alerts --query 'TopicArn' --output text

# Subscribe email to topic
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT_ID:alerts \
  --protocol email \
  --notification-endpoint you@example.com

# Publish a message
aws sns publish \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT_ID:alerts \
  --message 'Deployment complete'
```

### SAM deploy

```bash
# Build and deploy
sam build
sam deploy \
  --stack-name my-app-dev \
  --parameter-overrides Env=dev \
  --capabilities CAPABILITY_IAM \
  --no-confirm-changeset

# Deploy to prod
sam deploy \
  --stack-name my-app-prod \
  --parameter-overrides Env=prod \
  --capabilities CAPABILITY_IAM \
  --no-confirm-changeset

# Delete a stack
sam delete --stack-name my-app-dev

# View stack events
aws cloudformation describe-stack-events --stack-name my-app-dev \
  --query 'StackEvents[0:10].[LogicalResourceId,ResourceStatus,Timestamp]' --output table
```

### Useful --query patterns

The `--query` flag uses JMESPath to filter CLI output:

```bash
# Get just the function ARN
aws lambda get-function --function-name my-app --query 'Configuration.FunctionArn' --output text

# Get all alias names and versions
aws lambda list-aliases --function-name my-app \
  --query 'Aliases[*].[Name,FunctionVersion]' --output table

# Get last 5 versions
aws lambda list-versions-by-function --function-name my-app \
  --query 'Versions[-5:].[Version,LastModified]' --output table

# Get alarm state
aws cloudwatch describe-alarms --alarm-names my-app-errors \
  --query 'MetricAlarms[0].StateValue' --output text
```
