---
name: setup-fullstack-project
description: Set up Claude Code prompts, permissions, and optional backend scaffold for a fullstack project. Supports React Native (Expo/bare), Electron desktop, AWS Lambda or Vercel backend, RevenueCat in-app purchases, WorkOS authentication, and Apple platform guidelines.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
argument-hint: "[expo|bare|electron] [--lambda|--vercel] [--no-log-piping]"
---

# Setup Fullstack Project for Claude Code

You are setting up a fullstack project with curated coding conventions, permissions, and optionally a backend scaffold. This skill supports React Native (Expo/bare), Electron (desktop), and any project needing backend services (AWS Lambda, Vercel), integrations (RevenueCat, WorkOS), or Apple platform guidelines. Follow these steps in order.

The skill directory containing all prompts and templates is at: `${CLAUDE_SKILL_DIR}`

## Step 1: Have a conversation with the user

Don't just ask one question and proceed. Have a **conversation** to understand what the user wants:

1. **Ask what they want to build** — let them describe in their own words.
2. **Ask follow-up questions** based on their answer — clarify the tech stack, architecture, target platforms, key features, and any services/integrations they need.
3. **Scan the project directory** — read `package.json` (if it exists), look at the folder structure, and understand what already exists. Share what you found with the user.
4. **Suggest an approach** — based on what you've learned, propose a tech stack and architecture. Ask the user if they agree or want to adjust.
5. **Only proceed to setup once the user confirms** they're happy with the plan.

Example conversation:
> **Agent:** What would you like to build?
> **User:** A mobile app with a backend
> **Agent:** Great! A few questions:
> - What kind of mobile app? (iOS, Android, or both?)
> - Do you have a preference for the mobile framework? (Expo/React Native, Flutter, etc.)
> - What does the backend need to do? (API, database, auth, payments?)
> - Will this be deployed to any specific cloud provider?
> **User:** Both iOS and Android, using Expo. Backend needs auth and a database. Not sure about the cloud provider.
> **Agent:** I'd suggest: Expo for the mobile app, AWS Lambda for the backend (lightweight, pay-per-use), WorkOS for authentication (handles SSO and user management), and PostgreSQL via Drizzle ORM for the database. I have detailed reference prompts for all of these. Sound good?
> **User:** Yes, let's go with that.
> **Agent:** (proceeds with setup)

## Step 2: Identify relevant prompts

Based on the conversation, identify which prompt sections from this skill are relevant:

| If the project uses... | Include these prompts |
|---|---|
| Expo, React Native + Expo | `prompts/react-native/` (with expo.md) |
| React Native (bare/CLI) | `prompts/react-native/` (with bare.md) |
| Electron, desktop app | `prompts/electron/` |
| AWS Lambda, Lambda backend | `prompts/backend/aws-lambda/` |
| Vercel, serverless functions | `prompts/backend/vercel/` |
| RevenueCat, subscriptions, in-app purchases | `prompts/revenuecat/` |
| WorkOS, SSO, authentication, directory sync | `prompts/workos/` |
| iOS, Apple, App Store | `prompts/apple-hig/` |

**Always include** `prompts/core/` — it covers behavior, code style, documentation, and code review that apply to any project.

**If the project uses frameworks or services NOT covered by this skill** (e.g., Amplify, Supabase, Firebase, Flutter, SvelteKit, Django, Rails), that's fine — include the core prompts and **search online for the latest documentation** for those technologies. The skill doesn't need to cover everything; it just needs to be helpful for what it does cover and adaptive for everything else.

**Don't force a specific architecture.** The user may want:
- Separate backend + frontend directories
- A monorepo with multiple apps
- A single unified project (e.g., Next.js with API routes, or Amplify)
- Just conventions for an existing codebase

Adapt to whatever the user described in the conversation.

## Step 3: Generate CLAUDE.md

Resolve `${CLAUDE_SKILL_DIR}` to its absolute path. Call this `SKILL_DIR`.

Build the CLAUDE.md content. Start with the user's project description and core conventions:

```
# Project Instructions

## What we're building
{user's project description from Step 1}

## Core
@SKILL_DIR/prompts/core/index.md
```

The `## Core` section is always included — it covers behavior, code style, documentation, and code review conventions that apply to any project.

If Expo or Bare React Native platform, add the React Native section. The exact lines depend on selections:

```
## React Native
@SKILL_DIR/prompts/react-native/shared.md
@SKILL_DIR/prompts/react-native/expo.md        ← include this line if Expo
@SKILL_DIR/prompts/react-native/bare.md         ← include this line if Bare (not both)
@SKILL_DIR/prompts/react-native/navigation.md
@SKILL_DIR/prompts/react-native/log-piping.md   ← include this line only if log piping enabled
```

Include exactly one of `expo.md` or `bare.md`, never both. Include `log-piping.md` only if the user chose log piping.

If Electron platform:
```

## Electron
@SKILL_DIR/prompts/electron/index.md
```

If AWS Lambda backend:
```

## Backend (AWS Lambda)
@SKILL_DIR/prompts/backend/aws-lambda/index.md
```

If Vercel backend:
```

## Backend (Vercel)
@SKILL_DIR/prompts/backend/vercel/index.md
```

If RevenueCat selected:
```

## In-App Purchases (RevenueCat)
@SKILL_DIR/prompts/revenuecat/index.md
```

If WorkOS selected:
```

## Authentication (WorkOS)
@SKILL_DIR/prompts/workos/index.md
```

If platform is Expo, Bare React Native, or Electron (macOS target), always include Apple HIG:
```

## Apple Design & Review Guidelines
@SKILL_DIR/prompts/apple-hig/index.md
```

Always end with:
```

## Project-Specific Notes

<!-- Add your project-specific instructions below -->

```

Replace `SKILL_DIR` with the actual absolute path in all `@` lines.

**Writing the file:**
- If `CLAUDE.md` already exists in the project root, read it and append the generated content after a blank line.
- If it does not exist, create it with the generated content.

## Step 4: Generate .claude/settings.json

Read the following JSON files from `${CLAUDE_SKILL_DIR}/templates/settings/`:

1. Always read: `base.json`
2. Read platform-specific files based on what was matched in Step 2: `expo.json`, `bare.json`, `electron.json`. If no match, skip platform-specific files.
3. If Lambda: read `lambda.json`. If Vercel: read `vercel.json`.

Each file has a `permissions.allow` array. Merge all arrays into one, removing duplicates.

The final structure should be:
```json
{
  "permissions": {
    "allow": [
      "... all merged entries ..."
    ]
  }
}
```

**Writing the file:**
- If `.claude/settings.json` already exists, read it. Merge your `permissions.allow` entries into the existing array (preserve what's already there, add new entries, deduplicate).
- If it does not exist, create `.claude/` directory and write the file.

## Step 5: Configure start scripts in package.json

Skip this step during initial setup — the project may not exist yet. Instead, the coding agent should configure start scripts **when it actually creates or modifies the project** (as described in `behavior.md` under "Project bootstrapping").

The key convention: every runnable part of the stack should have a `start:` prefixed script in the root `package.json` so the user can run `npm run start:<name>` to launch anything. The agent figures out the right commands based on what's actually installed.

**Multiple services — use `concurrently`:**
If the project has both a backend and a frontend, add:
```json
{
  "start:all": "npx concurrently \"npm run start:api\" \"npm run start:<frontend>\""
}
```

The agent should always check what's actually in the project before adding scripts — never add scripts for frameworks that aren't installed.

## Step 6: Scaffold backend (if selected)

### AWS Lambda
If the user chose Lambda AND the `backend/` directory does NOT already exist:

Copy all files and directories from `${CLAUDE_SKILL_DIR}/templates/backend/aws-lambda/` to `backend/` in the project root. Preserve the directory structure. After copying, tell the user to run `cd backend && npm install`.

If `backend/` already exists, skip and tell the user it was skipped because the directory already exists.

### Vercel
If the user chose Vercel AND the `api/` directory does NOT already exist:

Create `api/hello.ts` with this content:
```typescript
export async function GET() {
  return Response.json({ message: 'Hello from Vercel!' });
}
```

If `api/` already exists, skip.

## Step 7: Scaffold Documentation folder

If the `Documentation/` directory does NOT already exist, create the initial structure:

```
Documentation/
├── INDEX.md
├── architecture/
│   ├── overview.md
│   ├── tech-stack.md
│   └── directory-structure.md
├── requirements/
│   └── features.md
├── decisions/
│   └── TEMPLATE.md
├── guides/
│   ├── local-setup.md
│   └── deployment.md
├── caveats/
│   └── known-issues.md
└── changelog/
    └── CHANGELOG.md
```

Populate each file with a heading and a brief placeholder based on the user's selections. For example:

- `tech-stack.md`: list the selected platform (Expo/Bare RN/Electron), backend (Lambda/Vercel), and integrations (RevenueCat/WorkOS) with their versions.
- `overview.md`: describe the high-level architecture based on selections (e.g., "React Native mobile app with AWS Lambda backend, RevenueCat for subscriptions, WorkOS for authentication").
- `features.md`: create a table with columns: Feature, Status (planned/in-progress/done), Notes.
- `TEMPLATE.md`: include the decision record template from the documentation prompt.
- `local-setup.md`: basic steps based on platform (e.g., "npm install, npx expo start" for Expo).
- `CHANGELOG.md`: start with `## [Unreleased]` section.
- `INDEX.md`: link to all created files.

If `Documentation/` already exists, skip this step.

Also scaffold a `references/` folder if it doesn't exist:

1. Create `references/MANIFEST.md` with an empty template (headings for Books & PDFs, Web Resources, Code Examples).
2. Create `code_review/` folder with a `.gitkeep` file.

3. Add to `.gitignore` (append if exists, create if not):
   ```
   # Reference materials (may contain large/copyrighted files)
   references/
   !references/MANIFEST.md

   # Code review reports
   code_review/
   !code_review/.gitkeep
   ```

## Step 8: Generate agent instruction files for other AI coding tools

Generate instruction files so that ANY AI coding agent (not just Claude Code) will discover and follow the project conventions. All files should contain the same core content but formatted for each tool.

Build the instruction content based on the user's selections. The content should:
1. State that the project uses specific frameworks/services (React Native + selected backend + selected integrations)
2. Point to the prompt files for conventions and patterns
3. Include the key rules from each selected prompt section inline (so agents without `@` import support still get the critical rules)

Generate these files in the project root:

**`.cursorrules`** (for Cursor):
```
# Project Conventions

This project uses [list of selected technologies]. Follow the conventions documented in the prompt files.

## Prompt files location
The project conventions and coding patterns are documented in:
[SKILL_DIR]/prompts/

Read the relevant prompt files before writing code:
[list of selected prompt index.md paths]

## Key rules
[inline the "Key rules" sections from each selected prompt file]
```

**`.github/copilot-instructions.md`** (for GitHub Copilot):
Same content as `.cursorrules` but in the `.github/` directory.

**`.windsurfrules`** (for Windsurf):
Same content as `.cursorrules`.

**`CONVENTIONS.md`** (universal fallback for any agent):
Same content. This file is a universal convention that many agents check.

Do not overwrite these files if they already exist — append the conventions section instead.

## Step 9: Print summary

Print a concise summary of what was created or updated:

```
Setup complete:
  CLAUDE.md ................... created/updated (Claude Code)
  .cursorrules ................ created/updated (Cursor)
  .windsurfrules .............. created/updated (Windsurf)
  .github/copilot-instructions.md created/updated (GitHub Copilot)
  CONVENTIONS.md .............. created/updated (universal)
  .claude/settings.json ....... created/updated
  package.json scripts ........ added
  backend/ .................... scaffolded (AWS Lambda)
  Documentation/ .............. scaffolded with initial structure
  references/MANIFEST.md ...... created (references folder gitignored)
  code_review/ ................ created (gitignored, for review reports)

Run `npm run` to see all available scripts (start:api, start:<frontend>, start:all, etc.)

Next steps:
  - Review CLAUDE.md and add project-specific notes at the bottom
  - If backend was scaffolded: cd backend && npm install
  - Review Documentation/architecture/tech-stack.md and add details
  - Start a new session in your AI coding agent to load the prompts
```

Adjust the summary based on what was actually done (skip lines for steps that were skipped).
