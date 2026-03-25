## Vercel Serverless Functions Conventions

### Runtime and language
- Runtime: Node.js on Vercel Functions. TypeScript files (`.ts`) in the `api/` directory are compiled automatically.
- Use the Web Standard `fetch` handler signature (preferred) or named HTTP method exports (`GET`, `POST`, etc.).
- Vercel Functions run on AWS Lambda under the hood, but Vercel manages deployment, routing, and scaling.

### Handler patterns

**Preferred: Web Standard fetch signature:**
```typescript
// api/hello.ts
export default {
  fetch(request: Request) {
    return Response.json({ message: 'Hello' });
  },
};
```

**Named HTTP method exports (for multiple methods in one file):**
```typescript
// api/orders.ts
export async function GET(request: Request) {
  const orders = await getOrders();
  return Response.json(orders);
}

export async function POST(request: Request) {
  const body = await request.json();
  const order = await createOrder(body);
  return Response.json(order, { status: 201 });
}
```

**File-based routing:** files in `api/` map directly to endpoints:
- `api/hello.ts` → `/api/hello`
- `api/users/[id].ts` → `/api/users/:id` (dynamic route)
- `api/orders/index.ts` → `/api/orders`

### Function configuration

**In `vercel.json`:**
```json
{
  "functions": {
    "api/heavy-task.ts": {
      "maxDuration": 60
    },
    "api/*.ts": {
      "maxDuration": 30
    }
  }
}
```

**In-code (Next.js >= 13.5, SvelteKit, Astro, Nuxt, Remix):**
```typescript
export const maxDuration = 30;
```

**Memory/CPU:** configured in Vercel dashboard (Settings → Functions → Advanced). Not settable in `vercel.json`.

### Runtime limits

| Resource | Hobby | Pro | Enterprise |
|---|---|---|---|
| Max duration | 300s (5 min) | 800s (13 min) | 800s (13 min) |
| Memory / CPU | 2 GB / 1 vCPU (fixed) | Up to 4 GB / 2 vCPU | Up to 4 GB / 2 vCPU |
| Payload size | 4.5 MB request + response | 4.5 MB | 4.5 MB |
| Bundle size | 250 MB uncompressed | 250 MB | 250 MB |
| `/tmp` storage | 500 MB (writable, ephemeral) | 500 MB | 500 MB |
| File descriptors | 1,024 shared across concurrent executions | 1,024 | 1,024 |
| Env vars total | 64 KB across all variables | 64 KB | 64 KB |
| Regions | 1 | Up to 3 | Up to 18 |
| Concurrency | Auto-scales to 30,000 | 30,000 | 100,000+ |

### Response streaming

Use Web Standard `ReadableStream` for streaming responses (useful for AI/LLM, large data):

```typescript
export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('First chunk\n'));
      controller.enqueue(encoder.encode('Second chunk\n'));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
```

Use `waitUntil` for post-response async work (analytics, logging) without blocking the response.

### Cron jobs

Configure scheduled functions in `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/cleanup", "schedule": "0 5 * * *" }
  ]
}
```

- Cron triggers an HTTP GET to the production deployment URL.
- Timezone is always UTC.
- Hobby: minimum once per day. Pro/Enterprise: minimum once per minute.
- Max 100 cron jobs per project.
- Verify the request is from Vercel cron: check `request.headers.get('user-agent') === 'vercel-cron/1.0'` or use `CRON_SECRET` env var.

### Storage options

| Product | Use case | Access pattern |
|---|---|---|
| **Vercel Blob** | File uploads, images, videos | Fast reads, ms writes |
| **Edge Config** | Feature flags, runtime config | Ultra-fast reads (<1ms), slow writes |
| **Neon** (Marketplace) | PostgreSQL database | SQL via connection string |
| **Upstash** (Marketplace) | Redis / KV store | REST API or Redis protocol |
| **Supabase** (Marketplace) | Postgres + auth + realtime | SDK or REST |

Marketplace integrations auto-inject credentials as environment variables when provisioned through the dashboard.

### Fluid Compute

- Enabled by default on new projects.
- Allows concurrent execution within the same function instance — reuses idle I/O wait time for other requests.
- Pricing based on active CPU time (not wall-clock). I/O wait (DB queries, API calls) does NOT count toward CPU billing.
- Reduces cold starts and costs for I/O-bound workloads.

### Key differences from AWS Lambda

| Aspect | Vercel Functions | AWS Lambda |
|---|---|---|
| Deployment | Git push → auto deploy | Manual package + SAM/CDK |
| Routing | File-system based (`api/`) | API Gateway config required |
| Handler | Web Standard `fetch` or named HTTP exports | `exports.handler = async (event, context)` |
| Max memory | 4 GB / 2 vCPU | 10 GB / 6 vCPU |
| Max duration | 800s (Pro) | 900s |
| Payload | 4.5 MB | 6 MB sync, 256 KB async |
| Built-in CDN | Yes (Vercel Edge Network) | Requires CloudFront |
| Cron | Built-in via `vercel.json` | Requires EventBridge |
| Framework integration | Deep (Next.js, SvelteKit, Remix) | Framework-agnostic |

### Archiving

- Production functions archived after 2 weeks of no invocations.
- Preview deployment functions archived after 48 hours.
- Archived functions unarchive on next invocation with ~1s extra cold start.
