#!/usr/bin/env node

/**
 * Setup script for fullstack-project-prompt.
 * Works with any AI coding agent — no Claude Code required.
 *
 * Usage:
 *   npx fullstack-project-prompt
 *   npx fullstack-project-prompt --agent cursor
 *   npx fullstack-project-prompt --agent windsurf
 *   npx fullstack-project-prompt --agent copilot
 *   npx fullstack-project-prompt --agent all
 */

import { readdir, readFile, writeFile, mkdir, cp, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = join(__dirname, '..', '.claude', 'skills', 'setup-fullstack-project');
const PROMPTS_DIR = join(SKILL_DIR, 'prompts');

const AGENTS = {
  cursor: '.cursorrules',
  windsurf: '.windsurfrules',
  copilot: '.github/copilot-instructions.md',
  claude: 'CLAUDE.md',
  universal: 'CONVENTIONS.md',
};

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

async function ask(rl, question, options) {
  console.log(`\n${question}`);
  options.forEach((opt, i) => console.log(`  ${i + 1}) ${opt}`));
  const answer = await rl.question(`Choose [1-${options.length}]: `);
  const idx = parseInt(answer.trim(), 10) - 1;
  return idx >= 0 && idx < options.length ? idx : 0;
}

async function buildConventions(selections, promptsPath) {
  const lines = ['# Project Conventions', '', '## How to use these prompts', '',
    `The full prompt library is at: ${promptsPath}/`, '',
    'Read the files listed below for project conventions. Each file contains patterns,',
    'code examples, and rules that should be followed when working on this project.', '',
    '**Important:** The API documentation in these prompts is for quick reference only.',
    'Always search online for the latest official docs before implementing API calls.', ''];

  lines.push('## Core (always read)', '');
  lines.push(`- ${promptsPath}/core/behavior.md`);
  lines.push(`- ${promptsPath}/core/code-style.md`);
  lines.push(`- ${promptsPath}/core/documentation.md`);
  lines.push('');

  if (selections.platform === 'expo' || selections.platform === 'bare') {
    lines.push('## React Native', '');
    lines.push(`- ${promptsPath}/react-native/shared.md`);
    if (selections.platform === 'expo') lines.push(`- ${promptsPath}/react-native/expo.md`);
    if (selections.platform === 'bare') lines.push(`- ${promptsPath}/react-native/bare.md`);
    lines.push(`- ${promptsPath}/react-native/navigation.md`);
    lines.push(`- ${promptsPath}/react-native/ios-permissions.md`);
    lines.push(`- ${promptsPath}/react-native/android-icons.md`);
    lines.push(`- ${promptsPath}/react-native/simulator-control.md`);
    lines.push('');
  }

  if (selections.platform === 'electron') {
    lines.push('## Electron', '');
    lines.push(`- ${promptsPath}/electron/process-model-ipc.md`);
    lines.push(`- ${promptsPath}/electron/security.md`);
    lines.push(`- ${promptsPath}/electron/ui-features.md`);
    lines.push(`- ${promptsPath}/electron/performance-native.md`);
    lines.push(`- ${promptsPath}/electron/distribution.md`);
    lines.push(`- ${promptsPath}/electron/api-reference.md`);
    lines.push('');
  }

  if (selections.backend === 'lambda') {
    lines.push('## Backend (AWS Lambda)', '');
    lines.push(`- ${promptsPath}/backend/aws-lambda/index.md (references 15 sub-files)`);
    lines.push('');
  }
  if (selections.backend === 'vercel') {
    lines.push('## Backend (Vercel)', '');
    lines.push(`- ${promptsPath}/backend/vercel/index.md (references 6 sub-files)`);
    lines.push('');
  }

  if (selections.revenuecat) {
    lines.push('## In-App Purchases (RevenueCat)', '');
    lines.push(`- ${promptsPath}/revenuecat/index.md (references 6 sub-files)`);
    lines.push('');
  }

  if (selections.workos) {
    lines.push('## Authentication (WorkOS)', '');
    lines.push(`- ${promptsPath}/workos/index.md (references 4 sub-files)`);
    lines.push('');
  }

  if (['expo', 'bare', 'electron'].includes(selections.platform)) {
    lines.push('## Apple Design & Review Guidelines', '');
    lines.push(`- ${promptsPath}/apple-hig/index.md (references 5 sub-files)`);
    lines.push('');
  }

  lines.push('## Project-Specific Notes', '', '<!-- Add your project-specific instructions below -->', '');

  return lines.join('\n');
}

async function scaffoldFolders(cwd) {
  const folders = [
    'Documentation/architecture',
    'Documentation/requirements',
    'Documentation/decisions',
    'Documentation/guides',
    'Documentation/caveats',
    'Documentation/changelog',
    'references',
    'code_review',
  ];

  for (const folder of folders) {
    const fullPath = join(cwd, folder);
    if (!await exists(fullPath)) {
      await mkdir(fullPath, { recursive: true });
    }
  }

  // Create placeholder files
  const files = {
    'Documentation/INDEX.md': '# Project Documentation\n\n<!-- Link to all documentation files here -->\n',
    'Documentation/decisions/TEMPLATE.md': '# [Number]: [Title]\n\n**Date:** YYYY-MM-DD\n**Status:** Proposed | Accepted | Deprecated | Superseded by [XXX]\n\n## Context\nWhat is the problem?\n\n## Options considered\n\n## Decision\nWhat was chosen and why.\n\n## Consequences\nWhat are the trade-offs?\n',
    'Documentation/changelog/CHANGELOG.md': '# Changelog\n\n## [Unreleased]\n',
    'references/MANIFEST.md': '# Reference Materials\n\n## Books & PDFs\n| File | Title | Covers | Added |\n|---|---|---|---|\n\n## Web Resources\n| URL | Title | Covers | Last checked |\n|---|---|---|---|\n',
    'code_review/.gitkeep': '',
  };

  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = join(cwd, relPath);
    if (!await exists(fullPath)) {
      await writeFile(fullPath, content, 'utf-8');
    }
  }

  // Update .gitignore
  const gitignorePath = join(cwd, '.gitignore');
  const gitignoreAdditions = '\n# Reference materials\nreferences/\n!references/MANIFEST.md\n\n# Code review reports\ncode_review/\n!code_review/.gitkeep\n';
  if (await exists(gitignorePath)) {
    const existing = await readFile(gitignorePath, 'utf-8');
    if (!existing.includes('references/')) {
      await writeFile(gitignorePath, existing + gitignoreAdditions, 'utf-8');
    }
  } else {
    await writeFile(gitignorePath, gitignoreAdditions.trim() + '\n', 'utf-8');
  }
}

async function main() {
  const cwd = process.cwd();
  const args = process.argv.slice(2);
  const agentFlag = args.find(a => a.startsWith('--agent='))?.split('=')[1]
    || (args.indexOf('--agent') !== -1 ? args[args.indexOf('--agent') + 1] : null);

  const rl = createInterface({ input: stdin, output: stdout });

  try {
    console.log('\n📦 fullstack-project-prompt setup\n');
    console.log('This will generate instruction files for your AI coding agent');
    console.log('and scaffold project management folders.\n');

    // Ensure package.json exists
    const pkgPath = join(cwd, 'package.json');
    if (!await exists(pkgPath)) {
      console.log('No package.json found. Creating one...\n');
      const { execSync } = await import('node:child_process');
      execSync('npm init -y', { cwd, stdio: 'pipe' });
    }

    // Detect platform
    let detectedPlatform = null;
    const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps.expo) detectedPlatform = 'expo';
    else if (deps['react-native']) detectedPlatform = 'bare';
    else if (deps.electron) detectedPlatform = 'electron';
    else if (deps.next) detectedPlatform = 'nextjs';

    if (detectedPlatform) console.log(`Detected: ${detectedPlatform} project\n`);

    // Ask questions
    const platformIdx = await ask(rl, 'Which platform will you build?', [
      `Expo (React Native)${detectedPlatform === 'expo' ? ' — detected' : ''}`,
      `Bare React Native${detectedPlatform === 'bare' ? ' — detected' : ''}`,
      `Electron (desktop)${detectedPlatform === 'electron' ? ' — detected' : ''}`,
      'Other / Not sure yet',
    ]);
    const platform = ['expo', 'bare', 'electron', 'other'][platformIdx];

    const backendIdx = await ask(rl, 'Backend?', ['AWS Lambda', 'Vercel', 'None / Later']);
    const backend = ['lambda', 'vercel', null][backendIdx];

    const rcIdx = await ask(rl, 'In-app purchases via RevenueCat?', ['Yes', 'No']);
    const revenuecat = rcIdx === 0;

    const workosIdx = await ask(rl, 'Authentication via WorkOS?', ['Yes', 'No']);
    const workos = workosIdx === 0;

    let agentChoice = agentFlag;
    if (!agentChoice) {
      const agentIdx = await ask(rl, 'Which AI coding agent are you using?', [
        'Cursor', 'Windsurf', 'GitHub Copilot', 'Claude Code', 'All of the above', 'None (just scaffold folders)',
      ]);
      agentChoice = ['cursor', 'windsurf', 'copilot', 'claude', 'all', 'none'][agentIdx];
    }

    const selections = { platform, backend, revenuecat, workos };
    const conventions = await buildConventions(selections, PROMPTS_DIR);

    // Write agent instruction files
    const written = [];
    const agentsToWrite = agentChoice === 'all'
      ? Object.keys(AGENTS)
      : agentChoice === 'none' ? [] : [agentChoice];

    for (const agent of agentsToWrite) {
      const filePath = join(cwd, AGENTS[agent]);
      const dir = dirname(filePath);
      if (dir !== cwd) await mkdir(dir, { recursive: true });

      if (await exists(filePath)) {
        const existing = await readFile(filePath, 'utf-8');
        await writeFile(filePath, existing + '\n\n' + conventions, 'utf-8');
        written.push(`${AGENTS[agent]} (appended)`);
      } else {
        await writeFile(filePath, conventions, 'utf-8');
        written.push(`${AGENTS[agent]} (created)`);
      }
    }

    // Scaffold folders
    await scaffoldFolders(cwd);

    // Summary
    console.log('\n✅ Setup complete:\n');
    for (const w of written) console.log(`  ${w}`);
    console.log('  Documentation/ .............. scaffolded');
    console.log('  references/MANIFEST.md ...... created');
    console.log('  code_review/ ................ created');
    console.log('  .gitignore .................. updated');

    console.log('\n📋 What to do next:\n');
    console.log('  1. Open this project in your AI coding agent');
    console.log('     (it will read the generated instruction file automatically)\n');

    if (!detectedPlatform && platform !== 'other') {
      console.log('  2. Ask the agent to create your project. For example:');
      if (platform === 'expo') console.log('     "Create a new Expo app in this directory"');
      if (platform === 'bare') console.log('     "Create a new React Native app in this directory"');
      if (platform === 'electron') console.log('     "Create a new Electron app in this directory"');
      console.log('');
      console.log('     The agent knows to use the framework\'s official CLI and will');
      console.log('     configure start scripts, install dependencies, and update docs.\n');
    }

    if (backend) {
      if (platform !== 'other' && !detectedPlatform) {
        console.log('  3. After the project is created, ask the agent to set up the backend:');
      } else {
        console.log('  2. Ask the agent to set up the backend:');
      }
      if (backend === 'lambda') console.log('     "Set up an AWS Lambda backend"');
      if (backend === 'vercel') console.log('     "Set up Vercel serverless functions"');
      console.log('');
    }

    console.log('  The agent has access to conventions and API references for everything');
    console.log('  you selected. Just tell it what to build!\n');
  } finally {
    rl.close();
  }
}

main().catch(console.error);
