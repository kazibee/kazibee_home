# Development site export

Target: Kazibee dev sites → `https://dev.kaziquery.com`. The main website export
is live. MCP/agent integration is implemented locally but NOT deployed by the
2026-09-13 setup task (see rollout below). Production remains disabled. The
destination is checked at admission and delivery. No browser receives an ingest credential.

## Activation prerequisites

The existing dev console database `kazibee` is
`db_6ca3a2a04ac727c6b4780b22cd56b4e4278b`. Its connector is
`con_kazibee_website_dev`, permitting log and trace, and register producer
`kazibee-website-dev` / epoch `initial-v1`, starting at watermark -1.
The connector/producer and an ingest-only API key have been provisioned for this database and connector.
Keep its value in SSM `/kazibee_web/dev/kaziquery/ingest_key` (SecureString),
then pipe that value to the website repository's **dev** GitHub environment
secret `KAZIQUERY_INGEST_KEY`. Never print it or commit it. The development
deployment workflow uploads this secret when present.

The dev-only `KAZIQUERY_EXPORT_ENABLED` var is now `"true"`. The Worker secret
and GitHub dev environment secret are configured. For subsequent deployments,
build the Worker, exercise a Connect operation, and verify an accepted log/trace.
The configured database label currently says `local`; this integration does
not relabel or repurpose its existing records.

## Policy v2 field catalog

Logs preserve their original message in `message` and their complete JSON context
in `context`. Trace context uses the same field. Context fields are
not selected, renamed or truncated; exporter metadata (`exportPolicyVersion: 2`)
is separate so it cannot overwrite application context. Absent context remains
absent. Normal JSON serialization applies; non-JSON values are not a lossless
transport format. Existing source/event admission filters remain in place.

Relay requests and outgoing records are capped at 64 KiB, matching KaziQuery's
line limit. Oversized records are rejected, not truncated. Old stored records
cannot recover fields previously omitted by policy v1.

## Delivery and recovery

One invocation admits at most 64 records, with at most eight outstanding
handoffs and a 2-second admission deadline. Ordinary logging fails open with
one independent failure diagnostic per invocation. `waitUntil` only protects
initial admission; it does not claim durability. Boot, out-of-request and
Durable Object logs are not included in this initial request-scoped integration.

The private `KaziQueryExportRelay` owns a transactional queue, separate contiguous
delivery sequence, frozen NDJSON and stable batch IDs. It acknowledges
`source_durable` after storage and alarm commit. Pending records are never
silently evicted. Capacity is 32 pending records; full admission fails closed
while the website operation retains its outcome. Admission receipts are kept
for 24 hours; older admission requests are rejected. The source adapter does
not retry unconfirmed admission with a newly minted identity.

Alarms retry network/429/server failures with bounded exponential delay;
redirects and permanent 4xx responses block the stream. Fetch uses `redirect:
"manual"` because Workers does not support `"error"`; credentials never follow
a redirect. Replay uses the exact bytes and
idempotency key. HTTP 202 is the cloud acceptance boundary. Disabling new
admissions leaves existing queue delivery active. Destination changes cannot
retarget queued records. Do not reset or delete the DO to recover a stream.

The private binding supports GET `/status` (pending, blocked, failure count)
and POST `/resume` after correcting a terminal failure. Neither has a public
route. Credential rotation must preserve the key identity accepted by
KaziQuery's pending-batch rules, or an operator must reconcile that batch.
After fixing a transient delivery problem, changing the dev-only
`KAZIQUERY_RETRY_REVISION` schedules one early retry of the existing queue.
It preserves batch identity and does not unblock terminal failures.

## Verification status

On 2026-09-11, dev Worker version `fda7ae82-18dc-40ea-b168-608f8cf6116d`
was confirmed active at 100%. The deployment used successful website release
`22f927233ccbe2c1646725c0bbf7740360237fbd` plus this export integration, avoiding
unrelated working-tree changes. Wrangler uploaded successfully but its final
zone-route inspection failed because the token lacks that permission; the
existing dev domain remained functional and the active version was checked
through the deployments API.

Synthetic unauthorized Connect session requests exercised actual website
logging and tracing. KaziQuery accepted 6 logs and 8 traces from producer
`kazibee-website-dev` at the verification snapshot. Public query results returned
`server.log` rows for that producer and nonzero traces. The separate setup-probe
producer was excluded from acceptance counts. Temporary query-only credentials
were revoked after verification; the website credential remains ingest-only.

The retained queue survived deployments and resumed delivery through live
Durable Object alarms after fixing unsupported `redirect: "error"`. It was still
draining at verification. Full queues reject new admissions, so this bounded
dev integration does not guarantee export of every log under load.

Five focused tests pass, including message/context preservation, exact restart replay, redirects,
terminal credential failure and dev isolation. Application and test type checks
and the Cloudflare build pass. Storage-double tests and this live smoke test do
not qualify throughput or the full spec's rollout gates.

Policy v2 requires the KaziQuery receiver with the additive `context` field deployed first.
Message and context bypass attribute redaction; the original JSON values are stored.

On 2026-09-11, policy v2 was deployed to dev Worker version
`0a461dcb-ce60-4823-9b61-466dfe1684cf` (100% confirmed through the deployments API).
The release staging directory uses installed published `@noego/app@3.1.1` and
`@noego/ioc@0.8.1`, not the active workspace’s development links.
KaziQuery API/web deployed first with context-envelope support and Message column.

Live dashboard verification: record `8f077a56-63e5-4070-9189-424420d2120e`,
sequence 116, contains message `connect.auth.skipped` and the complete context
(action=session, outcome=unauthorized, route, correlationId, count=0).
Message is visible in the table and full context in Inspect/Complete record JSON.

## MCP and agent setup — 13 September 2026

### Architecture and credentials

- `apps/mcp/noego.config.yml` and `apps/agent/noego.config.yml` now enable
  dev-only export and set `KAZIQUERY_SITE` to `mcp` / `agent`.
- Both bind `KaziQueryExportRelay` from `script_name: kazibee-dev`.
  All three sites use the SAME existing DO name `kazibee-dev-v1`. It remains
  the sole sequence owner for `kazibee-website-dev` / `initial-v1`.
  Do not provision separate queues with that producer identity or reset its sequence.
- The existing dataset, connector, producer and ingest-only secret are reused.
  Satellites do not need an ingest secret. There is no new migration, database,
  persistent API key or production configuration.
- Records retain original message/context. Export metadata adds `logger` and
  `site` without overwriting application context.
- Satellite admission is deliberately restricted to the audited
  `kazibee:gateway` logger. Existing tool/provider messages are not automatically
  exported merely because their logger begins with `kazibee`.

### Request coverage

The shared server hooks resolve a request-scoped `GatewayRequestLog`:
`gateway.request.started`, then exactly one `gateway.request.completed` or
`gateway.request.failed`. Fields include a generated request ID, site, sanitized
route template, HTTP method/status, duration, outcome and a validated Cloudflare
Ray ID when present. Authorization, cookies, handoff tokens, query strings, file
paths, bodies, and raw error messages/stacks are excluded.

The additive `ProductBoot.onRequestSettled` hook is owned by the local
`noego/app` package. It runs before response-body leasing, inside the same
request scope, and cannot replace the application's result when logging fails.
This catches HTTP auth/validation rejections, returned 5xx responses and thrown
dispatch failures without reading streams. It does not equate HTTP 200 with MCP
tool success: JSON-RPC domain failures inside 200 responses need their own
domain instrumentation. Boot failures before a request scope exists, edge-generated
502s, post-upgrade WebSocket activity and Durable Object internals remain platform
diagnostic responsibilities.

Main-site HTTP summaries are limited to gateway route families, not all downloads
or page traffic. The pre-existing 32-record relay queue and one-record-per-alarm
delivery remain bounded best-effort admission, NOT lossless capture under load.
Watch `kaziquery.export.admission_failed` in independent Worker logs; a full
queue must not be interpreted as an absence of application activity.

### Read logs

Open `https://dev.kaziquery.com`, select the existing `kazibee` database and
Logs, use a narrow recent time range, then Inspect a record for its complete
context. After rollout, gateway records can be located by message and their
`context.site`, `context.requestId` and `context.cfRay` inspected together.
Context and attribute paths are queryable in WHERE (`context.status >= 500`,
`context.route LIKE '/mcp%'`) and in the explorer search (`context.status:>=500`);
they are not selectable columns.

The public API uses a separate **query:read** key granted only to this database:
`POST https://dev.kaziquery.com/v1/query` with exactly
`{"database":"kazibee","query":"<SQL>"}`. Never use the website ingest key
for querying. Follow the returned status/results links until success, and check
`complete`; do not treat pending or failed queries as an empty log set.

Example SQL (replace FROM_MS and TO_MS with integer UTC milliseconds):

```sql
SELECT occurred_at_ms, message, level, producer_id
FROM logs
WHERE occurred_at_ms >= FROM_MS AND occurred_at_ms < TO_MS
  AND producer_id = 'kazibee-website-dev'
ORDER BY occurred_at_ms DESC
LIMIT 100
```

For programmatic access, create a query-only key in Kaziquery's authenticated
key management UI and keep it outside source control. The setup verification
used a ten-minute query-only key, revoked in cleanup; it did not leave a
persistent query credential.

### Local verification and rollout boundary

The website already links `node_modules/@noego/app` to
`../../noego/app`. The settlement hook is changed in that source repository,
not patched into node_modules. Build it with `npm run build:v1` from that
repository before building the consumer. A registry-only install of the
unchanged published version does not contain this new hook.

No deployment or commit was performed by this setup task. The website and
framework contain substantial pre-existing work; do not ship the entire working
tree as an incidental logging deployment. Prepare a reviewed artifact containing
the source-built framework hook plus these website changes, then deploy the dev
satellites with their export bindings. Keep production untouched. Preserve the
existing main-worker relay namespace and pending records.

Before claiming the dev satellites live: reproduce an unauthenticated MCP
request (expected 401) and Agent session request without Upgrade (expected 426),
retain their Ray IDs, then retrieve matching fresh gateway records from
Kaziquery. Also test an authenticated failing MCP call and check independent
Worker logs for exporter admission failures.

Live verification on 13 September confirmed: main-worker export
binding and ingest secret present; MCP/agent had no export bindings; Kaziquery
contained 747 accepted main-producer batches at the initial snapshot. A public
query returned recent main-site log rows with `complete: true`.
These are evidence for the existing main-site integration, not the new satellite rollout.

Local verification passed after regenerating the framework output from source:
- Website `npm run typecheck`, `npm run test:types`, `npm run lint`.
- 59 focused website tests: five logging/export suites plus the existing
  `remote_tools.testdinner.test.ts` and `remote_tools.testdinner.more.test.ts`.
- Framework `npm run build:v1`, `npm run typecheck`, and 24 tests across
  `request-settled`, `runtime`, `product-runtime`, and `lifetime-safety`.
- `npm run mcp:build` and `npm --ignore-scripts run agent:build` produced
  Cloudflare artifacts; generated dev bindings were inspected and production
  sections contain no Kaziquery configuration. Agent renderer restaging was
  intentionally skipped; this was backend logging verification, not a UI release.
- Real in-process routes proved 200 discovery, 401 MCP auth rejection, 400
  malformed JSON and 426 Agent upgrade rejection reach correlated export
  admission. Relay tests use a storage double; these are not live cross-Worker tests.

Review: the existing website logging guide's boundary/structured-context/privacy
rules are followed by `gateway_request_log.ts`; scoped ownership follows its
IoC guide. The source-owned framework hook and pre-existing local link follow
the cross-package rule; no node_modules patch or package publication remains.
The earlier setup deliberately excluded satellites, so this is a coverage gap,
not a proven cause of the reported MCP failure. The invariant is one correlated
HTTP outcome from the owning request scope, without consuming its stream or
letting logging alter its result. A common hook avoids duplicating instrumentation
across every controller branch. Remaining qualification is live satellite
delivery, authenticated-failure correlation and combined-site burst retention.


Setup guide for connecting any application (provisioning, ingest contract, envelope,
limits, error codes, exporter configuration): `websites/kaziquery/docs/ingest-setup.md`
in the sibling KaziQuery repository.

Canonical Kaziquery documentation:
[Start here](https://kazidoc.com/drive/p_pU2BK5SbBYeV/00%20%E2%80%94%20Start%20Here.md),
[deployment and operations](https://kazidoc.com/drive/p_pU2BK5SbBYeV/spec/15-deployment-and-operations.md),
[HTTP contract](https://kazidoc.com/drive/p_pU2BK5SbBYeV/spec/13-http-api-and-user-experience.md).
The spec distinguishes targets from deployed capabilities; verify implementation
against the local `websites/kaziquery` source and a live query.

