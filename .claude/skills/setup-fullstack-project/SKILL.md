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

## Step 1: Detect project type

Check if `package.json` exists in the current working directory.

**If `package.json` exists:**
- If `expo` appears in `dependencies` or `devDependencies` → detected platform is **Expo**
- If `react-native` appears (without expo) → detected platform is **Bare React Native**
- If `electron` appears in `dependencies` or `devDependencies` → detected platform is **Electron**
- If `next` appears → detected as **Next.js** (can use Vercel backend prompts)
- If none of these found → platform is **unknown** (could be a web app, Node.js project, etc.)

**If `package.json` does NOT exist:**
- This is likely an empty directory or a non-Node project. Platform is **unknown**.
- Note this for later — some steps (log piping, package scripts) may not apply.

Check if arguments were passed via `$ARGUMENTS`:
- If `$1` is `expo`, `bare`, or `electron`, use that as the platform (skip asking)
- If `--lambda` is in arguments, use Lambda as backend (skip asking)
- If `--vercel` is in arguments, use Vercel as backend (skip asking)
- If `--no-log-piping` is in arguments, skip log piping (don't ask)

## Step 2: Ask the user

If any choice was not determined from arguments or detection, ask the user using AskUserQuestion. Ask all remaining questions in a single AskUserQuestion call.

If the platform was auto-detected from package.json, tell the user what was detected (e.g., "Detected Expo project from package.json") and include the platform question with the detected value as the recommended option so they can confirm or override.

Questions to ask (skip any that were determined from arguments):

1. **Platform**: "Which platform is this project?"
   - Options: Expo (Recommended) [if detected], Bare React Native, Electron (desktop), Other / None
   - If not detected: Options: Expo, Bare React Native, Electron, Other / None
   - If "Other / None" selected, skip platform-specific prompts but still offer backend, integrations, and Apple guidelines

2. **Backend**: "Do you need a backend?"
   - Options: AWS Lambda, Vercel, None

3. **Log piping**: "Add log piping scripts so Claude can read Metro/logcat output directly from files?"
   - Options: Yes (Recommended), No

4. **In-app purchases**: "Will this app use in-app purchases or subscriptions via RevenueCat?"
   - Options: Yes, No

5. **Authentication**: "Will this app need user authentication (login, SSO, organizations)?"
   - Options: WorkOS AuthKit, None

## Step 3: Generate CLAUDE.md

Resolve `${CLAUDE_SKILL_DIR}` to its absolute path. Call this `SKILL_DIR`.

Build the CLAUDE.md content with these lines:

```
# Project Instructions

## Core
@SKILL_DIR/prompts/core/index.md
```

The `## Core` section is always included regardless of platform — it covers behavior, code style, and documentation conventions that apply to any project.

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
2. If Expo: read `expo.json`. If Bare: read `bare.json`. If Electron: read `electron.json`.
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

## Step 5: Add convenience scripts to root package.json

If `package.json` exists, add scripts to start all parts of the stack easily. Don't overwrite existing scripts with the same name.

If `package.json` does not exist, skip this step and note in the summary.

**Always add (if backend was selected):**
```json
{
  "start:api": "cd backend && npm run start:api",
  "start:api:watch": "cd backend && npm run start:api:watch"
}
```

**If Expo:**
```json
{
  "start:expo": "npx expo start",
  "start:expo:ios": "npx expo start --ios",
  "start:expo:android": "npx expo start --android",
  "start:expo:web": "npx expo start --web",
  "dev:ios": "npx expo start --ios 2>&1 | tee /tmp/rn-logs.txt",
  "dev:android": "npx expo start --android 2>&1 | tee /tmp/rn-logs.txt",
  "dev:android:logs": "adb logcat *:E 2>&1 | tee /tmp/android-errors.txt"
}
```

**If Bare React Native:**
```json
{
  "start:rn": "npx react-native start",
  "start:rn:ios": "npx react-native run-ios",
  "start:rn:android": "npx react-native run-android",
  "dev:ios": "npx react-native start 2>&1 | tee /tmp/rn-logs.txt",
  "dev:android": "npx react-native start 2>&1 | tee /tmp/rn-logs.txt",
  "dev:android:logs": "adb logcat *:E 2>&1 | tee /tmp/android-errors.txt"
}
```

**If Electron:**
```json
{
  "start:electron": "npx electron .",
  "start:electron:dev": "npx electron . --inspect"
}
```

If the project has Electron Forge configured, use instead:
```json
{
  "start:electron": "npx electron-forge start",
  "start:electron:dev": "npx electron-forge start -- --inspect"
}
```

**If multiple frontends exist (e.g., Expo + Electron in the same repo):**

Add a combined `start:all` script that runs the API server and the selected frontend concurrently. If `concurrently` is not installed, suggest installing it:

```json
{
  "start:all": "npx concurrently \"npm run start:api\" \"npm run start:expo\"",
  "start:all:electron": "npx concurrently \"npm run start:api\" \"npm run start:electron\""
}
```

Tell the user they can customize which frontend `start:all` runs.

**Log piping scripts** (`dev:ios`, `dev:android`, `dev:android:logs`) pipe Metro/logcat output to `/tmp/rn-logs.txt` and `/tmp/android-errors.txt` so the coding agent can read logs directly from files. Only add these if the user chose log piping.

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

Available commands:
  npm run start:api          Start backend server (localhost:3001)
  npm run start:api:watch    Start backend with hot-reload
  npm run start:expo         Start Expo dev server
  npm run start:expo:ios     Start Expo on iOS simulator
  npm run start:electron     Start Electron app
  npm run start:all          Start backend + frontend concurrently

Next steps:
  - Review CLAUDE.md and add project-specific notes at the bottom
  - If backend was scaffolded: cd backend && npm install
  - Review Documentation/architecture/tech-stack.md and add details
  - Start a new session in your AI coding agent to load the prompts
```

Adjust the summary based on what was actually done (skip lines for steps that were skipped).
