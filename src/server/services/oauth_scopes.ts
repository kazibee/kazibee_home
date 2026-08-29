import type { OAuthConnectionScope } from "../repo/oauth_repo";

export const OAUTH_READ_SCOPE = "kazibee:read";
export const OAUTH_WRITE_SCOPE = "kazibee:write";

export function oauthScopeToConnectionScope(scope: string): OAuthConnectionScope | null {
  const values = scope.trim().split(/\s+/).filter(Boolean);
  const unique = new Set(values);
  if (unique.size !== values.length) return null;
  if (unique.size === 1 && unique.has(OAUTH_READ_SCOPE)) return "read";
  if (
    unique.size === 2
    && unique.has(OAUTH_READ_SCOPE)
    && unique.has(OAUTH_WRITE_SCOPE)
  ) {
    return "read_write";
  }
  return null;
}

export function connectionScopeToOAuthScope(scope: OAuthConnectionScope): string {
  return scope === "read_write"
    ? `${OAUTH_READ_SCOPE} ${OAUTH_WRITE_SCOPE}`
    : OAUTH_READ_SCOPE;
}

/** Maps a connection scope onto the executor tool-scope strings. */
export function connectionScopeToToolScopes(scope: OAuthConnectionScope): string[] {
  return scope === "read_write"
    ? ["workspace.read", "workspace.write"]
    : ["workspace.read"];
}
