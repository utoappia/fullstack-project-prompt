## AWS Lambda Backend Conventions

### Runtime and language
- Target runtime: `nodejs22.x` (Node.js 22) on Amazon Linux 2023. Use `arm64` architecture (Graviton) for ~20% cost savings.
- TypeScript with `nodenext` module resolution. All imports use `.js` extensions (even for `.ts` source files).
- esbuild for bundling (transpiles TS → JS). `tsc --noEmit` for type checking only — esbuild does not type-check.
- AWS SDK v3 is included in the Lambda runtime. Import only the clients you need (e.g., `@aws-sdk/client-s3`), not the entire SDK. The SDK version varies by runtime and region — don't rely on a specific minor version.

### Handler patterns
- All API handlers export `{ handler, InputParams, SuccessResponse, ErrorResponse }`.
- All script handlers export `{ handler }`.
- Auth: session token based. Never pass userId directly in API calls — resolve from session token.

### Invocation types
- **Synchronous** (`RequestResponse`): caller waits for response. No automatic retry — caller must retry on failure. Used for direct invoke from React Native app, API Gateway, Cognito.
- **Asynchronous** (`Event`): Lambda queues the event and returns immediately. Retries up to 2 times on error. Failed events can be sent to a dead-letter queue (SQS/SNS) or destination. Used by S3, SNS, EventBridge, CloudWatch Logs.
- **Event source mapping** (poll-based): Lambda polls a stream/queue and invokes with batches of records. Used for SQS, DynamoDB Streams, Kinesis, Kafka, Amazon MQ.
- Scripts are invoked via Lambda self-invocation (fire-and-forget, async). Use `Lambda.invoke()` with `InvocationType: 'Event'`.
- Lambda handler routes to `api/` or `scripts/` based on the event payload.

### Dependencies and packaging
- All external package usage is re-exported from the core package. Lambda handler only imports from the core package (plus AWS SDK provided by the Lambda runtime).
- Build output: `npm run make_lambda_build` — uses esbuild to bundle everything into a single file.
- Typecheck: `npx tsc --noEmit` — run before deploying.
- DB schema push: `ENV=dev npm run push_db_schema` or `ENV=prod npm run push_db_schema`.

### Ephemeral storage and response streaming
- `/tmp` directory provides 512MB by default, configurable up to 10GB. Use for temporary file processing (image resizing, PDF generation). Persists across warm invocations — clean up if needed.
- **Response streaming**: for API handlers returning large payloads, Lambda supports streaming responses to improve time-to-first-byte. Configure via function URL with `RESPONSE_STREAM` invoke mode.

### Long-running workflows (Durable Functions)
- Standard Lambda has a 15-minute timeout. For workflows that span minutes to days (order fulfillment, payment flows, AI pipelines), use **Lambda Durable Functions**.
- Durable Functions use checkpointing — if interrupted, they replay from the last checkpoint, skipping completed work. Can run up to 1 year.
- TypeScript SDK available. Functions suspend during waits without incurring compute charges.
- Alternative: **AWS Step Functions** for visual workflow design and orchestration across 220+ AWS services. Use Step Functions when you need service integrations beyond Lambda; use Durable Functions when the workflow is code-centric.

### Local development

Run the backend locally without deploying to AWS:

```bash
cd backend

# Build and start (uses .env.dev)
npm run start:api

# Or with hot-reload (restarts on file changes)
npm run start:api:watch
```

The local server runs at `http://localhost:3001` with these endpoints:

| Method | Path | Body | Purpose |
|---|---|---|---|
| POST | `/api` | `{ "action": "getUser", "params": {...}, "sessionToken": "..." }` | Call API handlers |
| POST | `/script` | `{ "script": "cleanupOldRecords", "payload": {...} }` | Run script handlers |
| GET | `/health` | — | Health check, lists available handlers |

CORS is enabled for all origins in local mode. The server uses the same handler registry as the Lambda function — any API handler you add is automatically available locally.

**Example request:**
```bash
curl -X POST http://localhost:3001/api \
  -H 'Content-Type: application/json' \
  -d '{"action": "getUser", "params": {"userId": "123"}, "sessionToken": "tok_abc"}'
```

### Node.js runtime notes
- Keep-alive for HTTP connections is enabled by default in SDK v3. TCP connections are reused across invocations.
- Node.js 20+ does NOT auto-load AWS CA certificates. If connecting to RDS with SSL verification, set `NODE_EXTRA_CA_CERTS=/var/runtime/ca-cert.pem` in Lambda env vars. Or bundle only the needed cert with your deployment.
- Avoid enabling experimental Node.js features in production (`--experimental-require-module`, etc.) — they're ineligible for Lambda SLA.
