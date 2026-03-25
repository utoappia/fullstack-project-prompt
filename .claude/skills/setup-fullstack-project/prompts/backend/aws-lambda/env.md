## Environment Configuration

### File layout (local development)
- Two environment files: `.env.dev` and `.env.prod` in the `backend/` root. Never a plain `.env`.
- Copy `.env.dev.example` → `.env.dev` and `.env.prod.example` → `.env.prod`, then fill in real values.
- Never commit `.env.dev` or `.env.prod`. They are gitignored.

### How the right file is loaded locally
- `src/config.ts` reads `process.env.ENV` (defaults to `"dev"`), then loads `backend/.env.dev` or `backend/.env.prod` via dotenv.
- On Lambda, env vars are injected by the runtime — the dotenv load is skipped because the `.env.*` file won't exist there.
- `drizzle.config.ts` also reads `ENV` to pick the right file for schema push commands.

### Selecting dev vs prod locally
- Prefix any local command with `ENV=dev` or `ENV=prod`:
  - `ENV=dev npm run push_db_schema` — pushes schema to dev database
  - `ENV=prod npm run push_db_schema` — pushes schema to prod database
  - `ENV=dev npx tsc --noEmit` — typechecks with dev config
- If `ENV` is not set, it defaults to `dev`.

### Required variables
- `DATABASE_URL`, `AWS_REGION`, `S3_BUCKET` — validated at startup, throws if missing.
- `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` — optional (empty string default), needed for Cloudflare R2.
- `REDIS_URL` — optional, defaults to `redis://localhost:6379`.

---

## Environment Variable Strategies for Lambda

There are several ways to manage environment variables across dev and prod on Lambda. Choose based on your team size, isolation needs, and operational complexity.

### Strategy 1: Separate Lambda Functions (recommended for teams)

Deploy two independent Lambda functions, each with its own env vars.

```
my-app-dev   → DATABASE_URL=postgres://dev-db/...   ENV=dev
my-app-prod  → DATABASE_URL=postgres://prod-db/...  ENV=prod
```

- **Pros**: Full isolation (IAM, VPC, concurrency, monitoring). A dev bug cannot affect prod. Simplest mental model. Each function has its own CloudWatch logs.
- **Cons**: Two functions to manage and deploy. Code can drift between environments if deployed separately. Slightly higher infra cost (marginal).
- **Best for**: Teams that want maximum safety, or when dev and prod need different VPCs or IAM roles.

### Strategy 2: Single Lambda + Aliases (recommended for solo/small teams)

Deploy one Lambda function. Use aliases (`dev`, `prod`) pointing to specific versions. Each alias has its own env var overrides.

```
my-app (single function)
  ├── Alias: dev  → Version 6 (dev env vars)
  └── Alias: prod → Version 5 (prod env vars)
```

- **Pros**: One function, one codebase, no drift. Promote to prod by moving alias pointer. Instant rollback (point alias to previous version). Least infra to manage.
- **Cons**: Shared IAM role and VPC across aliases. Shared concurrency limit unless reserved per alias. Harder to give dev different permissions than prod.
- **Best for**: Solo devs or small teams who want simple promotion and rollback without managing two functions.
- **See**: `deployment.md` for the full versioning and alias workflow.

### Strategy 3: API Gateway Stages + Separate Lambdas

Use API Gateway stages to route to separate Lambda functions per environment.

```
api.myapp.com/dev/*   → dev stage  → my-app-dev Lambda
api.myapp.com/prod/*  → prod stage → my-app-prod Lambda
```

Or with custom domains:
```
api-dev.myapp.com → dev stage  → my-app-dev Lambda
api.myapp.com     → prod stage → my-app-prod Lambda
```

- **Pros**: Clean URL separation per environment. Stage-level throttling and usage plans. Custom domains per stage. Same isolation benefits as Strategy 1 with a unified API surface.
- **Cons**: Still two Lambda functions. API Gateway adds latency (~10-20ms). More infra to configure. Code drift still possible.
- **Best for**: Projects that need a public REST API with per-environment URLs, rate limiting, or usage plans.

### Strategy 4: API Gateway Stages + Single Lambda with Aliases

Combine API Gateway stages with Lambda aliases. Single function, single codebase.

```
api.myapp.com/dev/*   → dev stage  → my-app:dev alias  → Version 6
api.myapp.com/prod/*  → prod stage → my-app:prod alias → Version 5
```

- **Pros**: All benefits of aliases (instant rollback, no code drift) plus API Gateway features (throttling, custom domains, API keys).
- **Cons**: Shared IAM/VPC. API Gateway adds latency. More config than aliases alone.
- **Best for**: Public APIs where you want both API management features and simple deployment promotion.

### Strategy 5: AWS Secrets Manager / SSM Parameter Store

Fetch secrets at runtime from a centralized store instead of env vars.

```
my-app → fetches from Secrets Manager at cold start
         /my-app/dev/DATABASE_URL
         /my-app/prod/DATABASE_URL
```

- **Pros**: Centralized secret management. Auto-rotation support (e.g., RDS passwords). Audit trail via CloudTrail. No 4KB env var limit. Share secrets across multiple services.
- **Cons**: Adds latency on cold start (API call to fetch secrets). Extra cost ($0.40/secret/month for Secrets Manager; SSM Parameter Store is free). More code needed (fetch + cache logic). Adds a dependency — if Secrets Manager is down, Lambda fails.
- **Best for**: When you need secret rotation, audit logging, secrets shared across multiple services, or secrets that exceed Lambda's 4KB env var limit.
- **Note**: Can be combined with any of the above strategies. Use Secrets Manager for sensitive values (DB passwords, API keys) while keeping non-sensitive config (region, bucket names) in regular Lambda env vars.

### Strategies to avoid

**Suffix-based env vars** (`DATABASE_URL_DEV`, `DATABASE_URL_PROD` on a single function): Prod Lambda holds dev credentials and vice versa. Security risk if `ENV` is set wrong. Hits the 4KB limit faster. Nonstandard.

**`.env` files deployed with Lambda** (baked into the zip): Secrets end up in your deployment artifact, possibly in version control. No encryption at rest, no audit trail, can't change without redeploying.

### Summary

| Strategy | Isolation | Complexity | Rollback | Security | Best for |
|---|---|---|---|---|---|
| Separate functions | Best | Low | Redeploy | Best | Teams, strict isolation |
| Single + aliases | Good | Low | Instant | Good | Solo/small teams |
| API GW + separate | Best | Medium | Redeploy | Best | Public REST APIs |
| API GW + aliases | Good | Medium | Instant | Good | Public APIs + simple deploys |
| Secrets Manager | Depends on Lambda setup | Medium | N/A | Best | Rotation, shared secrets, audit |

### What `config.ts` does in all strategies

Regardless of which strategy you use, `config.ts` stays the same. It reads from `process.env`:
- Locally: dotenv loads `.env.dev` or `.env.prod` into `process.env`.
- On Lambda: env vars are already in `process.env` (injected by runtime, alias config, or fetched from Secrets Manager at startup).

No suffix logic, no environment detection beyond the `ENV` flag. The infrastructure handles routing to the right values.
