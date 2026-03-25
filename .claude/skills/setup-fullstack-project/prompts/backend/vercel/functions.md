## Vercel Serverless Functions

### Basics
- Functions go in the `api/` directory at the project root. Each file becomes an endpoint.
- TypeScript is supported natively — `.ts` files are compiled automatically. No build step needed.
- Use `vercel dev` for local development — it emulates the serverless environment.

### Handler signatures

**Preferred: Web Standard (modern):**
```typescript
// api/hello.ts
export async function GET(request: Request) {
  return Response.json({ message: 'Hello' });
}

export async function POST(request: Request) {
  const body = await request.json();
  return Response.json(body, { status: 201 });
}
```

**Legacy Node.js (still supported):**
```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ message: 'Hello' });
}
```

Use the Web Standard signature for new code. It's portable, uses standard `Request`/`Response`, and works with both Serverless and Edge runtimes.

### Serverless vs Edge Runtime

| Aspect | Serverless (default) | Edge |
|---|---|---|
| Runtime | Full Node.js | V8 isolate (no container) |
| Cold start | ~250ms-1s | <1ms |
| Node.js APIs | Full access | Limited (no `fs`, no native modules) |
| Max duration | 300-800s | 25s (start response), 300s (streaming) |
| Memory | Up to 4 GB | 128 MB |
| Use case | DB queries, heavy processing | Auth, redirects, A/B tests, geolocation |

To use Edge Runtime:
```typescript
export const config = { runtime: 'edge' };

export default function handler(request: Request) {
  return new Response('Hello from the Edge');
}
```

### Cold start optimization
- Keep function bundles small. Avoid importing large libraries at the top level.
- Fluid Compute (enabled by default) reduces cold starts by reusing idle function instances.
- Functions archived after 2 weeks of no invocations get ~1s extra cold start on next call.
- Deploy functions near your data source (default region: `iad1` US East).

### Best practices
- Organize shared logic (auth, DB clients, validation) in a `lib/` directory outside `api/`.
- Use connection pooling for database connections (1,024 file descriptor limit).
- Use `waitUntil` for post-response async work (analytics, logging) to avoid blocking responses.
- Set `maxDuration` to prevent runaway costs on functions that could hang.
