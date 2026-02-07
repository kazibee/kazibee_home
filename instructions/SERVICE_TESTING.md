# Service Testing Guide

Test services directly via IoC container with a real in-memory database. Location: `test/integration/service/`

---

## Quick Start

### Basic Service Test

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { resetTestDatabase } from '../../helpers/test-db';
import container from '../../../src/server/container';
import UserService from '../../../src/server/services/user_service';

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    await resetTestDatabase();  // Fresh DB for EACH test
    service = await container.get(UserService);
  });

  it('should create a user', async () => {
    const user = await service.create({
      email: 'test@example.com',
      password: 'secure123'
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe('test@example.com');
  });
});
```

---

## Test Location

```
test/
  integration/
    service/                # Service tests go here
      auth_service.test.ts
      user_service.test.ts
      user_repo.test.ts
    api/                    # API tests (see API_TESTING.md)
```

---

## When to Use Service Tests

Use service tests for:
- Business logic in services
- Repository operations (SQL queries)
- Service-to-service interactions
- Data validation and transformations
- Complex workflows

**Don't use service tests for:**
- HTTP status codes (use API tests)
- Request validation (use API tests)
- Authentication middleware (use API tests)

---

## Key Patterns

### Always Reset Database in beforeEach

```typescript
beforeEach(async () => {
  await resetTestDatabase();
  service = await container.get(MyService);
});
```

### Get Services AFTER Reset

```typescript
// WRONG - service references old database
service = await container.get(MyService);
await resetTestDatabase();

// RIGHT - service references fresh database
await resetTestDatabase();
service = await container.get(MyService);
```

### Use Unique Identifiers

```typescript
const email = `test_${Date.now()}_${Math.random()}@example.com`;
```

---

## Running Tests

### Commands

```bash
# Run all tests
npm run test

# Run service tests only
npm run test -- test/integration/service/

# Run a single test file
npm run test -- test/integration/service/auth_service.test.ts

# Watch mode
npm run test:watch
```

---

## Examples

### Testing a Repository

```typescript
// test/integration/service/user_repo.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resetTestDatabase } from '../../helpers/test-db';
import container from '../../../src/server/container';
import UserRepo from '../../../src/server/repo/user_repo';

describe('UserRepo', () => {
  let repo: UserRepo;

  beforeEach(async () => {
    await resetTestDatabase();
    repo = await container.get(UserRepo);
  });

  it('should create and retrieve a user', async () => {
    const result = await repo.create({
      email: 'test@example.com',
      password_hash: 'hashed'
    });

    const user = await repo.findById(result.lastInsertId);

    expect(user).toBeDefined();
    expect(user?.email).toBe('test@example.com');
  });

  it('should return null for non-existent user', async () => {
    const user = await repo.findById(99999);
    expect(user).toBeNull();
  });
});
```

### Testing a Service

```typescript
// test/integration/service/auth_service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resetTestDatabase } from '../../helpers/test-db';
import container from '../../../src/server/container';
import AuthService from '../../../src/server/services/auth_service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    await resetTestDatabase();
    service = await container.get(AuthService);
  });

  it('should register and login a user', async () => {
    const email = `test_${Date.now()}@example.com`;

    await service.register(email, 'password123');
    const token = await service.login(email, 'password123');

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
  });

  it('should reject invalid credentials', async () => {
    const email = `test_${Date.now()}@example.com`;
    await service.register(email, 'correct');

    await expect(service.login(email, 'wrong'))
      .rejects.toThrow('Invalid credentials');
  });
});
```

### Testing Service Interactions

```typescript
// test/integration/service/order_service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resetTestDatabase } from '../../helpers/test-db';
import container from '../../../src/server/container';
import OrderService from '../../../src/server/services/order_service';
import UserService from '../../../src/server/services/user_service';
import ProductService from '../../../src/server/services/product_service';

describe('OrderService', () => {
  let orderService: OrderService;
  let userService: UserService;
  let productService: ProductService;

  beforeEach(async () => {
    await resetTestDatabase();
    orderService = await container.get(OrderService);
    userService = await container.get(UserService);
    productService = await container.get(ProductService);
  });

  it('should create order for user', async () => {
    // Arrange
    const user = await userService.create({ email: 'test@example.com', password: 'pass' });
    const product = await productService.create({ name: 'Widget', price: 9.99 });

    // Act
    const order = await orderService.create({
      userId: user.id,
      items: [{ productId: product.id, quantity: 2 }]
    });

    // Assert
    expect(order.id).toBeDefined();
    expect(order.total).toBe(19.98);
  });
});
```

### Testing Error Cases

```typescript
describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    await resetTestDatabase();
    service = await container.get(UserService);
  });

  it('should throw on duplicate email', async () => {
    const email = `test_${Date.now()}@example.com`;

    await service.create({ email, password: 'pass1' });

    await expect(service.create({ email, password: 'pass2' }))
      .rejects.toThrow('Email already exists');
  });

  it('should throw on invalid email format', async () => {
    await expect(service.create({ email: 'not-an-email', password: 'pass' }))
      .rejects.toThrow('Invalid email');
  });
});
```

---

## Best Practices

1. **Always call `resetTestDatabase()` in `beforeEach`** - Each test needs a fresh database
2. **Get services AFTER reset** - Container needs to reference the new database
3. **Use unique identifiers** - Timestamps + random for emails/usernames
4. **No mocks** - Test real services against real (in-memory) database
5. **Test error cases** - Verify exceptions are thrown correctly
6. **Follow Arrange-Act-Assert pattern:**

```typescript
it('should do something', async () => {
  // Arrange - set up test data
  const user = await userService.create({ ... });

  // Act - perform the action
  const result = await service.doSomething(user.id);

  // Assert - verify the result
  expect(result).toBe(expected);
});
```

---

## Troubleshooting

### Common Issues

**Service references stale database**
- Get services AFTER calling `resetTestDatabase()`, not before

**Database state leaking between tests**
- Ensure `resetTestDatabase()` is in `beforeEach`, not `beforeAll`

**Test data conflicts**
- Use unique identifiers (timestamps + random) for test data

**Migrations not running**
- Verify `proper.json` exists in project root
- Check migrations directory has valid SQL files
