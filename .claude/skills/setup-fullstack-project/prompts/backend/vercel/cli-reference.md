## Vercel CLI Quick Reference

### Installation and auth

```bash
npm i -g vercel
vercel login             # interactive login (supports --github)
vercel login --token $VERCEL_TOKEN  # CI/CD token auth
vercel whoami            # check current user/team
vercel switch <team>     # switch team scope
```

### Deploy

```bash
# Preview deployment (default)
vercel

# Production deployment
vercel --prod

# Deploy to a custom environment (Pro/Enterprise)
vercel --target staging

# Deploy with build env vars
vercel --build-env API_KEY=abc --env RUNTIME_VAR=xyz

# Skip build cache (force fresh build)
vercel --force

# Deploy pre-built output (for custom CI/CD)
vercel deploy --prebuilt --archive=tgz

# Don't wait for deployment to finish (CI/CD)
vercel --no-wait

# Stdout is always the deployment URL
DEPLOY_URL=$(vercel --prod 2>/dev/null)
```

### Custom CI/CD workflow

For CI/CD pipelines (GitHub Actions, etc.) where you build outside Vercel:

```bash
# 1. Pull project settings and env vars
vercel pull --environment=production

# 2. Build locally with production env vars
vercel build --prod

# 3. Deploy the pre-built output (no source code shared)
vercel deploy --prebuilt --archive=tgz --prod
```

### Local development

```bash
# Start local dev server (emulates Vercel environment)
vercel dev

# Start on a specific port
vercel dev --listen 4000

# Run a command with env vars loaded (no .env file written)
vercel env run -- npm run dev
vercel env run -e preview -- npm test
vercel env run -e production -- npm run build
```

For frameworks with full dev support (Next.js, SvelteKit), prefer the framework's own dev server over `vercel dev`.

### Environment variables

```bash
# Add (interactive — prompts for value and scope)
vercel env add DATABASE_URL
vercel env add DATABASE_URL production
vercel env add DATABASE_URL preview
vercel env add --sensitive API_SECRET production

# Pull to local .env file
vercel env pull .env.local
vercel env pull --environment production

# List
vercel env ls
vercel env ls production

# Update
vercel env update DATABASE_URL production

# Remove
vercel env rm DATABASE_URL production
```

Changes only apply to **new deployments** — you must redeploy after changing env vars.

### Promote and rollback

```bash
# Promote a preview deployment to production
vercel promote <deployment-url>

# Check promotion status
vercel promote status

# Rollback production to previous deployment
vercel rollback

# Rollback to a specific deployment
vercel rollback <deployment-url>

# To undo a rollback, use promote
vercel promote <deployment-url>
```

Rollbacks are instant — Vercel re-points traffic without rebuilding. Hobby plan can only rollback to the immediately previous production deployment.

### Inspect and debug

```bash
# List recent deployments
vercel ls
vercel ls --meta KEY=value  # filter by metadata

# Inspect a deployment (build info, regions, functions)
vercel inspect <deployment-url>

# View runtime logs
vercel logs <deployment-url>
vercel logs <deployment-url> --follow  # stream live

# Binary search for which deployment introduced a bug
vercel bisect --good <working-url> --bad <broken-url>
```

### Project and linking

```bash
# Link local directory to Vercel project
vercel link

# Pull project settings (framework detection, build config, env vars)
vercel pull

# Open project in dashboard
vercel open
```

### Domains

```bash
# List domains
vercel domains ls

# Add a domain to current project
vercel domains add example.com

# Set a custom alias
vercel alias set <deployment-url> custom.example.com

# List aliases
vercel alias ls
```

### Storage (Blob)

```bash
# List blobs
vercel blob list

# Upload a file
vercel blob put uploads/photo.jpg < photo.jpg

# Delete a blob
vercel blob del <blob-url>
```

### System environment variables

Enable in dashboard: Project → Settings → Environment Variables → "Automatically expose System Environment Variables".

Key variables available at runtime:

| Variable | Value |
|---|---|
| `VERCEL_ENV` | `production`, `preview`, or `development` |
| `VERCEL_URL` | Deployment URL (no `https://`) |
| `VERCEL_REGION` | Region where function runs (e.g., `cdg1`) |
| `VERCEL_PROJECT_PRODUCTION_URL` | Shortest production domain (stable, works in preview too) |
| `VERCEL_GIT_COMMIT_SHA` | Current commit SHA |
| `VERCEL_GIT_COMMIT_REF` | Branch name |
| `VERCEL_GIT_PULL_REQUEST_ID` | PR ID (empty if no PR) |
