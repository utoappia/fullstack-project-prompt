## Structured Logging

- Lambda logs go to CloudWatch. Unstructured `console.log` output is difficult to search and correlate across invocations.
- Always log as JSON. CloudWatch Logs Insights can query JSON fields natively.
- Every log entry should include: level, message, requestId (from `context.awsRequestId`), and timestamp.

### Tier 1: console.log with JSON.stringify (zero dependencies)

- When to use: prototyping, single-handler projects, or when you cannot add dependencies.

```typescript
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
  const entry = JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...data,
  });
  if (level === 'error') {
    console.error(entry);
  } else {
    console.log(entry);
  }
}

// Usage in a handler:
export async function handler(params: InputParams, context: { awsRequestId: string }) {
  log('info', 'Processing request', { requestId: context.awsRequestId, action: 'createPost' });

  try {
    const result = await createPost(params);
    log('info', 'Request completed', { requestId: context.awsRequestId });
    return { statusCode: 200, body: result };
  } catch (err) {
    log('error', 'Request failed', { requestId: context.awsRequestId, error: String(err) });
    return { statusCode: 500, errorCode: 'INTERNAL_ERROR', message: 'Something went wrong' };
  }
}
```

- **Limitations**: no log level filtering at runtime, must manually pass requestId everywhere, easy to forget the structured format.

### Tier 2: Custom createLogger factory (zero dependencies, reusable)

- When to use: multiple handlers, want consistent format and log level filtering without a third-party dependency.

```typescript
// src/lib/Logger.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

interface LambdaContext {
  awsRequestId: string;
  functionName: string;
}

export function createLogger(context: LambdaContext) {
  const minLevel = LOG_LEVELS[(process.env.LOG_LEVEL as LogLevel) || 'info'];

  function write(level: LogLevel, message: string, data?: Record<string, unknown>) {
    if (LOG_LEVELS[level] < minLevel) return;
    const entry = JSON.stringify({
      level,
      message,
      requestId: context.awsRequestId,
      functionName: context.functionName,
      timestamp: new Date().toISOString(),
      ...data,
    });
    if (level === 'error') {
      console.error(entry);
    } else {
      console.log(entry);
    }
  }

  return {
    debug: (message: string, data?: Record<string, unknown>) => write('debug', message, data),
    info: (message: string, data?: Record<string, unknown>) => write('info', message, data),
    warn: (message: string, data?: Record<string, unknown>) => write('warn', message, data),
    error: (message: string, data?: Record<string, unknown>) => write('error', message, data),
  };
}
```

```typescript
// Usage in a handler:
import { createLogger } from './lib/Logger.js';

export async function handler(params: InputParams, context: LambdaContext) {
  const logger = createLogger(context);
  logger.info('Processing request', { action: 'createPost', userId: params.userId });

  const result = await createPost(params);
  logger.info('Request completed');
  return { statusCode: 200, body: result };
}
```

- **Advantages over Tier 1**: centralized format, log level filtering via `LOG_LEVEL` env var, requestId and functionName injected automatically, no manual passing.

### Tier 3: AWS Lambda Powertools Logger (full observability)

- When to use: production apps, team environments, need log sampling, persistent attributes, X-Ray correlation.

```typescript
// src/lib/Logger.ts
import { Logger } from '@aws-lambda-powertools/logger';

export const logger = new Logger({
  serviceName: 'my-app',
  logLevel: (process.env.LOG_LEVEL as 'DEBUG' | 'INFO' | 'WARN' | 'ERROR') || 'INFO',
  sampleRateValue: 0.1, // log 10% of DEBUG messages in production
});
```

```typescript
// Usage in a handler:
import { logger } from './lib/Logger.js';

export async function handler(params: InputParams, context: LambdaContext) {
  logger.addContext(context); // injects requestId, functionName, cold start, X-Ray trace ID
  logger.appendKeys({ action: 'createPost', userId: params.userId });

  logger.info('Processing request');
  const result = await createPost(params);
  logger.info('Request completed');
  return { statusCode: 200, body: result };
}
```

- **Advantages over Tier 2**: automatic Lambda context injection, cold start detection, X-Ray trace ID correlation, log sampling for cost control, persistent attributes across log calls.
- **Note**: adds `@aws-lambda-powertools/logger` dependency (~50KB). Must be included in esbuild bundle or added as a Lambda Layer.

### CloudWatch Logs Insights queries

Use these queries in CloudWatch Logs Insights to search structured logs:

```
# Find all logs for a specific request
fields @timestamp, level, message
| filter requestId = "abc-123-def"
| sort @timestamp asc

# Find all errors in the last 24 hours
fields @timestamp, message, requestId, error
| filter level = "error"
| sort @timestamp desc
| limit 100

# Cold start frequency (Tier 3 only)
filter coldStart = true
| stats count() as coldStarts by bin(1h)

# Average duration per action
filter message = "Request completed"
| stats avg(duration) as avgMs by action
```

### Tier comparison

| Aspect | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Dependencies | None | None | @aws-lambda-powertools/logger |
| Setup effort | Minimal | ~30 min | ~15 min (install + config) |
| Log levels | Manual | Env-var controlled | Env-var + sampling |
| Correlation ID | Manual extraction | Auto from context | Auto + X-Ray trace ID |
| Cold start flag | No | No | Built-in |
| Bundle impact | None | None | ~50KB |
| Best for | Prototypes | Most projects | Production / teams |

### Key rules

- Always log as structured JSON. Never use bare `console.log('some string')`.
- Include `requestId` (from `context.awsRequestId`) in every log entry for correlation.
- Never log sensitive data: tokens, passwords, full request bodies with PII.
- Use `LOG_LEVEL` env var to control verbosity. Set to `info` in prod, `debug` in dev.
- Log at the start and end of each handler invocation at minimum.
- Log client errors (400s) at `warn` level, server errors (500s) at `error` level.
