/**
 * Plain initial-data rows for the test/schemas/oauth.ts fixture. These are
 * literal INSERT rows handed to testPostgres(...).data(...) by the calling
 * case; no repository, service, or app is involved in seeding them. JSONB
 * columns are passed as JSON text (Postgres casts the untyped parameter).
 */
export const OAUTH_FIXTURE_NOW = "2026-01-01T00:00:00.000Z";

/** connect_accounts row for an OAuth connection owner. */
export function accountRow(userId: string) {
  const suffix = userId.replace(/^usr_/, "").toLowerCase();
  return {
    user_id: userId,
    username: `owner_${suffix}`,
    email: `owner_${suffix}@example.com`,
    status: "active",
    created_at: OAUTH_FIXTURE_NOW,
    updated_at: OAUTH_FIXTURE_NOW,
  };
}

/** oauth_clients row (dcr client, one redirect URI, note metadata or null). */
export function oauthClientRow(clientId: string, clientName: string | null) {
  return {
    client_id: clientId,
    kind: "dcr",
    client_name: clientName,
    redirect_uris: JSON.stringify(["https://client.example/callback"]),
    metadata: clientName === null ? null : JSON.stringify({ note: `metadata for ${clientName}` }),
    status: "active",
    created_at: OAUTH_FIXTURE_NOW,
    updated_at: OAUTH_FIXTURE_NOW,
  };
}
