import { describe, it, expect } from "vitest";
import {
  connectionScopeToToolScopes,
  grantScopeAllows,
  grantScopeToOAuthScope,
  oauthScopeToConnectionScope,
  parseOAuthGrantScope,
} from "../../src/server/services/oauth_scopes";

describe("OAuth grant scope parsing (doc 06 §3)", () => {
  it("parses workspace, shell, and web families and requires kazibee:read", () => {
    expect(parseOAuthGrantScope("kazibee:read")).toEqual({ access: "read", shell: false, web: false });
    expect(parseOAuthGrantScope("kazibee:read kazibee:write kazibee:shell kazibee:web"))
      .toEqual({ access: "read_write", shell: true, web: true });
    // Dependency: shell/write/web all require read; a scope without read is rejected.
    expect(parseOAuthGrantScope("kazibee:shell")).toBeNull();
    expect(parseOAuthGrantScope("kazibee:read kazibee:bogus")).toBeNull();
    expect(parseOAuthGrantScope("kazibee:read kazibee:read")).toBeNull();
  });

  it("enforces the approved-scope ceiling per family", () => {
    const requested = { access: "read_write", shell: true, web: false } as const;
    expect(grantScopeAllows(requested, { access: "read", shell: true, web: false })).toBe(true);
    // Cannot approve a family the client did not request.
    expect(grantScopeAllows(requested, { access: "read", shell: false, web: true })).toBe(false);
    // Cannot approve write above a read-only request.
    expect(grantScopeAllows({ access: "read", shell: false, web: false }, { access: "read_write", shell: false, web: false })).toBe(false);
  });

  it("round-trips the wire scope string", () => {
    const grant = { access: "read_write", shell: true, web: true } as const;
    expect(parseOAuthGrantScope(grantScopeToOAuthScope(grant))).toEqual(grant);
  });

  it("maps member scope plus connection families onto executor tool scopes", () => {
    expect(connectionScopeToToolScopes("read")).toEqual(["workspace.read"]);
    expect(connectionScopeToToolScopes("read_write", { allow_shell: true, allow_web: true }))
      .toEqual(["workspace.read", "workspace.write", "shell.execute", "web.read", "browser.fetch"]);
    expect(connectionScopeToToolScopes("read", { allow_shell: false, allow_web: true }))
      .toEqual(["workspace.read", "web.read", "browser.fetch"]);
  });

  it("only treats a pure workspace scope as a legacy connection scope", () => {
    expect(oauthScopeToConnectionScope("kazibee:read kazibee:write")).toBe("read_write");
    expect(oauthScopeToConnectionScope("kazibee:read kazibee:shell")).toBeNull();
  });
});
