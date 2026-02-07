# API Testing Guide

Test HTTP endpoints using Supertest. Location: `test/integration/api/`

---

## Quick Start

### Basic API Test

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { getTestApp, cleanupTestApp, type TestAppResult } from '../../helpers/test-app';

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

## Test Location

```
test/
  integration/
    api/                    # API tests go here
      auth.test.ts
      users.test.ts
      status.test.ts
    service/                # Service tests (see SERVICE_TESTING.md)
```

---

## When to Use API Tests

Use API tests for:
- HTTP status codes and response formats
- Request validation and error responses
- Authentication and authorization middleware
- Cookie/session handling
- Full request/response cycle

**Don't use API tests for:**
- Business logic (use service tests)
- Database operations (use service tests)
- Service interactions (use service tests)

---

## Database Behavior

### How It Works

- **Migrations run automatically** - No need to run `proper up` manually
- **In-memory SQLite** - Tests use `:memory:` database for speed
- **Foreign keys enabled** - Schema bugs are caught early

### Database Lifecycle

```typescript
beforeAll(async () => {
  const result = await getTestApp();  // Creates fresh DB
  agent = result.agent;
});

// Optional: reset between tests for isolation
beforeEach(async () => {
  await resetTestDatabase();
});

afterAll(async () => {
  await cleanupTestApp();
});
```

---

## Test Structure

### Standard Pattern

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Express } from 'express';
import request from 'supertest';
import { getTestApp, cleanupTestApp, type TestAppResult } from '../../helpers/test-app';

describe('Feature Name', () => {
  let app: Express;
  let agent: ReturnType<typeof request.agent>;
  let database: Database;

  beforeAll(async () => {
    const result: TestAppResult = await getTestApp();
    app = result.app;
    agent = result.agent;
    database = result.database;
  });

  afterAll(async () => {
    await cleanupTestApp();
  });

  describe('GET /api/endpoint', () => {
    it('should return expected data', async () => {
      const response = await agent.get('/api/endpoint');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });
  });
});
```

### What `getTestApp()` Returns

```typescript
interface TestAppResult {
  app: Express;           // Express application instance
  database: Database;     // SQLite database instance
  agent: SuperTestAgent;  // Supertest agent for HTTP requests
}
```

---

## Running Tests

### Commands

```bash
# Run all tests
npm run test

# Run API tests only
npm run test -- test/integration/api/

# Run a single test file
npm run test -- test/integration/api/users.test.ts

# Watch mode
npm run test:watch

# Run tests matching a pattern
npm run test -- --grep "users"
```

---

## Examples

### Testing a GET Endpoint

```typescript
// test/integration/api/users.test.ts
describe('GET /api/users/:id', () => {
  let agent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    const result = await getTestApp();
    agent = result.agent;
  });

  afterAll(async () => {
    await cleanupTestApp();
  });

  it('should return user data', async () => {
    // First create a user via API
    const createRes = await agent.post('/api/users').send({
      email: 'test@example.com',
      password: 'secure123'
    });

    const response = await agent.get(`/api/users/${createRes.body.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: createRes.body.id,
      email: 'test@example.com',
    });
  });

  it('should return 404 for non-existent user', async () => {
    const response = await agent.get('/api/users/99999');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', true);
  });
});
```

### Testing a POST Endpoint

```typescript
describe('POST /api/users', () => {
  let agent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    const result = await getTestApp();
    agent = result.agent;
  });

  afterAll(async () => {
    await cleanupTestApp();
  });

  it('should create a new user', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
    };

    const response = await agent
      .post('/api/users')
      .send(userData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: expect.any(Number),
      name: 'Test User',
      email: 'test@example.com',
    });
  });

  it('should return 400 for invalid data', async () => {
    const response = await agent
      .post('/api/users')
      .send({ name: '' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', true);
    expect(response.body).toHaveProperty('message');
  });
});
```

### Testing Authentication

```typescript
describe('Authentication', () => {
  let agent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    const result = await getTestApp();
    agent = result.agent;
  });

  afterAll(async () => {
    await cleanupTestApp();
  });

  it('should return 401 for unauthorized access', async () => {
    const response = await agent.get('/api/admin/settings');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', true);
  });

  it('should return 403 for forbidden actions', async () => {
    // Authenticate as regular user first
    await agent.post('/api/auth/login').send({
      email: 'user@example.com',
      password: 'password'
    });

    const response = await agent.delete('/api/admin/users/1');

    expect(response.status).toBe(403);
    expect(response.body.error).toBe(true);
  });
});
```

### Testing Error Responses

```typescript
describe('Error Handling', () => {
  let agent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    const result = await getTestApp();
    agent = result.agent;
  });

  afterAll(async () => {
    await cleanupTestApp();
  });

  it('should handle server errors gracefully', async () => {
    const response = await agent.get('/api/broken-endpoint');

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error', true);
    // Should not leak stack traces in production
    expect(response.body).not.toHaveProperty('stack');
  });
});
```

---

## Best Practices

1. **One `getTestApp()` per describe block** - Reuse the app within a suite
2. **Always cleanup with `afterAll`** - Prevents resource leaks
3. **Use Supertest agent** - Maintains cookies across requests
4. **Test HTTP behavior** - Status codes, headers, response body
5. **Keep tests focused** - One assertion concept per test
6. **Use descriptive names** - `it('should return 404 when user not found')`

---

## Troubleshooting

### Common Issues

**Test hangs or times out**
- Ensure `cleanupTestApp()` is called in `afterAll`
- Check for unclosed database connections

**Database state leaking between tests**
- Add `resetTestDatabase()` to `beforeEach` if needed

**Port already in use**
- The test server uses port 0 (random available port)
- If issues persist, check for orphaned processes

**Migrations not running**
- Verify `proper.json` exists in project root
- Check migrations directory has valid SQL files
