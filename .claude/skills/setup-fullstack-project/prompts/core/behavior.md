## Coding Agent Behavior

- When working on multi-step tasks, proceed through all steps without asking for confirmation between phases. Only stop to ask if you encounter an error or ambiguity.
- Do not summarize what you just did at the end of every response.
- Keep responses concise.
- When debugging or checking for errors, read log files directly instead of asking the user to paste console output.
- When fixing errors, fix them directly rather than explaining what to fix.
- Use available tools (file reads, shell commands) rather than suggesting manual steps.
- If a task involves multiple files, handle all of them in one pass.

### Check for skill updates

At the start of each session (or periodically), check if `fullstack-project-prompt` has a newer version:

```bash
npm outdated fullstack-project-prompt
```

If a newer version is available, inform the user:
> "A newer version of fullstack-project-prompt is available (installed: X.X.X, latest: Y.Y.Y). Run `npm update fullstack-project-prompt` to get the latest conventions and API references."

If the command fails or the package isn't installed via npm (e.g., the prompts were copied manually), skip this check silently.

If web search is available, you can also check the GitHub repo directly:
- Search for `github.com/utoappia/fullstack-project-prompt releases`
- Compare against the version in `node_modules/fullstack-project-prompt/package.json`

Don't block the user's work for this — mention it once and move on.

### Project bootstrapping

When the user wants to create a new project or add a new component to an existing project, the coding agent should:

1. **Check what already exists.** Read `package.json`, scan the directory structure, and understand the current state before creating anything.

2. **Use the official scaffolding tools for the framework.** Don't manually create project boilerplate — use the framework's CLI:
   - Search online for the latest recommended way to create a new project for the chosen framework
   - Common examples (verify these are current before running):
     - Expo: `npx create-expo-app@latest`
     - Bare React Native: `npx @react-native-community/cli init`
     - Electron: `npm init electron-app@latest` (Electron Forge)
     - Next.js: `npx create-next-app@latest`
     - Vite: `npm create vite@latest`
   - Always use the `@latest` tag to get the current version

3. **Configure start scripts.** After the project is created, ensure `package.json` has `start:` prefixed scripts for every runnable part of the stack:
   - `start:api` — backend server (if backend exists)
   - `start:<frontend>` — frontend dev server (name based on framework: `start:web`, `start:mobile`, `start:desktop`)
   - `start:all` — run everything concurrently (use `npx concurrently` if multiple services)
   - `dev:` prefixed variants for debug/log-piping modes

4. **Install dependencies.** Run `npm install` after scaffolding. For monorepo setups, install in each workspace.

5. **Verify it runs.** After setup, attempt to start the project and verify it launches without errors. If a simulator/emulator is available, check that the app renders.

6. **Update documentation.** After bootstrapping, update:
   - `Documentation/architecture/tech-stack.md` with frameworks, versions, and why they were chosen
   - `Documentation/architecture/directory-structure.md` with an explanation of the folder layout
   - `Documentation/guides/local-setup.md` with steps to get the project running from scratch

7. **For fullstack projects with backend + frontend:**
   - Backend goes in `backend/` subdirectory (or follows the framework's convention)
   - Frontend stays in the project root (or its own subdirectory for monorepos)
   - Both should be startable independently and together via `start:all`
   - Environment variables: backend uses `.env.dev` / `.env.prod` in its directory; frontend uses `.env.local` or the framework's convention
   - The frontend should be configured to call the backend's local URL (`http://localhost:3001`) during development

8. **For monorepos with multiple frontends (e.g., mobile + desktop + web):**
   - Each frontend in its own directory (e.g., `apps/mobile/`, `apps/desktop/`, `apps/web/`)
   - Shared code in `packages/` directory (e.g., `packages/shared/`, `packages/ui/`)
   - Root `package.json` has scripts to start any combination
   - Consider using npm workspaces, yarn workspaces, or turborepo for dependency management

### API documentation in this skill is for quick reference only

The API documentation included in this skill's prompt files (for AWS Lambda, Vercel, RevenueCat, WorkOS, Electron, etc.) is a **snapshot** captured at the time the prompts were written. It is meant to give you awareness of what APIs, patterns, and features exist — not to be the source of truth.

**When writing code that uses any external API or SDK:**
1. **Always search online for the latest official documentation** if web search or web fetch is available. APIs change — endpoints get deprecated, new parameters become required, SDK methods get renamed, and default behaviors shift.
2. **Use the prompt files to understand the overall architecture and patterns** — they tell you which services to use, how they fit together, and what the recommended patterns are.
3. **Use the official docs for exact method signatures, parameter names, and current behavior** — don't blindly copy code examples from the prompt files without verifying against the latest docs.
4. **If web search is NOT available**, use the prompt files as your best available reference but note in code comments when you're unsure if an API is still current: `// TODO: verify against latest {service} docs`.

This applies to all prompt files under:
- `prompts/backend/aws-lambda/` — AWS Lambda, SDK v3, SAM, CloudWatch, DynamoDB, S3, etc.
- `prompts/backend/vercel/` — Vercel Functions, CLI, deployment
- `prompts/revenuecat/` — RevenueCat SDK, REST API, webhooks, Web Billing
- `prompts/workos/` — WorkOS AuthKit, SSO, Directory Sync, FGA
- `prompts/electron/` — Electron APIs, IPC, BrowserWindow, packaging
