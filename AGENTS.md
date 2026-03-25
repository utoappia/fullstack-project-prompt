# Agent Instructions

This file is for any AI coding agent working on this repository — Claude Code, Cursor, Windsurf, Copilot, Cody, Aider, or any other tool. Read this file first to understand the project structure and how to work with it.

## What this project is

A curated library of developer prompts and conventions for building fullstack applications. Supports React Native (Expo/bare), Electron desktop apps, and any project needing backend services (AWS Lambda, Vercel), integrations (RevenueCat for in-app purchases, WorkOS for authentication), or Apple platform guidelines. The prompts guide AI coding agents to follow established patterns, avoid common mistakes, and use correct API conventions. The core prompts (behavior, code style, documentation, code review) apply to any project regardless of platform.

## Repository structure

```
.claude/skills/setup-fullstack-project/     # Claude Code skill (setup wizard)
  SKILL.md                           # Skill definition (Claude Code specific)
  prompts/                           # THE PROMPT LIBRARY (universal, any agent can use)
    core/                            # General coding behavior and style
    react-native/                    # React Native / Expo conventions
    electron/                        # Electron desktop app conventions (5 files)
    backend/
      aws-lambda/                    # AWS Lambda backend (16 files)
      vercel/                        # Vercel serverless functions (7 files)
    revenuecat/                      # In-app purchases via RevenueCat (7 files)
    workos/                          # Authentication via WorkOS (5 files)
    apple-hig/                       # Apple Human Interface Guidelines + App Review (6 files)
  templates/                         # Scaffold templates and permission configs
    settings/                        # Claude Code permission JSON fragments
    backend/aws-lambda/              # Lambda project scaffold

references/                          # Reference materials (books, MANIFEST)
UPDATE_INSTRUCTIONS.md               # How to audit and update all prompts
AGENTS.md                            # This file
```

## How to use the prompts

### If the project has already been set up

The `/setup-fullstack-project` skill generates instruction files for multiple AI coding agents. Look for whichever file your tool reads:

| File | Agent |
|---|---|
| `CLAUDE.md` | Claude Code (with `@` imports to prompt files) |
| `.cursorrules` | Cursor |
| `.windsurfrules` | Windsurf |
| `.github/copilot-instructions.md` | GitHub Copilot |
| `CONVENTIONS.md` | Universal fallback (any agent) |

If these files exist in the project root, follow the instructions in them. They contain the project's selected conventions and key rules inline.

### If the project has NOT been set up yet

**Claude Code:** invoke `/setup-fullstack-project` — it generates all instruction files automatically.

**Any other agent (Cursor, Windsurf, Copilot, Cody, Aider, etc.):** see `SETUP.md` for step-by-step instructions. It includes a copy-paste template for your agent's instruction file and commands to scaffold the project folders. The prompt files are plain markdown that any agent can read:



- **Always read**: `prompts/core/index.md` (follows links to `behavior.md` and `code-style.md`)
- **For React Native**: `prompts/react-native/index.md` (follows links to shared, navigation, platform-specific files)
- **For Electron**: `prompts/electron/index.md` (follows links to process model, security, UI, performance, distribution)
- **For Apple platforms**: `prompts/apple-hig/index.md` (HIG foundations, app icons, patterns, components, App Store review guidelines)
- **For AWS Lambda backend**: `prompts/backend/aws-lambda/index.md` (follows links to 16 topic files)
- **For Vercel backend**: `prompts/backend/vercel/index.md` (follows links to 7 topic files)
- **For in-app purchases**: `prompts/revenuecat/index.md` (follows links to 7 topic files)
- **For authentication**: `prompts/workos/index.md` (follows links to 5 topic files)

Each `index.md` file lists the sub-files to read. Lines starting with `@` are file references — read those files too.

### How to interpret the prompt files

- **Sections with code blocks**: these are patterns and examples the agent should follow when writing code for the user's project.
- **Tables**: quick reference for limits, options, comparisons. Use when making configuration decisions.
- **"Key rules" sections**: critical constraints. Always follow these.
- **"Tier 1 / Tier 2 / Tier 3" sections**: progressively more sophisticated approaches. Ask the user which tier fits their project, or recommend based on project complexity.

## Maintaining the prompts

See `UPDATE_INSTRUCTIONS.md` for the complete update procedure. Key points:

- Prompts reference external service documentation that can become outdated
- Services can be renamed, acquired, discontinued, or have breaking API changes
- The update instructions cover how to handle each scenario
- After updates, verify cross-references between files still work

**Performance tip:** The update process involves checking 13+ external documentation sites. If your agent supports spawning sub-agents, background tasks, or concurrent workers, use them — the update instructions include a parallelization strategy with suggested worker groupings. If your agent doesn't support concurrency, the instructions also provide a sequential fallback ordered by priority.

## Adding new services

To add a new service (e.g., a new backend provider or integration):

1. Create a new directory under `prompts/` (e.g., `prompts/supabase/` or `prompts/backend/google-cloud/`)
2. Create an `index.md` that lists all sub-files
3. Create topic-specific `.md` files following the existing pattern (see any `aws-lambda/*.md` for the style)
4. For Claude Code: update `.claude/skills/setup-fullstack-project/SKILL.md` to offer the new service as an option
5. Update `UPDATE_INSTRUCTIONS.md` to include the new service's documentation URL
6. Update this file's structure diagram

## File conventions

- All prompt files use Markdown with code blocks in TypeScript
- Each directory has an `index.md` that aggregates its sub-files
- File names are kebab-case: `cold-starts.md`, `input-validation.md`
- Code examples should be complete enough to copy-paste but concise enough to scan
- Tables are used for comparisons, limits, and quick reference
- "Key rules" sections at the end of each file list non-negotiable constraints
