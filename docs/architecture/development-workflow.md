# Development Workflow

This document outlines the standard tooling and commands developers should use during their day-to-day workflow in the TaskMatrix project.

## Code Quality & Architecture Checking

In addition to standard building and testing, we use several tools to guarantee architectural integrity.

### Circular Dependency Analysis (`madge`)

Circular dependencies can cause extremely difficult-to-debug runtime errors (e.g., variables being `undefined` when a module is loaded before its dependency).

We use [Madge](https://github.com/pahen/madge) to statically analyze imports and detect circular loops.

**How to run:**

To verify your changes have not introduced a circular dependency, run the following command from the root of the workspace you are modifying:

```bash
# In the client workspace
cd client
npm run analyze:circular

# In the server workspace
cd server
npm run analyze:circular
```

**When to run:**
- Before opening a PR.
- If you encounter strange `undefined` exports during development.
- After significant refactoring or extracting code into shared utilities.

### Linting (ESLint)

ESLint is configured to catch programmatic errors without being overly opinionated about formatting.

```bash
# In the server workspace
cd server
npm run lint

# Auto-fix fixable issues
npm run lint:fix
```
