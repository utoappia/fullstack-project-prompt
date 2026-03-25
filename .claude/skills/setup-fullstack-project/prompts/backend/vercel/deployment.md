## Deployment

### How Vercel deployments work

Every git push creates a deployment:
- Push to **production branch** (usually `main`) → **production deployment** at your custom domain.
- Push to **any other branch** or open a **PR** → **preview deployment** with a unique URL like `project-git-branch-team.vercel.app`.

Preview deployments let you test changes before they reach production. Each PR gets its own URL.

### Vercel CLI commands

```bash
# Deploy to preview (default)
vercel

# Deploy to production
vercel --prod

# Build locally without deploying (for debugging build issues)
vercel build

# Run functions locally (emulates serverless environment)
vercel dev

# Pull project settings and env vars
vercel pull

# Link local directory to a Vercel project
vercel link

# List recent deployments
vercel ls

# Inspect a deployment
vercel inspect <deployment-url>

# Promote a preview deployment to production
vercel promote <deployment-url>

# Rollback to a previous production deployment
vercel rollback

# View deployment logs
vercel logs <deployment-url>

# Remove a deployment
vercel rm <deployment-url>
```

### Git-based workflow (recommended)

1. Connect your GitHub/GitLab/Bitbucket repo to Vercel (one-time setup in dashboard).
2. Every push to `main` auto-deploys to production.
3. Every PR creates a preview deployment with a unique URL.
4. Vercel adds a comment to the PR with the preview URL.
5. Merge the PR → production deploys automatically.

No CLI needed for this workflow — it's fully automated via git.

### vercel.json configuration

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "api/heavy-task.ts": { "maxDuration": 60 },
    "api/*.ts": { "maxDuration": 30 }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ],
  "rewrites": [
    { "source": "/api/v1/:path*", "destination": "/api/:path*" }
  ],
  "crons": [
    { "path": "/api/cron/cleanup", "schedule": "0 5 * * *" }
  ]
}
```

Always include `"$schema"` — it enables IDE autocomplete and validation for `vercel.json`.

### Custom CI/CD (GitHub Actions)

For pipelines where you build outside Vercel:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }

      - name: Install Vercel CLI
        run: npm i -g vercel

      - name: Pull settings
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy
        run: vercel deploy --prebuilt --prod --archive=tgz --token=${{ secrets.VERCEL_TOKEN }}
```

### Custom environments (Pro/Enterprise)

Beyond production and preview, create custom environments like `staging` or `qa`:

```bash
# Deploy to a custom environment
vercel --target staging

# Pull env vars for a custom environment
vercel pull --environment staging

# Add env vars scoped to a custom environment
vercel env add DATABASE_URL staging
```

- Pro: 1 custom environment per project. Enterprise: 12.
- Custom environments can track a specific branch (auto-deploy on push).
- Custom environments can have their own domains.

### Rollbacks

```bash
# Instantly rollback production to the previous deployment
vercel rollback

# Promote a specific deployment to production
vercel promote <deployment-url>

# Undo a rollback by promoting the deployment you want
vercel promote <deployment-url>
```

Rollbacks are instant — Vercel re-points production traffic without rebuilding. Hobby plan can only rollback to the immediately previous production deployment.

### Regions

- Default region: `iad1` (US East, Washington D.C.).
- Deploy functions near your data source for lower latency.
- Pro: up to 3 regions. Enterprise: up to 18 regions.
- Set via dashboard: Settings → Functions → Region.

### Key rules

- Use git-based deployments for production. Use `vercel` CLI for quick testing and debugging.
- Every preview deployment is isolated — its own URL, its own env vars (preview scope).
- Use `vercel env pull` to keep local env vars in sync with the dashboard.
- Set `maxDuration` in `vercel.json` to prevent runaway costs.
- Changes to env vars only apply to **new deployments** — always redeploy after updating.
- Monitor deployments in the Vercel dashboard — it shows build logs, function logs, and errors.
- Use `VERCEL_PROJECT_PRODUCTION_URL` system env var for stable links (e.g., OG images) that always point to production, even from preview deployments.
