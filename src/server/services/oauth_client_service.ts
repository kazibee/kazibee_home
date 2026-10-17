import { Component, Inject } from "@noego/ioc";
import { randomBytes } from "node:crypto";
import OAuthRepo, {
  type OAuthClientRecord,
  toCreateOAuthClientParams,
} from "../repo/oauth_repo";
import { repoUnavailable, type RepoUnavailable } from "../repo/repo_failure";
import { ConnectClock } from "./connect_auth_primitives";
import OAuthClientMetadataClient from "./oauth_client_metadata_client";

export interface OAuthClientMetadata extends Record<string, unknown> {
  client_id?: string;
  client_name?: string;
  redirect_uris: string[];
  application_type?: string;
}

export type ResolveOAuthClientResult =
  | { ok: true; client: OAuthClientRecord }
  | { ok: false; error: "invalid_client" }
  | RepoUnavailable;

export type RegisterOAuthClientResult =
  | { ok: true; client: OAuthClientRecord }
  | { ok: false; error: "invalid_client_metadata" }
  | RepoUnavailable;

@Component()
export default class OAuthClientService {
  constructor(
    @Inject(OAuthRepo) private readonly clients: OAuthRepo,
    @Inject(ConnectClock) private readonly clock: ConnectClock,
    @Inject(OAuthClientMetadataClient) private readonly metadataClient: OAuthClientMetadataClient,
  ) {}

  async resolveClient(clientId: string): Promise<ResolveOAuthClientResult> {
    if (clientId.startsWith("oac_")) {
      const lookup = await this.clients.findClientById({ client_id: clientId });
      if (!lookup.ok) return repoUnavailable(lookup.error);
      const client = lookup.value;
      return client && client.kind === "dcr" && client.status === "active"
        ? { ok: true, client }
        : { ok: false, error: "invalid_client" };
    }

    if (!clientId.startsWith("https://")) {
      return { ok: false, error: "invalid_client" };
    }

    const cachedLookup = await this.clients.findClientById({ client_id: clientId });
    if (!cachedLookup.ok) return repoUnavailable(cachedLookup.error);
    const cached = cachedLookup.value;
    if (cached) {
      return cached.kind === "cimd" && cached.status === "active"
        ? { ok: true, client: cached }
        : { ok: false, error: "invalid_client" };
    }

    try {
      const response = await this.metadataClient.request(clientId);
      if (!response.ok) return { ok: false, error: "invalid_client" };
      const metadata = await response.json();
      if (!isMetadataObject(metadata)) {
        return { ok: false, error: "invalid_client" };
      }
      if (
        metadata.client_id !== clientId
        || !Array.isArray(metadata.redirect_uris)
        || !metadata.redirect_uris.every((uri) => typeof uri === "string")
      ) {
        return { ok: false, error: "invalid_client" };
      }

      const now = this.clock.now().toISOString();
      const client: OAuthClientRecord = {
        client_id: clientId,
        kind: "cimd",
        client_name: typeof metadata.client_name === "string"
          ? metadata.client_name
          : null,
        redirect_uris: metadata.redirect_uris,
        metadata,
        status: "active",
        created_at: now,
        updated_at: now,
      };
      const cachedClient = await this.clients.createClient(toCreateOAuthClientParams(client));
      // Caching the fetched metadata is part of resolving the client. A unique
      // violation means a concurrent request for the same document cached it
      // first: the client is resolved. Any other write failure says nothing
      // about the client, so it is `unavailable` (500), never invalid_client.
      if (!cachedClient.ok && cachedClient.error.kind === "write_failed") {
        if (!isUniqueViolation(cachedClient.error.cause)) return repoUnavailable(cachedClient.error);
      }
      return { ok: true, client };
    } catch {
      return { ok: false, error: "invalid_client" };
    }
  }

  async registerClient(
    metadata: OAuthClientMetadata,
  ): Promise<RegisterOAuthClientResult> {
    if (
      !Array.isArray(metadata.redirect_uris)
      || metadata.redirect_uris.length === 0
      || !metadata.redirect_uris.every((uri) => validRedirectUri(uri))
    ) {
      return { ok: false, error: "invalid_client_metadata" };
    }

    const clientId = `oac_${randomBytes(16).toString("hex")}`;
    const now = this.clock.now().toISOString();
    const storedMetadata: Record<string, unknown> = {
      ...metadata,
      client_id: clientId,
    };
    const client: OAuthClientRecord = {
      client_id: clientId,
      kind: "dcr",
      client_name: typeof metadata.client_name === "string"
        ? metadata.client_name
        : null,
      redirect_uris: [...metadata.redirect_uris],
      metadata: storedMetadata,
      status: "active",
      created_at: now,
      updated_at: now,
    };
    const created = await this.clients.createClient(toCreateOAuthClientParams(client));
    if (!created.ok) return repoUnavailable(created.error);
    return { ok: true, client };
  }

  validateRedirectUri(
    client: OAuthClientRecord,
    redirectUri: string,
  ): boolean {
    if (client.redirect_uris.includes(redirectUri)) return true;
    // RFC 8252 §7.3: for loopback redirect URIs the port is chosen at request
    // time by the client (e.g. Codex registers http://127.0.0.1/callback and
    // redirects to http://127.0.0.1:<port>/callback), so match ignoring port.
    const candidate = parseLoopbackUri(redirectUri);
    if (!candidate) return false;
    return client.redirect_uris.some((registered) => {
      const loopback = parseLoopbackUri(registered);
      return Boolean(
        loopback
        && loopback.hostname === candidate.hostname
        && loopback.pathname === candidate.pathname,
      );
    });
  }
}

/** Postgres 23505; sqlstack copies the driver code onto DatabaseError.code. */
function isUniqueViolation(cause: unknown): boolean {
  return cause instanceof Error && (
    ("code" in cause && cause.code === "23505")
    || cause.message.toLowerCase().includes("duplicate key value violates unique constraint")
  );
}

function isMetadataObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validRedirectUri(value: string): boolean {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return true;
    // Loopback http redirects are safe per RFC 8252 and are used by native
    // MCP clients (Codex, Claude Code) regardless of whether they declare
    // application_type=native during dynamic client registration.
    return url.protocol === "http:" && isLoopbackHost(url.hostname);
  } catch {
    return false;
  }
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === "[::1]";
}

function parseLoopbackUri(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" && isLoopbackHost(url.hostname)
      ? url
      : null;
  } catch {
    return null;
  }
}
