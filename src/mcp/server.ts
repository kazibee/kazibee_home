/**
 * Boot hooks for the Remote Tool MCP worker (mcp.kazibee.com).
 *
 * Reuses the main site's server boot: IoC container, Env, RawRequest capture,
 * and database wiring. The satellite serves only the MCP surface; grants,
 * consent, and the Connect executor channel stay on kazibee.com.
 */
export { node, worker } from "../server/server";
