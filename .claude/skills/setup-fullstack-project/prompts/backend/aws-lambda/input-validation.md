## Runtime Input Validation

- TypeScript types are erased at runtime. Lambda receives raw JSON from clients — it can contain anything.
- Validate every input at the handler boundary before any business logic runs.
- Return structured 400 errors with field-level detail. Never let bad data reach the database.

### Why TypeScript types are not enough

- TypeScript's `InputParams` type only exists at compile time. At runtime, `params` is `unknown`.
- A client can send `{ title: 123 }` when you expect `{ title: string }` — TypeScript will not catch this.
- Skipping validation leads to cryptic database errors, undefined behavior, or data corruption.
- Always validate at system boundaries: where external data enters your code.

### Tier 1: Manual validation (zero dependencies)

- When to use: 1-2 handlers, simple inputs, no desire to add dependencies.

```typescript
// In your API handler:

interface CreatePostParams {
  title: string;
  body: string;
  categoryId: number;
}

interface FieldError {
  field: string;
  message: string;
}

function validateCreatePost(params: unknown): { valid: true; data: CreatePostParams } | { valid: false; errors: FieldError[] } {
  const errors: FieldError[] = [];
  const p = params as Record<string, unknown>;

  if (typeof p.title !== 'string' || p.title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Required, must be a non-empty string' });
  }
  if (typeof p.body !== 'string') {
    errors.push({ field: 'body', message: 'Required, must be a string' });
  }
  if (typeof p.categoryId !== 'number' || !Number.isInteger(p.categoryId)) {
    errors.push({ field: 'categoryId', message: 'Required, must be an integer' });
  }

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, data: p as CreatePostParams };
}

export async function handler(params: unknown) {
  const validation = validateCreatePost(params);
  if (!validation.valid) {
    return { statusCode: 400, errorCode: 'VALIDATION_ERROR', message: 'Invalid input', details: validation.errors };
  }

  const { data } = validation;
  // data is now typed as CreatePostParams
}
```

- **Limitations**: verbose, error-prone at scale, must write a validate function per handler, type and validation logic can drift apart.

### Tier 2: Zod schemas (one dependency)

- When to use: 3+ handlers, want type inference from validation, good error messages out of the box.

```typescript
// src/api/schemas/createPost.ts
import { z } from 'zod';

export const CreatePostSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  body: z.string().min(1, 'Body is required'),
  categoryId: z.number().int('Must be an integer'),
});

// The TypeScript type is inferred from the schema — no separate interface needed
export type CreatePostParams = z.infer<typeof CreatePostSchema>;
```

```typescript
// In your API handler:
import { CreatePostSchema, type CreatePostParams } from './schemas/createPost.js';

export async function handler(params: unknown) {
  const result = CreatePostSchema.safeParse(params);
  if (!result.success) {
    const fieldErrors = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return { statusCode: 400, errorCode: 'VALIDATION_ERROR', message: 'Invalid input', details: fieldErrors };
  }

  const data: CreatePostParams = result.data;
  // data is typed and validated
}
```

- **Advantages over Tier 1**: type and validation defined once (single source of truth), composable schemas (`z.object`, `z.array`, `.extend()`, `.pick()`), built-in error messages, ~12KB gzipped.
- **Note**: re-export Zod from the core package per `conventions.md` (all external packages re-exported from core).

### Tier 3: withValidation higher-order function (one dependency, DRY)

- When to use: many handlers, team environment, want zero validation boilerplate per handler.

```typescript
// src/lib/validation.ts
import { type ZodSchema, type ZodError } from 'zod';

type HandlerFn<T> = (params: T, context: any) => Promise<any>;

export function withValidation<T>(schema: ZodSchema<T>, handler: HandlerFn<T>): (params: unknown, context: any) => Promise<any> {
  return async (params: unknown, context: any) => {
    const result = schema.safeParse(params);
    if (!result.success) {
      const fieldErrors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return { statusCode: 400, errorCode: 'VALIDATION_ERROR', message: 'Invalid input', details: fieldErrors };
    }
    return handler(result.data, context);
  };
}
```

```typescript
// In your API handler — no validation code at all:
import { withValidation } from '../lib/validation.js';
import { CreatePostSchema, type CreatePostParams } from './schemas/createPost.js';

export const handler = withValidation(CreatePostSchema, async (params: CreatePostParams, context) => {
  // params is already validated and typed
  const post = await createPost(params);
  return { statusCode: 200, body: post };
});
```

- **Advantages over Tier 2**: validation fully separated from business logic, consistent error format guaranteed, handlers contain only business logic, composes with `withErrorHandling` from `error-handling.md`.

### Standard 400 error response format

All tiers should return validation errors in this shape:

```typescript
{
  statusCode: 400,
  errorCode: 'VALIDATION_ERROR',
  message: 'Invalid input',
  details: [
    { field: 'title', message: 'Required, must be a non-empty string' },
    { field: 'categoryId', message: 'Must be an integer' }
  ]
}
```

This conforms to the `ErrorResponse` export from `conventions.md`.

### Tier comparison

| Aspect | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Dependencies | None | zod (~12KB) | zod (~12KB) |
| Type inference | Manual (separate interface) | Automatic (`z.infer`) | Automatic |
| Error messages | DIY | Built-in | Built-in + consistent |
| Boilerplate per handler | High | Medium (~5 lines) | None |
| Schema reuse | Low | High (composable) | High |
| Best for | 1-2 endpoints | Most projects | Teams / many handlers |

### Key rules

- Validate at the API boundary — the moment input enters your handler.
- Never trust client input, even from your own React Native app. Clients can be tampered with.
- Return 400 with field-level errors. Never a generic "bad request" with no detail.
- Co-locate schemas near handlers (`src/api/schemas/`) or in the handler file itself for small projects.
- Re-export Zod from the core package per `conventions.md`: all external packages re-exported from core.
