## Vercel API Routes

### File-based routing

Files in `api/` map directly to HTTP endpoints:

| File | Endpoint | Notes |
|---|---|---|
| `api/hello.ts` | `/api/hello` | Basic route |
| `api/users/index.ts` | `/api/users` | Index route |
| `api/users/[id].ts` | `/api/users/:id` | Dynamic parameter |
| `api/[...slug].ts` | `/api/*` | Catch-all route |

### Accessing parameters

**Web Standard handler:**
```typescript
// api/users/[id].ts
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.pathname.split('/').pop(); // or use a routing helper
  // ...
}
```

**Legacy handler:**
```typescript
// api/users/[id].ts
export default function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  // ...
}
```

### Request body parsing
- Automatic for JSON (`Content-Type: application/json`) and form data.
- Web Standard: `const body = await request.json()`.
- Legacy: `req.body` is already parsed.

### CORS

Configure in `vercel.json` for all routes:
```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET, POST, PUT, DELETE, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type, Authorization" }
      ]
    }
  ]
}
```

Or handle in the function for fine-grained control.

### Rewrites and redirects

```json
{
  "rewrites": [
    { "source": "/api/v1/:path*", "destination": "/api/:path*" }
  ],
  "redirects": [
    { "source": "/old-endpoint", "destination": "/api/new-endpoint", "statusCode": 301 }
  ]
}
```

### Key rules
- Organize shared logic (auth, DB clients, validation) in a `lib/` directory outside `api/`.
- Each function file is an independent serverless function — they don't share memory or state between requests (unless reused by Fluid Compute).
- Keep functions focused — one endpoint per file. Don't build a monolithic router in a catch-all.
