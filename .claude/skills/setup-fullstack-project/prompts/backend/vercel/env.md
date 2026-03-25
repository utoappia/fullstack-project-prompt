## Environment Configuration

### How environments work on Vercel

Vercel has three built-in environments:

| Environment | When it runs | URL |
|---|---|---|
| **Development** | `vercel dev` locally | `localhost:3000` |
| **Preview** | Every git push to non-production branch, every PR | `project-git-branch.vercel.app` |
| **Production** | Git push to production branch (usually `main`) | `project.vercel.app` or custom domain |

Each environment can have its own set of environment variables. This means dev, preview, and production can point to different databases without any code changes.

### Setting environment variables

**Via Vercel CLI:**
```bash
# Add a variable (interactive — prompts for value and environment scope)
vercel env add DATABASE_URL

# Add for specific environment
vercel env add DATABASE_URL production
vercel env add DATABASE_URL preview
vercel env add DATABASE_URL development

# Pull env vars to local .env file
vercel env pull .env.local

# List env vars
vercel env ls

# Remove
vercel env rm DATABASE_URL production
```

**Via Vercel dashboard:** Settings → Environment Variables. Set per-environment values for the same key.

**Via `.env` files (local development only):**
- `.env.local` — loaded by `vercel dev` and most frameworks. Gitignored.
- `.env.development` — development-specific overrides.
- `.env.production` — production overrides (only used in local builds, not on Vercel).

### Accessing env vars in functions

```typescript
// api/hello.ts
export async function GET() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL not configured');
  // ...
}
```

Env vars are injected at build time for static pages and at runtime for serverless functions.

### Sensitive vs non-sensitive

- **Sensitive** (default): encrypted, not visible in logs, not exposed to the browser. Use for secrets, API keys, database URLs.
- **Plain** (optional): can be marked as non-sensitive. Use for public config like `NEXT_PUBLIC_*` vars in Next.js.
- Client-exposed vars must be prefixed with `NEXT_PUBLIC_` (Next.js) or equivalent framework prefix.

### Marketplace auto-injection

When you provision a database (Neon, Upstash, Supabase) through the Vercel Marketplace, credentials are auto-injected as environment variables. No manual setup needed.

### Limits

- Total size of all environment variables: **64 KB** per deployment.
- Variables are scoped to environments (development, preview, production) and optionally to specific git branches.

### Key rules

- Never commit `.env.local` or any file with real secrets. Add to `.gitignore`.
- Use `vercel env pull` to sync dashboard env vars to your local `.env.local` file.
- Production and preview should have different database URLs — never share a production DB with preview deployments.
- Use the Vercel dashboard or CLI to set env vars. Do not rely on `.env` files for deployed environments.
- Required variables should be validated at function startup, not at call time.
