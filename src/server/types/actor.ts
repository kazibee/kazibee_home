/**
 * Actor - Represents the identity performing an action
 *
 * Every business logic operation receives an Actor to enable:
 * - Authorization decisions (checking roles/permissions)
 * - Audit logging (who did what)
 * - Multi-tenancy (scoping data access)
 *
 * The Actor is created from the authenticated user in the controller,
 * then passed through to all logic layer methods.
 */
export interface Actor {
  /** User ID (0 for system/anonymous actors) */
  id: number;

  /** User's email address */
  email: string;

  /** User's role for authorization checks */
  role: "admin" | "user" | "guest";

  /** Whether this is a system actor (bypasses some checks) */
  isSystem: boolean;

  /** Optional metadata for audit/logging */
  metadata?: Record<string, unknown>;
}

/**
 * Create an Actor from a user object (typically from req.user)
 *
 * @param user - The authenticated user object
 * @returns Actor instance for use in logic layer
 */
export function createActor(user: {
  id: number;
  email?: string;
  role?: string;
}): Actor {
  return {
    id: user.id,
    email: user.email || "",
    role: (user.role as Actor["role"]) || "user",
    isSystem: false,
  };
}

/**
 * System actor for background jobs, migrations, and internal operations
 * Has elevated privileges and is marked as isSystem: true
 */
export const SYSTEM_ACTOR: Actor = {
  id: 0,
  email: "system@kazibee",
  role: "admin",
  isSystem: true,
  metadata: { source: "system" },
};

/**
 * Guest actor for unauthenticated requests
 * Use this when a valid Actor is required but no user is authenticated
 */
export const GUEST_ACTOR: Actor = {
  id: 0,
  email: "",
  role: "guest",
  isSystem: false,
};
