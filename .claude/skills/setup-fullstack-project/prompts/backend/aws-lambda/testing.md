## Testing Lambda Functions

- Lambda functions interact with external services (databases, S3, SQS). Testing requires a strategy for handling these dependencies.
- The key architectural pattern: separate the **Lambda handler** (thin adapter) from **business logic** (pure functions). Test business logic with fast unit tests, test the handler with integration tests.
- Test both the happy path (everything works) and the sad path (services fail, bad input, timeouts).

### The code boundary pattern

Split every handler into two layers:

```typescript
// src/api/createOrder.ts

// INNER BOUNDARY: pure business logic — no Lambda, no AWS SDK
// Easy to unit test with plain function calls
export async function createOrderLogic(params: CreateOrderParams, deps: { db: DbClient; stripe: StripeClient }) {
  const user = await deps.db.getUser(params.userId);
  if (!user) throw NotFoundError('User', params.userId);

  const charge = await deps.stripe.charge(user.stripeId, params.amount);
  const order = await deps.db.insertOrder({ userId: params.userId, chargeId: charge.id, amount: params.amount });
  return order;
}

// OUTER BOUNDARY: Lambda adapter — extracts params, calls business logic, formats response
// Tested with integration tests using real or emulated AWS services
export const handler = withErrorHandling(
  withValidation(CreateOrderSchema, async (params, context) => {
    const order = await createOrderLogic(params, { db: getDb(), stripe: getStripe() });
    return { statusCode: 200, body: order };
  })
);

export type InputParams = z.infer<typeof CreateOrderSchema>;
export type SuccessResponse = { statusCode: 200; body: Order };
export type ErrorResponse = { statusCode: number; errorCode: string; message: string };
```

This separation means:
- **Business logic** has no Lambda dependency. It takes plain inputs and returns plain outputs. Test it with fast unit tests by injecting mock dependencies.
- **Handler** is a thin adapter. Test it with integration tests that verify event parsing, validation, error formatting, and AWS service interactions.

### Tier 1: Unit tests with mocked dependencies (zero infrastructure)

- When to use: every project. These tests are fast, free, and catch most bugs.

```typescript
// src/api/__tests__/createOrder.test.ts
import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createOrderLogic } from '../createOrder.js';

describe('createOrderLogic', () => {
  const mockGetUser = mock.fn<() => Promise<any>>();
  const mockInsertOrder = mock.fn<() => Promise<any>>();
  const mockCharge = mock.fn<() => Promise<any>>();

  const mockDb = { getUser: mockGetUser, insertOrder: mockInsertOrder };
  const mockStripe = { charge: mockCharge };

  beforeEach(() => {
    mockGetUser.mock.resetCalls();
    mockInsertOrder.mock.resetCalls();
    mockCharge.mock.resetCalls();
  });

  it('creates an order for a valid user', async () => {
    mockGetUser.mock.mockImplementation(async () => ({ id: 'u1', stripeId: 'stripe_123' }));
    mockCharge.mock.mockImplementation(async () => ({ id: 'ch_abc' }));
    mockInsertOrder.mock.mockImplementation(async () => ({ id: 'ord_1', amount: 5000 }));

    const result = await createOrderLogic(
      { userId: 'u1', amount: 5000 },
      { db: mockDb as any, stripe: mockStripe as any },
    );

    assert.deepStrictEqual(result, { id: 'ord_1', amount: 5000 });
    assert.equal(mockCharge.mock.callCount(), 1);
    assert.deepStrictEqual(mockCharge.mock.calls[0].arguments, ['stripe_123', 5000]);
  });

  it('throws NotFoundError for unknown user', async () => {
    mockGetUser.mock.mockImplementation(async () => null);

    await assert.rejects(
      () => createOrderLogic({ userId: 'unknown', amount: 5000 }, { db: mockDb as any, stripe: mockStripe as any }),
      { message: /User not found/ },
    );
  });

  it('does not charge if user lookup fails', async () => {
    mockGetUser.mock.mockImplementation(async () => { throw new Error('DB connection failed'); });

    await assert.rejects(
      () => createOrderLogic({ userId: 'u1', amount: 5000 }, { db: mockDb as any, stripe: mockStripe as any }),
      { message: 'DB connection failed' },
    );

    assert.equal(mockCharge.mock.callCount(), 0);
  });
});
```

**Test runner setup** (add to `backend/package.json`):

```json
{
  "scripts": {
    "test": "node --test 'src/**/*.test.ts'",
    "test:watch": "node --test --watch 'src/**/*.test.ts'"
  }
}
```

No config file needed. No devDependencies for the test runner — it's built into Node.js.

**TypeScript support**: Node.js 22+ can run `.ts` test files directly with `--experimental-strip-types` (enabled by default in Node 22.6+). For older versions, use a loader:

```json
{
  "scripts": {
    "test": "node --import tsx --test 'src/**/*.test.ts'"
  },
  "devDependencies": {
    "tsx": "^4.0.0"
  }
}
```

- **What to test**: business logic functions, validation schemas (pass valid/invalid data), error classes, utility functions.
- **What NOT to test here**: AWS SDK calls, database queries, Lambda event parsing — those need integration tests.
- **Limitations**: mocks can diverge from real service behavior. A test passes but production fails because S3 returns a different error shape than your mock.

### Tier 2: Integration tests with LocalStack (local AWS emulation)

- When to use: when your handlers interact with DynamoDB, S3, SQS, or other AWS services and you want to test against real service behavior without AWS costs.

**LocalStack** emulates AWS services locally in Docker. Free tier supports Lambda, S3, DynamoDB, SQS, SNS, CloudWatch, API Gateway.

**Setup:**

```bash
# Install LocalStack CLI
brew install localstack/tap/localstack-cli

# Start LocalStack (requires Docker)
localstack start -d

# Use awslocal instead of aws CLI (auto-targets localhost)
pip install awscli-local
```

```typescript
// src/__tests__/integration/idempotency.integration.test.ts
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DynamoDBClient, CreateTableCommand, DeleteTableCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const isLocalStack = process.env.LOCALSTACK === 'true';

// Point SDK at LocalStack when running locally
const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient(
    isLocalStack
      ? { endpoint: 'http://localhost:4566', region: 'us-east-1', credentials: { accessKeyId: 'test', secretAccessKey: 'test' } }
      : {},
  ),
);

describe('idempotency (integration)', () => {
  before(async () => {
    if (isLocalStack) {
      await ddb.send(new CreateTableCommand({
        TableName: 'idempotency',
        AttributeDefinitions: [{ AttributeName: 'pk', AttributeType: 'S' }],
        KeySchema: [{ AttributeName: 'pk', KeyType: 'HASH' }],
        BillingMode: 'PAY_PER_REQUEST',
      }));
    }
  });

  after(async () => {
    if (isLocalStack) {
      await ddb.send(new DeleteTableCommand({ TableName: 'idempotency' }));
    }
  });

  it('stores and retrieves idempotency records', async () => {
    // ... test your idempotency logic against a real DynamoDB table
  });
});
```

**Run integration tests:**

```json
{
  "scripts": {
    "test": "node --test 'src/**/*.test.ts'",
    "test:integration": "LOCALSTACK=true node --test 'src/__tests__/integration/**/*.test.ts'"
  }
}
```

**CI integration** (GitHub Actions):

```yaml
- name: Start LocalStack
  run: |
    pip install localstack
    localstack start -d
    localstack wait -t 30

- name: Run integration tests
  env:
    LOCALSTACK: 'true'
  run: npm run test:integration
```

- **Advantages over Tier 1**: tests real AWS service behavior (DynamoDB conditional writes, S3 events, SQS message visibility), catches issues mocks would miss, no AWS costs.
- **Limitations**: LocalStack doesn't perfectly emulate all services. IAM policies, some error conditions, and newer features may behave differently than real AWS. Not a replacement for cloud-based E2E tests.

### Tier 3: End-to-end tests against deployed Lambda (cloud-based)

- When to use: production-critical flows where you need to verify the full deployed stack works (Lambda + API Gateway + DynamoDB + S3 + all IAM policies).

```typescript
// e2e/createOrder.e2e.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({ region: 'us-east-1' });
const FUNCTION_NAME = `my-app:${process.env.E2E_ALIAS || 'dev'}`;

describe('createOrder (E2E)', () => {
  it('creates an order via Lambda invoke', async () => {
    const response = await lambda.send(new InvokeCommand({
      FunctionName: FUNCTION_NAME,
      Payload: JSON.stringify({
        action: 'createOrder',
        params: { sessionToken: process.env.E2E_SESSION_TOKEN, amount: 100 },
      }),
    }));

    const payload = JSON.parse(new TextDecoder().decode(response.Payload!));
    assert.equal(payload.statusCode, 200);
    assert.ok(payload.body.id);
    assert.equal(payload.body.amount, 100);
  });

  it('returns 401 for invalid session token', async () => {
    const response = await lambda.send(new InvokeCommand({
      FunctionName: FUNCTION_NAME,
      Payload: JSON.stringify({
        action: 'createOrder',
        params: { sessionToken: 'invalid-token', amount: 100 },
      }),
    }));

    const payload = JSON.parse(new TextDecoder().decode(response.Payload!));
    assert.equal(payload.statusCode, 401);
    assert.equal(payload.errorCode, 'UNAUTHORIZED');
  });
});
```

**Run E2E tests:**

```json
{
  "scripts": {
    "test:e2e": "E2E_ALIAS=dev node --test 'e2e/**/*.test.ts'"
  }
}
```

**In CI (after deploying to dev):**

```yaml
- name: Run E2E tests
  env:
    E2E_ALIAS: dev
    E2E_SESSION_TOKEN: ${{ secrets.E2E_SESSION_TOKEN }}
  run: npm run test:e2e
```

- **Advantages over Tier 2**: tests the real deployed stack including IAM policies, VPC, environment variables, and actual AWS service behavior.
- **Limitations**: slower (cold starts, network latency), costs money (Lambda invocations, DynamoDB reads/writes), needs test data setup/cleanup, requires AWS credentials in CI.

### Test pyramid for Lambda

```
        /  E2E  \          Few — verify deployed stack works
       /----------\
      / Integration \      Some — verify AWS service interactions
     /----------------\
    /    Unit tests     \  Many — verify business logic
   /--------------------\
```

| Type | Count | Speed | Cost | What it catches |
|---|---|---|---|---|
| Unit | Many (80%+) | <1ms each | Free | Logic bugs, edge cases, validation |
| Integration | Some (15%) | 1-5s each | Free (LocalStack) | AWS service behavior, data format |
| E2E | Few (5%) | 5-30s each | AWS costs | Deployment config, IAM, full flow |

### Tier comparison

| Aspect | Tier 1 (Unit) | Tier 2 (LocalStack) | Tier 3 (E2E) |
|---|---|---|---|
| Dependencies | None (built-in) | Docker + LocalStack | AWS credentials |
| Speed | <1ms per test | 1-5s per test | 5-30s per test |
| Cost | Free | Free | AWS usage costs |
| AWS fidelity | None (mocks) | Good (emulated) | Perfect (real) |
| Setup effort | Low | Medium (Docker) | Medium (test data, credentials) |
| CI integration | Easy | Medium (Docker in CI) | Easy (just needs AWS creds) |
| Best for | Every project | Projects using DynamoDB/S3/SQS | Production-critical flows |

### SAM local testing (alternative to LocalStack)

If you use SAM for deployment (see `ci-cd.md` Tier 3), SAM CLI provides built-in local testing:

```bash
# Invoke a function locally with a test event
sam local invoke MyFunction --event event.json

# Start a local API Gateway (hot-reloads on code changes)
sam local start-api

# Generate sample event payloads for different triggers
sam local generate-event s3 put --bucket my-bucket --key uploads/file.png > event.json
sam local generate-event sqs receive-message > sqs-event.json
sam local generate-event apigateway aws-proxy --method POST --path /orders > api-event.json

# Invoke a deployed function in the cloud
sam remote invoke MyFunction --stack-name my-app-dev --event '{"action":"healthCheck"}'
```

SAM local uses Docker to run your Lambda handler in a container that matches the Lambda runtime. Slower than unit tests, but validates the full handler including event parsing.

### Key rules

- Always separate business logic from the Lambda handler. Business logic takes plain inputs and returns plain outputs — no `event`, no `context`, no AWS SDK.
- Write unit tests for business logic first. They're fast, free, and catch most bugs.
- Use dependency injection to make business logic testable. Pass `db`, `s3`, `stripe` as parameters, not global imports.
- Don't mock what you don't own. If your test mocks DynamoDB `PutItem`, it might not match real behavior. Use LocalStack or E2E tests for AWS service interactions.
- Test sad paths: what happens when the DB is down? When S3 returns 403? When the session token is expired?
- Run unit tests on every push, integration tests on every PR, E2E tests after deploying to dev.
- Use the Node.js built-in test runner (`node:test` + `node:assert`). Zero dependencies, built into the runtime since Node 18. Only reach for vitest/jest if you need features not available in the built-in runner (e.g., advanced timer mocks, JSX transforms, extensive snapshot testing).
- Node.js 22+ supports running `.ts` files directly. For older versions, use `tsx` as a loader: `node --import tsx --test`.
