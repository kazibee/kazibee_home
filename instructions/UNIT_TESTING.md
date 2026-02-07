# Unit Testing Guide

Test stateless logic with no side effects. **No database, no mocks.** IoC is fine for services that don't touch the database.

---

## Quick Start

```bash
# Run all unit tests
npm run test -- --testPathPattern=test/unit

# Run a specific test file
npm run test -- test/unit/validators.test.ts

# Run with watch mode
npm run test -- --testPathPattern=test/unit --watch
```

---

## What to Unit Test

### Can Be Unit Tested

- **Pure functions** - Same input always produces same output
- **Validators** - Email validation, password strength, etc.
- **Formatters** - Currency, dates, percentages
- **Parsers** - String parsing, URL parsing
- **Factory functions** - Create domain objects
- **Error classes** - Custom error definitions
- **Math utilities** - Calculations without side effects

### Cannot Be Unit Tested

- **Database operations** - Use service tests instead
- **API calls** - Use service or API tests
- **File I/O** - Use integration tests
- **Services that call the database** - Use service tests
- **Anything needing mocks** - If you need mocks, it's an integration test

**Rule of thumb:** If you need to call `resetTestDatabase()`, it's NOT a unit test. Using `container.get()` is fine for services that don't touch the database.

---

## Test Location

```
test/
  unit/                     # Unit tests go here
    validators.test.ts
    formatters.test.ts
    parsers.test.ts
  integration/              # Integration tests (service + API)
    service/                # Service tests
    *.test.ts               # API tests
```

---

## Basic Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import { validateEmail, formatCurrency } from '../../src/utils';

describe('validateEmail', () => {
  it('should return true for valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('should return false for invalid email', () => {
    expect(validateEmail('not-an-email')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(validateEmail('')).toBe(false);
  });
});

describe('formatCurrency', () => {
  it('should format positive numbers', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('should format zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('should format negative numbers', () => {
    expect(formatCurrency(-99.99)).toBe('-$99.99');
  });
});
```

---

## Test Patterns

### Testing Validators

```typescript
import { describe, it, expect } from 'vitest';
import { validatePassword } from '../../src/validators/password';

describe('validatePassword', () => {
  it('should accept valid password', () => {
    expect(validatePassword('SecurePass123!')).toBe(true);
  });

  it('should reject short passwords', () => {
    expect(validatePassword('short')).toBe(false);
  });

  it('should reject passwords without numbers', () => {
    expect(validatePassword('NoNumbers!')).toBe(false);
  });

  it('should reject passwords without special characters', () => {
    expect(validatePassword('NoSpecial123')).toBe(false);
  });
});
```

### Testing Parsers

```typescript
import { describe, it, expect } from 'vitest';
import { parseQueryString } from '../../src/utils/url';

describe('parseQueryString', () => {
  it('should parse simple query string', () => {
    const result = parseQueryString('?name=john&age=30');
    expect(result).toEqual({ name: 'john', age: '30' });
  });

  it('should handle empty query string', () => {
    expect(parseQueryString('')).toEqual({});
  });

  it('should decode URL-encoded values', () => {
    const result = parseQueryString('?name=john%20doe');
    expect(result).toEqual({ name: 'john doe' });
  });
});
```

### Testing Formatters

```typescript
import { describe, it, expect } from 'vitest';
import { formatDuration, formatFileSize } from '../../src/utils/format';

describe('formatDuration', () => {
  it('should format seconds', () => {
    expect(formatDuration(45)).toBe('45s');
  });

  it('should format minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2m 5s');
  });

  it('should format hours, minutes, and seconds', () => {
    expect(formatDuration(3661)).toBe('1h 1m 1s');
  });
});

describe('formatFileSize', () => {
  it('should format bytes', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('should format kilobytes', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('should format megabytes', () => {
    expect(formatFileSize(1048576)).toBe('1 MB');
  });
});
```

### Testing Factory Functions

```typescript
import { describe, it, expect } from 'vitest';
import { createUser, createAdmin } from '../../src/factories/user';

describe('createUser', () => {
  it('should create user with default role', () => {
    const user = createUser({ id: 1, name: 'John' });
    expect(user.role).toBe('user');
    expect(user.permissions).toEqual(['read']);
  });
});

describe('createAdmin', () => {
  it('should create admin with elevated permissions', () => {
    const admin = createAdmin({ id: 1, name: 'Admin' });
    expect(admin.role).toBe('admin');
    expect(admin.permissions).toContain('write');
    expect(admin.permissions).toContain('delete');
  });
});
```

### Testing Error Classes

```typescript
import { describe, it, expect } from 'vitest';
import { ValidationError, NotFoundError } from '../../src/errors';

describe('ValidationError', () => {
  it('should set message and code', () => {
    const error = new ValidationError('Invalid input');
    expect(error.message).toBe('Invalid input');
    expect(error.code).toBe('VALIDATION_ERROR');
  });

  it('should preserve context', () => {
    const error = new ValidationError('Bad value', { field: 'email' });
    expect(error.context).toEqual({ field: 'email' });
  });
});

describe('NotFoundError', () => {
  it('should set status to 404', () => {
    const error = new NotFoundError('User not found');
    expect(error.status).toBe(404);
  });
});
```

### Testing Pure Async Logic

```typescript
import { describe, it, expect } from 'vitest';
import { retry, delay } from '../../src/utils/async';

describe('delay', () => {
  it('should delay execution', async () => {
    const start = Date.now();
    await delay(100);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(100);
  });
});

describe('retry', () => {
  it('should retry failed operations', async () => {
    let attempts = 0;
    const operation = async () => {
      attempts++;
      if (attempts < 3) throw new Error('Fail');
      return 'success';
    };

    const result = await retry(operation, { maxRetries: 3 });
    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should throw after max retries', async () => {
    const operation = async () => {
      throw new Error('Always fails');
    };

    await expect(retry(operation, { maxRetries: 2 }))
      .rejects.toThrow('Always fails');
  });
});
```

---

## Common Assertions

### Basic

```typescript
expect(value).toBe(expected);           // Strict equality (===)
expect(value).toEqual(expected);        // Deep equality
expect(value).toBeDefined();
expect(value).toBeNull();
expect(value).toBeTruthy();
expect(value).toBeFalsy();
```

### Numbers

```typescript
expect(value).toBeGreaterThan(5);
expect(value).toBeLessThan(10);
expect(value).toBeCloseTo(0.3, 2);      // Within 2 decimal places
```

### Strings

```typescript
expect(text).toContain('substring');
expect(text).toMatch(/pattern/);
expect(text).toHaveLength(10);
```

### Arrays

```typescript
expect(array).toContain(item);
expect(array).toHaveLength(5);
expect(array).toContainEqual({ id: 1 });
```

### Objects

```typescript
expect(obj).toHaveProperty('key');
expect(obj).toHaveProperty('key', 'value');
expect(obj).toMatchObject({ key: 'value' });
```

### Exceptions

```typescript
expect(() => fn()).toThrow();
expect(() => fn()).toThrow('error message');
expect(() => fn()).toThrow(CustomError);

// Async
await expect(asyncFn()).rejects.toThrow();
```

---

## Best Practices

1. **Test one thing per test** - Each test should verify one behavior
2. **Use descriptive names** - `it('should return false for empty string')`
3. **Test edge cases** - Empty inputs, null, negative numbers, etc.
4. **No external dependencies** - If you need mocks, use integration tests
5. **Keep tests fast** - Unit tests should complete instantly
6. **Follow Arrange-Act-Assert pattern:**

```typescript
it('should calculate total correctly', () => {
  // Arrange - set up test data
  const items = [{ price: 10 }, { price: 20 }];

  // Act - call the function
  const total = calculateTotal(items);

  // Assert - verify the result
  expect(total).toBe(30);
});
```

---

## Common Mistakes

### Testing with Database

```typescript
// WRONG - This is a service test, not a unit test
import { resetTestDatabase } from '../helpers/test-db';

beforeEach(async () => {
  await resetTestDatabase();  // Unit tests don't need this
});

it('should load user', async () => {
  const user = await userService.findById(1);  // This is a service test!
});

// RIGHT - Test pure logic only
it('should validate user data', () => {
  expect(validateUser({ email: 'test@example.com' })).toBe(true);
});
```

### Using Mocks

```typescript
// WRONG - If you need mocks, use integration tests
const mockRepo = { findById: vi.fn() };
const service = new UserService(mockRepo);

// RIGHT - Test the logic directly without mocks
const result = formatUserName({ firstName: 'John', lastName: 'Doe' });
expect(result).toBe('John Doe');
```

### Testing Multiple Concepts

```typescript
// WRONG - Testing too many things
it('should work', () => {
  expect(validate('valid')).toBe(true);
  expect(validate('invalid')).toBe(false);
  expect(() => validate(null)).toThrow();
});

// RIGHT - One concept per test
it('should return true for valid input', () => {
  expect(validate('valid')).toBe(true);
});

it('should return false for invalid input', () => {
  expect(validate('invalid')).toBe(false);
});

it('should throw for null input', () => {
  expect(() => validate(null)).toThrow();
});
```
