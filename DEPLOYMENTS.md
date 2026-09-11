# Deployment components

All three Cloudflare applications live in `kazibee/kazibee_home`. Each has an independent workflow; deploying one does not deploy the others.

| Component | Dev workflow | Worker / hostname | Responsibility |
|---|---|---|---|
| Website API and Coordinator | deploy-worker-dev.yml | kazibee-dev / dev.kazibee.com | Website pages, login, executor enrollment/approval, ExecutorCoordinator Durable Object |
| Agent UI | deploy-agent-dev.yml | kazibee-agent-dev / agent-dev.kazibee.com | Serves the exact installed web-agent-renderer package; does not publish or rebuild UI source |
| MCP Gateway | deploy-mcp-dev.yml | kazibee-mcp-dev / mcp-dev.kazibee.com | MCP protocol surface; binds the Website ExecutorCoordinator |

Deploy the Website first, then the satellites. Dispatch each workflow against the same reviewed commit/ref. Dev workflows select the GitHub dev environment and Wrangler dev environment. Production has separate deploy-worker-prod.yml, deploy-agent-prod.yml and deploy-mcp-prod.yml workflows; dev deployment does not invoke them.

Database migrations are separate, manual-only migrate-db-dev.yml / migrate-db-prod.yml workflows. They are not automatically run by deployment.

The remote executor is a locally started process, not a Cloudflare worker. Its enrollment and authenticated reconnect require a separate end-to-end check. Desktop UI package publication is also separate, in kazibee_desktop; publishing a package does not update the Website pin or deploy these workers.
