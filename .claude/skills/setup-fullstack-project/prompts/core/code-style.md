## Code Style

- Always use TypeScript, never plain JavaScript.
- Use functional components with hooks, never class components.
- Avoid over-engineering. Only make changes that are directly requested or clearly necessary.
- Don't add features, refactor code, or make "improvements" beyond what was asked.
- Don't add docstrings, comments, or type annotations to code you didn't change.
- Only add comments where the logic isn't self-evident.
- Prefer named exports over default exports.
- Prefer `const` arrow functions for component definitions.
- Don't create helpers, utilities, or abstractions for one-time operations.
- Don't design for hypothetical future requirements.

### Git workflow

- Write clear, concise commit messages. Use conventional format: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.
- Each commit should be a single logical change. Don't mix unrelated changes in one commit.
- Don't amend published commits. Create new commits to fix issues.
- Before committing, check `git status` and `git diff` to verify what's being committed.
- Don't commit secrets, `.env` files, `node_modules/`, build output, or large binary files.
- When creating branches, use descriptive names: `feat/add-subscription-flow`, `fix/android-crash-on-restore`, `refactor/auth-middleware`.

### Dependency management

- Pin exact versions for critical dependencies (frameworks, SDKs). Use `^` ranges for utilities.
- Before adding a new dependency, check: Is there a built-in alternative? Is the package actively maintained? What's the bundle size impact?
- Keep `package-lock.json` (or `yarn.lock`) committed. Don't delete or regenerate it unnecessarily.
- When upgrading dependencies, check the changelog for breaking changes before updating.
- Run tests after dependency upgrades to catch regressions.
- Audit for security vulnerabilities periodically: `npm audit`.
