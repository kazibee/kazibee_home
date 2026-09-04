import { Component, Inject, LoadAs } from "@noego/ioc";
import Env from "./env";

/**
 * Deployment-pinned OAuth origins. Issuer strings must be byte-stable per
 * environment (clients cache authorization-server metadata and compare iss),
 * so both origins are explicit per-env bindings rather than being derived
 * from the inbound Host header or coupled to other URL settings.
 *
 *   KAZI_MCP_ORIGIN     — https://mcp-dev.kazibee.com / https://mcp.kazibee.com
 *   KAZI_WEBSITE_ORIGIN — https://dev.kazibee.com     / https://kazibee.com
 */
@Component({ scope: LoadAs.Singleton })
export default class OAuthOrigins {
  constructor(@Inject(Env) private readonly env: Env) {}

  // Pre-release default: every unconfigured deployment is the dev pair.
  // Production sets both KAZI_MCP_ORIGIN and KAZI_WEBSITE_ORIGIN explicitly.
  get issuer(): string {
    return this.origin("KAZI_MCP_ORIGIN", "https://mcp-dev.kazibee.com");
  }

  get resource(): string {
    return `${this.issuer}/mcp`;
  }

  get websiteOrigin(): string {
    return this.origin("KAZI_WEBSITE_ORIGIN", "https://dev.kazibee.com");
  }

  get agentOrigin(): string {
    return this.origin("KAZI_AGENT_ORIGIN", "https://agent-dev.kazibee.com");
  }

  get authorizationEndpoint(): string {
    return `${this.websiteOrigin}/oauth/authorize`;
  }

  private origin(key: string, fallback: string): string {
    const configured = this.env.string(key) ?? fallback;
    const url = new URL(configured);
    if (url.protocol !== "https:") throw new Error(`${key} must use HTTPS`);
    return url.origin;
  }
}
