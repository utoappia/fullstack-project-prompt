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

async function readPromptFile(filePath) {
  try {
    return await readFile(filePath, 'utf-8');
  } catch {
    return '';
  }
}

async function buildConventions(selections, promptsPath, agent) {
  // For Claude Code, use @ imports (it loads referenced files into context)
  // For other agents, inline the actual file contents
  const useImports = (agent === 'claude');

  const sections = [];

  sections.push('# Project Conventions');
  sections.push('');
  sections.push('**API documentation in these prompts is for quick reference only.**');
  sections.push('Always search online for the latest official docs before implementing API calls.');
  sections.push('');

  // Helper: add a section either as @ import or inlined content
  async function addSection(heading, files) {
    sections.push(`## ${heading}`, '');
    for (const file of files) {
      if (useImports) {
        sections.push(`@${file}`);
      } else {
        const content = await readPromptFile(file);
        if (content) {
          sections.push(content);
          sections.push('');
        }
      }
    }
    sections.push('');
  }

  // Core — always included
  await addSection('Core', [
    join(promptsPath, 'core', 'behavior.md'),
    join(promptsPath, 'core', 'code-style.md'),
    join(promptsPath, 'core', 'documentation.md'),
  ]);

  // Platform-specific
  if (selections.platform === 'expo' || selections.platform === 'bare') {
    const files = [join(promptsPath, 'react-native', 'shared.md')];
    if (selections.platform === 'expo') files.push(join(promptsPath, 'react-native', 'expo.md'));
    if (selections.platform === 'bare') files.push(join(promptsPath, 'react-native', 'bare.md'));
    files.push(
      join(promptsPath, 'react-native', 'navigation.md'),
      join(promptsPath, 'react-native', 'ios-permissions.md'),
      join(promptsPath, 'react-native', 'android-icons.md'),
      join(promptsPath, 'react-native', 'simulator-control.md'),
    );
    await addSection('React Native', files);
  }

  if (selections.platform === 'electron') {
    await addSection('Electron', [
      join(promptsPath, 'electron', 'process-model-ipc.md'),
      join(promptsPath, 'electron', 'security.md'),
      join(promptsPath, 'electron', 'ui-features.md'),
      join(promptsPath, 'electron', 'performance-native.md'),
      join(promptsPath, 'electron', 'distribution.md'),
      join(promptsPath, 'electron', 'api-reference.md'),
    ]);
  }

  // Backend
  if (selections.backend === 'lambda') {
    // Lambda has 15 files — for non-Claude agents, read each via index
    if (useImports) {
      await addSection('Backend (AWS Lambda)', [join(promptsPath, 'backend', 'aws-lambda', 'index.md')]);
    } else {
      const indexContent = await readPromptFile(join(promptsPath, 'backend', 'aws-lambda', 'index.md'));
      const subFiles = indexContent.split('\n').filter(l => l.startsWith('@')).map(l => join(promptsPath, 'backend', 'aws-lambda', l.replace('@', '').trim()));
      await addSection('Backend (AWS Lambda)', subFiles);
    }
  }

  if (selections.backend === 'vercel') {
    if (useImports) {
      await addSection('Backend (Vercel)', [join(promptsPath, 'backend', 'vercel', 'index.md')]);
    } else {
      const indexContent = await readPromptFile(join(promptsPath, 'backend', 'vercel', 'index.md'));
      const subFiles = indexContent.split('\n').filter(l => l.startsWith('@')).map(l => join(promptsPath, 'backend', 'vercel', l.replace('@', '').trim()));
      await addSection('Backend (Vercel)', subFiles);
    }
  }

  // Integrations
  if (selections.revenuecat) {
    if (useImports) {
      await addSection('In-App Purchases (RevenueCat)', [join(promptsPath, 'revenuecat', 'index.md')]);
    } else {
      const indexContent = await readPromptFile(join(promptsPath, 'revenuecat', 'index.md'));
      const subFiles = indexContent.split('\n').filter(l => l.startsWith('@')).map(l => join(promptsPath, 'revenuecat', l.replace('@', '').trim()));
      await addSection('In-App Purchases (RevenueCat)', subFiles);
    }
  }

  if (selections.workos) {
    if (useImports) {
      await addSection('Authentication (WorkOS)', [join(promptsPath, 'workos', 'index.md')]);
    } else {
      const indexContent = await readPromptFile(join(promptsPath, 'workos', 'index.md'));
      const subFiles = indexContent.split('\n').filter(l => l.startsWith('@')).map(l => join(promptsPath, 'workos', l.replace('@', '').trim()));
      await addSection('Authentication (WorkOS)', subFiles);
    }
  }

  // Apple HIG
  if (['expo', 'bare', 'electron'].includes(selections.platform)) {
    if (useImports) {
      await addSection('Apple Design & Review Guidelines', [join(promptsPath, 'apple-hig', 'index.md')]);
    } else {
      const indexContent = await readPromptFile(join(promptsPath, 'apple-hig', 'index.md'));
      const subFiles = indexContent.split('\n').filter(l => l.startsWith('@')).map(l => join(promptsPath, 'apple-hig', l.replace('@', '').trim()));
      await addSection('Apple Design & Review Guidelines', subFiles);
    }
  }

  sections.push('## Project-Specific Notes', '', '<!-- Add your project-specific instructions below -->', '');

  return sections.join('\n');
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

    const pkgPath = join(cwd, 'package.json');

    // Ask what the user wants to build
    console.log('Describe what you want to build (1-2 sentences).');
    console.log('Examples:');
    console.log('  "A mobile app with Expo, Lambda backend, and subscriptions"');
    console.log('  "An Electron desktop app with a REST API"');
    console.log('  "A Next.js web app with Amplify"');
    console.log('  "Just set up the coding conventions for my existing project"\n');
    const description = await rl.question('What are you building? ');

    // Detect which prompts are relevant from the description
    const desc = description.toLowerCase();
    const selections = {
      platform: 'other',
      backend: null,
      revenuecat: false,
      workos: false,
    };

    // Auto-detect from description
    if (desc.match(/expo|react.native.*expo/)) selections.platform = 'expo';
    else if (desc.match(/react.native|bare.rn/)) selections.platform = 'bare';
    else if (desc.match(/electron|desktop/)) selections.platform = 'electron';

    if (desc.match(/lambda|aws/)) selections.backend = 'lambda';
    else if (desc.match(/vercel|serverless.func/)) selections.backend = 'vercel';

    if (desc.match(/revenuecat|subscript|in.app.purchas|iap/)) selections.revenuecat = true;
    if (desc.match(/workos|authkit|sso|directory.sync/)) selections.workos = true;

    // Also detect from existing package.json
    const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps.expo && selections.platform === 'other') selections.platform = 'expo';
    else if (deps['react-native'] && selections.platform === 'other') selections.platform = 'bare';
    else if (deps.electron && selections.platform === 'other') selections.platform = 'electron';

    // Show what was detected and let user confirm
    const matched = [];
    if (selections.platform !== 'other') matched.push(`Platform: ${selections.platform}`);
    if (selections.backend) matched.push(`Backend: ${selections.backend}`);
    if (selections.revenuecat) matched.push('RevenueCat (in-app purchases)');
    if (selections.workos) matched.push('WorkOS (authentication)');

    if (matched.length > 0) {
      console.log('\nI\'ll include reference prompts for:');
      matched.forEach(m => console.log(`  ✓ ${m}`));
    }
    console.log('\nCore conventions (code style, documentation, code review) are always included.');
    console.log('Apple design guidelines are included for Apple platform projects.');
    console.log('For anything else you mentioned, the agent will search online for docs.\n');

    // Ask which agent
    let agentChoice = agentFlag;
    if (!agentChoice) {
      const agentIdx = await ask(rl, 'Which AI coding agent are you using?', [
        'Cursor', 'Windsurf', 'GitHub Copilot', 'Claude Code', 'All of the above',
      ]);
      agentChoice = ['cursor', 'windsurf', 'copilot', 'claude', 'all'][agentIdx];
    }

    // Write agent instruction files
    const written = [];
    const agentsToWrite = agentChoice === 'all' ? Object.keys(AGENTS) : [agentChoice];

    for (const agent of agentsToWrite) {
      // Build conventions with agent-appropriate format
      const conventions = await buildConventions(selections, PROMPTS_DIR, agent);
      const header = `# Project Conventions\n\n## What we're building\n${description}\n\n`;
      const fullConventions = header + conventions.replace('# Project Conventions\n\n', '');

      const filePath = join(cwd, AGENTS[agent]);
      const dir = dirname(filePath);
      if (dir !== cwd) await mkdir(dir, { recursive: true });

      if (await exists(filePath)) {
        const existing = await readFile(filePath, 'utf-8');
        await writeFile(filePath, existing + '\n\n' + fullConventions, 'utf-8');
        written.push(`${AGENTS[agent]} (appended)`);
      } else {
        await writeFile(filePath, fullConventions, 'utf-8');
        written.push(`${AGENTS[agent]} (created)`);
      }
    }

    // Scaffold folders
    await scaffoldFolders(cwd);

    // Summary
    console.log('✅ Setup complete:\n');
    for (const w of written) console.log(`  ${w}`);
    console.log('  Documentation/ .............. scaffolded');
    console.log('  references/MANIFEST.md ...... created');
    console.log('  code_review/ ................ created');
    console.log('  .gitignore .................. updated');

    console.log('\n📋 Next step:\n');
    console.log('  Open this project in your AI coding agent and tell it:');
    console.log(`\n  "${description}"\n`);
    console.log('  The agent will read the conventions file, use the reference prompts');
    console.log('  for frameworks it knows, and search online for anything else.\n');
  } finally {
    rl.close();
  }
}

main().catch(console.error);
