# 12 — Testing Guidelines

This document outlines the testing strategy for the TaskMatrix application. 

*Note: While automated tests are not currently heavily implemented in the repository, this guide establishes the standards for future development.*

## Frontend Testing Strategy

### 1. Unit Testing
- **Frameworks**: Jest and React Testing Library (RTL).
- **Scope**: Focus on testing pure utility functions (in `src/lib/utils.ts`), custom hooks (e.g., `useS3Upload`), and complex Redux reducers.
- **Components**: Test isolated UI components (like `TaskCard`, buttons, inputs) to ensure they render correctly given specific props.

### 2. Integration Testing
- **Scope**: Test interactions between components and the Redux store.
- **Mocking**: Use Mock Service Worker (MSW) to intercept RTK Query API calls and provide mock responses. This allows testing components that fetch data without hitting a real backend.
- **Graph Testing**: Use `@testing-library/react` coupled with `ResizeObserver` mocks to test the `@xyflow/react` dependency graphs. Ensure nodes render correctly based on prediction data.

### 3. End-to-End (E2E) Testing
- **Framework**: Cypress or Playwright.
- **Scope**: Simulate critical user journeys such as:
  - Logging in via the Cognito mock interface.
  - Creating a new project.
  - Creating a task, assigning it, and dragging it across the Kanban board.
  - Generating an AI task breakdown.

## Backend Testing Strategy

### 1. Unit Testing
- **Frameworks**: Jest and Supertest.
- **Scope**: Test individual service functions (e.g., specific logic inside `s3Service.ts`) and utility functions. Mock the Prisma client to avoid requiring a real database connection.

### 2. Integration Testing
- **Scope**: Test API endpoints by sending HTTP requests using Supertest and asserting on the responses.
- **Database Strategy**: Use a dedicated test PostgreSQL database. Run migrations to ensure a clean schema, insert seed data before tests, and clear tables after tests. 
- **Mocking External Services**: Use libraries like `nock` or Jest mocks to mock external calls to AWS S3 and Google Gemini API. Ensure tests do not incur API costs or upload real files to S3.

## Continuous Integration (CI)

- Tests should be automated using a CI pipeline (e.g., GitHub Actions).
- The pipeline should run unit and integration tests on every pull request.
- The build should fail if tests do not pass or if code coverage drops below an established threshold.
