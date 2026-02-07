# TDD Workflow Guide

A simple guide to Test-Driven Development with the NoEgo framework.

---

## Types of Tests

NoEgo supports four types of tests, each suited to different purposes:

### 1. Unit Tests (`test/unit/`)

Test stateless logic with no side effects. **No database, no mocks.** IoC is fine for services that don't touch the database.

Use unit tests for:
- Pure functions (same input always produces same output)
- Validators and formatters
- String parsers and math utilities
- Factory functions and error classes

```bash
npm run test -- --testPathPattern=test/unit     # Run all unit tests
npm run test -- test/unit/validators.test.ts    # Run specific file
```

**Rule of thumb:** If you need mocks or database access, it's NOT a unit test.

See `UNIT_TESTING.md` for detailed documentation.

---

### 2. Service Tests (`test/integration/service/`)

Test services directly via IoC container with a real in-memory database.

Use service tests for:
- Business logic in services
- Repository operations (SQL queries)
- Service-to-service interactions
- Data validation and transformations

```bash
npm run test -- test/integration/service/       # Run all service tests
npm run test -- test/integration/service/auth.test.ts
```

**Pattern:**
```typescript
import { resetTestDatabase } from '../../helpers/test-db';
import container from '../../../src/server/container';
import AuthService from '../../../src/server/services/auth_service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    await resetTestDatabase();
    service = await container.get(AuthService);
  });

  it('should create user', async () => {
    const result = await service.createUser('test@example.com', 'password');
    expect(result.id).toBeDefined();
  });
});
```

See `SERVICE_TESTING.md` for detailed documentation.

---

### 3. API Tests (`test/integration/api/`)

Test HTTP endpoints using Supertest. Tests the full request/response cycle.

Use API tests for:
- HTTP endpoint behavior (status codes, headers, body)
- Authentication and authorization flows
- Request validation and error responses
- End-to-end API workflows

```bash
npm run test -- test/integration/api/       # Run all API tests
npm run test -- test/integration/api/status.test.ts
```

**Pattern:**
```typescript
import { getTestApp, cleanupTestApp } from '../../helpers/test-app';

describe('GET /api/status', () => {
  let agent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    const result = await getTestApp();
    agent = result.agent;
  });

  afterAll(async () => {
    await cleanupTestApp();
  });

  it('should return 200', async () => {
    const response = await agent.get('/api/status');
    expect(response.status).toBe(200);
  });
});
```

See `API_TESTING.md` for detailed documentation.

---

### 4. Visual Tests (`test/ui/**/*.forge.ts`)

Screenshot capture tests for UI components using Forge and Playwright. These tests render Svelte components and capture PNG/JPEG screenshots at different viewports, outputting image files to a specified directory for visual inspection and regression detection.

**What visual tests do:**
- Render Svelte components in a real browser via Playwright
- Capture screenshots at specified viewport sizes (mobile, tablet, desktop)
- Output image files (PNG/JPEG) to a directory you specify
- Enable visual comparison to detect UI regressions

Use visual tests for:
- UI component rendering verification
- Responsive layouts (mobile, tablet, desktop breakpoints)
- Different UI states (empty, loading, error, populated)
- Visual regression detection via screenshot comparison

```bash
npm run test:ui                      # Run all visual tests
forge test/ui/page.forge.ts          # Run specific visual test
npx forge test/ui/**/*.forge.ts      # Run all forge files with npx
```

See `VISUAL_TESTING.md` for detailed documentation.

---

## Choosing the Right Test Type

| What to Test | Test Type | Location | Key Helper |
|--------------|-----------|----------|------------|
| Pure functions, validators | Unit | `test/unit/` | None needed |
| Service methods, repos | Service | `test/integration/service/` | `resetTestDatabase()` + `container.get()` |
| HTTP endpoints | API | `test/integration/api/` | `getTestApp()` |
| UI components | Visual | `test/ui/` | `createImageRenderer()` |

---

## The TDD Cycle

### 1. Red - Write a Failing Test

Write a test for the feature you want to implement. The test should fail because the feature does not exist yet.

**For Service Logic (recommended starting point):**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { resetTestDatabase } from '../../helpers/test-db';
import container from '../../../src/server/container';
import UserService from '../../../src/server/services/user_service';

describe('UserService.register', () => {
  let service: UserService;

  beforeEach(async () => {
    await resetTestDatabase();
    service = await container.get(UserService);
  });

  it('should create a new user', async () => {
    const user = await service.register('new@example.com', 'secure123');
    expect(user.id).toBeDefined();
    expect(user.email).toBe('new@example.com');
  });
});
```

**For API Endpoints:**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, cleanupTestApp } from '../helpers/test-app';

describe('POST /api/users/register', () => {
  let agent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    const result = await getTestApp();
    agent = result.agent;
  });

  afterAll(async () => {
    await cleanupTestApp();
  });

  it('should return 201 with user id', async () => {
    const response = await agent
      .post('/api/users/register')
      .send({ email: 'new@example.com', password: 'secure123' });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
  });
});
```

Run the test - it should fail (Red).

### 2. Green - Make It Pass

Write the minimum code to make the test pass.

```typescript
// In your service
async register(email: string, password: string) {
  const hashedPassword = await this.hashPassword(password);
  return this.userRepo.create({ email, password: hashedPassword });
}
```

Run the test - it should pass (Green).

### 3. Refactor - Clean Up

Improve the code without changing behavior. The test should still pass.

- Extract common logic
- Improve naming
- Add validation
- Handle edge cases

---

## Quick Start Commands

```bash
# Run all tests
npm run test

# Start watch mode for fast feedback
npm run test:watch

# Run unit tests only
npm run test -- --testPathPattern=test/unit

# Run service tests only
npm run test -- test/integration/service/

# Run API tests only
npm run test -- test/integration/api/

# Run visual tests
npm run test:ui

# Run specific test file
npm run test -- test/integration/service/auth.test.ts

# Run tests matching pattern
npm run test -- --grep "registration"
```

---

## Key Points

### Migrations Run Automatically

No need to run `proper up` before tests. The test helpers:
1. Create an in-memory SQLite database
2. Run all migrations automatically
3. Give you a fresh database for each test (service tests) or test suite (API tests)

### Use Watch Mode

```bash
npm run test:watch
```

This re-runs tests on every file change - perfect for the TDD cycle.

### Test Structure by Type

**Unit Tests** (no setup needed):
```typescript
describe('validateEmail', () => {
  it('should return true for valid email', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });
});
```

**Service Tests** (reset database each test):
```typescript
describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    await resetTestDatabase();
    service = await container.get(UserService);
  });

  it('should create user', async () => {
    const user = await service.create('test@example.com');
    expect(user.id).toBeDefined();
  });
});
```

**API Tests** (setup once per suite):
```typescript
describe('GET /api/users', () => {
  let agent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    const result = await getTestApp();
    agent = result.agent;
  });

  afterAll(async () => {
    await cleanupTestApp();
  });

  it('should return 200', async () => {
    const response = await agent.get('/api/users');
    expect(response.status).toBe(200);
  });
});
```

---

## TDD Tips

1. **Start with service tests** - They're faster to write than API tests and test real business logic
2. **Use unit tests for pure logic** - Validators, formatters, parsers
3. **Test behavior, not implementation** - Focus on what, not how
4. **Keep tests fast** - Use in-memory database
5. **Write descriptive test names** - `it('should return 404 when user not found')`
6. **Refactor only when green** - Never refactor failing tests
7. **If you need mocks, reconsider** - Real services with test database are better

---

## Example TDD Session

### Feature: Delete User

**Step 1: Write failing service test first**

```typescript
// test/integration/service/user_service.test.ts
describe('UserService.delete', () => {
  let service: UserService;

  beforeEach(async () => {
    await resetTestDatabase();
    service = await container.get(UserService);
  });

  it('should delete a user', async () => {
    // Create a user
    const user = await service.create({ email: 'test@example.com' });

    // Delete
    await service.delete(user.id);

    // Verify deletion
    const found = await service.findById(user.id);
    expect(found).toBeNull();
  });

  it('should throw NotFoundError for non-existent user', async () => {
    await expect(service.delete(99999)).rejects.toThrow('User not found');
  });
});
```

**Step 2: Implement service method**

```typescript
async delete(id: number): Promise<void> {
  const user = await this.userRepo.findById(id);
  if (!user) throw new NotFoundError('User not found');
  await this.userRepo.delete(id);
}
```

**Step 3: Add API test**

```typescript
// test/integration/api/users.test.ts
it('should delete a user via API', async () => {
  const createRes = await agent.post('/api/users').send({ email: 'test@example.com' });
  const userId = createRes.body.id;

  const deleteRes = await agent.delete(`/api/users/${userId}`);
  expect(deleteRes.status).toBe(204);

  const getRes = await agent.get(`/api/users/${userId}`);
  expect(getRes.status).toBe(404);
});
```

**Step 4: Refactor**

- Add soft delete support
- Add authorization check
- Improve error messages

---

## Common Patterns

### Testing Validation

```typescript
it('should reject invalid email', async () => {
  const response = await agent
    .post('/api/users')
    .send({ email: 'invalid', password: 'secure123' });

  expect(response.status).toBe(400);
  expect(response.body.message).toContain('email');
});
```

### Testing Authorization

```typescript
it('should require authentication', async () => {
  const response = await agent.get('/api/admin/users');
  expect(response.status).toBe(401);
});
```

### Testing Edge Cases

```typescript
it('should handle empty list', async () => {
  const response = await agent.get('/api/users');
  expect(response.status).toBe(200);
  expect(response.body).toEqual([]);
});
```
