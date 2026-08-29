import type { OAuthConnectionScope } from "../repo/oauth_repo";

export const OAUTH_READ_SCOPE = "kazibee:read";
export const OAUTH_WRITE_SCOPE = "kazibee:write";
export const OAUTH_SHELL_SCOPE = "kazibee:shell";
export const OAUTH_WEB_SCOPE = "kazibee:web";

/**
 * Full grant shape (doc 06 §3): workspace access plus optional shell and web
 * families. kazibee:read is always required (this deployment does not issue
 * web-only grants); kazibee:shell and kazibee:write both depend on it.
 */
export interface OAuthGrantScope {
  access: OAuthConnectionScope;
  shell: boolean;
  web: boolean;
}

export function parseOAuthGrantScope(scope: string): OAuthGrantScope | null {
  const values = scope.trim().split(/\s+/).filter(Boolean);
  const unique = new Set(values);
  if (unique.size !== values.length || unique.size === 0) return null;
  const known = [OAUTH_READ_SCOPE, OAUTH_WRITE_SCOPE, OAUTH_SHELL_SCOPE, OAUTH_WEB_SCOPE];
  for (const value of unique) {
    if (!known.includes(value)) return null;
  }
  if (!unique.has(OAUTH_READ_SCOPE)) return null;
  return {
    access: unique.has(OAUTH_WRITE_SCOPE) ? "read_write" : "read",
    shell: unique.has(OAUTH_SHELL_SCOPE),
    web: unique.has(OAUTH_WEB_SCOPE),
  };
}

export function grantScopeToOAuthScope(grant: OAuthGrantScope): string {
  const parts = [OAUTH_READ_SCOPE];
  if (grant.access === "read_write") parts.push(OAUTH_WRITE_SCOPE);
  if (grant.shell) parts.push(OAUTH_SHELL_SCOPE);
  if (grant.web) parts.push(OAUTH_WEB_SCOPE);
  return parts.join(" ");
}

/** True when every family in `desired` is within `available`. */
export function grantScopeAllows(
  available: OAuthGrantScope,
  desired: OAuthGrantScope,
): boolean {
  return (available.access === "read_write" || desired.access === "read")
    && (available.shell || !desired.shell)
    && (available.web || !desired.web);
}

export function oauthScopeToConnectionScope(scope: string): OAuthConnectionScope | null {
  const grant = parseOAuthGrantScope(scope);
  return grant && !grant.shell && !grant.web ? grant.access : null;
}

export function connectionScopeToOAuthScope(scope: OAuthConnectionScope): string {
  return scope === "read_write"
    ? `${OAUTH_READ_SCOPE} ${OAUTH_WRITE_SCOPE}`
    : OAUTH_READ_SCOPE;
}

/** Maps member workspace access plus connection families to executor tool scopes. */
export function connectionScopeToToolScopes(
  scope: OAuthConnectionScope,
  families?: { allow_shell: boolean; allow_web: boolean },
): string[] {
  const scopes = scope === "read_write"
    ? ["workspace.read", "workspace.write"]
    : ["workspace.read"];
  if (families?.allow_shell) scopes.push("shell.execute");
  if (families?.allow_web) scopes.push("web.read");
  return scopes;
}
