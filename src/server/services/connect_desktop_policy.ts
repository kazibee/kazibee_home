import { Component, LoadAs } from "@noego/ioc";

@Component({ scope: LoadAs.Singleton })
export default class ConnectDesktopPolicy {
  readonly claimLifetimeMs = 10 * 60 * 1000;
  readonly credentialLifetimeMs = 365 * 24 * 60 * 60 * 1000;
  readonly ownerListLimit = 100;
  readonly bootstrapHeader = "x-kazi-bootstrap-token";
  readonly claimBaseUrl = this.readBaseUrl();

  private readBaseUrl(): string {
    const configured = process.env.KAZI_CONNECT_ACCOUNT_URL ?? "https://connect.kazibee.example";
    const url = new URL(configured);
    if (url.protocol !== "https:") throw new Error("KAZI_CONNECT_ACCOUNT_URL must use HTTPS");
    return url.toString().replace(/\/$/, "");
  }
}
