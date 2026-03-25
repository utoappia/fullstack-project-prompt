## Error Handling Patterns

- Lambda handlers must catch all errors and return a structured response. An unhandled throw returns a raw stack trace to the caller.
- Distinguish client errors (4xx — the caller did something wrong) from server errors (5xx — something broke internally).
- Never leak stack traces, internal file paths, or dependency names to the client.

### Error response format

All handlers should return errors in this canonical shape:

```typescript
{
  statusCode: number;       // HTTP status code (400, 401, 404, 500, etc.)
  errorCode: string;        // Machine-readable code (SCREAMING_SNAKE_CASE)
  message: string;          // Human-readable message (safe to show to client)
  details?: unknown;        // Optional: field errors, context, etc.
}
```

This conforms to the `ErrorResponse` export from `conventions.md`.

### Client errors vs server errors

| Type | Status | Cause | Example | Log level |
|---|---|---|---|---|
| Client | 400 | Bad input | Missing required field | warn |
| Client | 401 | Auth failure | Invalid session token | warn |
| Client | 404 | Resource not found | No such post | info |
| Client | 409 | Conflict | Duplicate email | warn |
| Server | 500 | Unhandled/unexpected | DB connection failed | error |
| Server | 502 | Upstream service failure | S3 timeout | error |

### Tier 1: try/catch in handler (zero dependencies)

- When to use: 1-2 handlers, getting started.

```typescript
export async function handler(params: InputParams, context: any) {
  try {
    if (!params.title) {
      return { statusCode: 400, errorCode: 'VALIDATION_ERROR', message: 'Title is required' };
    }

    const post = await createPost(params);
    return { statusCode: 200, body: post };
  } catch (err) {
    // Log the real error server-side (see logging.md)
    console.error(JSON.stringify({ level: 'error', message: 'Unhandled error', error: String(err), stack: (err as Error).stack }));

    // Return a safe message to the client
    return { statusCode: 500, errorCode: 'INTERNAL_ERROR', message: 'Something went wrong' };
  }
}
```

- **Limitations**: error response format can drift across handlers, easy to forget the catch block, mixing validation logic with business logic.

### Tier 2: Custom AppError class (zero dependencies, typed errors)

- When to use: 3+ handlers, want throwable errors that carry their own status code and error code.

```typescript
// src/lib/errors.ts

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Convenience factories:
export function ValidationError(message: string, fieldErrors?: { field: string; message: string }[]) {
  return new AppError(400, 'VALIDATION_ERROR', message, fieldErrors);
}

export function NotFoundError(resource: string, id: string | number) {
  return new AppError(404, 'NOT_FOUND', `${resource} not found: ${id}`);
}

export function AuthError(message = 'Unauthorized') {
  return new AppError(401, 'UNAUTHORIZED', message);
}

export function ConflictError(message: string) {
  return new AppError(409, 'CONFLICT', message);
}
```

```typescript
// In your API handler:
import { NotFoundError, AuthError } from '../lib/errors.js';

export async function handler(params: InputParams, context: any) {
  try {
    const session = await getSession(params.sessionToken);
    if (!session) throw AuthError();

    const post = await getPost(params.postId);
    if (!post) throw NotFoundError('Post', params.postId);

    return { statusCode: 200, body: post };
  } catch (err) {
    if (err instanceof AppError) {
      return { statusCode: err.statusCode, errorCode: err.errorCode, message: err.message, details: err.details };
    }
    // Unknown error — log and return generic 500
    console.error(JSON.stringify({ level: 'error', message: 'Unhandled error', error: String(err), stack: (err as Error).stack }));
    return { statusCode: 500, errorCode: 'INTERNAL_ERROR', message: 'Something went wrong' };
  }
}
```

- **Advantages over Tier 1**: errors are self-describing (carry statusCode and errorCode), catch block is consistent, easy to add new error types.

### Tier 3: withErrorHandling HOF + error catalog (zero dependencies, zero boilerplate)

- When to use: many handlers, team environment, want consistent error handling everywhere without repeating try/catch.

```typescript
// src/lib/errorHandler.ts
import { AppError } from './errors.js';

type HandlerFn = (params: any, context: any) => Promise<any>;

export function withErrorHandling(handler: HandlerFn): HandlerFn {
  return async (params, context) => {
    try {
      return await handler(params, context);
    } catch (err) {
      if (err instanceof AppError) {
        // Client error — log at warn, return structured response
        console.log(JSON.stringify({
          level: err.statusCode >= 500 ? 'error' : 'warn',
          message: err.message,
          errorCode: err.errorCode,
          statusCode: err.statusCode,
          requestId: context?.awsRequestId,
        }));
        return {
          statusCode: err.statusCode,
          errorCode: err.errorCode,
          message: err.message,
          details: err.details,
        };
      }

      // Unknown error — log full details, return safe 500
      console.error(JSON.stringify({
        level: 'error',
        message: 'Unhandled error',
        error: String(err),
        stack: (err as Error).stack,
        requestId: context?.awsRequestId,
      }));
      return { statusCode: 500, errorCode: 'INTERNAL_ERROR', message: 'Something went wrong' };
    }
  };
}
```

```typescript
// Optional: error catalog for consistency across the codebase
// src/lib/errorCatalog.ts

export const ERROR_CODES = {
  VALIDATION_ERROR: { statusCode: 400, message: 'Invalid input' },
  UNAUTHORIZED: { statusCode: 401, message: 'Unauthorized' },
  FORBIDDEN: { statusCode: 403, message: 'Forbidden' },
  NOT_FOUND: { statusCode: 404, message: 'Resource not found' },
  CONFLICT: { statusCode: 409, message: 'Conflict' },
  RATE_LIMITED: { statusCode: 429, message: 'Too many requests' },
  INTERNAL_ERROR: { statusCode: 500, message: 'Something went wrong' },
} as const;
```

```typescript
// In your API handler — no try/catch, no error formatting:
import { withErrorHandling } from '../lib/errorHandler.js';
import { NotFoundError } from '../lib/errors.js';

export const handler = withErrorHandling(async (params: InputParams, context) => {
  const post = await getPost(params.postId);
  if (!post) throw NotFoundError('Post', params.postId);

  return { statusCode: 200, body: post };
});
```

- **Advantages over Tier 2**: zero error-handling boilerplate in handlers, all errors logged identically, error catalog provides project-wide consistency.
- **Composability**: chain with `withValidation` from `input-validation.md`:
  ```typescript
  export const handler = withErrorHandling(
    withValidation(CreatePostSchema, async (params, context) => {
      // params is validated, errors are caught
    })
  );
  ```

### Lambda retry behavior

Lambda has two invocation types with different retry behavior:

| Invocation type | Parameter | Retry | Examples |
|---|---|---|---|
| Synchronous (`RequestResponse`) | Caller waits for response | No auto-retry — caller must retry | Direct invoke from React Native, API Gateway |
| Asynchronous (`Event`) | Lambda queues event, returns immediately | Up to 2 retries on error | SQS, SNS, EventBridge, Lambda self-invoke for scripts |

- **Returning a structured error response** (not throwing) prevents retries. The invocation is considered successful even if it returns a 500.
- **If you want retries** for transient failures (e.g., DB connection timeout), throw intentionally so Lambda retries the async invocation.
- **If you don't want retries**, always catch and return a response.
- **Dead-letter queues**: for async invocations, configure a DLQ (SQS or SNS) to capture events that fail all retries. This prevents silent data loss.
- **Destinations**: as an alternative to DLQ, configure success/failure destinations to route results to SQS, SNS, EventBridge, or another Lambda.
- For operations that must not be duplicated by retries, see `idempotency.md`.

### Tier comparison

| Aspect | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Dependencies | None | None | None |
| Boilerplate per handler | High (try/catch) | Medium (try/catch) | None (wrapper handles it) |
| Error consistency | Manual | Via error classes | Guaranteed (wrapper + catalog) |
| Stack trace safety | Manual check | Built into catch | Built into wrapper |
| Composability | N/A | N/A | Chains with withValidation |
| Best for | Getting started | Most projects | Teams / many handlers |

### Key rules

- Never leak stack traces to the client. Log them server-side, return a safe message.
- Always return a response from your handler — never let errors propagate unhandled (unless you intentionally want Lambda to retry).
- Use consistent `errorCode` strings in `SCREAMING_SNAKE_CASE` across all handlers.
- Log server errors (5xx) at `error` level, client errors (4xx) at `warn` or `info`.
- Use the `AppError` class from Tier 2+ even if you don't use the wrapper — it standardizes error creation across the team.
