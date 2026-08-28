import { Component, LoadAs } from "@noego/ioc";

/**
 * Runtime bindings shared by Node and Cloudflare-backed providers.
 *
 * On Workers the bindings (Durable Object namespaces, KV, R2, secrets) arrive
 * as the `env` argument to the worker entry rather than on `process.env`, so
 * anything that needs a binding reads it through here instead.
 */
@Component({ scope: LoadAs.Singleton })
export default class Env {
  private values: Record<string, unknown> | null = null;

  load(values: Record<string, unknown>): void {
    this.values = values;
  }

  get(key: string): unknown {
    return this.values === null ? process.env[key] : this.values[key];
  }

  string(key: string): string | undefined {
    const value = this.get(key);
    if (typeof value !== "string") return undefined;
    return value.trim() || undefined;
  }
}
