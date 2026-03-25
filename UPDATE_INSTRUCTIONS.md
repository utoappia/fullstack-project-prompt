# Prompt Update Instructions

This document instructs any AI coding agent (Claude Code, Cursor, Windsurf, Copilot, Cody, Aider, or any future tool) on how to review and update all prompt files in this repository. The prompts reference external services whose APIs, features, pricing, and even existence can change over time.

All prompt files are located under `.claude/skills/setup-fullstack-project/prompts/`. When this document references `prompts/`, it means that path.

## When to run updates

- Periodically (every 3-6 months)
- When a user reports outdated information
- When a major version of a referenced service is released
- When a service announces deprecation, merger, or rebranding

## Services and their documentation entry points

### Core services (always check)

| Service | Documentation URL | Prompt files |
|---|---|---|
| AWS Lambda | https://docs.aws.amazon.com/lambda/latest/dg/welcome.html | `prompts/backend/aws-lambda/*.md` |
| Vercel | https://vercel.com/docs | `prompts/backend/vercel/*.md` |
| RevenueCat | https://www.revenuecat.com/docs/welcome/overview | `prompts/revenuecat/*.md` |
| WorkOS | https://workos.com/docs/reference | `prompts/workos/*.md` |
| React Native | https://reactnative.dev/docs/getting-started | `prompts/react-native/*.md` |
| Expo | https://docs.expo.dev/ | `prompts/react-native/expo.md` |
| Electron | https://www.electronjs.org/docs/latest/ | `prompts/electron/*.md` |
| Apple HIG | https://developer.apple.com/design/human-interface-guidelines/ | `prompts/apple-hig/*.md` |
| App Store Review | https://developer.apple.com/app-store/review/guidelines/ | `prompts/apple-hig/app-review-guidelines.md` |
| Node.js | https://nodejs.org/docs/latest/api/ | `prompts/backend/aws-lambda/testing.md` (test runner) |

### Secondary references (check for breaking changes)

| Tool | Check URL | Used in |
|---|---|---|
| Drizzle ORM | https://orm.drizzle.team/docs/overview | `prompts/backend/aws-lambda/database.md` |
| Zod | https://zod.dev/ | `prompts/backend/aws-lambda/input-validation.md` |
| esbuild | https://esbuild.github.io/ | `prompts/backend/aws-lambda/bundling.md` |
| AWS Lambda Powertools | https://docs.powertools.aws.dev/lambda/typescript/latest/ | `prompts/backend/aws-lambda/logging.md`, `observability.md`, `idempotency.md` |
| Stripe | https://stripe.com/docs/api | `prompts/revenuecat/web-purchases.md` |
| Paddle | https://developer.paddle.com/api-reference/overview | `prompts/revenuecat/web-purchases.md` |

## Parallelization strategy

This update involves checking 7 core services and 6 secondary references — doing it sequentially is slow. **Use concurrent workers whenever your tooling supports it.**

### If your agent supports sub-agents / background tasks

Spawn parallel workers organized by service. Each worker independently fetches documentation, compares against the existing prompt files, and reports changes needed. Suggested groupings:

| Worker | Services | Prompt files to check |
|---|---|---|
| Worker 1 | AWS Lambda, Node.js | `prompts/backend/aws-lambda/*.md` (16 files) |
| Worker 2 | Vercel | `prompts/backend/vercel/*.md` (7 files) |
| Worker 3 | RevenueCat, Stripe, Paddle | `prompts/revenuecat/*.md` (7 files) |
| Worker 4 | WorkOS | `prompts/workos/*.md` (5 files) |
| Worker 5 | React Native, Expo, Electron | `prompts/react-native/*.md` (6 files), `prompts/electron/*.md` (5 files) |
| Worker 6 | Secondary tools (Drizzle, Zod, esbuild, Powertools) | Various files |

Each worker should:
1. Fetch the service's documentation entry point and key sub-pages
2. Read the corresponding prompt files in this repo
3. Identify discrepancies (outdated versions, deprecated APIs, new features, changed limits)
4. Report findings but **do not edit files yet** — collect all findings first, then apply changes in a coordinated pass to avoid conflicts

After all workers complete, review the combined findings and apply updates. This prevents workers from making conflicting edits to files that cross-reference each other.

### If your agent does NOT support sub-agents

Work through the services one at a time in this order (highest impact first):
1. AWS Lambda (most prompt files, most likely to have runtime/SDK changes)
2. RevenueCat (frequently updated SDK, new features)
3. WorkOS (check for React Native SDK release)
4. Vercel (platform changes)
5. React Native / Expo (framework version changes)
6. Secondary tools (usually stable, quick checks)

For each service, batch your documentation fetches — fetch multiple pages in parallel if your tool supports concurrent web requests, even if it doesn't support sub-agents.

## Update procedure

### Step 1: Check service status

For each service in the table above:

1. **Visit the documentation entry point URL.** If it redirects to a new URL, update the URL in this file and investigate whether the service was renamed or restructured.

2. **Check for discontinuation or merger.** Search for `"[service name] deprecated"`, `"[service name] shutdown"`, `"[service name] acquired"`, `"[service name] renamed"`. If the service has been discontinued:
   - Add a deprecation notice at the top of the affected prompt files
   - Research the recommended replacement service
   - Create new prompt files for the replacement if it's widely adopted
   - Keep the old prompt files (marked deprecated) for users still on the old service

3. **Check for major version changes.** Search for `"[service name] v2"`, `"[service name] breaking changes"`, `"[service name] migration guide"`. If there's a major version:
   - Read the migration guide
   - Update code examples in the prompts
   - Note any breaking changes in the relevant prompt file

### Step 2: Review each prompt section

For each prompt file, compare the documented content against the current official documentation:

**API endpoints and SDK methods:**
- Are all endpoints still valid? Any new ones added?
- Have method signatures changed? (parameter names, types, return values)
- Are SDK package names and import paths still correct?
- Are minimum SDK version numbers still accurate?

**Configuration and setup:**
- Have installation steps changed? (new packages, removed packages, renamed packages)
- Have configuration options changed? (new fields, deprecated fields, renamed fields)
- Have default values changed?
- Are environment variable names still the same?

**Limits and pricing:**
- Have resource limits changed? (max duration, max memory, payload sizes, rate limits)
- Have plan tiers changed? (Hobby/Pro/Enterprise features)
- Have pricing models changed?

**Code examples:**
- Do code examples still compile and run correctly?
- Are there newer, recommended patterns that replace the examples shown?
- Are deprecated APIs still used in examples?

**Feature additions:**
- Has the service added significant new features that should be documented?
- Have experimental features we noted become stable (or been removed)?
- Are there new best practices published by the service?

### Step 3: Check cross-references

Prompt files reference each other. After updating any file, verify:

- Each `index.md` file lists references to files that still exist (look for lines starting with `@`)
- Cross-references between files (e.g., "see `idempotency.md`") point to correct section names
- If a file was renamed or removed, update all references to it across the repository

### Step 4: Check the setup configuration

Read `.claude/skills/setup-fullstack-project/SKILL.md` and verify:
- The questions asked still match available services (e.g., if a backend provider was discontinued, remove it as an option)
- The settings JSON templates in `.claude/skills/setup-fullstack-project/templates/settings/` still contain valid permission patterns
- The backend scaffold templates in `.claude/skills/setup-fullstack-project/templates/backend/` still work with current tooling
- If you are not using Claude Code, these skill files may not apply to you directly — but the prompt files under `prompts/` are universal markdown that any agent can read

### Step 5: Update the MANIFEST

After all updates, update `references/MANIFEST.md`:
- Add any new documentation sources consulted
- Update the coverage gap analysis
- Note the date of the last review

## What to look for per service

### AWS Lambda
- New Node.js runtime versions (check if `nodejs22.x` is still current or if newer exists)
- Changes to Lambda Powertools for TypeScript
- New Lambda features (Durable Functions was new — check for more)
- SnapStart Node.js support (currently not supported — may change)
- Changes to SAM CLI or CDK
- Changes to API Gateway, DynamoDB, S3 SDKs
- AWS SDK v3 changes

### Vercel
- New serverless function features or limits
- Changes to Fluid Compute
- New CLI commands or flags
- Changes to environment variable handling
- New framework support or changed framework detection
- Changes to `vercel.json` schema
- Edge Runtime changes

### RevenueCat
- SDK version bumps and new features
- New webhook event types
- Changes to the offerings/entitlements model
- Changes to Web Billing (Stripe/Paddle integration)
- New store support (beyond Apple/Google/Amazon)
- Changes to sandbox testing behavior
- Changes to the RevenueCat Paywalls component API
- Virtual currency feature changes (was relatively new)

### WorkOS
- AuthKit SDK changes (especially check if a React Native SDK has been released)
- New SSO identity providers
- FGA model changes
- Changes to session management (sealed sessions)
- New authentication methods
- Radar feature changes (was in preview)
- Vault API changes
- WorkOS Connect changes

### React Native / Expo
- New React Native versions and architecture changes (New Architecture, Fabric, TurboModules)
- Expo SDK version bumps
- Changes to expo-router
- Changes to EAS Build / EAS Update
- New React Native CLI commands
- Changes to Metro bundler
- Navigation library changes (React Navigation versions)

### Apple HIG & App Store Review
- App Store Review Guidelines change frequently — always re-fetch the entire page
- New HIG sections for new platforms (visionOS was recent)
- Changes to app icon specifications (sizes, formats, layering)
- New UI components or deprecated ones
- Changes to Sign in with Apple requirements
- New privacy requirements (Privacy Manifest, tracking transparency)
- Account deletion requirement changes
- In-app purchase and external payment link rules (frequently updated due to regulatory changes)
- New Liquid Glass design language (iOS 26+)

### Electron
- New Electron major versions and breaking changes (check `/docs/latest/breaking-changes`)
- Changes to the process model (main/renderer/preload/utility)
- Security defaults changes (context isolation, sandbox)
- Electron Forge updates (makers, publishers, config format)
- Auto-updater changes (electron-updater vs built-in)
- New APIs or deprecated APIs
- Changes to packaging (asar, code signing, notarization requirements)
- Chromium and Node.js version bumps bundled with Electron

## How to handle specific scenarios

### Service renamed
1. Update all references to the new name
2. Update import paths if package names changed
3. Add a note: "Previously known as [old name]"
4. Update documentation URLs

### Service acquired / merged
1. Check if the API/SDK still works as-is
2. If migrated to a new platform, create new prompt files and deprecate old ones
3. Update documentation URLs to the new parent company's docs

### Feature deprecated within a service
1. Mark the deprecated feature with a note in the prompt
2. Document the recommended replacement
3. Update code examples to use the replacement
4. Remove the deprecated content after one update cycle (give users time to migrate)

### New competing service emerges
1. Evaluate if it's widely adopted enough to warrant prompt files
2. If yes, create a new directory under the appropriate parent (`prompts/backend/`, `prompts/`, etc.)
3. Update the setup skill (`.claude/skills/setup-fullstack-project/SKILL.md`) to offer it as an option
4. Don't remove existing service prompts — let users choose

### Price or plan changes
1. Update any hardcoded pricing numbers
2. Update plan feature tables (what's available on Hobby vs Pro vs Enterprise)
3. Note if free tiers have changed

## File inventory

Current prompt file count for reference (update this after each review):

```
prompts/
├── core/                    (4 files: index, behavior, code-style, documentation)
├── react-native/            (9 files: index, shared, expo, bare, navigation, log-piping, ios-permissions, android-icons)
├── electron/                (7 files: index, process-model-ipc, security, ui-features, performance-native, distribution, api-reference)
├── backend/
│   ├── aws-lambda/          (16 files: index + 15 topic files)
│   └── vercel/              (7 files: index + 6 topic files)
├── revenuecat/              (7 files: index + 6 topic files)
├── workos/                  (5 files: index + 4 topic files)
└── apple-hig/               (6 files: index, foundations, app-icons, patterns-inputs, components-technologies, app-review-guidelines)
Total: 60 prompt files
```

## Last reviewed

| Date | Services checked | Agent | Notes |
|---|---|---|---|
| 2026-03-25 | All | Claude Opus 4.6 | Initial creation of all prompt files |

When you complete an update, add a new row to this table.
