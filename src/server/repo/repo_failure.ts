/**
 * What a repository method reports when sqlstack cannot complete its
 * statement: `query_failed` for reads, `write_failed` for writes. `cause` is
 * what sqlstack raised (a DatabaseError holding the driver error and the SQL).
 *
 * Repositories infer these kinds from their Trust.tryAsync mappers. The name
 * exists for the result shapes services still write by hand: those carry the
 * failure as a field until the service itself returns a trust Result.
 */
export type RepoFailure =
  | { kind: "query_failed"; cause: unknown }
  | { kind: "write_failed"; cause: unknown };

/**
 * The failure branch a hand-written `{ ok, reason }` result uses when the
 * repository failed: the lookup could not be answered, which is not the same
 * as a refused credential or a missing row. Controllers answer it with 500.
 */
export type RepoUnavailable = { ok: false; reason: "unavailable"; failure: RepoFailure };

export function repoUnavailable(failure: RepoFailure): RepoUnavailable {
  return { ok: false, reason: "unavailable", failure };
}
