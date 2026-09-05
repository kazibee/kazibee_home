import { ExecutionContext } from "@noego/ioc";
import { SqlStack, currentTransaction, currentTransactionFor } from "sqlstack";

/** Match rollback-only marking to the same database entry used by @transaction. */
export async function currentAppTransaction() {
  const scope = ExecutionContext.current();
  if (!scope) return currentTransaction(); // Standalone legacy callers.
  // A service invoked without a database composition has no root transaction
  // to mark. Never reach into an unrelated global transaction from this root.
  if (!scope.isRegistered(SqlStack)) return undefined;
  const stack = await scope.get(SqlStack) as SqlStack;
  return currentTransactionFor(stack.getEntry());
}
