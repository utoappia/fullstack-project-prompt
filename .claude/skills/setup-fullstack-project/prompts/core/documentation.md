## Active Documentation

Maintain a living `Documentation/` folder at the project root. This is not optional — it is a core part of development. Every design decision, requirement, caveat, and architectural choice must be documented so that any developer or coding agent can understand the project quickly without reading all the source code.

### Folder structure

Create and maintain this structure. As the project grows, add subdirectories and split files.

```
Documentation/
├── INDEX.md                          # Master index — links to every document
├── architecture/
│   ├── overview.md                   # High-level architecture, system diagram
│   ├── tech-stack.md                 # Frameworks, libraries, versions, and why each was chosen
│   ├── data-flow.md                  # How data moves through the app (client → API → DB)
│   └── directory-structure.md        # Explanation of the codebase folder layout
├── requirements/
│   ├── features.md                   # Feature list with status (planned/in-progress/done)
│   ├── user-stories.md               # User stories or use cases
│   └── non-functional.md             # Performance, security, accessibility, compliance requirements
├── decisions/
│   ├── TEMPLATE.md                   # Template for new decision records
│   └── 001-auth-provider.md          # Example: why WorkOS was chosen over Auth0
├── api/
│   ├── endpoints.md                  # All API endpoints with request/response shapes
│   ├── error-codes.md                # Application error codes and meanings
│   └── webhooks.md                   # Incoming/outgoing webhook event types
├── guides/
│   ├── local-setup.md                # How to set up the project locally from scratch
│   ├── deployment.md                 # How to deploy to each environment
│   ├── testing.md                    # How to run tests, what to test, testing strategy
│   └── troubleshooting.md           # Common issues and solutions
├── caveats/
│   ├── known-issues.md               # Known bugs, limitations, workarounds
│   ├── platform-differences.md       # iOS vs Android vs Web behavioral differences
│   └── third-party-quirks.md         # Gotchas with external services (RevenueCat, WorkOS, etc.)
└── changelog/
    └── CHANGELOG.md                  # Chronological log of significant changes
```

### INDEX.md (master index)

The `Documentation/INDEX.md` file is the entry point. It must link to every document in the folder. Keep it updated whenever you add, rename, or remove a document.

```markdown
# Project Documentation

## Architecture
- [System Overview](architecture/overview.md)
- [Tech Stack](architecture/tech-stack.md)
- [Data Flow](architecture/data-flow.md)
- [Directory Structure](architecture/directory-structure.md)

## Requirements
- [Features](requirements/features.md)
- [User Stories](requirements/user-stories.md)
- [Non-Functional Requirements](requirements/non-functional.md)

## Design Decisions
- [001: Auth Provider Selection](decisions/001-auth-provider.md)

## API
- [Endpoints](api/endpoints.md)
- [Error Codes](api/error-codes.md)
- [Webhooks](api/webhooks.md)

## Guides
- [Local Setup](guides/local-setup.md)
- [Deployment](guides/deployment.md)
- [Testing](guides/testing.md)
- [Troubleshooting](guides/troubleshooting.md)

## Caveats
- [Known Issues](caveats/known-issues.md)
- [Platform Differences](caveats/platform-differences.md)
- [Third-Party Quirks](caveats/third-party-quirks.md)

## Changelog
- [Changelog](changelog/CHANGELOG.md)
```

### Decision records

Use a consistent format for documenting design decisions. Create a new file for each significant decision.

**Template (`decisions/TEMPLATE.md`):**
```markdown
# [Number]: [Title]

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded by [XXX]
**Decision makers:** [names or roles]

## Context
What is the problem or situation that requires a decision?

## Options considered
### Option A: [Name]
- Pros: ...
- Cons: ...

### Option B: [Name]
- Pros: ...
- Cons: ...

## Decision
Which option was chosen and why.

## Consequences
What are the implications of this decision? What trade-offs were accepted?

## Future considerations
Under what conditions should this decision be revisited?
```

### When to document

**Document immediately when you:**
- Make an architectural decision (which database, which auth provider, which state management)
- Discover a caveat or platform-specific behavior
- Add or change an API endpoint
- Fix a bug caused by a non-obvious issue (add to troubleshooting or known-issues)
- Set up a new integration with an external service
- Change the deployment process
- Add a new feature or change requirements

**Document proactively:**
- Before starting a new feature, document the requirements and design approach
- After completing a feature, update the feature list status and add any caveats discovered
- When onboarding context is lost (e.g., "why did we do X?"), create a decision record retroactively

### How to write good documentation

- **Be specific, not generic.** Don't write "we use a database." Write "PostgreSQL via Neon, accessed through Drizzle ORM. Connection string in `DATABASE_URL` env var. Schema in `backend/src/db/schema.ts`."
- **Include code paths.** Reference specific files: "Auth middleware is in `src/middleware/auth.ts`. It validates the JWT from WorkOS using the JWKS endpoint."
- **Explain why, not just what.** "We use RevenueCat instead of direct StoreKit/Billing because it handles receipt validation, cross-platform entitlements, and webhook delivery — things that would take months to build correctly."
- **Use code snippets** for configuration, environment variables, and command examples. Wrap in fenced code blocks with language tags.
- **Keep it current.** Outdated documentation is worse than no documentation. When you change code, update the relevant docs in the same work session.
- **Link between documents.** Use relative markdown links. Don't duplicate information — reference the canonical location.

### Restructuring as the project grows

When a section gets too long (>300 lines) or covers too many topics, split it:

1. Create a subdirectory for the section
2. Move the file into the subdirectory as multiple focused files
3. Create an `index.md` in the subdirectory that links to all files
4. Update `INDEX.md` to point to the new subdirectory index

Example: if `api/endpoints.md` grows to cover 50 endpoints, split into:
```
api/
├── index.md              # Links to all API docs
├── auth-endpoints.md     # Authentication endpoints
├── user-endpoints.md     # User management endpoints
├── order-endpoints.md    # Order/purchase endpoints
└── webhook-events.md     # Webhook event types
```

### Media and non-markdown files

- **Diagrams:** Store as `.png`, `.svg`, or `.mermaid` files in a `Documentation/assets/` directory. Reference from markdown: `![Architecture](assets/architecture-diagram.png)`
- **Code snippets:** For long code examples that don't fit inline, create `.ts`, `.json`, or `.sh` files in a `Documentation/examples/` directory.
- **Mermaid diagrams** (rendered by GitHub/GitLab): use fenced code blocks with `mermaid` language tag directly in markdown.

### Changelog format

Use [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
# Changelog

## [Unreleased]
### Added
- RevenueCat integration for in-app purchases
### Changed
- Migrated auth from Firebase to WorkOS AuthKit
### Fixed
- Android crash on subscription restore (#42)

## [1.0.0] - 2026-03-25
### Added
- Initial release with Expo, AWS Lambda backend
- User authentication via WorkOS
- Subscription management via RevenueCat
```

### References folder

Maintain a `references/` folder at the project root for research materials — website URLs, PDFs, articles, books, screenshots, or any source that informed design decisions.

**Structure:**
```
references/
├── MANIFEST.md              # Index of all references and what they cover
├── aws-lambda-best-practices-2026.pdf
├── revenuecat-webhook-payload-spec.json
├── workos-authkit-react-native-flow.png
└── ...
```

**MANIFEST.md format:**
```markdown
# Reference Materials

## Books & PDFs
| File | Title | Covers | Added |
|---|---|---|---|
| `serverless-handbook-swizec-teller-2021.pdf` | Serverless Handbook for Frontend Engineers | Serverless concepts, AWS, provider comparison | 2026-03-25 |

## Web Resources
| URL | Title | Covers | Last checked |
|---|---|---|---|
| https://docs.aws.amazon.com/lambda/latest/dg/welcome.html | AWS Lambda Developer Guide | Runtime, invocation, deployment, configuration | 2026-03-25 |

## Code Examples & Snippets
| File | Description | Related to |
|---|---|---|
| `stripe-webhook-example.ts` | Stripe webhook handler pattern | RevenueCat web billing |
```

**Git behavior:** The `references/` folder is added to `.gitignore` by default (it may contain large PDFs or copyrighted materials). The user can choose to track it in git by removing the line from `.gitignore`. `MANIFEST.md` itself should always be committed even if the folder is gitignored — add `!references/MANIFEST.md` to `.gitignore`.

**When the user drops new files into `references/`:**

1. **Read the file** to understand what it contains (for PDFs, read the table of contents and key chapters; for URLs in a text file, fetch and summarize them).
2. **Assess relevance.** Is it useful for the project? Does it cover topics related to the tech stack, architecture, or domain?
3. **If useful:**
   - Rename the file to a descriptive, easy-to-index name: `topic-author-year.ext` (e.g., `serverless-handbook-swizec-teller-2021.pdf`, not `935631567-ebook-4K-pdf-edition.pdf`)
   - Add an entry to `MANIFEST.md` describing what information it covers
   - If the reference contains actionable insights, consider updating the relevant documentation or prompt files
4. **If not useful:** Tell the user why and suggest removing it. Don't add it to the manifest.

### Code review folder

Maintain a `code_review/` folder at the project root. Each code review produces a timestamped report file. This creates an audit trail of code quality over time and helps track what was reviewed, what issues were found, and what was fixed.

**Git behavior:** Added to `.gitignore` by default (review files can be large and contain verbose analysis). Users may choose to track it in git. Add `!code_review/.gitkeep` to `.gitignore` to preserve the empty folder.

**File naming:** `review_{EPOCH}_{RANDOM}.md`
- `{EPOCH}` — Unix epoch time in seconds when the review started (e.g., `1711324800`)
- `{RANDOM}` — 4-character alphanumeric random string (e.g., `a7x2`)
- Example: `review_1711324800_a7x2.md`

**How to conduct a code review:**

**Phase 1: Read documentation first.**
Before looking at any code, read:
1. `Documentation/INDEX.md` — understand the project structure and architecture
2. `Documentation/architecture/overview.md` — understand how components connect
3. `Documentation/architecture/tech-stack.md` — know what frameworks and libraries are used
4. `Documentation/caveats/known-issues.md` — know existing problems
5. `Documentation/decisions/` — understand why things are the way they are

This gives you context so you can review code against the intended design, not just against abstract best practices.

**Phase 2: Plan the review scope.**
If the codebase is large or has multiple components, break the review into steps:

```markdown
## Review Plan
1. [ ] Core configuration (package.json, tsconfig, env setup)
2. [ ] Backend API handlers
3. [ ] Backend middleware and utilities
4. [ ] Frontend screens and components
5. [ ] Navigation and routing
6. [ ] State management
7. [ ] Third-party integrations (RevenueCat, WorkOS, etc.)
8. [ ] Test coverage
9. [ ] Documentation accuracy
```

Work through each step one by one. Don't try to review everything at once.

**Phase 3: Review code in each area.**
For each file or group of files, check:

- **Correctness:** Does the code do what the documentation says it should?
- **Security:** Are IPC inputs validated? Are secrets exposed? Is user input sanitized? Are auth checks in place?
- **Error handling:** Are errors caught and handled gracefully? Are error responses consistent?
- **Performance:** Are there blocking operations on the main thread? Unnecessary re-renders? Missing caching?
- **Code style:** Does it follow the project's conventions (see `code-style.md`)? TypeScript used correctly?
- **Duplication:** Is there repeated logic that should be extracted?
- **Dependencies:** Are there unused dependencies? Are versions pinned appropriately?
- **Platform differences:** Does the code handle iOS/Android/Web/Desktop differences where needed?

**Phase 4: Check test coverage.**
- Are there tests? Do they run (`npm test`)?
- Is coverage adequate? Check for:
  - Unit tests for business logic
  - Integration tests for API handlers / database interactions
  - E2E tests for critical user flows (if applicable)
- Are edge cases and error paths tested?
- Are there tests for recently added features that don't have coverage yet?
- If tests are missing or inadequate, note specific files/functions that need tests.

**Phase 5: Verify against live documentation (if web search is available).**

If your tooling supports web search or web fetching, do a fresh check of external API documentation for every third-party service the project uses. This catches breaking changes, deprecations, and new best practices that the codebase may not reflect yet.

For each third-party dependency (SDK, API, service):
1. Search for `"{service name} changelog"`, `"{service name} breaking changes"`, or `"{service name} migration guide"` to find recent changes.
2. Check the official documentation for any API endpoints, SDK methods, or configuration options used in the codebase — are they still current?
3. Check if the SDK version used in `package.json` is outdated and whether newer versions have security patches or breaking changes.
4. Note any findings in the review report under a dedicated "Third-Party API Status" section.

Common things to check:
- **SDK versions**: Is the installed version still supported? Is there a newer major version?
- **Deprecated APIs**: Are any methods used in the code marked as deprecated in the latest docs?
- **New required fields**: Have any API endpoints added required parameters that the code doesn't send?
- **Auth changes**: Have authentication methods, token formats, or OAuth flows changed?
- **Rate limit changes**: Have rate limits been tightened?
- **Pricing changes**: Have free tier limits changed in a way that affects the project?

If web search is NOT available, skip this phase and note in the review report: "Third-party API verification skipped — web search not available. Recommend running this check when web access is enabled."

**Phase 6: Check documentation accuracy.**
- Does the documentation match the current code? Are there outdated references?
- Are new features or API changes reflected in the docs?
- Are there undocumented design decisions that should have decision records?

**Phase 7: Write the review report.**

Use this format:

```markdown
# Code Review — {date}

**Reviewer:** {agent name or human}
**Scope:** {what was reviewed — full repo, specific component, PR #, etc.}
**Commit:** {git commit hash if available}

## Summary
{2-3 sentence overview of the codebase health and the most important findings}

## Critical Issues
Issues that must be fixed — security vulnerabilities, data loss risks, crashes.
- [ ] **[CRITICAL]** {file:line} — {description}

## Important Issues
Issues that should be fixed — bugs, performance problems, missing validation.
- [ ] **[IMPORTANT]** {file:line} — {description}

## Suggestions
Non-urgent improvements — refactoring, code style, better patterns.
- [ ] **[SUGGESTION]** {file:line} — {description}

## Test Coverage Assessment
| Area | Has tests? | Coverage | Notes |
|---|---|---|---|
| Backend API handlers | Yes | Good | Missing test for error path in createOrder |
| Auth middleware | No | None | Needs unit tests |
| Frontend components | Partial | Low | Only LoginScreen tested |

## Third-Party API Status
{Only if web search was available. Otherwise note: "Skipped — web search not available."}
| Service | Installed version | Latest version | Status | Notes |
|---|---|---|---|---|
| react-native-purchases | 8.11.3 | 9.6.15 | Outdated | Major version bump, check migration guide |
| @workos-inc/node | 8.9.0 | 8.9.0 | Current | |
| @aws-sdk/client-s3 | 3.540.0 | 3.620.0 | Minor update | No breaking changes |

## Documentation Accuracy
- [ ] {document} — {what's outdated or missing}

## Files Reviewed
{list of files or directories reviewed in this pass}

## Follow-Up Actions
{list of concrete next steps, ordered by priority}
```

**After the review:**
- If issues were found, offer to fix the critical and important ones immediately.
- Update `Documentation/caveats/known-issues.md` with any newly discovered issues.
- If documentation was outdated, update it.
- If third-party APIs have breaking changes, create a decision record about whether to upgrade now or later.

### Key rules

- **Every code change that affects behavior should update documentation.** This is not a separate task — it's part of the change.
- **INDEX.md must always be up to date.** It's the map of the entire documentation. A new coding agent should be able to read INDEX.md and find any information about the project.
- **Decision records are permanent.** Don't delete them when decisions change — mark them as "Superseded by [new decision]" and create a new record.
- **Don't document what the code already says.** Document *why* the code is the way it is, *what trade-offs* were made, and *what gotchas* exist.
- **Documentation is for humans AND coding agents.** Write so that an AI coding agent with no prior context can understand the project's architecture, constraints, and conventions by reading the Documentation folder.
- **MANIFEST.md in references/ must stay current.** When new reference files are added, review them, rename them clearly, and update the manifest.
- **When in doubt, document it.** If you had to think about something for more than a minute, it's worth documenting.
