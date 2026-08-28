import { Component, Inject, LoadAs } from "@noego/ioc";
import Env from "./env";

@Component({ scope: LoadAs.Singleton })
export default class ConnectExecutorPolicy {
  readonly claimLifetimeMs = 10 * 60 * 1000;
  readonly ownerListLimit = 100;
  readonly bootstrapHeader = "x-kazi-bootstrap-token";

  constructor(@Inject(Env) private readonly env: Env) {}

  // Read lazily: on Workers the binding is published by worker boot, which
  // may run after this singleton is constructed.
  get claimBaseUrl(): string {
    const configured = this.env.string("KAZI_CONNECT_ACCOUNT_URL") ?? "https://connect.kazibee.example";
    const url = new URL(configured);
    if (url.protocol !== "https:") throw new Error("KAZI_CONNECT_ACCOUNT_URL must use HTTPS");
    return url.toString().replace(/\/$/, "");
  }
}
