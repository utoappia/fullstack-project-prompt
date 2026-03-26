# fullstack-project-prompt

Curated coding prompts that make AI coding agents better at building and managing your projects. Works with **any** AI coding agent — Claude Code, Cursor, Windsurf, GitHub Copilot, Cody, Aider, or anything else that reads markdown.

## What it does

When an AI coding agent works on your project, it needs to know your conventions, the APIs you use, how your architecture fits together, and what mistakes to avoid. This package provides **60+ prompt files** covering:

| Category | What's covered |
|---|---|
| **Core** | Coding behavior, code style, git workflow, documentation practices, code review process |
| **React Native** | Expo, bare RN, navigation, log piping, iOS permissions, Android icons, simulator/emulator control |
| **Electron** | Process model, IPC, security, UI features, performance, native modules, packaging, auto-updates |
| **AWS Lambda** | Conventions, env vars, deployment, bundling, logging, validation, error handling, idempotency, cold starts, observability, CI/CD, testing, CLI reference |
| **Vercel** | Functions, API routes, env vars, deployment, CLI reference |
| **RevenueCat** | SDK client, products/offerings, paywalls/experiments, server-side webhooks, web purchases, store setup/testing |
| **WorkOS** | AuthKit, SSO, directory sync, organizations/roles/FGA, audit logs, webhooks, vault, feature flags |
| **Apple HIG** | Foundations, app icons (all platforms), patterns/inputs, components/technologies, App Store Review Guidelines |

The prompts include code examples, configuration snippets, comparison tables, error codes, and "key rules" that the agent should always follow.

## Install

```bash
npm install --save-dev github:utoappia/fullstack-project-prompt
npx fullstack-project-prompt
```

The setup asks one question: **"What are you building?"**

Describe your project in plain language:
- *"A mobile app with Expo, Lambda backend, and subscriptions"*
- *"An Electron desktop app with a REST API"*
- *"A Next.js web app with Amplify"*
- *"Just set up coding conventions for my existing project"*

It then generates the right instruction file for your AI agent, scaffolds project management folders, and tells you what to do next.

Open the project in your AI coding agent and start building. The agent reads the conventions, has reference docs for frameworks it knows, and searches online for everything else.

**Claude Code users** can also invoke the skill directly after installing:
```
/setup-fullstack-project
```

## What gets generated

After running the setup, your project will have:

```
your-project/
├── .cursorrules                    # Instructions for Cursor
├── .windsurfrules                  # Instructions for Windsurf
├── .github/copilot-instructions.md # Instructions for GitHub Copilot
├── CONVENTIONS.md                  # Universal instructions (any agent)
├── CLAUDE.md                       # Instructions for Claude Code (with @ imports)
├── .claude/settings.json           # Claude Code permissions
├── Documentation/                  # Project documentation scaffold
│   ├── INDEX.md
│   ├── architecture/
│   ├── requirements/
│   ├── decisions/
│   ├── guides/
│   ├── caveats/
│   └── changelog/
├── references/                     # Research materials (gitignored)
│   └── MANIFEST.md
└── code_review/                    # Code review reports (gitignored)
```

You only need the file for your agent — delete the others if you want.

## Supported AI coding agents

| Agent | Instruction file | How it works |
|---|---|---|
| **Claude Code** | `CLAUDE.md` | `@` imports load prompt files into context automatically |
| **Cursor** | `.cursorrules` | Cursor reads rules on every session |
| **Windsurf** | `.windsurfrules` | Windsurf reads rules on every session |
| **GitHub Copilot** | `.github/copilot-instructions.md` | Copilot reads instructions from this path |
| **Any other agent** | `CONVENTIONS.md` | Most agents check for convention files at the repo root |

## Supported platforms and services

**Frontend:**
- React Native (Expo managed workflow)
- React Native (bare / CLI)
- Electron (desktop)
- Other / None (core conventions still apply)

**Backend:**
- AWS Lambda (TypeScript, esbuild, Drizzle ORM, S3, DynamoDB)
- Vercel (serverless functions, API routes, Edge)

**Integrations:**
- RevenueCat (in-app purchases, subscriptions, web billing)
- WorkOS (authentication, SSO, directory sync, roles/permissions)

**Design guidelines:**
- Apple Human Interface Guidelines (all platforms)
- App Store Review Guidelines

## What the prompts teach the agent

The prompts aren't just documentation dumps. They're structured instructions that tell the agent:

- **What patterns to use** — code examples for common scenarios (IPC in Electron, webhook handlers for RevenueCat, sealed sessions for WorkOS)
- **What mistakes to avoid** — "never expose `client_secret` in mobile apps", "always validate IPC inputs in the main process", "handle `PURCHASE_CANCELLED_ERROR` separately — it's not an error"
- **What to check before shipping** — iOS permissions in Info.plist, Android icon densities, App Store Review Guidelines compliance, launch checklists
- **How to manage the project** — documentation structure, decision records, code review process, reference materials
- **When to look things up** — every prompt includes a note that API documentation may be outdated and the agent should search online for the latest version

## Keeping prompts updated

The external services documented in the prompts (AWS, Vercel, RevenueCat, WorkOS, Apple, Electron) update their APIs regularly. See `UPDATE_INSTRUCTIONS.md` for the complete audit procedure. The key points:

- The prompts are **quick references**, not the source of truth
- The agent is instructed to **search online for the latest docs** before implementing API calls
- The update instructions include a **parallelization strategy** for agents that support sub-agents
- A **last reviewed** table tracks when each service was last audited

## Project structure

```
fullstack-project-prompt/
├── .claude/skills/setup-fullstack-project/
│   ├── SKILL.md                    # Claude Code skill definition
│   ├── prompts/                    # The prompt library (60+ markdown files)
│   │   ├── core/                   # Behavior, code style, documentation
│   │   ├── react-native/           # RN/Expo conventions, permissions, icons
│   │   ├── electron/               # Process model, security, packaging
│   │   ├── backend/aws-lambda/     # Lambda conventions, patterns, CLI
│   │   ├── backend/vercel/         # Vercel functions, deployment, CLI
│   │   ├── revenuecat/             # IAP, webhooks, web billing
│   │   ├── workos/                 # Auth, SSO, roles, infrastructure
│   │   └── apple-hig/              # Design guidelines, review rules
│   └── templates/                  # Settings and scaffold templates
├── bin/setup.mjs                   # Interactive setup script (any agent)
├── AGENTS.md                       # Instructions for any AI agent reading this repo
├── SETUP.md                        # Detailed setup guide
├── UPDATE_INSTRUCTIONS.md          # How to audit and update prompts
├── references/                     # Reference materials and MANIFEST
└── package.json
```

## Contributing

To add support for a new service or platform:

1. Create a new directory under `prompts/` (e.g., `prompts/supabase/`)
2. Add topic markdown files following the existing pattern
3. Create an `index.md` listing all sub-files
4. Update `SKILL.md` to offer it as an option
5. Update `bin/setup.mjs` to include it in the interactive wizard
6. Update `UPDATE_INSTRUCTIONS.md` with the service's documentation URL
7. Update this README

## License

MIT
