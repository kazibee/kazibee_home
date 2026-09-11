# Development website export

Target: `dev.kazibee.com` → `https://dev.kaziquery.com`. Production and the
agent/MCP satellites are not enabled. The destination is checked at admission
and delivery. No browser receives an ingest credential.

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
