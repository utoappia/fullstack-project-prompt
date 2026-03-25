## Idempotency

- Lambda can execute the same event more than once. Async invocations (SQS, SNS, EventBridge) retry on failure. Network issues can cause duplicate direct invocations.
- Any operation that creates, modifies, or charges must be idempotent — processing the same request twice should produce the same result without side effects.
- Read operations are naturally idempotent. Focus idempotency protection on writes.

### Why Lambda retries cause duplicates

- **Async invoke**: Lambda retries up to 2 times on unhandled errors. See `error-handling.md` Lambda retry behavior section.
- **SQS**: message is redelivered if not deleted within the visibility timeout, or if your handler throws.
- **Direct invoke**: client timeout + retry = the same request executed twice.
- **Network blip**: response lost between Lambda and caller, caller retries — Lambda processes it again.

### Which operations need idempotency

| Operation | Needs idempotency? | Why |
|---|---|---|
| Create order | Yes | Duplicate charge, duplicate record |
| Send email / push notification | Yes | User gets duplicate notifications |
| Process payment | Yes | Double charge |
| Update user profile | Usually no | Last-write-wins is acceptable |
| Read / query | No | Naturally idempotent |
| Delete (by ID) | Usually no | Deleting twice is a no-op |

### Tier 1: Client idempotency key + DynamoDB conditional put (minimal)

- When to use: a few critical endpoints, small scale, want minimal infrastructure.

```typescript
// Client sends an idempotencyKey (UUID) in the request:
// { action: 'createOrder', params: { idempotencyKey: 'uuid-abc-123', ... } }

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.IDEMPOTENCY_TABLE || 'idempotency';

export async function handler(params: InputParams, context: any) {
  const { idempotencyKey } = params;
  if (!idempotencyKey) {
    return { statusCode: 400, errorCode: 'VALIDATION_ERROR', message: 'idempotencyKey is required' };
  }

  // Check if this key was already processed
  const existing = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk: idempotencyKey } }));
  if (existing.Item) {
    return existing.Item.result; // Return the stored result
  }

  // Process the request
  const result = await createOrder(params);
  const response = { statusCode: 200, body: result };

  // Store the result with a 24-hour TTL
  await ddb.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      pk: idempotencyKey,
      result: response,
      ttl: Math.floor(Date.now() / 1000) + 86400, // 24 hours
    },
    ConditionExpression: 'attribute_not_exists(pk)', // Prevent race conditions
  }));

  return response;
}
```

DynamoDB table schema:
```
Table: idempotency
  Partition key: pk (String)
  TTL attribute: ttl
```

- **Limitations**: client must generate and send the key, no automatic payload validation (same key + different payload could return stale result), manual DynamoDB code in each handler.

### Tier 2: Custom withIdempotency HOF (reusable)

- When to use: multiple idempotent endpoints, want a reusable pattern without a heavy dependency.

```typescript
// src/lib/idempotency.ts
import { createHash } from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

interface IdempotencyConfig {
  tableName: string;
  ttlSeconds?: number;                               // Default: 86400 (24 hours)
  keyFrom?: (params: any) => string;                  // Custom key extractor
}

type HandlerFn = (params: any, context: any) => Promise<any>;

function defaultKeyFrom(params: any): string {
  const hash = createHash('sha256').update(JSON.stringify(params)).digest('hex');
  return hash.slice(0, 32);
}

export function withIdempotency(config: IdempotencyConfig, handler: HandlerFn): HandlerFn {
  const { tableName, ttlSeconds = 86400, keyFrom = defaultKeyFrom } = config;

  return async (params, context) => {
    const key = keyFrom(params);

    // Check for existing result
    const existing = await ddb.send(new GetCommand({ TableName: tableName, Key: { pk: key } }));
    if (existing.Item) {
      if (existing.Item.status === 'IN_PROGRESS') {
        return { statusCode: 409, errorCode: 'IN_PROGRESS', message: 'Request is already being processed' };
      }
      return existing.Item.result;
    }

    // Claim the key with optimistic locking
    try {
      await ddb.send(new PutCommand({
        TableName: tableName,
        Item: {
          pk: key,
          status: 'IN_PROGRESS',
          ttl: Math.floor(Date.now() / 1000) + ttlSeconds,
        },
        ConditionExpression: 'attribute_not_exists(pk)',
      }));
    } catch (err: any) {
      if (err.name === 'ConditionalCheckFailedException') {
        // Another invocation claimed it — re-fetch the result
        const retry = await ddb.send(new GetCommand({ TableName: tableName, Key: { pk: key } }));
        if (retry.Item?.result) return retry.Item.result;
        return { statusCode: 409, errorCode: 'IN_PROGRESS', message: 'Request is already being processed' };
      }
      throw err;
    }

    // Execute the handler and store the result
    const result = await handler(params, context);

    await ddb.send(new PutCommand({
      TableName: tableName,
      Item: {
        pk: key,
        status: 'COMPLETED',
        result,
        ttl: Math.floor(Date.now() / 1000) + ttlSeconds,
      },
    }));

    return result;
  };
}
```

```typescript
// Usage in a handler:
import { withIdempotency } from '../lib/idempotency.js';

export const handler = withIdempotency(
  {
    tableName: 'idempotency',
    keyFrom: (params) => `createOrder:${params.idempotencyKey}`, // or hash the payload
  },
  async (params, context) => {
    const order = await createOrder(params);
    return { statusCode: 200, body: order };
  },
);
```

CloudFormation for the DynamoDB table:
```yaml
IdempotencyTable:
  Type: AWS::DynamoDB::Table
  Properties:
    TableName: idempotency
    BillingMode: PAY_PER_REQUEST
    AttributeDefinitions:
      - AttributeName: pk
        AttributeType: S
    KeySchema:
      - AttributeName: pk
        KeyType: HASH
    TimeToLiveSpecification:
      AttributeName: ttl
      Enabled: true
```

- **Advantages over Tier 1**: reusable across handlers, key can be auto-derived from payload hash, handles concurrent executions (optimistic locking + IN_PROGRESS status), no idempotency code in handlers.

### Tier 3: AWS Lambda Powertools Idempotency (battle-tested)

- When to use: production apps, need in-progress dedup, payload validation, configurable expiry, and a maintained solution.

```typescript
// src/lib/idempotency.ts
import { makeIdempotent } from '@aws-lambda-powertools/idempotency';
import { DynamoDBPersistenceLayer } from '@aws-lambda-powertools/idempotency/dynamodb';

const persistenceStore = new DynamoDBPersistenceLayer({
  tableName: process.env.IDEMPOTENCY_TABLE || 'idempotency',
});

export { makeIdempotent, persistenceStore };
```

```typescript
// Usage in a handler:
import { makeIdempotent, persistenceStore } from '../lib/idempotency.js';

async function processOrder(params: InputParams, context: any) {
  const order = await createOrder(params);
  return { statusCode: 200, body: order };
}

export const handler = makeIdempotent(processOrder, {
  persistenceStore,
  dataKeywordArgument: 'params',              // which argument to use for idempotency key
  expiresAfterSeconds: 86400,                 // 24 hours
  eventKeyJmesPath: 'idempotencyKey',         // extract key from specific field
  payloadValidationJmesPath: 'amount',        // reject if same key but different amount
  throwOnNoIdempotencyKey: true,              // error if key is missing
});
```

- **Advantages over Tier 2**: handles all edge cases (in-progress dedup with status tracking, payload validation, jitter), configurable expiry, JMESPath-based key/payload extraction, community maintained.
- **Note**: requires DynamoDB table (same schema as Tier 2). Adds `@aws-lambda-powertools/idempotency` dependency (~100KB). Must be bundled or added as a Lambda Layer.

### Storage options for idempotency records

| Storage | Cost | Latency | TTL support | Best for |
|---|---|---|---|---|
| DynamoDB | ~$0 (PAY_PER_REQUEST) | <10ms | Built-in | Most Lambda projects (default) |
| Redis / ElastiCache | $15+/month | <1ms | Built-in (EXPIRE) | High-throughput, sub-ms latency |
| PostgreSQL | Already paid | ~5ms | Manual (scheduled delete) | Avoiding new infrastructure |

DynamoDB is the default choice: it has native TTL, pay-per-request pricing (near-free at low scale), and is what Lambda Powertools uses internally.

### Tier comparison

| Aspect | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Dependencies | @aws-sdk/client-dynamodb | @aws-sdk/client-dynamodb | @aws-lambda-powertools/idempotency |
| Key generation | Client-provided | Auto (payload hash or custom) | Auto (JMESPath configurable) |
| Payload validation | No | No | Built-in |
| Race condition handling | Basic (conditional write) | Optimistic lock + IN_PROGRESS | Full (status tracking + jitter) |
| Bundle impact | Minimal (SDK already used) | Minimal | ~100KB |
| Setup effort | Low | Medium (~1 hour) | Low (install + config) |
| Best for | 1-2 endpoints | Most projects | Production / teams |

### Composability

The Tier 2 and Tier 3 HOFs compose with the wrappers from `error-handling.md` and `input-validation.md`:

```typescript
import { withErrorHandling } from '../lib/errorHandler.js';
import { withIdempotency } from '../lib/idempotency.js';
import { withValidation } from '../lib/validation.js';
import { CreateOrderSchema } from './schemas/createOrder.js';

export const handler = withErrorHandling(
  withIdempotency(
    { tableName: 'idempotency', keyFrom: (p) => p.idempotencyKey },
    withValidation(CreateOrderSchema, async (params, context) => {
      const order = await createOrder(params);
      return { statusCode: 200, body: order };
    }),
  ),
);
```

Order: error handling (outermost) → idempotency → validation → business logic (innermost).

### Key rules

- Every state-changing operation triggered by async events must be idempotent.
- Use DynamoDB as the default idempotency store. It is cheap, fast, and has native TTL.
- Set TTL on idempotency records. 24 hours is a good default for most operations.
- Never rely on "it probably won't retry." Design for guaranteed at-least-once delivery.
- Test idempotency by invoking the same request twice and verifying identical results with no duplicate side effects.
- For operations that charge money, always use idempotency — even if the caller is your own app.
