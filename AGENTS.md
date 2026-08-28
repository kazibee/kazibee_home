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

