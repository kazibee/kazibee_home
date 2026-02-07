# NoEgo Framework Expert Guide

**Purpose**: Complete technical reference for experts navigating and building with the NoEgo framework.

---

## Table of Contents

1. [Framework Overview](#framework-overview)
2. [Configuration System](#configuration-system)
3. [Project Architecture](#project-architecture)
4. [Backend Development](#backend-development)
5. [Frontend Development](#frontend-development)
6. [Testing Strategy](#testing-strategy)
7. [Development Workflow](#development-workflow)
8. [Build & Deployment](#build--deployment)
9. [Best Practices](#best-practices)

---

## Framework Overview

### What is NoEgo?

NoEgo is a full-stack TypeScript framework built on the **no ego** ecosystem that combines:
- **@noego/app**: Application bootstrapping and configuration
- **@noego/dinner**: Server-side routing and OpenAPI integration
- **@noego/forge**: Frontend SSR/CSR framework with Svelte 5
- **@noego/ioc**: Dependency injection container
- **sqlstack**: SQL-first database layer with co-located queries

### Core Philosophy

1. **Configuration over Convention**: Explicit `noego.config.yml` controls all build behavior
2. **OpenAPI-First**: Routes defined in YAML, auto-mapped to controllers and views
3. **SQL Co-location**: SQL queries live next to repository methods
4. **Type Safety**: Full TypeScript support with `verbatimModuleSyntax`
5. **SSR/CSR Flexibility**: Same code works in both server and client rendering modes

---

## Configuration System

### noego.config.yml Structure

```yaml
root: .                    # Project root directory

mode: production          # Build mode: development | production
outDir: dist             # Output directory for compiled assets

app:
  boot: index.ts         # Application entry point
  watch:                 # Files that trigger full app restart
    - index.ts
    - noego.config.yml

server:
  main: server/server.ts           # Server bootstrap file
  controllers: server/controller   # Controller directory
  middleware: middleware           # Middleware directory
  openapi: server/stitch.yaml      # Server OpenAPI stitching config
  watch:                           # Files that trigger server rebuild
    - server/**/*.ts
    - middleware/**/*.ts
    - server/stitch.yaml
    - server/openapi/**/*.yaml
    - server/repo/**/*.sql

client:
  main: ui/frontend.ts             # Client entry point
  shell: ui/index.html             # HTML shell template
  openapi: ui/stitch.yaml          # Client OpenAPI stitching config
  componentDir: ui                 # Base directory for Svelte components
  watch:                           # Files that trigger client rebuild
    - ui/frontend.ts
    - ui/stitch.yaml
    - ui/openapi/**/*.yaml
  exclude:                         # Exclude from client bundle
    - server/**
    - middleware/**

assets:                            # Static assets to copy to dist/
  - ui/resources/**
  - ui/styles/**
  - server/repo/**/*.sql

dev:
  watch: false                     # Enable/disable file watching
  splitServe: true                 # Run frontend/backend on separate ports
  port: 3000                       # Frontend dev server port
  backendPort: 3001               # Backend API port
```

### Key Configuration Concepts

**Split Serve Mode** (`splitServe: true`):
- Frontend: `http://localhost:3000` (Vite dev server)
- Backend: `http://localhost:3001` (Express API)
- Enables fast HMR for frontend development
- Production mode serves everything on single port

**Watch Patterns**:
- `app.watch`: Changes trigger full application restart
- `server.watch`: Changes rebuild server bundle
- `client.watch`: Changes rebuild client bundle

**Asset Handling**:
- Listed in `assets` array are copied to `dist/` during build
- `.sql` files included for runtime query loading
- Images/CSS served via configured routes in `server.ts`

---

## Project Architecture

### Directory Structure

```
project/
├── noego.config.yml          # Framework configuration
├── index.ts                   # Application boot (exports default function)
├── package.json
├── migrations/               # Database migrations
│   ├── {timestamp}_{name}.up.sql
│   └── {timestamp}_{name}.down.sql
├── middleware/               # Express middleware
│   └── auth/
│       ├── cookie.ts         # Exported as default
│       └── admin.ts
├── server/                   # Backend code
│   ├── server.ts             # Server bootstrap (exports default function)
│   ├── container.ts          # IoC container singleton
│   ├── stitch.yaml           # Backend OpenAPI stitching config
│   ├── openapi/              # Backend API route definitions
│   │   ├── base.yaml
│   │   └── admin/
│   │       ├── admin.yaml
│   │       └── components.yaml
│   ├── controller/           # API controllers (HTTP adapters)
│   │   └── admin.controller.ts
│   ├── logic/                # Business logic layer (domain brain)
│   │   └── admin.logic.ts
│   ├── services/             # Technical orchestration (trusted workers)
│   │   └── admin_service.ts
│   ├── types/                # Shared types and interfaces
│   │   └── actor.ts
│   ├── errors/               # Domain error classes
│   │   └── domain_errors.ts
│   └── repo/                 # Database repositories
│       └── admin_repo/
│           ├── index.ts      # Repository class
│           ├── findAdminByEmail.sql
│           └── createAdmin.sql
└── ui/                       # Frontend code
    ├── frontend.ts           # Client entry point
    ├── index.html            # HTML shell
    ├── stitch.yaml           # Frontend OpenAPI stitching config
    ├── openapi/              # Frontend route definitions
    │   ├── base.yaml
    │   └── admin/
    │       └── admin.yaml
    ├── pages/                # Page components
    │   └── admin/
    │       └── main.svelte
    ├── layout/               # Layout wrappers
    │   └── admin_layout.svelte
    ├── component/            # Reusable components
    └── resources/            # Static assets
        ├── images/
        └── tailwind/
```

### File Naming Conventions

- **Controllers**: `{feature}.controller.ts` (e.g., `admin.controller.ts`)
- **Logic**: `{feature}.logic.ts` (e.g., `admin.logic.ts`)
- **Services**: `{feature}_service.ts` (e.g., `admin_service.ts`)
- **Repositories**: `{feature}_repo/index.ts` with co-located `.sql` files
- **Middleware**: `{feature}.ts` or `{category}/{feature}.ts`
- **OpenAPI**: `{feature}.yaml` + `components.yaml` (schemas)
- **Migrations**: `{timestamp}_{description}.{up|down}.sql`

---

## Backend Development

### Architectural Overview

The backend uses a **4-layer architecture** with strict unidirectional data flow:

```
HTTP Request
     │
     ▼
┌─────────────────────────────────────────────┐
│  Controller (HTTP Adapter)                  │
│  - Extract request data, create Actor       │
│  - Call Logic, map errors to HTTP status    │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  Logic (Domain Brain)                       │
│  - Authorization checks                     │
│  - Business rule validation                 │
│  - Throw domain errors                      │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  Service (Trusted Worker)                   │
│  - Data operations (NO authorization)       │
│  - Technical orchestration                  │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  Repository (Data Persistence)              │
│  - SQL queries via sqlstack                 │
└─────────────────────────────────────────────┘
```

**Key Principles**:
- Controllers inject **Logic** (never Service directly)
- Logic receives **Actor** as first parameter for authorization
- Services trust that Logic has already authorized
- Each layer has single responsibility

### 1. OpenAPI Route Definition (with JSON Schema Validation)

**Location**: `server/openapi/{feature}/{feature}.yaml`

**Pattern**:
```yaml
module:
  admin:
    basePath: '/api/admin'
    paths:
      '/':
        post:
          x-controller: admin.controller    # Maps to server/controller/admin.controller.ts
          x-action: createAdmin             # Calls 'createAdmin' method
          summary: 'Create a new admin'
          requestBody:
            required: true
            content:
              application/json:
                schema:
                  $ref: '#/components/schemas/CreateAdminRequest'
          responses:
            '201':
              description: 'Admin created'
              content:
                application/json:
                  schema:
                    $ref: '#/components/schemas/CreateAdminResponse'
            '400':
              description: 'Validation error'
```

**JSON Schema Validation** (`server/openapi/{feature}/components.yaml`):
```yaml
components:
  schemas:
    CreateAdminRequest:
      type: object
      required:
        - email
        - password
      properties:
        email:
          type: string
          format: email
          minLength: 5
          maxLength: 255
        password:
          type: string
          minLength: 6
          maxLength: 100
      additionalProperties: false

    CreateAdminResponse:
      type: object
      properties:
        id:
          type: integer
          minimum: 1
```

**How Validation Works**:
1. **Automatic Validation**: Framework validates `req.body` against the schema before calling your controller
2. **Invalid Requests**: Automatically return `400` with validation errors
3. **Valid Requests**: Controller receives validated data - no manual validation needed
4. **Type Safety**: Schemas define the contract for request/response bodies

**Validation Features**:
- `required`: Fields that must be present
- `type`: Data type (string, number, integer, boolean, object, array)
- `format`: Special formats (email, date, uuid, uri, etc.)
- `minLength`/`maxLength`: String length constraints
- `minimum`/`maximum`: Number range constraints
- `pattern`: Regular expression validation
- `enum`: Allowed values only
- `additionalProperties: false`: Reject extra fields

**Route Middleware**:
```yaml
get:
  x-controller: admin.controller
  x-action: listAdmins
  x-middleware:
    - auth.admin:is_admin    # Resolves to middleware/auth/admin.ts
```

**Regex in Paths** (CRITICAL):

Use **colon syntax** to add regex constraints to path parameters:

```yaml
# Format: {paramName:regexPattern}
'/{id:\d+}'           # Matches only digits (e.g., /123)
'/{slug:[a-z-]+}'     # Matches lowercase + hyphens (e.g., /my-post)
'/{file:.*}'          # Matches anything (e.g., /path/to/file.txt)
```

| Syntax | Converts To | Matches |
|--------|-------------|---------|
| `{id}` | `:id` | Any value |
| `{id:\d+}` | `:id(\d+)` | Digits only |
| `{id?}` | `:id?` | Optional param |

**Common Mistake**: `{id(\d+)}` does NOT work - use `{id:\d+}` instead

### 2. Controller Layer (HTTP Adapter)

**Location**: `server/controller/{feature}.controller.ts`

The Controller is a thin HTTP adapter that translates between the HTTP protocol and the domain.

**Pattern**:
```typescript
import { Component, Inject } from "@noego/ioc";
import type { Actor } from "../types/actor";
import { createActor } from "../types/actor";
import TasksLogic from "../logic/tasks.logic";
import { NotFoundError, ConflictError, ForbiddenError, ValidationError } from "../errors/domain_errors";

@Component()
export default class TasksController {
  constructor(@Inject(TasksLogic) private logic: TasksLogic) {}

  async claim({ req, res }: any) {
    try {
      // 1. Create Actor from authenticated request
      const actor: Actor = createActor(Number(req.user?.id || 0), req.user?.role || "user");

      // 2. Extract and validate request parameters
      const taskId = Number(req.params?.id);
      if (!Number.isFinite(taskId)) {
        throw new ValidationError("Invalid task id");
      }

      // 3. Call Logic layer (all business logic lives there)
      const result = await this.logic.claim(actor, taskId);

      // 4. Return success response
      res?.status?.(200);
      return result;
    } catch (error) {
      // 5. Map domain errors to HTTP status codes
      if (error instanceof ValidationError) {
        res?.status?.(400);
        return { error: error.message };
      }
      if (error instanceof NotFoundError) {
        res?.status?.(404);
        return { error: error.message };
      }
      if (error instanceof ForbiddenError) {
        res?.status?.(403);
        return { error: error.message };
      }
      if (error instanceof ConflictError) {
        res?.status?.(409);
        return { error: error.message };
      }
      throw error; // Let global handler manage 500s
    }
  }
}
```

**Rules**:
- Must be **default export**
- Use `@Component()` decorator
- **Inject Logic** (not Service) via constructor
- Create `Actor` from `req.user` for every request
- Methods receive `{ req, res }` object
- Set status via `res?.status?.(code)`
- Catch domain errors and map to HTTP status codes
- Return JSON-serializable objects

**Controller Responsibilities**:
- ✅ Extract and normalize request data (params, body, query)
- ✅ Create Actor context from authenticated user
- ✅ Call Logic layer methods
- ✅ Map domain errors to HTTP status codes
- ❌ **NO** business logic
- ❌ **NO** authorization decisions
- ❌ **NO** direct database access

### 3. Logic Layer (Domain Brain)

**Location**: `server/logic/{feature}.logic.ts`

The Logic layer is the "brain" of the application. It enforces all business rules, performs authorization, and decides whether operations are permitted.

**Pattern**:
```typescript
import { Component, Inject } from "@noego/ioc";
import { transaction } from "./transaction";
import type { Actor } from "../types/actor";
import TasksService from "../services/tasks_service";
import AuthorizationService, { Resource } from "../services/authorization_service";
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from "../errors/domain_errors";

@Component()
export default class TasksLogic {
  constructor(
    @Inject(TasksService) private tasks: TasksService,
    @Inject(AuthorizationService) private authorizationService: AuthorizationService
  ) {}

  @transaction
  async claim(actor: Actor, taskId: number): Promise<any> {
    // 1. Fetch the resource
    const task = await this.tasks.getById(taskId);
    if (!task) {
      throw new NotFoundError("Task not found");
    }

    // 2. Authorization check - does actor have access?
    await this.authorizationService.assertAccess(actor, Resource.Task, taskId);

    // 3. Business rule validation
    const claimed = await this.tasks.markInProgress(taskId);
    if (!claimed) {
      throw new ConflictError("Task already claimed");
    }

    // 4. Execute the operation via Service
    // ... additional business logic ...

    return { status: "claimed", taskId };
  }
}
```

**Logic Layer Responsibilities**:
- ✅ **Authorization**: Validate actor has permission for the operation
- ✅ **Business Rules**: Enforce domain invariants and state transitions
- ✅ **Validation**: Perform business-logic validation (uniqueness, cross-field, state-dependent)
- ✅ **Throw Domain Errors**: Signal failures with descriptive errors (`NotFoundError`, `ForbiddenError`, `ConflictError`, `ValidationError`)
- ✅ **Transaction Boundaries**: Use `@transaction` decorator for atomic operations
- ✅ **Service Integration**: Call Services to execute technical operations
- ❌ **NO** HTTP concerns (status codes, headers)
- ❌ **NO** request/response handling

**Actor Parameter**:
Every Logic method that operates on user data accepts `Actor` as its first parameter:
```typescript
async claim(actor: Actor, taskId: number): Promise<any>
async submitResult(actor: Actor, taskId: number, payload: SubmitPayload): Promise<Result>
async getTaskStatus(actor: Actor, taskId: number): Promise<TaskStatus>
```

**Domain Errors**:
The Logic layer throws domain errors that Controllers map to HTTP status codes:

| Domain Error | HTTP Status | When to Use |
|:-------------|:------------|:------------|
| `NotFoundError` | 404 | Resource does not exist |
| `ForbiddenError` | 403 | User lacks permission for this resource |
| `ConflictError` | 409 | Request conflicts with current state (e.g., duplicate, already in use) |
| `ValidationError` | 400 | Request data fails business validation |
| `UnauthorizedError` | 401 | No valid authentication (usually handled by middleware) |

**Domain Error Classes** (`server/errors/domain_errors.ts`):
```typescript
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string = "Resource not found") {
    super(message);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message: string = "Access denied") {
    super(message);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}
```

### 4. Service Layer (Trusted Worker)

**Location**: `server/services/{feature}_service.ts`

The Service layer is a "trusted worker" that executes technical workflows. It operates under the guarantee that the Logic layer has already authorized and validated the request.

**Pattern**:
```typescript
import { Component, Inject } from "@noego/ioc";
import { transaction } from "../logic/transaction";
import TasksRepo, { type TaskRow } from "../repo/tasks_repo";

@Component()
export default class TasksService {
  constructor(@Inject(TasksRepo) private tasksRepo: TasksRepo) {}

  async getById(taskId: number): Promise<TaskRow | null> {
    return this.tasksRepo.findById(taskId);
  }

  async markInProgress(taskId: number): Promise<boolean> {
    const result = await this.tasksRepo.markInProgress({ id: taskId });
    const affected = Number((result as any)?.rowsAffected ?? 0);
    return Number.isFinite(affected) && affected > 0;
  }

  async markCompleted(taskId: number): Promise<void> {
    await this.tasksRepo.markCompleted({ id: taskId });
  }

  @transaction
  async createTask(params: CreateTaskParams): Promise<number> {
    const result = await this.tasksRepo.createTask({
      title: params.title,
      body: params.body,
      // ... other fields
    });
    return Number((result as any)?.lastInsertId ?? 0);
  }
}
```

**Service Layer Responsibilities**:
- ✅ **Data Operations**: Execute repository calls
- ✅ **Technical Orchestration**: Coordinate multiple repository operations
- ✅ **Data Transformation**: Transform data between layers
- ✅ **External Integrations**: Call external APIs (after Logic has authorized)
- ❌ **NO** authorization (Logic already did this)
- ❌ **NO** business rule validation (Logic already did this)
- ❌ **NO** domain error throwing for authorization failures

**Why Service Has No Authorization**:
The Service is called AFTER Logic has verified permissions. This keeps authorization in one place (Logic) and makes Services simpler and more testable.

### 5. Actor Context

**Location**: `server/types/actor.ts`

The Actor represents the authenticated user making a request. All Logic layer methods accept an Actor as their first parameter to enable authorization decisions.

**Actor Interface**:
```typescript
// server/types/actor.ts
export interface Actor {
  /**
   * User ID from the authenticated session
   */
  id: number;

  /**
   * User's role for authorization decisions
   * - user: Standard authenticated user (can only access own resources)
   * - admin: Administrator (can access any user's resources)
   * - coach: Coach role (can access coached athletes' resources)
   * - system: System/background process (internal use)
   */
  role: "user" | "admin" | "coach" | "system";
}
```

**Creating Actor from Request**:
```typescript
import { createActor } from "../types/actor";
import type { Actor } from "../types/actor";

// In Controller methods:
const actor: Actor = createActor(Number(req.user?.id || 0), req.user?.role || "user");
```

**System Actor for Background Processes**:
```typescript
import { SYSTEM_ACTOR, createSystemActor } from "../types/actor";

// For background jobs, cron tasks, etc.
const result = await logic.processExpiredTasks(SYSTEM_ACTOR);
```

**Why Actor Context Matters**:
- **Identity**: Who is making the request (`actor.id`)
- **Authority**: What permissions they have (`actor.role`)
- **Authorization Decisions**: Logic layer uses actor to decide access
- **Audit Trail**: Enables logging of WHO attempted WHAT operation

### 6. Repository Layer (SQL Co-location)

**Location**: `server/repo/{feature}_repo/`

**Structure**:
```
admin_repo/
├── index.ts                    # Repository class
├── findAdminByEmail.sql
├── findAdminById.sql
├── createAdmin.sql
├── updateAdmin.sql
└── getAllAdmins.sql
```

**Repository Class** (`index.ts`):
```typescript
import { Component } from "@noego/ioc";
import type { WriteResult } from "sqlstack";
import { QueryBinder, Query, Only, Single, SqlStackError } from "sqlstack";

export interface Admin {
  id: number;
  email: string;
  password: string;
  created_at: string;
  deleted_at: string | null;
}

@QueryBinder()
@Component()
export default class AdminRepo {

  @Only
  @Query()
  findAdminByEmail(email: string): Promise<Admin> {
    throw new SqlStackError("Not implemented");
  }

  @Single
  @Query()
  findAdminById(id: number): Promise<Admin | null> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  createAdmin(params: { email: string; password: string }): Promise<WriteResult> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  getAllAdmins(): Promise<Admin[]> {
    throw new SqlStackError("Not implemented");
  }
}
```

**SQL Files** (e.g., `findAdminByEmail.sql`):
```sql
SELECT id, email, password, created_at, deleted_at
FROM employees
WHERE email = :arg1
  AND deleted_at IS NULL
LIMIT 1;
```

**Parameter Binding** (CRITICAL):

**Rule 1**: Object parameters → Named bindings
```typescript
// Method signature
createAdmin(params: { email: string; password: string }): Promise<WriteResult>

// SQL uses named parameters
INSERT INTO employees (email, password)
VALUES (:email, :password)
```

**Rule 2**: Individual parameters → Positional bindings
```typescript
// Method signature
findAdminByEmail(email: string): Promise<Admin>

// SQL uses positional parameters
SELECT * FROM employees WHERE email = :arg1
```

**Decorators**:
- `@Query()`: Maps method to `.sql` file
- `@Only`: Returns single row (throws if 0 or multiple)
- `@Single`: Returns single row or `null`
- No decorator: Returns array of rows

#### Junction Tables and Related Tables

**Convention**: Junction tables and simple relationship tables belong in the primary feature's repository, not in their own separate repository.

**Why?** Repositories are organized by **feature**, not by **table**. A junction table like `disabled_models` is part of the "models" feature, not a standalone feature.

**Pattern**: Add methods for the related table directly to the primary repository:

```typescript
// server/repo/ai_models_repo/index.ts
@QueryBinder()
@Component()
export default class AiModelsRepo {
  // Primary table methods
  @Query()
  listAll(): Promise<AiModelRow[]> { throw new SqlStackError("Not implemented"); }

  @Single
  @Query()
  findById(id: number): Promise<AiModelRow | null> { throw new SqlStackError("Not implemented"); }

  // Junction table methods (disabled_models)
  @Single
  @Query()
  findDisabledByUserAndModel(params: { user_id: number; model_id: number }): Promise<DisabledModelRow | null> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  createDisabledModel(params: { model_id: number; user_id: number }): Promise<WriteResult> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  deleteDisabledByUserAndModel(params: { user_id: number; model_id: number }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  // Efficient JOIN query that combines both tables
  @Query()
  listAllForUser(userId: number): Promise<AiModelWithDisabledStatus[]> {
    throw new SqlStackError("Not implemented");
  }
}
```

**SQL with LEFT JOIN** (`listAllForUser.sql`):
```sql
SELECT
    m.id, m.name, m.engine, m.description, m.is_active,
    CASE WHEN dm.id IS NOT NULL THEN 1 ELSE 0 END AS is_disabled_for_user
FROM ai_models m
LEFT JOIN disabled_models dm ON dm.model_id = m.id AND dm.user_id = :arg1
WHERE m.is_active = 1
ORDER BY m.engine, m.name;
```

**When to Use This Pattern**:
- Junction tables (many-to-many relationships)
- User preference/settings tables tied to a primary entity
- Audit/history tables for a primary entity
- Any table that only makes sense in the context of the primary feature

**When to Create a Separate Repository**:
- The table represents an independent domain concept
- Multiple features need to access it independently
- Complex business logic specific to that table

**Benefits**:
- Fewer repository classes to manage
- Single query with JOIN instead of multiple queries + JS merge
- Clearer feature boundaries
- Simpler dependency injection in logic layer

### 7. Middleware

**Location**: `middleware/{category}/{feature}.ts`

**Pattern**:
```typescript
// middleware/auth/cookie.ts
import cookieParser from 'cookie-parser';
const secret = process.env.COOKIE_SECRET;
export default cookieParser(secret);
```

**Resolution**: `auth.cookie` → `middleware/auth/cookie.ts` (default export)

**Usage in OpenAPI**:
```yaml
x-middleware: auth.cookie
# OR
x-middleware:
  - auth.cookie
  - auth.admin:is_admin
```

### 8. Transactions (sqlstack)

Use sqlstack transactions for multi-step database operations that must be atomic.

**Recommended: Logic-level transaction boundary**

Put `@transaction` on the Logic layer method so all service/repo calls inside share one transaction. This follows the 4-layer architecture where Logic handles business operations:

**Controller** (thin HTTP adapter - no transaction):
```typescript
import { Component, Inject } from "@noego/ioc";
import type { Actor } from "../types/actor";
import { createActor } from "../types/actor";
import InvoicesLogic from "../logic/invoices.logic";

@Component()
export default class InvoicesController {
  constructor(@Inject(InvoicesLogic) private logic: InvoicesLogic) {}

  async markPaid({ req, res }: any) {
    const actor: Actor = createActor(Number(req.user?.id || 0), req.user?.role || "user");
    const invoiceId = Number(req.body?.invoice_id);
    const paymentIntentId = String(req.body?.payment_intent_id ?? "");

    const result = await this.logic.markInvoicePaid(actor, invoiceId, paymentIntentId);

    res?.status?.(200);
    return result;
  }
}
```

**Logic** (with `@transaction` - handles authorization and atomic operations):
```typescript
import { Component, Inject } from "@noego/ioc";
import { transaction } from "sqlstack";
import type { Actor } from "../types/actor";
import InvoicesService from "../services/invoices_service";
import PaymentsService from "../services/payments_service";
import AuthorizationService, { Resource } from "../services/authorization_service";

@Component()
export default class InvoicesLogic {
  constructor(
    @Inject(InvoicesService) private invoicesService: InvoicesService,
    @Inject(PaymentsService) private paymentsService: PaymentsService,
    @Inject(AuthorizationService) private authorizationService: AuthorizationService
  ) {}

  @transaction
  async markInvoicePaid(actor: Actor, invoiceId: number, paymentIntentId: string) {
    // 1. Authorization check
    await this.authorizationService.assertAccess(actor, Resource.Invoice, invoiceId);

    // 2. Business operations in transaction
    await this.invoicesService.markAsPaid(invoiceId);
    await this.paymentsService.create({
      invoice_id: invoiceId,
      stripe_payment_intent_id: paymentIntentId
    });

    return { ok: true };
  }
}
```

**External API calls**

Do external work (Stripe, email, file I/O) **before** starting the transaction (it can't be rolled back), then record results inside a `@transaction` method.

**One-off transaction wrapper**

For non-class flows, use `withTransaction`:

```typescript
import { withTransaction } from "sqlstack";

const result = await withTransaction(async () => {
  await service.step1();
  await service.step2();
  return { ok: true };
});
```

**Business-rule rollback**

Use `currentTransaction()?.rollbackOnly(error?)` to force rollback. If you call `rollbackOnly()`, the transaction will always throw after rolling back (either your error or `RollbackTransactionError`).

**Nested behavior**

Nested `@transaction` calls join the outer transaction by default (`nested: 'join'`), so service calls across Logic/Service boundaries still share one atomic unit of work.

**How repos participate**

Repo methods decorated with `@Query` automatically route through the active transaction; do not pass transaction handles into repositories.

### 9. Dependency Injection

**Container Setup** (`server/container.ts`):
```typescript
import { Container } from "@noego/ioc";

const container = new Container();
container.setTracingEnabled(true);  // Enable tracing for debugging

export default container;
```

**Bootstrap** (`server/server.ts`):
```typescript
import container from './container.js';

const server = await bootBackend(assetMappings, {
  controller_builder: async (Controller: any) => container.get(Controller),
  controller_args_provider: async (req: any, res: any) => ({ req, res }),
});
```

**Key Points**:
- `@Component()` registers classes
- Constructor injection with `@Inject()`
- Container auto-resolves dependencies
- Tracing captures all method calls for debugging

---

## Frontend Development

### 1. OpenAPI View Routes

**Location**: `ui/openapi/{feature}/{feature}.yaml`

**Pattern**:
```yaml
openapi: '3.0.3'
info:
  title: Admin Portal
  version: '1.0.0'

modules:
  - basePath: /admin
    x-middleware:
      - auth.admin:is_admin
    baseLayouts:
      - layout/admin_layout.svelte
    paths:
      /:
        get:
          summary: Admin Dashboard
          x-view: pages/admin/main.svelte
      /clients/{id}:
        get:
          summary: Client Detail
          x-view: pages/admin/client_detail.svelte
          parameters:
            - in: path
              name: id
              required: true
              schema:
                type: integer
```

**Note**: UI routing uses `modules` with `basePath`, optional `baseLayouts`, and per-route `x-view` mappings (see `ui/openapi/admin/admin.yaml`).

### 2. Page Components

**Location**: `ui/pages/{path}/page.svelte`

**Pattern**:
```svelte
<script module lang="ts">
  // Optional: Define loader for SSR/CSR
  export { load } from './page.load';
</script>

<script lang="ts">
  // Props from loader
  const props = $props();

  // Reactive state
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>

<!-- Template -->
<div>
  <h1>{props.title}</h1>
  <button onclick={() => count++}>
    Count: {count} (Doubled: {doubled})
  </button>
</div>
```

### 3. Page Loaders (SSR/CSR)

**Location**: `ui/pages/{path}/page.load.ts`

**Pattern**:
```typescript
type RequestData = any  // CRITICAL: Never import from @noego/forge/server

export type PageLoaderData = {
  items: Item[];
  load_error: boolean;
};

export async function load(request: RequestData): Promise<PageLoaderData> {
  // Access request properties
  const origin = buildOrigin(request.url, request.headers);
  const userId = request.context?.user?.id;
  const params = request.params;

  // Fetch data
  const items = await fetchItems(userId);

  return { items, load_error: false };
}
```

**Request Object Properties**:
- `request.url`: Request URL
- `request.headers`: HTTP headers
- `request.params`: Route params (e.g., `{id: "123"}`)
- `request.context`: Middleware-added context
- `request.method`: HTTP method
- `request.body`: Request body

### 4. Svelte 5 Reactivity (CRITICAL)

**✅ CORRECT Patterns**:
```typescript
// Single expression (no braces)
const doubled = $derived(count * 2);
const items = $derived(data.filter(x => x > 0));
const validation = $derived(computeValidation(name));

// Multiple statements (use .by())
const sorted = $derived.by(() => {
  const filtered = items.filter(item => item.active);
  return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
});
```

**❌ WRONG Pattern** (creates function, not value):
```typescript
// NEVER DO THIS - breaks templates
const items = $derived(() => data.filter(x => x > 0));
const validation = $derived(() => computeValidation(name));
```

**❌ ANTI-PATTERN: Using `{@const}` in Templates**

In Svelte, `{@const}` has **strict placement restrictions** - it can only be the immediate child of specific block elements. Using it elsewhere causes a **compilation error**:

```
`{@const}` must be the immediate child of `{#snippet}`, `{#if}`, `{:else if}`,
`{:else}`, `{#each}`, `{:then}`, `{:catch}`, `<svelte:fragment>`,
`<svelte:boundary>` or `<Component>`
```

**Why `{@const}` should be avoided:**
1. **Compilation errors**: Cannot be placed inside regular elements like `<div>`, `<section>`, etc.
2. **Limited scope**: Only works inside specific Svelte block constructs
3. **Separation of concerns**: Logic belongs in `<script>`, presentation in templates
4. **Reusability**: `$derived` values can be used anywhere; `{@const}` is block-scoped

**❌ WRONG - Causes compilation error**:
```svelte
<!-- ERROR: {@const} cannot be direct child of <div> -->
<div class="summary">
  {@const outstanding = invoices.filter(i => i.status === "outstanding")}
  {@const overdue = outstanding.filter(i => i.days_until_due < 0)}
  {@const paid = invoices.filter(i => i.status === "paid")}

  <p>Outstanding: {outstanding.length}</p>
</div>
```

**✅ CORRECT - Using `$derived` in script**:
```svelte
<script lang="ts">
  let invoices = $state<Invoice[]>(props.invoices || []);

  // Derived states for computed values
  let outstanding = $derived(invoices.filter(i => i.status === "outstanding"));
  let overdue = $derived(outstanding.filter(i => i.days_until_due < 0));
  let paid = $derived(invoices.filter(i => i.status === "paid"));

  let outstandingTotal = $derived(outstanding.reduce((sum, i) => sum + i.amount, 0));
  let overdueTotal = $derived(overdue.reduce((sum, i) => sum + i.amount, 0));
  let paidTotal = $derived(paid.reduce((sum, i) => sum + i.amount, 0));
</script>

<div class="summary">
  <p>Outstanding: {outstanding.length} ({formatCurrency(outstandingTotal)})</p>
  <p>Overdue: {overdue.length} ({formatCurrency(overdueTotal)})</p>
  <p>Paid: {paid.length} ({formatCurrency(paidTotal)})</p>
</div>
```

**Rule**: If you need computed/derived values, always use `$derived` or `$derived.by()` in the script section. Never use `{@const}` for derived data in templates.

**State Updates**:
```typescript
let count = $state(0);
let user = $state({ name: "John" });

count = 10;              // ✅ Direct assignment
user.name = "Jane";      // ✅ Object mutation is reactive
```

### 5. Layout Components

**Location**: `ui/layout/{layout}.svelte`

**Pattern**:
```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
</script>

<div class="admin-layout">
  <header>
    <nav>...</nav>
  </header>

  <main>
    {@render children()}
  </main>

  <footer>...</footer>
</div>
```

### 6. Client-Side Navigation (CRITICAL)

**Prefer `<a>` links for normal in-app navigation.** Use `navigate()` only for programmatic flows (after backend work or when you need to decide the destination in code). **Never** use `window.location.href`/`assign()` for in-app routes.

**Why?**

- The Forge router intercepts `<a>` navigation and performs SPA transitions without full reloads.
- `navigate()` is for imperative navigation (post-save redirect, conditional routes).
- `window.location` forces a full reload and drops client state.

**The navigate() Function** (`ui/lib/navigate.ts`):

```typescript
import { navigate } from '$lib/navigate';

// Standard navigation (adds to browser history)
navigate('/admin/clients');
navigate('/admin/cases/123');

// Replace current history entry (for redirects)
navigate('/login', { replace: true });

// Navigate with query parameters
navigate(`/admin/clients?page=2&q=${encodeURIComponent(searchQuery)}`);

// Refresh current page (re-run loader)
navigate(window.location.pathname + window.location.search);
```

**How It Works**:

The `navigate()` function uses the History API (`history.pushState` / `history.replaceState`) and dispatches a `popstate` event that Forge's router detects, triggering a client-side route transition without a full page reload.

**When to Use Each Method**:

| Scenario | Method | Reason |
|----------|--------|--------|
| Standard in-app link (menu/back/breadcrumb) | `<a href="/path">` ✅ | Declarative, accessible, SPA handled |
| Navigate after form submission or API success | `navigate('/success')` ✅ | Imperative flow after backend work |
| Redirect after login/auth | `navigate('/dashboard', { replace: true })` ✅ | Replace history so back button doesn't return to login |
| Refresh current page data | `navigate(window.location.pathname + window.location.search)` ✅ | Re-runs page loader |
| Navigate to external site | `window.location.href = 'https://external.com'` ✅ | External navigation requires full page load |
| Force full page reload | `window.location.reload()` ⚠️ | Only if absolutely necessary (rare) |

**Common Patterns**:

```typescript
// Simple in-app link (SPA-handled)
<a href={`/admin/cases/${caseId}`} data-test-id="case-back-link">
  Back to Case
</a>

// After creating/updating a record, refresh to show changes
async function updateClient(id: number, data: any) {
  const response = await fetch(`/api/clients/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

  if (response.ok) {
    // Re-run the loader to fetch fresh data
    navigate(window.location.pathname + window.location.search);
  }
}

// After deleting a record, navigate to list page
async function deleteInvoice(invoiceId: number) {
  const response = await fetch(`/api/invoices/${invoiceId}`, {
    method: 'DELETE',
  });

  if (response.ok) {
    // Navigate to parent case page
    navigate(`/admin/cases/${caseId}`);
  }
}

// Search with debouncing
const searchSubject = new Subject<string>();
searchSubject.pipe(
  debounceTime(300),
  distinctUntilChanged()
).subscribe((query) => {
  const url = query
    ? `/admin/clients?page=1&q=${encodeURIComponent(query)}`
    : `/admin/clients?page=1`;
  navigate(url);
});

// Pagination
function goToPage(page: number) {
  const url = searchQuery
    ? `/admin/clients?page=${page}&q=${encodeURIComponent(searchQuery)}`
    : `/admin/clients?page=${page}`;
  navigate(url);
}
```

**Anti-Pattern (DO NOT DO THIS)**:

```typescript
// ❌ WRONG - Triggers full page reload, loses client state
async function deleteInvoice(invoiceId: number) {
  await fetch(`/api/invoices/${invoiceId}`, { method: 'DELETE' });
  window.location.href = `/admin/cases/${caseId}`;  // ❌ Full reload!
}

// ✅ CORRECT - Client-side navigation
async function deleteInvoice(invoiceId: number) {
  await fetch(`/api/invoices/${invoiceId}`, { method: 'DELETE' });
  navigate(`/admin/cases/${caseId}`);  // ✅ SPA navigation
}
```

**Critical Rule**:

> **Use `<a>` for normal in-app navigation and `navigate()` for programmatic redirects.** Only use `window.location` for external sites or forced reloads.

### 7. TypeScript Import Convention

**CRITICAL**: Use `verbatimModuleSyntax`

**Rules**:
```typescript
// ✅ Runtime imports
import AuthRepo from "../repo/auth_repo";
import { Component, Inject } from "@noego/ioc";

// ✅ Type-only imports (REQUIRED)
import type { User, UserRow } from "../repo/auth_repo";
import type { Request, Response } from "express";

// ✅ Mixed imports
import AuthRepo, { type User } from "../repo/auth_repo";

// ❌ WRONG - type imported without 'type' keyword
import { User } from "../repo/auth_repo";  // Compilation error
```

---

## Testing Strategy

### Testing Philosophy

**Core Principle**: Use REAL services with in-memory database for production-identical testing.

#### Services Are Stateless

NoEgo services hold NO mutable state - they're dependency injection wrappers:

```typescript
@Component()
export default class TasksService {
  constructor(
    @Inject(TasksRepo) private repo: TasksRepo
  ) {}

  async createTask(params) {
    return this.repo.createTask(params);  // No state - just calls repo
  }
}
```

**Implications**:
- ✅ No singleton pollution between tests
- ✅ No need to reset IoC container
- ✅ No need for mock factories
- ✅ Tests use REAL services = production-identical behavior

#### Database is the ONLY State

The only source of test pollution is the database. Handle with:

```typescript
// test/helpers/test-db.ts
const runner = await MigrationRunnerFactory.create(properConfigPath, sqliteConn);
await runner.reset();  // Drops ALL tables, re-runs migrations
```

**Using `:memory:` database**:
- ✅ No file system pollution
- ✅ Fast (in-memory)
- ✅ Complete isolation between tests
- ✅ Runs identically to production

#### No Mocks Needed

Use REAL services with in-memory database:

```typescript
describe("Feature Integration", () => {
  beforeEach(async () => {
    await resetTestDatabase();  // Clean slate
    await seedAll();            // Reference data
  });

  it("works like production", async () => {
    // Get REAL service from container
    const service = await container.get(MyService);

    // Call REAL method with REAL data
    const result = await service.doSomething();

    // Assert on REAL results
    expect(result).toBe(expected);
  });
});
```

**Result**: 100% test coverage with production-identical behavior.

---

### UI Testing with Static Rendering

**Primary Approach**: Use `@noego/forge/static` for fast, reliable UI rendering tests without a browser.

#### Why Static Rendering Over Browser Tests

| Approach | Speed | Reliability | CI Setup | Best For |
|----------|-------|-------------|----------|----------|
| **Static Rendering** | ⚡ Fast (~100ms) | ✅ No flakiness | None needed | Content verification, layouts, data binding |
| **Browser Tests** | 🐢 Slow (~5s+) | ⚠️ Can be flaky | Browser required | User interactions, JS behavior |

**Static rendering is the default choice** for UI tests. Only use browser tests when you specifically need to test client-side JavaScript behavior.

#### Setting Up Static Renderer

```typescript
// test/unit/page-render.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createStaticRenderer, type StaticRenderer } from '@noego/forge/static';

describe('Page Rendering', () => {
    let renderer: StaticRenderer;

    beforeAll(async () => {
        renderer = await createStaticRenderer({
            stitchConfig: './ui/stitch.yaml',
            componentDir: './ui'
        });
    });

    it('renders page with mock data', async () => {
        const { html, params, query } = await renderer.render({
            route: '/automations/42?tab=phases',
            data: {
                view: {
                    item: { id: 42, status: 'success', phases: [] }
                }
            }
        });

        // Verify content
        expect(html).toContain('Automation Detail');
        expect(html).toContain('success');
        expect(params.id).toBe('42');
        expect(query.tab).toBe('phases');
    });
});
```

#### Static Renderer API

**`createStaticRenderer(config)`** - Factory function:
```typescript
const renderer = await createStaticRenderer({
    stitchConfig: './ui/stitch.yaml',  // Path to stitch config
    componentDir: './ui',               // Base directory for components
    production: false                   // Use pre-compiled components (faster)
});
```

**`renderer.render(options)`** - Render a route:
```typescript
const result = await renderer.render({
    route: '/automations/42?tab=logs',  // URL with optional query params
    method: 'get',                       // HTTP method (default: 'get')
    data: {
        view: { /* props for view component */ },
        layout: [{ /* props for each layout */ }]
    },
    // Optional: Manual component override (skip auto-resolution)
    view: MyComponent,
    layouts: [Layout1, Layout2]
});

// Result contains:
result.html;    // Rendered HTML string
result.head;    // Content from <svelte:head>
result.css;     // Extracted CSS (if using <style> blocks)
result.params;  // Path parameters { id: '42' }
result.query;   // Query parameters { tab: 'logs' }
result.route;   // Matched route object (null if manual override)
```

**`renderer.renderToPage(options)`** - Full HTML document:
```typescript
const document = await renderer.renderToPage({
    route: '/automations/42',
    data: { view: { item: {...} } },
    template: `<!DOCTYPE html>
<html lang="en">
<head>{{{HEAD}}}<style>{{{CSS}}}</style></head>
<body><div id="app">{{{APP}}}</div></body>
</html>`
});
```

#### Test Patterns

**Content Verification**:
```typescript
it('renders automation with all data', async () => {
    const { html } = await renderer.render({
        route: '/automations/42',
        data: {
            view: {
                item: {
                    id: 42,
                    repository_url: 'https://github.com/acme/project',
                    issue_number: 123,
                    status: 'success',
                    phases: [
                        { phase_name: 'analyze', status: 'completed' },
                        { phase_name: 'plan', status: 'completed' }
                    ]
                }
            }
        }
    });

    // Verify view content
    expect(html).toContain('Automation Detail');
    expect(html).toContain('acme/project');
    expect(html).toContain('#123');
    expect(html).toContain('success');
    expect(html).toContain('analyze');
    expect(html).toContain('plan');
});
```

**Layout Verification**:
```typescript
it('includes layout navigation', async () => {
    const { html } = await renderer.render({
        route: '/automations/42',
        data: { view: { item: {...} } }
    });

    // Verify layout elements
    expect(html).toContain('Dashboard');
    expect(html).toContain('Automations');
    expect(html).toContain('Settings');
    expect(html).toContain('Logout');
});
```

**Error State Testing**:
```typescript
it('renders error state', async () => {
    const { html } = await renderer.render({
        route: '/automations/42',
        data: {
            view: { error: 'Automation not found' }
        }
    });

    expect(html).toContain('Automation not found');
});
```

**Route Parameter Extraction**:
```typescript
it('auto-extracts params and query', async () => {
    const { params, query } = await renderer.render({
        route: '/clients/123/cases/456?status=active&sort=date',
        data: { view: {...} }
    });

    expect(params).toEqual({ clientId: '123', caseId: '456' });
    expect(query.status).toBe('active');
    expect(query.sort).toBe('date');
});
```

**Manual Component Override**:
```typescript
it('renders with custom components', async () => {
    const CustomView = (await import('../../ui/pages/custom.svelte')).default;
    const CustomLayout = (await import('../../ui/layout/custom.svelte')).default;

    const { html } = await renderer.render({
        route: '/any-route',
        view: CustomView,
        layouts: [CustomLayout],
        data: { view: { title: 'Custom Page' } }
    });

    expect(html).toContain('Custom Page');
});
```

**Production Mode Testing**:
```typescript
describe('Production Mode', () => {
    let prodRenderer: StaticRenderer;

    beforeAll(async () => {
        prodRenderer = await createStaticRenderer({
            stitchConfig: './dist/ui/stitch.yaml',
            componentDir: './dist/ui',
            production: true  // Uses pre-compiled entry-ssr.js
        });
    });

    it('renders from compiled components', async () => {
        const { html } = await prodRenderer.render({...});
        expect(html).toContain('Expected Content');
    });
});
```

#### Using data-test-id with Static Rendering

Test IDs are still valuable for content verification in static rendering tests:

```typescript
it('renders form with correct structure', async () => {
    const { html } = await renderer.render({
        route: '/login',
        data: { view: {} }
    });

    // Verify elements by test ID
    expect(html).toContain('data-test-id="login-email-input"');
    expect(html).toContain('data-test-id="login-submit-button"');
    expect(html).toContain('data-test-id="login-form"');
});

it('renders dynamic list items', async () => {
    const { html } = await renderer.render({
        route: '/clients',
        data: {
            view: {
                clients: [
                    { id: 1, name: 'Acme Corp' },
                    { id: 2, name: 'Initech' }
                ]
            }
        }
    });

    // Verify list items have unique test IDs
    expect(html).toContain('data-test-id="client-item-1"');
    expect(html).toContain('data-test-id="client-item-2"');
    expect(html).toContain('Acme Corp');
    expect(html).toContain('Initech');
});
```

#### When to Use Browser Tests

Only use browser tests (Playwright) for:
- Client-side JavaScript behavior (click handlers, form submission)
- Animations and transitions
- Browser APIs (localStorage, fetch interception)
- Full user flow testing (login → navigate → action → verify)

For everything else, **prefer static rendering tests**.

---

### Image Rendering for Visual Testing

**Use Case**: Capture screenshots of rendered pages for AI visual verification or visual regression testing.

#### Setting Up Image Renderer

```typescript
// test/ui/auth.test.ts
import { createImageRenderer } from '@noego/forge/test';

// Define your HTML template (with CSS framework if needed)
const TAILWIND_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
    <script src="https://cdn.tailwindcss.com"></script>
    {{{HEAD}}}
    <style>{{{CSS}}}</style>
</head>
<body>
    <div id="app">{{{APP}}}</div>
</body>
</html>`;

async function main() {
  const imageRenderer = await createImageRenderer({
    outputDir: './test/output/screenshots/auth',
    stitchConfig: './ui/stitch.yaml',
    componentDir: './ui',
    template: TAILWIND_TEMPLATE,
  });

  try {
    // Capture pages at different sizes
    await imageRenderer.capture('login', '/login');
    await imageRenderer.capture('login-mobile', '/login', { width: 375, height: 812 });
    await imageRenderer.capture('signup', '/signup');
  } finally {
    await imageRenderer.close();
  }
}

main().catch(console.error);
```

#### Running Image Tests with Forge CLI

```bash
# Run a single test file
npx forge test/ui/auth.test.ts

# Run all UI tests (glob pattern)
npx forge test/ui/*.test.ts

# Shell expansion also works (no quotes needed)
npx forge test/ui/*.test.ts
```

**Key Features**:
- Each file runs in isolation - if one crashes, others still run
- Summary shows pass/fail counts at the end
- Requires `tsx` and `playwright` as peer dependencies

#### Image Renderer API

**`createImageRenderer(config)`** - Factory function:
```typescript
const renderer = await createImageRenderer({
  outputDir: './screenshots',       // Where to save images
  stitchConfig: './ui/stitch.yaml', // Path to stitch config
  componentDir: './ui',             // Base directory for components
  template: TAILWIND_TEMPLATE,      // HTML template with {{{HEAD}}}, {{{CSS}}}, {{{APP}}}
  width: 1920,                      // Default width (default: 1920)
  height: 1080,                     // Default height (default: 1080)
  format: 'png',                    // 'png' or 'jpeg' (default: 'png')
  deviceScaleFactor: 1,             // For retina displays (default: 1)
});
```

**`renderer.capture(name, route, options?)`** - Capture a route:
```typescript
// Basic capture
await renderer.capture('home', '/');
// Output: ./screenshots/home@1920x1080.png

// With custom dimensions
await renderer.capture('home-mobile', '/', { width: 375, height: 812 });
// Output: ./screenshots/home-mobile@375x812.png

// With view data
await renderer.capture('client-detail', '/clients/42', {
  view: { client: { id: 42, name: 'Acme Corp' } }
});
```

**`renderer.captureHtml(name, html, options?)`** - Capture raw HTML:
```typescript
await renderer.captureHtml('custom', '<html><body><h1>Hello</h1></body></html>');
```

**`renderer.close()`** - Close browser when done:
```typescript
await renderer.close();
```

#### Test Organization

Organize UI image tests by feature:

```
test/
├── ui/
│   ├── auth.test.ts      # Login, signup pages
│   ├── landing.test.ts   # Homepage, marketing pages
│   ├── dashboard.test.ts # Dashboard views
│   └── settings.test.ts  # Settings pages
├── helpers/
│   └── templates.ts      # Shared HTML templates
└── output/
    └── screenshots/
        ├── auth/
        ├── landing/
        └── dashboard/
```

**Shared Templates** (`test/helpers/templates.ts`):
```typescript
export const TAILWIND_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
    <script src="https://cdn.tailwindcss.com"></script>
    {{{HEAD}}}
    <style>{{{CSS}}}</style>
</head>
<body>
    <div id="app">{{{APP}}}</div>
</body>
</html>`;
```

---

### Live Server Testing with Playwright

**Use Case**: Test against a running server for full E2E user flows with real navigation and interactions.

#### Setting Up Playwright Tests

```typescript
// test/live/dashboard.test.ts
import { chromium, Browser, Page } from 'playwright';

describe('Dashboard Live Test', () => {
  let browser: Browser;
  let page: Page;
  const baseUrl = `http://localhost:${process.env.PORT || 3000}`;

  beforeAll(async () => {
    const isHeadless = process.env.HEADLESS !== 'false';
    browser = await chromium.launch({
      headless: isHeadless,
      slowMo: isHeadless ? 0 : 100,
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  afterEach(async () => {
    await page.close();
  });

  it('should load the landing page', async () => {
    await page.goto(baseUrl);
    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('Expected Content');
  });

  it('should navigate to login page', async () => {
    await page.goto(baseUrl);
    await page.click('a[href="/login"]');
    await page.waitForSelector('[data-test-id="login-email-input"]');
    expect(page.url()).toContain('/login');
  });
});
```

#### Playwright Helpers

```typescript
// test/helpers/playwright.ts
import type { Page } from 'playwright';

/**
 * Automates login for E2E/Live tests
 */
export async function authenticateUser(
  page: Page,
  baseUrl: string,
  user: { email: string, password: string }
) {
  await page.goto(`${baseUrl}/login`);
  await page.fill('[data-test-id="login-email-input"]', user.email);
  await page.fill('[data-test-id="login-password-input"]', user.password);
  await page.click('[data-test-id="login-submit-button"]');
  await page.waitForURL('**/dashboard**');
}
```

#### Running Live Tests

```bash
# Start the dev server first
npm run dev

# In another terminal, run live tests
npm run test:live

# Run with visible browser (for debugging)
HEADLESS=false npm run test:live
```

#### When to Use Each Testing Approach

| Approach | Use For | Speed | Requires Server |
|----------|---------|-------|-----------------|
| **Static Rendering** | Content verification, layouts, data binding | ⚡ Fast | No |
| **Image Rendering** | Visual verification, AI review, screenshots | 🔶 Medium | No |
| **Live Server (Playwright)** | User flows, JS behavior, real navigation | 🐢 Slow | Yes |

**Decision Guide**:
1. **Testing content renders correctly?** → Static Rendering
2. **Need visual proof/screenshots?** → Image Rendering
3. **Testing user interactions?** → Live Server with Playwright

---

### data-test-id Naming Convention

**CRITICAL**: Every interactive UI element MUST have a `data-test-id` attribute for testing.

#### Why data-test-id is Required

Test IDs provide stable, semantic hooks for both static rendering tests and browser tests:

- ❌ **Class selectors** (`.btn-primary`) - Break when CSS changes
- ❌ **Text content** (`button:has-text("Submit")`) - Break when copy changes or i18n is added
- ❌ **DOM structure** (`div > div > button:nth-child(3)`) - Break when layout changes
- ✅ **Test IDs** (`data-test-id="submit-button"`) - Explicit, stable, semantic

#### Naming Pattern

**Format**: `data-test-id="component-action"` or `data-test-id="component-state"`

```svelte
<!-- Button actions -->
data-test-id="login-submit-button"
data-test-id="client-delete-button"

<!-- Form inputs -->
data-test-id="user-email-input"
data-test-id="search-field"

<!-- Validation messages -->
data-test-id="email-error-message"
data-test-id="success-banner"

<!-- Dynamic list items (include unique identifier) -->
data-test-id="client-item-{client.id}"
data-test-id="invoice-row-{invoice.id}"

<!-- Navigation -->
data-test-id="nav-dashboard"
data-test-id="sidebar-toggle"

<!-- Modals -->
data-test-id="confirm-dialog"
data-test-id="close-modal-button"
```

#### When to Add data-test-id

**ALWAYS add test IDs to**:
1. All interactive elements (buttons, links, inputs)
2. Form elements and their error messages
3. List items in `{#each}` loops (with unique identifier)
4. Navigation elements
5. Modal/dialog triggers and contents
6. Status indicators (success/error messages)

#### Svelte Examples

**Form with validation**:
```svelte
<form data-test-id="login-form">
  <input
    data-test-id="login-email-input"
    type="email"
    bind:value={email}
  />
  {#if emailError}
    <p data-test-id="email-error-message">{emailError}</p>
  {/if}
  <button data-test-id="login-submit-button">Login</button>
</form>
```

**Dynamic list**:
```svelte
<div data-test-id="clients-list">
  {#each clients as client (client.id)}
    <article data-test-id="client-item-{client.id}">
      <h3>{client.name}</h3>
      <button data-test-id="client-edit-button-{client.id}">Edit</button>
      <button data-test-id="client-delete-button-{client.id}">Delete</button>
    </article>
  {/each}
</div>
```

#### Anti-Patterns

❌ **Non-unique test IDs**:
```svelte
<!-- BAD -->
{#each items as item}
  <button data-test-id="delete-button">Delete</button>
{/each}

<!-- GOOD -->
{#each items as item}
  <button data-test-id="delete-button-{item.id}">Delete</button>
{/each}
```

#### Best Practices

1. Add test IDs during development, not as an afterthought
2. Use semantic names that explain the element's purpose
3. Include unique identifiers for dynamic lists
4. Keep test ID structure consistent across the app
5. Never use test IDs in production JavaScript logic

---

## Development Workflow

### Starting Development

```bash
# Install dependencies
npm install

# Reset database and seed data
npm run reset

# Start development server
npm run dev
```

**Dev Server Modes**:
- **Split Serve** (`splitServe: true`): Frontend on `:3000`, Backend on `:3001`
- **Unified** (`splitServe: false`): Everything on `:3000`

### Running Tests

**Backend Tests** (fast, no server needed):
```bash
npm test                    # All tests (E2E + Integration)
npm run test:repo           # Repository tests only
npm run test:service        # Service tests only
npm run integration         # Integration tests with coverage
npm run test:file -- test/integration/repo/auth_repo.test.ts
```

**UI Rendering Tests** (fast, no browser needed):
```bash
npm run test:ui             # Run Vitest UI tests (static rendering)
```

**Watch Mode**:
```bash
npm run test:watch          # Re-run tests on file changes
```

**Test Types**:
- **E2E Tests** (`test/e2e/`) - Full API integration with supertest
- **Integration Tests** (`test/integration/`) - Real services + in-memory DB
- **UI Tests** (`test/unit/`) - Static rendering tests with Vitest

All tests use:
- ✅ Real services (no mocks)
- ✅ Real database (`:memory:` for fast tests)
- ✅ Real Svelte components (static rendering)
- ✅ Production-identical behavior

### UI Test Configuration

**Vitest Setup** (`vitest.config.ts`):
```typescript
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
    plugins: [svelte({ hot: false })],
    test: {
        include: ['test/unit/**/*.test.ts'],
        environment: 'node',
        globals: true
    }
});
```

**Package.json script**:
```json
{
  "scripts": {
    "test:ui": "vitest run --config vitest.config.ts"
  }
}
```

### Database Management

```bash
# Reset database (run all migrations)
npm run reset:db

# Seed data
npm run seed

# Full reset + seed
npm run reset
```

**Creating Migrations (proper)**:

Use `proper create` to generate migration files (it creates both `.up.sql` and `.down.sql` with the correct timestamp prefix).

```bash
# Create a new migration (generates timestamped up/down files)
proper create create_users_table

# Apply pending migrations
proper up

# Roll back last migration
proper down

# Roll back all and reapply (same as npm run reset:db)
proper reset

# Check migration status
proper status
```

**Migration File Structure**:
- `.up.sql`: Forward migration (CREATE, ALTER, INSERT, etc.)
- `.down.sql`: Reverse migration (DROP, rollback changes)
- Timestamp format: 13 digits (milliseconds since epoch)

**Example Migration**:

`migrations/1234567890123_create_users_table.up.sql`:
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT DEFAULT NULL
);
```

`migrations/1234567890123_create_users_table.down.sql`:
```sql
DROP TABLE IF EXISTS users;
```

**Seeding Data**:

Use `proper seed` commands to manage reference/test data:

```bash
# Run all seeds (from proper.json seeds.list)
proper seed up

# Rollback all seeds
proper seed down

# Seed specific data
proper seed up ai_models
```

**Seed Configuration** (in `proper.json`):
```json
{
  "migration_folder": "migrations",
  "migration_table": "proper_migrations",
  "database": "sqlite",
  "sqlite": { "database": "database/db.sqlite" },
  "seeds": {
    "migrationsDir": "database/seed/migrations",
    "dataDir": "database/seed/data",
    "list": ["ai_models", "ai_model_defaults"]
  }
}
```

**Seed File Structure**:

TypeScript/JavaScript modules in `database/seed/migrations/`:

```typescript
// database/seed/migrations/ai_models.ts
import type { Database } from "sqlstack";

interface SeedContext {
  dialect: string;
  data: any[];
  log?: (msg: string) => void;
}

export async function up(db: Database, ctx: SeedContext): Promise<void> {
  const models = ctx.data;
  for (const model of models) {
    await db.query(
      `INSERT INTO ai_models (name, engine, description) VALUES (?, ?, ?)`,
      [model.name, model.engine, model.description]
    );
  }
}

export async function down(db: Database, ctx: SeedContext): Promise<void> {
  const models = ctx.data;
  const names = models.map(m => m.name);
  await db.query(
    `DELETE FROM ai_models WHERE name IN (${names.map(() => '?').join(',')})`,
    names
  );
}
```

JSON data in `database/seed/data/`:

```json
// database/seed/data/ai_models.json
[
  { "name": "claude-opus-4-5", "engine": "claude", "description": "..." },
  { "name": "gpt-5", "engine": "openai", "description": "..." }
]
```

**Key Points**:
- Seed modules export `up()` and `down()` functions
- Data files are optional (can hardcode in module)
- Seeds should be idempotent (check before inserting)
- Use for reference data, not test fixtures

### OpenAPI Stitching

**IMPORTANT**: OpenAPI stitching is built into the framework and happens automatically during development and build. You only need to configure which YAML files to include.

**Stitch Configuration Files**:

**Server API Routes** (`server/stitch.yaml`):
```yaml
stitch:
  - openapi/base.yaml
  - openapi/status/**/*.yaml
  - openapi/admin/**/*.yaml
  - openapi/clients/**/*.yaml
  - openapi/cases/**/*.yaml
```

**Frontend View Routes** (`ui/stitch.yaml`):
```yaml
stitch:
  - openapi/**/*.yaml
```

**How It Works**:
1. List the YAML files (with glob patterns) in the `stitch` array
2. Framework automatically merges them during watch/build
3. No manual stitching commands needed during development

**When to Update**:
- Add new feature? → Add `openapi/{feature}/**/*.yaml` to the stitch config
- Framework watches these files (configured in `noego.config.yml`)
- Changes trigger automatic rebuild

---

## Build & Deployment

### Building for Production

```bash
# Full production build
npm run build
```

**Build Process**:
1. `clean`: Remove `dist/` directory
2. `build:css`: Compile Tailwind CSS
3. `build:ts`: Compile TypeScript with `noego build`
   - Reads `noego.config.yml`
   - Bundles server + client code
   - Copies assets to `dist/`

**Output Structure**:
```
dist/
├── index.js              # Application entry point
├── server/               # Compiled server code
├── ui/                   # Compiled client code
└── resources/            # Static assets
```

### Running in Production

```bash
NODE_ENV=production node --loader @noego/forge/loader dist/index.js
```

**Environment Variables**:
- `NODE_ENV`: `production` or `development`
- `PORT`: Server port (default: 3000)
- `COOKIE_SECRET`: Secret for signed cookies
- `COOKIE_SECURE`: `true` for HTTPS-only cookies
- `JWT_SECRET`: Secret for JWT tokens

---

## Best Practices

### Backend

**4-Layer Architecture** (Controller → Logic → Service → Repository):

1. **OpenAPI Schemas**: Define all input validation using JSON Schema in `components.yaml`
2. **Controllers**: Thin HTTP adapters that:
   - Extract request data and create Actor from `req.user`
   - Inject and call Logic layer (never Service directly)
   - Map domain errors to HTTP status codes
   - Contain NO business logic or authorization
3. **Logic**: Domain brain that:
   - Receives Actor as first parameter for authorization
   - Enforces all business rules and domain invariants
   - Throws domain errors (`NotFoundError`, `ForbiddenError`, `ConflictError`, `ValidationError`)
   - Uses `@transaction` for atomic operations
4. **Services**: Trusted workers that:
   - Execute data operations (NO authorization - Logic already did this)
   - Orchestrate multiple repository calls
   - Handle external integrations
5. **Repositories**: Only database access, no business logic
6. **Middleware**: Can be default export (`auth.cookie`) or named export (`auth.admin:is_admin`) and referenced from OpenAPI
7. **Error Handling**: Always set HTTP status before returning error objects
8. **Validation Strategy**:
   - Basic validation (required, types, formats) → OpenAPI schema
   - Business validation (uniqueness, authorization) → Logic layer
   - Avoid duplicating schema validation in code
9. **SQL Queries**: Always use parameterized queries (`:arg1`, `:fieldName`)

### Frontend

1. **Client-Side Navigation**: ALWAYS use `navigate()` from `$lib/navigate` - NEVER use `window.location.href` (except for external sites)
2. **Loaders**: Use for structural/fast data (user, menu, permissions)
3. **fetch() in Components**: Use for slow/supplemental data (lists, stats)
4. **Svelte Reactivity**: NEVER use `$derived(() => expression)` - always `$derived(expression)` or `$derived.by(() => {})`
5. **Derived Values**: NEVER use `{@const}` in templates for computed values - always use `$derived` in the script section
6. **Test IDs**: Add `data-test-id` to ALL interactive elements during development
7. **Page/View Separation**: Separate complex pages into `.svelte` (logic) + `.view.svelte` (presentation)

### Testing

**Philosophy**:
1. **Use Real Services** - No mocks, no manual test doubles
2. **In-Memory Database** - Fast tests with `:memory:` SQLite
3. **Static Rendering** - Test UI without browser overhead
4. **Production-Identical** - Same code paths as production

**Backend Test Structure**:
```typescript
import { resetTestDatabase } from '../../helpers/test-db';
import { seedAll } from '../../helpers/seed';
import container from '../../../server/container';

describe("Feature Integration", () => {
  beforeEach(async () => {
    await resetTestDatabase();  // Clean slate
    await seedAll();            // Reference data
  });

  it("works like production", async () => {
    const service = await container.get(MyService);
    const result = await service.doSomething();
    expect(result).toBe(expected);
  });
});
```

**UI Test Structure**:
```typescript
import { createStaticRenderer, type StaticRenderer } from '@noego/forge/static';

describe("Page Rendering", () => {
  let renderer: StaticRenderer;

  beforeAll(async () => {
    renderer = await createStaticRenderer({
      stitchConfig: './ui/stitch.yaml',
      componentDir: './ui'
    });
  });

  it("renders correctly with mock data", async () => {
    const { html } = await renderer.render({
      route: '/clients/123',
      data: { view: { client: { id: 123, name: 'Acme' } } }
    });
    expect(html).toContain('Acme');
    expect(html).toContain('data-test-id="client-name"');
  });
});
```

**Anti-Patterns**:
- ❌ Don't create mock factories
- ❌ Don't write unit tests with manual mocks
- ❌ Don't reset IoC container (services are stateless)
- ❌ Don't use browser tests for content verification
- ❌ Don't create custom seeders (use `proper seed`)

**Test Helpers**:
1. **test/helpers/test-db.ts** - In-memory database setup
2. **test/helpers/seed.ts** - Fast seeding for tests
3. **test/helpers/actor.ts** - Test user creation utilities

### TypeScript

1. **Imports**: Use `import type {}` for all type imports
2. **Exports**: Controllers/Repos must be default exports
3. **Decorators**: `@Component()` for all injectable classes
4. **Type Safety**: Enable strict mode, no `any` unless necessary

### Database

1. **Creating Migrations**: Use `proper create <migration_name>` to generate `.up.sql` + `.down.sql` files
2. **Migrations**: Write reversible `.up.sql` (forward) and `.down.sql` (rollback)
3. **Migration Tool**: Use `proper` commands (`up`, `down`, `reset`, `status`)
4. **Co-location**: SQL files in same directory as repository
5. **Parameter Style**: Object params → named (`:email`), Individual params → positional (`:arg1`)

---

## Common Patterns

### Full-Stack Feature Workflow

1. **Create Migration**:
   ```bash
   # Use proper to create migration files
   proper create create_feature_table

   # Write your SQL in the generated files
   # Then apply the migration
   proper up
   ```

2. **Create Repository**:
   ```
   server/repo/feature_repo/
   ├── index.ts
   ├── create.sql
   ├── findById.sql
   └── list.sql
   ```

3. **Create Service** (Trusted Worker):
   ```typescript
   server/services/feature_service.ts
   ```
   - Data operations only
   - NO authorization (Logic handles this)

4. **Create Logic** (Domain Brain):
   ```typescript
   server/logic/feature.logic.ts
   ```
   - Authorization checks
   - Business rule validation
   - Domain error throwing
   - Uses `@transaction` for atomic operations

5. **Create Controller** (HTTP Adapter):
   ```typescript
   server/controller/feature.controller.ts
   ```
   - Inject Logic (not Service)
   - Create Actor from `req.user`
   - Map domain errors to HTTP status codes

6. **Define Backend API Routes**:
   ```yaml
   server/openapi/feature/feature.yaml
   server/openapi/feature/components.yaml
   ```

7. **Define Frontend View Routes**:
   ```yaml
   ui/openapi/feature/feature.yaml
   ```

8. **Create Pages**:
   ```
   ui/pages/feature/
   ├── list.svelte
   ├── list.load.ts
   ├── detail.svelte
   └── detail.load.ts
   ```

9. **Create UI Rendering Tests**:
   ```typescript
   test/unit/feature-page.test.ts
   ```
   Use `@noego/forge/static` to test page rendering with mock data.

---

## Debugging Tools

### Container Traces

```typescript
// Enable in server/container.ts
container.setTracingEnabled(true);

// Access traces
const traces = container.getTraces();

// Find specific method call
const controllerTrace = traces.find(t => t.class_name === 'AdminController');
console.log(controllerTrace.parameters);
console.log(controllerTrace.return_value);
console.log(controllerTrace.duration_ms);
```

### OpenAPI Validation

```bash
# Validate against schema
npx stitch build server/stitch.yaml --validate ./node_modules/@noego/dinner/schema.json
```

### Static Rendering Debug

```typescript
// Log rendered HTML for debugging
const { html, params, query, route } = await renderer.render({
    route: '/automations/42?debug=true',
    data: { view: {...} }
});

console.log('Matched route:', route?.path);
console.log('Params:', params);
console.log('Query:', query);
console.log('HTML preview:', html.slice(0, 500));
```

---

## Framework Dependencies

**Core Framework** (`@noego/*`):
- `@noego/app`: Application bootstrapping
- `@noego/dinner`: Server routing and OpenAPI
- `@noego/forge`: Frontend SSR/CSR with Svelte
- `@noego/ioc`: Dependency injection
- `sqlstack`: Database layer

**Build Tools**:
- `@noego/stitch`: OpenAPI stitching
- `@noego/proper`: Database migrations
- `vite`: Frontend bundling
- `tsx`: TypeScript execution

**Testing**:
- `jest`: Backend test runner
- `vitest`: UI rendering test runner
- `supertest`: HTTP assertions
- `@noego/forge/static`: Static page rendering for tests

---

## Next Steps

1. **Read AGENTS.md**: Comprehensive patterns and best practices
2. **Explore Examples**: Study existing controllers/repos/pages
3. **Build a Feature**: Follow the full-stack workflow above
4. **Run Tests**: Verify everything works with live tests

---

**End of NoEgo Framework Guide**
