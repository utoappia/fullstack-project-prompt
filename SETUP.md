# Setup Guide (Any AI Coding Agent)

## Quick setup (recommended)

```bash
npm install --save-dev github:utoappia/fullstack-project-prompt   # works in empty folders too
npx fullstack-project-prompt
```

The interactive wizard will ask about your platform, backend, and integrations, then generate the right instruction file for your AI agent (Cursor, Windsurf, Copilot, Claude Code, or all of them) and scaffold Documentation, references, and code review folders.

**With flags:**
```bash
npx fullstack-project-prompt --agent cursor    # skip agent selection
npx fullstack-project-prompt --agent all       # generate for all agents
```

**If using Claude Code**, you can also run `/setup-fullstack-project` as a skill instead.

---

## Manual setup (if you prefer not to use the CLI)

### Step 1: Install this package

```bash
npm install --save-dev github:utoappia/fullstack-project-prompt
```

### Step 2: Locate the prompt files

After installing, the prompts are at:
```
node_modules/fullstack-project-prompt/.claude/skills/setup-fullstack-project/prompts/
```

### Step 3: Create your agent's instruction file

Copy the appropriate template below into your project root, replacing `PROMPTS_PATH` with the actual path to the prompts directory from Step 2.

**For Cursor** — create `.cursorrules`:
**For Windsurf** — create `.windsurfrules`:
**For GitHub Copilot** — create `.github/copilot-instructions.md`:
**For any agent** — create `CONVENTIONS.md`:

Use this template (adjust sections based on your project):

```markdown
# Project Conventions

This project follows curated development conventions. The full prompt files are located at:
PROMPTS_PATH/

## Core (always read)
Read: PROMPTS_PATH/core/behavior.md
Read: PROMPTS_PATH/core/code-style.md
Read: PROMPTS_PATH/core/documentation.md

## Frontend (pick one)
# For React Native Expo:
Read: PROMPTS_PATH/react-native/shared.md
Read: PROMPTS_PATH/react-native/expo.md
Read: PROMPTS_PATH/react-native/navigation.md
Read: PROMPTS_PATH/react-native/ios-permissions.md
Read: PROMPTS_PATH/react-native/android-icons.md
Read: PROMPTS_PATH/react-native/simulator-control.md

# For Electron:
Read: PROMPTS_PATH/electron/process-model-ipc.md
Read: PROMPTS_PATH/electron/security.md
Read: PROMPTS_PATH/electron/ui-features.md
Read: PROMPTS_PATH/electron/performance-native.md
Read: PROMPTS_PATH/electron/distribution.md
Read: PROMPTS_PATH/electron/api-reference.md

## Backend (pick one)
# For AWS Lambda:
Read: PROMPTS_PATH/backend/aws-lambda/index.md (references 15 sub-files)

# For Vercel:
Read: PROMPTS_PATH/backend/vercel/index.md (references 6 sub-files)

## Integrations (include if using)
# For RevenueCat (in-app purchases):
Read: PROMPTS_PATH/revenuecat/index.md (references 6 sub-files)

# For WorkOS (authentication):
Read: PROMPTS_PATH/workos/index.md (references 4 sub-files)

## Apple Guidelines (include for any Apple platform)
Read: PROMPTS_PATH/apple-hig/index.md (references 5 sub-files)

## Key Rules (inline for agents that can't follow file references)

### Code Style
- Always use TypeScript, never plain JavaScript
- Use functional components with hooks, never class components
- Avoid over-engineering — only make changes that are directly requested
- Prefer named exports over default exports

### Documentation
- Maintain a Documentation/ folder with architecture docs, decision records, and guides
- Update documentation whenever code changes affect behavior
- Maintain a references/ folder for research materials with a MANIFEST.md index
- Conduct code reviews with timestamped reports in code_review/ folder

### API Documentation Awareness
- The prompt files contain API documentation that may be outdated
- Always search online for the latest official documentation before implementing API calls
- If web search is not available, note uncertainty with TODO comments

### Git
- Use conventional commits: feat:, fix:, refactor:, docs:, test:, chore:
- Each commit = one logical change
- Don't commit secrets, .env files, node_modules, or build output
```

### Step 4: Customize

Remove sections you don't need (e.g., if you're not using RevenueCat, delete that section). Add your project-specific notes at the bottom.

### Step 5: Scaffold project folders

Create these folders manually (the Claude Code skill does this automatically):

```bash
# Documentation
mkdir -p Documentation/{architecture,requirements,decisions,guides,caveats,changelog}
touch Documentation/INDEX.md

# References (gitignored by default)
mkdir -p references
touch references/MANIFEST.md

# Code review (gitignored by default)
mkdir -p code_review
touch code_review/.gitkeep

# Add to .gitignore
cat >> .gitignore << 'EOF'

# Reference materials
references/
!references/MANIFEST.md

# Code review reports
code_review/
!code_review/.gitkeep
EOF
```

## How agents discover the prompts

Different agents look for instructions in different files:

| Agent | Reads from |
|---|---|
| Claude Code | `CLAUDE.md` (with `@` file imports) |
| Cursor | `.cursorrules` or `.cursor/rules` |
| Windsurf | `.windsurfrules` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Cody | Context files or `.sourcegraph/` |
| Aider | `.aider.conf.yml` or conventions files |
| Any agent | `CONVENTIONS.md`, `AGENTS.md`, or `INSTRUCTIONS.md` at repo root |

The prompt files themselves are **plain markdown** — any agent that can read files can use them directly, regardless of which discovery mechanism it uses.

## Keeping prompts updated

See `UPDATE_INSTRUCTIONS.md` for the complete guide on auditing and updating prompt files when external service documentation changes.
