import type { IContainer } from "@noego/ioc";
import { SqlStack, resolveExecution } from "sqlstack";
import { registerSqlStack } from "sqlstack/ioc";

/**
 * Bridge App 2.4's boot-time global database/manifest into an owned IoC root.
 * Capture once during boot, before request execution: requests must never
 * consult another root's process-global database or resolver.
 * The adapter remains owned by the existing boot/driver lifecycle.
 *
 * Boot edge: a failure rejects, so the legacy node boot does not start and
 * the worker boot logs that postgres registration failed (server.ts).
 */
export async function registerAppSqlStack(container: IContainer): Promise<void> {
  //trust:accept boot contract: no registered default database rejects the boot that called this
  const { entry, resolver } = await resolveExecution();
  if (container.isRegistered(SqlStack)) {
    // Node dev rebuilds reuse the App root; update its existing registration.
    const stack = await container.get(SqlStack) as SqlStack;
    //trust:accept boot contract: a closed stack rejects the rebuild that called this
    stack.register(entry.name, entry.db, { owned: false, default: true });
    if (resolver) {
      //trust:accept boot contract: a closed stack rejects the rebuild that called this
      stack.useResolver(resolver);
    }
    return;
  }
  //trust:accept boot contract: an IoC registration failure rejects the boot that called this
  registerSqlStack(container, {
    databases: { [entry.name]: entry.db },
    default: entry.name,
    resolver,
  });
}
