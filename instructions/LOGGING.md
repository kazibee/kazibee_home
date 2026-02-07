# Logging Guide

Comprehensive logging documentation for NoEgo applications.

---

## Quick Start

### NEVER use console.log - use the logger

```typescript
// BAD - Never do this
console.log("Something happened");

// GOOD - Always use the logger
import { getLogger } from "@noego/logger";
const logger = getLogger("kazibee:my-service");
logger.info("Something happened");
```

### How to Import

```typescript
import { getLogger } from "@noego/logger";
```

### Basic Usage

```typescript
const logger = getLogger("kazibee:my-service");

logger.info("User created", { userId: 123 });
logger.error("Failed to save", error);
```

---

## Backend Logging Patterns

### In Controllers

```typescript
import { Component, Inject } from "@noego/ioc";
import type { Request, Response } from "express";
import { getLogger } from "@noego/logger";

const logger = getLogger("kazibee:user-controller");

@Component()
export default class UserController {
  constructor(@Inject(UserLogic) private userLogic: UserLogic) {}

  async getUser({ req, res }: { req: Request; res: Response }) {
    const userId = parseInt(req.params.id, 10);
    logger.debug("getUser called", { userId });

    try {
      const user = await this.userLogic.getUser(userId);
      logger.info("User retrieved successfully", { userId });
      return res.json(user);
    } catch (error) {
      logger.error("Failed to get user", { userId, error });
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}
```

### In Services

```typescript
import { Component, Inject } from "@noego/ioc";
import { getLogger } from "@noego/logger";

const logger = getLogger("kazibee:user-service");

@Component()
export default class UserService {
  constructor(@Inject(UserRepo) private userRepo: UserRepo) {}

  async findById(id: number) {
    logger.debug("findById called", { id });
    const user = await this.userRepo.findById(id);

    if (!user) {
      logger.warn("User not found", { id });
    }

    return user;
  }

  async create(data: { name: string; email: string }) {
    logger.info("Creating new user", { email: data.email });
    const result = await this.userRepo.create(data);
    logger.info("User created", { userId: result.id, email: data.email });
    return result;
  }
}
```

### In Logic Layer

```typescript
import { Component, Inject } from "@noego/ioc";
import { getLogger } from "@noego/logger";
import { ForbiddenError, NotFoundError } from "../errors/domain_errors";

const logger = getLogger("kazibee:user-logic");

@Component()
export default class UserLogic {
  constructor(@Inject(UserService) private userService: UserService) {}

  async getUser(actor: Actor, userId: number) {
    logger.debug("getUser called", { actorId: actor.id, userId });

    // Authorization check
    if (!actor.isSystem && actor.role !== "admin" && actor.id !== userId) {
      logger.warn("Unauthorized access attempt", {
        actorId: actor.id,
        targetUserId: userId,
        actorRole: actor.role
      });
      throw new ForbiddenError("You can only view your own profile");
    }

    const user = await this.userService.findById(userId);
    if (!user) {
      logger.info("User not found", { userId });
      throw new NotFoundError("User not found");
    }

    logger.debug("User retrieved", { userId, userName: user.name });
    return user;
  }
}
```

---

## Frontend Logging

### In Svelte Components

```typescript
<script lang="ts">
  import { clientLogger } from '$lib/logger';
  import { onMount } from 'svelte';

  onMount(() => {
    clientLogger.info("Dashboard component mounted");
  });

  async function handleSubmit() {
    clientLogger.debug("Form submitted", { formData: data });

    try {
      await api.submit(data);
      clientLogger.info("Form submitted successfully");
    } catch (error) {
      clientLogger.error("Form submission failed", error);
    }
  }
</script>
```

### In Page Loaders

```typescript
// src/ui/pages/dashboard/main.load.ts
import container from '../../server/container';
import DashboardLogic from '../../server/logic/dashboard.logic';
import { clientLogger } from '$lib/logger';

type RequestData = any;

export default async function load(request: RequestData) {
  clientLogger.debug("Dashboard loader called");

  try {
    const dashboardLogic = container.resolve(DashboardLogic);
    const data = await dashboardLogic.getDashboardData();

    clientLogger.info("Dashboard data loaded", {
      itemCount: data.items.length
    });

    return { data };
  } catch (error) {
    clientLogger.error("Failed to load dashboard", error);
    return {
      data: null,
      error: "Failed to load dashboard"
    };
  }
}
```

### The clientLogger

The `clientLogger` is pre-configured in `src/ui/lib/logger.ts`:

```typescript
import { getLogger } from '@noego/logger';

export const clientLogger = getLogger('kazibee:ui');
```

---

## Log Levels

NoEgo's logger supports standard log levels in order of severity:

| Level | Method | Use Case |
|-------|--------|----------|
| TRACE | `logger.trace()` | Very detailed debug information (function entry/exit, loop iterations) |
| DEBUG | `logger.debug()` | Debug information (variable values, flow control) |
| INFO | `logger.info()` | General information (successful operations, state changes) |
| WARN | `logger.warn()` | Warnings (deprecated usage, recoverable errors) |
| ERROR | `logger.error()` | Errors (failed operations, exceptions) |
| FATAL | `logger.fatal()` | Critical errors (unrecoverable, application crash) |

### Examples

```typescript
import { getLogger } from "@noego/logger";
const logger = getLogger("kazibee:example");

// TRACE - Very detailed, typically disabled in production
logger.trace("Entering function processItem", { itemId: 123 });

// DEBUG - Useful for development
logger.debug("Processing item", { item: { id: 123, name: "Test" } });

// INFO - Normal operations
logger.info("User logged in", { userId: 456 });

// WARN - Something unexpected but handled
logger.warn("API rate limit approaching", { currentUsage: 950, limit: 1000 });

// ERROR - Something went wrong
logger.error("Failed to process payment", { orderId: 789, error: err });

// FATAL - Application cannot continue
logger.fatal("Database connection lost", { attempts: 3 });
```

---

## Structured Logging

Always log with context using the second parameter:

```typescript
// BAD - String concatenation
logger.info("User " + userId + " created order " + orderId);

// GOOD - Structured context
logger.info("User created order", {
  userId: user.id,
  email: user.email,
  orderId: order.id,
  amount: order.total,
  timestamp: new Date()
});
```

### Complex Objects

```typescript
// Log nested data
logger.info("Order processed", {
  order: {
    id: order.id,
    status: order.status,
    items: order.items.length
  },
  customer: {
    id: customer.id,
    tier: customer.tier
  }
});
```

### Arrays and Collections

```typescript
// Summarize collections, don't log entire arrays
logger.info("Batch processing complete", {
  processedCount: items.length,
  successCount: results.filter(r => r.success).length,
  failedIds: results.filter(r => !r.success).map(r => r.id)
});
```

---

## Common Patterns

### Logging in Controllers

```typescript
import { getLogger } from "@noego/logger";
const logger = getLogger("kazibee:user-controller");

@Component()
export default class UserController {
  async createUser({ req, res }: { req: Request; res: Response }) {
    const requestId = req.headers["x-request-id"];

    logger.info("Creating user", {
      requestId,
      email: req.body.email
    });

    try {
      const user = await this.userLogic.create(req.body);

      logger.info("User created successfully", {
        requestId,
        userId: user.id
      });

      return res.status(201).json(user);
    } catch (error) {
      logger.error("Failed to create user", {
        requestId,
        email: req.body.email,
        error
      });

      return res.status(500).json({ error: "Internal server error" });
    }
  }
}
```

### Logging Errors with Stack Traces

```typescript
try {
  await riskyOperation();
} catch (error) {
  // Log the full error object - logger will extract stack trace
  logger.error("Operation failed", error);

  // Or with additional context
  logger.error("Operation failed", {
    operation: "riskyOperation",
    userId: userId,
    error: error  // Include error in context object
  });
}
```

### Performance Logging

```typescript
async function expensiveOperation() {
  const startTime = performance.now();

  logger.debug("Starting expensive operation");

  try {
    const result = await doWork();

    const duration = performance.now() - startTime;
    logger.info("Expensive operation completed", {
      durationMs: Math.round(duration),
      resultCount: result.length
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error("Expensive operation failed", {
      durationMs: Math.round(duration),
      error
    });
    throw error;
  }
}
```

### Request/Response Logging

```typescript
async function callExternalApi(endpoint: string, payload: object) {
  const requestId = crypto.randomUUID();

  logger.debug("Calling external API", {
    requestId,
    endpoint,
    payloadKeys: Object.keys(payload)
  });

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    logger.info("External API response", {
      requestId,
      status: response.status,
      ok: response.ok
    });

    return response;
  } catch (error) {
    logger.error("External API call failed", {
      requestId,
      endpoint,
      error
    });
    throw error;
  }
}
```

### Background Job Logging

```typescript
import { getLogger } from "@noego/logger";
const logger = getLogger("kazibee:jobs:cleanup");

export async function cleanupJob() {
  logger.info("Starting cleanup job");

  const stats = {
    processed: 0,
    deleted: 0,
    errors: 0
  };

  for (const item of items) {
    try {
      if (shouldDelete(item)) {
        await deleteItem(item);
        stats.deleted++;
      }
      stats.processed++;
    } catch (error) {
      stats.errors++;
      logger.warn("Failed to process item", {
        itemId: item.id,
        error
      });
    }
  }

  logger.info("Cleanup job completed", stats);
}
```

---

## Configuration

### LOG_LEVEL Environment Variable

Set the minimum log level using the `LOG_LEVEL` environment variable:

```bash
# .env
LOG_LEVEL=debug    # Development - show debug and above
LOG_LEVEL=info     # Production - show info and above
LOG_LEVEL=warn     # Minimal - show warnings and errors only
```

### Valid Values

- `trace` - All logs
- `debug` - Debug and above (default in development)
- `info` - Info and above (default in production)
- `warn` - Warn and above
- `error` - Error and fatal only
- `fatal` - Fatal only

### Service Name Convention

Use hierarchical naming with colons:

```typescript
// Pattern: project:layer:component
getLogger("kazibee:controller:user")
getLogger("kazibee:service:payment")
getLogger("kazibee:repo:order")
getLogger("kazibee:jobs:cleanup")
getLogger("kazibee:ui")  // Frontend
```

---

## Anti-Patterns

### Never Use console.log

```typescript
// BAD
console.log("User created:", userId);
console.error("Error:", error);
console.debug("Debug info");

// GOOD
logger.info("User created", { userId });
logger.error("Error occurred", error);
logger.debug("Debug info", { data });
```

### Never Log Sensitive Data

```typescript
// BAD - Logging passwords, tokens, secrets
logger.info("User login", {
  email,
  password,        // NEVER log passwords
  sessionToken,    // NEVER log tokens
  apiKey          // NEVER log API keys
});

// GOOD - Log safe identifiers only
logger.info("User login", {
  email,
  hasPassword: !!password,
  tokenPrefix: sessionToken?.slice(0, 4)
});
```

### Never Log in Tight Loops

```typescript
// BAD - Logging every iteration
for (const item of thousandsOfItems) {
  logger.debug("Processing item", { id: item.id });
  process(item);
}

// GOOD - Log summary
logger.debug("Starting batch processing", { count: items.length });
for (const item of thousandsOfItems) {
  process(item);
}
logger.debug("Batch processing complete", { count: items.length });

// GOOD - Sample logging for large batches
for (let i = 0; i < items.length; i++) {
  if (i % 1000 === 0) {
    logger.debug("Processing progress", {
      current: i,
      total: items.length
    });
  }
  process(items[i]);
}
```

### Never Log Large Objects

```typescript
// BAD - Logging entire request/response bodies
logger.debug("API response", { body: largeResponseBody });

// GOOD - Log relevant fields only
logger.debug("API response", {
  status: response.status,
  itemCount: body.items?.length,
  hasNextPage: body.pagination?.hasNext
});
```

### Never Catch and Swallow Errors Silently

```typescript
// BAD - Silent failure
try {
  await operation();
} catch (error) {
  // Nothing logged!
}

// GOOD - Log and handle
try {
  await operation();
} catch (error) {
  logger.error("Operation failed", error);
  // Handle appropriately: rethrow, return error, etc.
  throw error;
}
```

---

## Best Practices Summary

1. **Always use the logger** - Never use `console.log`
2. **Use structured context** - Pass objects, not concatenated strings
3. **Choose appropriate levels** - Use debug for development, info for production
4. **Include identifiers** - Add userId, orderId, requestId for traceability
5. **Log at boundaries** - Entry/exit of services, API calls, database operations
6. **Protect sensitive data** - Never log passwords, tokens, or secrets
7. **Summarize collections** - Log counts, not entire arrays
8. **Handle errors properly** - Always log errors before handling them
9. **Use consistent naming** - Follow the `project:layer:component` pattern
10. **Performance matters** - Avoid logging in tight loops
