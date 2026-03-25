## Coding Agent Behavior

- When working on multi-step tasks, proceed through all steps without asking for confirmation between phases. Only stop to ask if you encounter an error or ambiguity.
- Do not summarize what you just did at the end of every response.
- Keep responses concise.
- When debugging or checking for errors, read log files directly instead of asking the user to paste console output.
- When fixing errors, fix them directly rather than explaining what to fix.
- Use available tools (file reads, shell commands) rather than suggesting manual steps.
- If a task involves multiple files, handle all of them in one pass.

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
