import { ExecutionContext, type IContainer } from "@noego/ioc";

/**
 * Return the root/scope already owned by the active App execution flow.
 *
 * There is deliberately no process-global fallback here. Server-side loaders,
 * request helpers, and other in-process consumers must execute inside the
 * App/IoC ExecutionContext that owns their lifecycle.
 */
export function currentContainer(): IContainer {
  const container = ExecutionContext.current();
  if (!container) {
    throw new Error(
      "No active App execution scope. Resolve this operation inside the request/SSR ExecutionContext.",
    );
  }
  return container;
}
