/**
 * Boot hooks for the Remote Tool MCP worker (mcp.kazibee.com).
 *
 * Reuses the main site's server registration: Env, RawRequest capture, and
 * the root-owned database wiring (`register`), plus the legacy node/worker
 * boot for older runtimes. The satellite serves only the MCP surface; grants,
 * consent, and the Connect executor channel stay on kazibee.com.
 */
export { register, node, worker } from "../server/server";
