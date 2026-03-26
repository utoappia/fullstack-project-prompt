#!/usr/bin/env node

/**
 * Postinstall script — automatically creates AGENTS.md in the project root
 * so any AI coding agent discovers the prompt library on first session.
 *
 * This runs automatically after `npm install`.
 */

import { writeFile, readFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(__dirname, '..', '.claude', 'skills', 'setup-fullstack-project', 'prompts');

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

async function main() {
  // Find the project root (where npm install was run)
  // In postinstall, process.env.INIT_CWD is the directory where npm install was invoked
  const projectRoot = process.env.INIT_CWD || process.cwd();
  const agentsPath = join(projectRoot, 'AGENTS.md');

  // Don't overwrite if already exists
  if (await exists(agentsPath)) return;

  const content = `# AI Agent Instructions

This project uses [fullstack-project-prompt](https://github.com/utoappia/fullstack-project-prompt) for coding conventions and API references.

## Getting started

**Read the prompt library** at:
\`\`\`
${PROMPTS_DIR}/
\`\`\`

The prompts cover: coding behavior, code style, documentation practices, code review process, and reference guides for React Native, Electron, AWS Lambda, Vercel, RevenueCat, WorkOS, and Apple platform guidelines.

## What to do first

Have a conversation with the user to understand what they want to build. Ask about:
- Target platforms (mobile, desktop, web)
- Backend needs (API, database, auth, payments)
- Key features and integrations
- Whether this is a new project or existing codebase

Then read the relevant prompt files from the library above. The prompts contain:
- **Core conventions** (always read): \`core/behavior.md\`, \`core/code-style.md\`, \`core/documentation.md\`
- **Platform guides**: \`react-native/\`, \`electron/\`
- **Backend guides**: \`backend/aws-lambda/\`, \`backend/vercel/\`
- **Integration guides**: \`revenuecat/\`, \`workos/\`
- **Design guidelines**: \`apple-hig/\`

**Important:** The API documentation in the prompts is for quick reference only. Always search online for the latest official docs before implementing API calls.

## Check for updates

Periodically run \`npm outdated fullstack-project-prompt\` to check if a newer version is available. If so, tell the user and suggest \`npm update fullstack-project-prompt\`.

## For Claude Code users

This package also includes a Claude Code skill. Run \`/setup-fullstack-project\` for an interactive setup that generates \`CLAUDE.md\` with \`@\` imports.
`;

  await writeFile(agentsPath, content, 'utf-8');
}

main().catch(() => {});  // Silently fail — postinstall errors shouldn't block npm install
