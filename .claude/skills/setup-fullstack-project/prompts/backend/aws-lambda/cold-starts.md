## Cold Start Optimization

- A cold start happens when Lambda creates a new execution environment for your function. It downloads your code, starts the runtime, and runs your initialization code before handling the request.
- Cold starts add 200ms-5s of latency depending on bundle size, runtime, VPC config, and initialization work.
- After a cold start, the execution environment is reused for subsequent requests (warm start). Warm starts add no extra latency.

### Execution environment lifecycle

Lambda execution environments go through three phases:

1. **INIT** (cold start): Lambda downloads your code, starts the Node.js runtime, and runs module-level code (imports, client initialization). This is the expensive phase. Runs once per environment.
2. **INVOKE**: Lambda calls your handler function. This runs on every request. The execution environment (including module-level variables, DB connections, SDK clients) persists between invocations.
3. **SHUTDOWN**: after ~5-15 minutes of inactivity, Lambda tears down the environment. Next request triggers a new INIT.

Key implication: anything you initialize at module level (outside the handler) is reused across warm invocations. This is why connection reuse and lazy initialization matter.

### What causes cold starts

- **First invocation** after deployment or a period of inactivity (~5-15 minutes idle).
- **Scaling up** — when concurrent requests exceed available warm environments, Lambda creates new ones. Each new concurrent environment is a cold start.
- **Code size** — larger bundles take longer to download and initialize.
- **VPC** — Lambda in a VPC requires ENI (Elastic Network Interface) setup, adding 1-2s (mostly mitigated since 2019 with VPC improvements, but still slower than non-VPC).
- **Initialization code** — anything that runs at module load time (DB connections, SDK clients, config fetching).

### Tier 1: Minimize bundle size and initialization (zero cost)

- When to use: every project, regardless of scale. These are free optimizations.

**Bundle size:**
- Use esbuild to tree-shake and bundle (already configured per `bundling.md`). A typical bundled Lambda is ~1-5MB vs ~190MB unbundled.
- Avoid importing entire SDKs. Import only the clients you need:
  ```typescript
  // Good — imports only the S3 client (~50KB)
  import { S3Client } from '@aws-sdk/client-s3';

  // Bad — imports the entire AWS SDK
  import AWS from 'aws-sdk';
  ```
- Check bundle size after build: `ls -lh _aws_lambda_build/nodejs/node_modules/@project/backend/`

**Lazy initialization:**
```typescript
// src/lib/Postgres.ts

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

let db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!db) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool);
  }
  return db;
}
```

Initialize clients lazily (on first use) instead of at module load time. This way, cold starts that don't use a particular client don't pay its initialization cost. And warm invocations reuse the existing connection.

**Move initialization outside the handler but use lazy patterns:**
```typescript
// Module-level: runs once per cold start, reused across warm invocations
import { S3Client } from '@aws-sdk/client-s3';
const s3 = new S3Client({ region: process.env.AWS_REGION });

// Handler: runs every invocation
export async function handler(params: InputParams, context: any) {
  // s3 is already initialized on warm starts
}
```

- **Limitations**: can't eliminate cold starts entirely, only reduce their duration.

### Tier 2: Optimize Lambda configuration (minimal cost)

- When to use: when cold start latency is noticeable to users (>500ms).

**Memory and CPU:**
- Lambda CPU scales linearly with memory. At 128MB you get a fraction of a vCPU; at 1769MB you get a full vCPU.
- Increasing memory often decreases duration enough to reduce total cost.
- Run tests at 256MB, 512MB, 1024MB, 1769MB and compare duration vs cost.
- Use [AWS Lambda Power Tuning](https://github.com/alexcasalboni/aws-lambda-power-tuning) to find the optimal memory/cost balance automatically.
- Use **AWS Compute Optimizer** for ML-based memory recommendations — it continuously monitors your functions and suggests right-sizing. Available in the Lambda console and via CLI.

**ARM64 (Graviton2):**
```yaml
# SAM template
MyFunction:
  Type: AWS::Serverless::Function
  Properties:
    Architectures:
      - arm64
```
- ARM64 functions are ~20% cheaper and often ~10-15% faster than x86.
- Node.js works identically on ARM64. No code changes needed.
- Only use x86 if you have native dependencies that don't support ARM.

**Timeout tuning:**
- Set timeout to the maximum expected duration + buffer. Don't use the default 3s for functions that call databases.
- Typical: API handlers 10-30s, background scripts 60-300s.
- A too-short timeout wastes the cold start cost when the function times out.

- **Advantages over Tier 1**: measurable latency reduction, potential cost savings.

### Tier 3: Provisioned concurrency (costs money)

- When to use: production APIs where cold start latency is unacceptable (<100ms P99 required), or after Tier 1 and 2 are exhausted.

**Provisioned concurrency** keeps a set number of execution environments always warm:

```bash
# Set 5 always-warm environments on the prod alias
aws lambda put-provisioned-concurrency-config \
  --function-name my-app \
  --qualifier prod \
  --provisioned-concurrent-executions 5
```

```yaml
# SAM template
MyFunction:
  Type: AWS::Serverless::Function
  Properties:
    ProvisionedConcurrencyConfig:
      ProvisionedConcurrentExecutions: 5
```

- **Cost**: you pay for provisioned environments even when idle (~$0.015/GB-hour). 5 environments at 512MB ≈ $27/month.
- **Auto-scaling**: combine with Application Auto Scaling to scale provisioned concurrency based on utilization:
  ```bash
  aws application-autoscaling register-scalable-target \
    --service-namespace lambda \
    --resource-id function:my-app:prod \
    --scalable-dimension lambda:function:ProvisionedConcurrency \
    --min-capacity 2 \
    --max-capacity 20
  ```
- **SnapStart**: pre-initializes the execution environment at deploy time by snapshotting memory and disk state. Supported for Java, Python, and .NET only — **not available for Node.js**. If you migrate to a supported runtime in the future, SnapStart eliminates cold starts without provisioned concurrency costs.

- **Advantages over Tier 2**: eliminates cold starts for the provisioned environments. Traffic beyond provisioned capacity still gets cold starts.

### Tier comparison

| Aspect | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Cost | Free | Free (may save money) | $0.015/GB-hour per env |
| Cold start reduction | 30-70% shorter | 10-30% shorter | Eliminated (up to provisioned limit) |
| Effort | Low (code changes) | Low (config changes) | Medium (config + cost monitoring) |
| When to do it | Always | When >500ms cold starts | When <100ms P99 required |
| Best for | Every project | Most projects | Production APIs |

### Key rules

- Always bundle with esbuild. An unbundled Lambda is 10-50x larger and proportionally slower to cold start.
- Initialize SDK clients at module level (outside the handler) so they're reused across warm invocations.
- Use lazy initialization for clients that aren't needed on every invocation (e.g., S3 client in a handler that only sometimes uploads).
- Use ARM64 unless you have a specific reason not to.
- Measure before optimizing — use CloudWatch to find actual P95/P99 cold start durations before paying for provisioned concurrency.
- Never open a new database connection per invocation. Reuse connections across warm starts via module-level singletons.
