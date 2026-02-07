# IoC (Inversion of Control) Container Guide

This guide explains how to use the IoC container for dependency injection in NoEgo projects.

---

## What is IoC?

**Inversion of Control (IoC)** is a design pattern where the control of object creation and dependency management is inverted from the application code to a container. Instead of classes creating their own dependencies, the container creates and injects them.

**Why use IoC?**
- **Loose coupling**: Classes depend on abstractions, not concrete implementations
- **Testability**: Easy to mock dependencies in tests
- **Single Responsibility**: Classes focus on their core logic, not dependency management
- **Lifecycle Management**: Container handles singleton vs transient instances

---

## Quick Start

### 1. Register a Class with `@Component()`

```typescript
import { Component, Inject } from "@noego/ioc";

@Component()
export default class MyService {
  constructor(
    @Inject(MyRepo) private repo: MyRepo
  ) {}

  async getData(): Promise<Data[]> {
    return this.repo.findAll();
  }
}
```

### 2. Inject Dependencies with `@Inject()`

```typescript
import { Component, Inject } from "@noego/ioc";

@Component()
export default class MyController {
  constructor(
    @Inject(MyLogic) private logic: MyLogic
  ) {}
}
```

### 3. Resolve from Container

```typescript
import container from './server/container';
import MyService from './server/services/my_service';

const service = container.resolve(MyService);
const result = await service.getData();
```

---

## Getting the Container

### Import the Pre-configured Container

```typescript
// Most common approach - use the exported container
import container from './server/container';

const myService = container.resolve(MyService);
```

### Get Container from Framework

```typescript
// Alternative approach - get from @noego/app
import { getContainer } from '@noego/app';

const container = getContainer();
const myService = container.resolve(MyService);
```

### When to Use `container.resolve()`

- **Page loaders (.load.ts)**: To get logic instances for SSR data fetching
- **Tests**: To get instances with all dependencies injected
- **Entry points**: When bootstrapping the application
- **Background jobs**: When running tasks outside the request context

---

## Common Patterns

### Controller with Logic Injection

Controllers handle HTTP concerns and delegate to the Logic layer:

```typescript
import { Component, Inject } from "@noego/ioc";
import type { Request, Response } from "express";
import UserLogic from "../logic/user.logic";
import { createActor, GUEST_ACTOR, type Actor } from "../types/actor";
import { ForbiddenError, NotFoundError, ValidationError } from "../errors/domain_errors";
import { getLogger } from "@noego/logger";

const logger = getLogger("kazibee:user-controller");

@Component()
export default class UserController {
  constructor(@Inject(UserLogic) private userLogic: UserLogic) {}

  private buildActor(req: Request & { user?: { id: number; role?: string } }): Actor {
    if (req.user) {
      return createActor(req.user);
    }
    return GUEST_ACTOR;
  }

  private handleError(error: unknown, res: Response): Response {
    if (error instanceof ForbiddenError) {
      return res.status(403).json({ error: true, message: error.message });
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: true, message: error.message });
    }
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: true, message: error.message });
    }
    logger.error("Unexpected error", error);
    return res.status(500).json({ error: true, message: "Internal server error" });
  }

  async getUser({ req, res }: { req: Request; res: Response }) {
    try {
      const actor = this.buildActor(req);
      const userId = parseInt(req.params.id, 10);
      const user = await this.userLogic.getUser(actor, userId);
      return res.json(user);
    } catch (error) {
      return this.handleError(error, res);
    }
  }
}
```

### Logic with Service Injection

Logic handles authorization and business rules:

```typescript
import { Component, Inject } from "@noego/ioc";
import UserService from "../services/user_service";
import type { Actor } from "../types/actor";
import { ForbiddenError, NotFoundError } from "../errors/domain_errors";
import { getLogger } from "@noego/logger";

const logger = getLogger("kazibee:user-logic");

@Component()
export default class UserLogic {
  constructor(@Inject(UserService) private userService: UserService) {}

  async getUser(actor: Actor, userId: number) {
    logger.debug("getUser called", { actorId: actor.id, userId });

    // Authorization: users can only view their own profile unless admin
    if (!actor.isSystem && actor.role !== "admin" && actor.id !== userId) {
      throw new ForbiddenError("You can only view your own profile");
    }

    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    return user;
  }
}
```

### Service with Repository Injection

Services handle data operations:

```typescript
import { Component, Inject } from "@noego/ioc";
import UserRepo from "../repo/user_repo";
import { getLogger } from "@noego/logger";

const logger = getLogger("kazibee:user-service");

@Component()
export default class UserService {
  constructor(@Inject(UserRepo) private userRepo: UserRepo) {}

  async findById(id: number) {
    logger.debug("findById called", { id });
    return this.userRepo.findById(id);
  }

  async findAll() {
    return this.userRepo.findAll();
  }

  async create(data: { name: string; email: string }) {
    return this.userRepo.create(data);
  }
}
```

### Repository (No Injection Needed)

Repositories use `@QueryBinder` for SQL binding:

```typescript
import { Component } from "@noego/ioc";
import { QueryBinder, Query, SqlStackError } from "sqlstack";

@QueryBinder()
@Component()
export default class UserRepo {
  @Query()
  findById(id: number): Promise<{ id: number; name: string; email: string } | null> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  findAll(): Promise<{ id: number; name: string; email: string }[]> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  create(data: { name: string; email: string }): Promise<{ id: number }> {
    throw new SqlStackError("Not implemented");
  }
}
```

### Page Loader with Container

Page loaders fetch data for SSR:

```typescript
// src/ui/pages/users/main.load.ts
import container from '../../server/container';
import UserLogic from '../../server/logic/user.logic';
import { clientLogger } from '$lib/logger';

type RequestData = any;

export default async function load(request: RequestData) {
  try {
    const userLogic = container.resolve(UserLogic);

    // Get actor from authenticated user
    const actor = request.context?.user
      ? { id: request.context.user.id, role: request.context.user.role, isSystem: false }
      : { id: 'system', isSystem: true, role: 'system' as const };

    const users = await userLogic.listUsers(actor);

    return {
      users,
    };
  } catch (error) {
    clientLogger.error('Failed to load users', error);
    return {
      users: [],
      error: "Failed to load users",
    };
  }
}
```

### Testing with Container

Integration tests use `getTestApp()` which sets up the container:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { getTestApp, cleanupTestApp, type TestAppResult } from '../helpers/test-app';

describe('User API', () => {
  let agent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    const result = await getTestApp();
    agent = result.agent;
  });

  afterAll(async () => {
    await cleanupTestApp();
  });

  it('should get user by id', async () => {
    const response = await agent.get('/api/users/1');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', 1);
  });
});
```

---

## Decorator Usage Reference

### `@Component()` - Register a Class

Use `@Component()` on any class that should be managed by the container:

```typescript
import { Component } from "@noego/ioc";

@Component()
export default class MyService {
  // Class implementation
}
```

### `@Inject()` - Inject Dependencies

Use `@Inject(ClassName)` in the constructor to inject dependencies:

```typescript
import { Component, Inject } from "@noego/ioc";
import MyRepo from "../repo/my_repo";

@Component()
export default class MyService {
  constructor(
    @Inject(MyRepo) private repo: MyRepo
  ) {}
}
```

### Multiple Dependencies

```typescript
import { Component, Inject } from "@noego/ioc";
import UserRepo from "../repo/user_repo";
import EmailService from "./email_service";
import CacheService from "./cache_service";

@Component()
export default class UserService {
  constructor(
    @Inject(UserRepo) private userRepo: UserRepo,
    @Inject(EmailService) private emailService: EmailService,
    @Inject(CacheService) private cacheService: CacheService
  ) {}
}
```

---

## Common Mistakes & Troubleshooting

### Mistake 1: Forgetting `@Component()`

**Error**: `Unable to resolve service` or `No provider for X`

**Problem**:
```typescript
// WRONG: Missing @Component()
export default class MyService {
  constructor(@Inject(MyRepo) private repo: MyRepo) {}
}
```

**Solution**:
```typescript
// CORRECT: Add @Component()
@Component()
export default class MyService {
  constructor(@Inject(MyRepo) private repo: MyRepo) {}
}
```

### Mistake 2: Forgetting `@Inject()`

**Error**: `undefined` dependency or `Cannot read property of undefined`

**Problem**:
```typescript
@Component()
export default class MyService {
  // WRONG: Missing @Inject()
  constructor(private repo: MyRepo) {}
}
```

**Solution**:
```typescript
@Component()
export default class MyService {
  // CORRECT: Add @Inject(MyRepo)
  constructor(@Inject(MyRepo) private repo: MyRepo) {}
}
```

### Mistake 3: Circular Dependencies

**Error**: `Circular dependency detected` or stack overflow

**Problem**:
```typescript
// ServiceA depends on ServiceB
@Component()
class ServiceA {
  constructor(@Inject(ServiceB) private b: ServiceB) {}
}

// ServiceB depends on ServiceA - CIRCULAR!
@Component()
class ServiceB {
  constructor(@Inject(ServiceA) private a: ServiceA) {}
}
```

**Solution**: Refactor to break the cycle:
```typescript
// Extract shared logic to a third service
@Component()
class SharedService {
  // Shared functionality
}

@Component()
class ServiceA {
  constructor(@Inject(SharedService) private shared: SharedService) {}
}

@Component()
class ServiceB {
  constructor(@Inject(SharedService) private shared: SharedService) {}
}
```

### Mistake 4: Not Awaiting Async Resolution

**Error**: Promise object instead of actual value

**Problem**:
```typescript
// If your resolved service has async initialization
const service = container.resolve(MyService);
const data = service.getData(); // Returns Promise, not data!
```

**Solution**:
```typescript
const service = container.resolve(MyService);
const data = await service.getData(); // Await the promise
```

### Mistake 5: Missing TypeScript Decorator Config

**Error**: `Decorators are not valid here` or `experimentalDecorators is not set`

**Solution**: Ensure `tsconfig.json` has:
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### Mistake 6: Missing `reflect-metadata` Import

**Error**: `Reflect.metadata is not a function`

**Solution**: Ensure the entry point imports reflect-metadata:
```typescript
// At the very top of src/index.ts
import 'reflect-metadata';
```

---

## Complete Examples

### Full Controller -> Logic -> Service -> Repository Chain

**Controller** (`src/server/controller/product.controller.ts`):
```typescript
import { Component, Inject } from "@noego/ioc";
import type { Request, Response } from "express";
import ProductLogic from "../logic/product.logic";
import { createActor, GUEST_ACTOR, type Actor } from "../types/actor";
import { NotFoundError, ValidationError } from "../errors/domain_errors";
import { getLogger } from "@noego/logger";

const logger = getLogger("kazibee:product-controller");

@Component()
export default class ProductController {
  constructor(@Inject(ProductLogic) private productLogic: ProductLogic) {}

  private buildActor(req: Request): Actor {
    return req.user ? createActor(req.user) : GUEST_ACTOR;
  }

  async listProducts({ req, res }: { req: Request; res: Response }) {
    try {
      const actor = this.buildActor(req);
      const products = await this.productLogic.listProducts(actor);
      return res.json(products);
    } catch (error) {
      logger.error("Failed to list products", error);
      return res.status(500).json({ error: true, message: "Internal server error" });
    }
  }

  async getProduct({ req, res }: { req: Request; res: Response }) {
    try {
      const actor = this.buildActor(req);
      const productId = parseInt(req.params.id, 10);
      const product = await this.productLogic.getProduct(actor, productId);
      return res.json(product);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: true, message: error.message });
      }
      logger.error("Failed to get product", error);
      return res.status(500).json({ error: true, message: "Internal server error" });
    }
  }

  async createProduct({ req, res }: { req: Request; res: Response }) {
    try {
      const actor = this.buildActor(req);
      const product = await this.productLogic.createProduct(actor, req.body);
      return res.status(201).json(product);
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({ error: true, message: error.message });
      }
      logger.error("Failed to create product", error);
      return res.status(500).json({ error: true, message: "Internal server error" });
    }
  }
}
```

**Logic** (`src/server/logic/product.logic.ts`):
```typescript
import { Component, Inject } from "@noego/ioc";
import ProductService from "../services/product_service";
import type { Actor } from "../types/actor";
import { ForbiddenError, NotFoundError, ValidationError } from "../errors/domain_errors";
import { getLogger } from "@noego/logger";

const logger = getLogger("kazibee:product-logic");

@Component()
export default class ProductLogic {
  constructor(@Inject(ProductService) private productService: ProductService) {}

  async listProducts(actor: Actor) {
    logger.debug("listProducts called", { actorId: actor.id });
    return this.productService.findAll();
  }

  async getProduct(actor: Actor, productId: number) {
    logger.debug("getProduct called", { actorId: actor.id, productId });

    const product = await this.productService.findById(productId);
    if (!product) {
      throw new NotFoundError("Product not found");
    }

    return product;
  }

  async createProduct(actor: Actor, data: { name: string; price: number }) {
    logger.debug("createProduct called", { actorId: actor.id, name: data.name });

    // Authorization: only authenticated users can create products
    if (actor.isGuest) {
      throw new ForbiddenError("Authentication required");
    }

    // Validation
    if (!data.name || data.name.length < 3) {
      throw new ValidationError("Product name must be at least 3 characters");
    }
    if (!data.price || data.price <= 0) {
      throw new ValidationError("Price must be greater than 0");
    }

    return this.productService.create(data);
  }
}
```

**Service** (`src/server/services/product_service.ts`):
```typescript
import { Component, Inject } from "@noego/ioc";
import ProductRepo from "../repo/product_repo";
import { getLogger } from "@noego/logger";

const logger = getLogger("kazibee:product-service");

@Component()
export default class ProductService {
  constructor(@Inject(ProductRepo) private productRepo: ProductRepo) {}

  async findAll() {
    logger.debug("findAll called");
    return this.productRepo.findAll();
  }

  async findById(id: number) {
    logger.debug("findById called", { id });
    return this.productRepo.findById(id);
  }

  async create(data: { name: string; price: number }) {
    logger.debug("create called", { name: data.name });
    return this.productRepo.create(data);
  }
}
```

**Repository** (`src/server/repo/product_repo/index.ts`):
```typescript
import { Component } from "@noego/ioc";
import { QueryBinder, Query, SqlStackError } from "sqlstack";

@QueryBinder()
@Component()
export default class ProductRepo {
  @Query()
  findAll(): Promise<{ id: number; name: string; price: number }[]> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  findById(id: number): Promise<{ id: number; name: string; price: number } | null> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  create(data: { name: string; price: number }): Promise<{ id: number }> {
    throw new SqlStackError("Not implemented");
  }
}
```

---

## Architecture Layers

The IoC container supports the following layer architecture:

```
Request → Controller → Logic → Service → Repository → Database
              ↑            ↑         ↑            ↑
          @Component   @Component  @Component  @Component
              +            +          +           +
          @Inject      @Inject     @Inject    @QueryBinder
```

| Layer | Responsibility | Injects |
|-------|----------------|---------|
| **Controller** | HTTP request/response, error mapping | Logic |
| **Logic** | Authorization, business rules, orchestration | Service |
| **Service** | Data operations, external integrations | Repository |
| **Repository** | SQL queries, data access | (none - uses @QueryBinder) |

---

## Tips

1. **Always use `default export`** for classes registered with `@Component()`
2. **Keep dependencies minimal** - if a class has many dependencies, consider splitting it
3. **Use constructor injection** - avoid property injection for better testability
4. **Name files consistently** - e.g., `user.logic.ts`, `user_service.ts`, `user_repo/index.ts`
5. **Check your imports** - ensure you import from the correct module paths
