import { ExecutionContext } from "@noego/ioc";
import { SqlStack, currentTransaction, currentTransactionFor, hasTransactionContext } from "sqlstack";

/**
 * Match rollback-only marking to the same database entry used by @transaction.
 *
 * Callers are already handling a failure inside a transaction. If the
 * transaction itself cannot be found, the error escapes on purpose: an
 * exception out of the @transaction method rolls it back, which is what the
 * rollback-only mark was for. Returning undefined instead would commit.
 */
export async function currentAppTransaction() {
  // Inspecting an absent transaction must not construct a database provider,
  // especially while handling an unrelated service error above the SQL boundary.
  if (!hasTransactionContext()) return undefined;
  const scope = ExecutionContext.current();
  if (!scope) {
    // Standalone legacy callers.
    //trust:accept escapes the @transaction method, which rolls the transaction back (see above)
    return currentTransaction();
  }
  // A service invoked without a database composition has no root transaction
  // to mark. Never reach into an unrelated global transaction from this root.
  if (!scope.isRegistered(SqlStack)) return undefined;
  const stack = await scope.get(SqlStack) as SqlStack;
  //trust:accept escapes the @transaction method, which rolls the transaction back (see above)
  return currentTransactionFor(stack.getEntry());
}
