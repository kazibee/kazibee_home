# Repository Instructions

1. Never run the server unless explicitly asked to do so.

## Migrations (@noego/proper)

Migrations are owned by `@noego/proper`. Never author migration files by hand.

1. Create every migration through the CLI, from the kazibee root, with the config that owns the set:
   - durable (all runtimes, incl. Cloudflare): `npx proper -c proper.durable.json create <snake_case_name>`
   - relay (Node runtime only): `npx proper -c proper.relay.json create <snake_case_name>`
   `proper create` writes the `<Date.now()>_<name>.up.sql` / `.down.sql` pair into that config's
   `migration_folder`; only then edit the SQL inside the generated files.
2. Never invent, hand-type, or "sequence" timestamps, and never rename or renumber generated files.
   The timestamp is proper's ordering key and its record in the migrations table.
3. One migration per `create` call; never mix durable and relay tables in one migration.
4. Never edit a migration that has been applied anywhere; add a new one.
5. All SQL is PostgreSQL. `migrations/legacy/` is the retired SQLite history — read-only, never run.
6. Verify with `npx proper -c <config> up`, `down`, `up` against a throwaway local Postgres database
   before committing. Read `noego/proper/README.md` and `noego/proper/framework/MigrationRunner.ts`
   before touching migrations if unsure how proper behaves; do not guess framework behavior.

## Logging and KaziQuery export

1. Application code logs only through `@noego/logger` (`getLogger("kazibee:<layer>:<component>")`);
   rules and anti-patterns are in `instructions/LOGGING.md`. Never `console.log`, never log secrets.
2. Dev Workers export those logs/traces to `https://dev.kaziquery.com`. The full setup guide —
   what to provision in KaziQuery, the ingest HTTP contract and envelope, what the exporter
   admits, the `KAZIQUERY_*` config block, operations and verification — is
   `../kaziquery/docs/ingest-setup.md`. The Kazibee-specific provisioned identities, rollout
   history and satellite (MCP/agent) notes are in `instructions/KAZIQUERY_DEV.md`.
3. `KAZIQUERY_INGEST_KEY` is a Worker secret (SSM → GitHub dev environment). Never print or commit
   it, never query with it, and never reset or delete the `KaziQueryExportRelay` Durable Object:
   its sequence is the producer watermark.

