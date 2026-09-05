import type { Container } from "@noego/ioc";
import { SqlStack, resolveExecution } from "sqlstack";
import { registerSqlStack } from "sqlstack/ioc";

/**
 * Bridge App 2.4's boot-time global database/manifest into an owned IoC root.
 * Capture once during boot, before request execution: requests must never
 * consult another root's process-global database or resolver.
 * The adapter remains owned by the existing boot/driver lifecycle.
 */
export async function registerAppSqlStack(container: Container): Promise<void> {
  const { entry, resolver } = await resolveExecution();
  if (container.isRegistered(SqlStack)) {
    // Node dev rebuilds reuse the App root; update its existing registration.
    const stack = await container.get(SqlStack) as SqlStack;
    stack.register(entry.name, entry.db, { owned: false, default: true });
    if (resolver) stack.useResolver(resolver);
    return;
  }
  registerSqlStack(container, {
    databases: { [entry.name]: entry.db },
    default: entry.name,
    resolver,
  });
}
