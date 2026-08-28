import { describe, expect, it } from "vitest";
import { createPostgresTestDatabase } from "../helpers/postgres-test-databases";

describe("PostgreSQL test database templates", () => {
  it("creates isolated full-schema clones from migrations", async () => {
    const first = await createPostgresTestDatabase("full");
    const second = await createPostgresTestDatabase("full");
    try {
      const durableHistory = await first.pool.query(
        "SELECT count(*)::int AS count FROM proper_migrations_durable",
      );
      const relayHistory = await first.pool.query(
        "SELECT count(*)::int AS count FROM proper_migrations_relay",
      );
      expect(durableHistory.rows[0]?.count).toBe(11); // +remote_tool_grants
      expect(relayHistory.rows[0]?.count).toBe(8);

      await first.pool.query(
        `INSERT INTO sessions
          (session_id, user_id, device_id, session_fence_message_id)
         VALUES ($1, $2, $3, $4)`,
        ["ses_isolation01", "usr_isolation01", "dev_isolation01", 0],
      );

      const firstCount = await first.pool.query(
        "SELECT count(*)::int AS count FROM sessions",
      );
      const secondCount = await second.pool.query(
        "SELECT count(*)::int AS count FROM sessions",
      );
      expect(firstCount.rows[0]?.count).toBe(1);
      expect(secondCount.rows[0]?.count).toBe(0);
    } finally {
      await Promise.all([first.close(), second.close()]);
    }
  });

  it("keeps relay tables out of durable-only clones", async () => {
    const database = await createPostgresTestDatabase("durable");
    try {
      const durableHistory = await database.pool.query(
        "SELECT count(*)::int AS count FROM proper_migrations_durable",
      );
      const relayTable = await database.pool.query(
        "SELECT to_regclass('public.sessions') AS table_name",
      );
      expect(durableHistory.rows[0]?.count).toBe(11); // +remote_tool_grants
      expect(relayTable.rows[0]?.table_name).toBeNull();
    } finally {
      await database.close();
    }
  });
});
