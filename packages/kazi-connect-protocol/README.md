# Kazi Connect Protocol

`@kazibee/connect-protocol` is the Website-owned, language-neutral Kazi Connect
V1 contract. The package contains data only: JSON Schema 2020-12 artifacts,
portable fixtures, deterministic scenarios, and a SHA-256 manifest.

## Ownership and transport

The Website owns accounts, browser sessions, executor claims/ownership,
revocation, presence projection, authorization, and the **live** authenticated
HTTP POST/SSE relay. It is management and relay infrastructure only. It has no
coding surface, performs no execution, and is never an execution fallback.

The executor initiates its authenticated outbound channel. There is no inbound
executor listener, direct route, or Desktop-to-executor transport. The Website
has no durable command queue and no command or event replay buffer. A command
or replay request received while its executor is offline is rejected with
`executor-offline`.

The executor owns command acceptance, idempotency, authoritative positive
sequence allocation, the durable journal, and replay. Replay cursors are
exclusive: `afterSequence: n` requests only events with sequence `> n`.

The Desktop is an authenticated, reconnectable client and a non-authoritative
projection. The four distinct roles are `browser_session`, `desktop_device`,
`executor_device`, and the single-use `claim_challenge`.

## Website deployment identity fence

Each Website deployment persists exactly one opaque, non-secret
`websiteDeploymentId` with the strict `wdp_` format. It is minted once and
remains stable across process restarts and origin changes. Successful accepted
Desktop and executor claim status and decision responses return the same
deployment ID, allowing independently linked peers to bind to one Website.

Every `command.post` must include that exact `websiteDeploymentId`. The Website
compares it before registering a relay route or dispatching to an executor.
Missing, malformed, unknown, or mismatched deployment identities fail closed;
a well-formed mismatch returns the typed, non-retryable
`website-deployment-mismatch` protocol error and has no relay side effects.

## Executor discovery presence

Every `executorSummary` includes both the compatibility `online` boolean and required `presence` enum (`online`, `offline`, or `stale`). Desktop discovery uses the exact authenticated relay headers and returns only executors owned by the Desktop device owner.

## Desktop device claim and relay admission

A native or headless Desktop creates a `desktop.claim.create.request` using a
stable `deviceId`, public-key fingerprint, and `desktopVersion`. The Website
returns a `desktop.claim.challenge` containing both an HTTPS account-linked URL
and a short code. An authenticated individual owner (V1 has no teams or shared
ownership) accepts or denies that challenge with a browser session.

The bootstrap value is supplied only through `X-Kazi-Bootstrap-Token`; it is
never a JSON field, response value, fixture value, log field, trace attribute,
or audit payload. Acceptance atomically binds the device to the owner and
promotes the hash of that accepted single-use bootstrap value into the active
Desktop credential at generation `1`. It does not mint or return a second raw
credential. Pending, denied, and expired claims never produce a credential.

Later authenticated Desktop POST and SSE relay requests use the same contract:

| Header | Required value |
|---|---|
| `Authorization` | exactly one `Bearer <credential>` value |
| `X-Kazi-Device-Id` | the claimed Desktop `deviceId` |
| `X-Kazi-Credential-Generation` | canonical positive base-10 integer |
| `X-Kazi-Audience` | literal `desktop-relay` |
| `X-Kazi-Protocol-Version` | literal `1.0` |

Admission requires an owner-bound `desktop_device`, an active credential hash,
the exact current device generation, the `desktop-relay` audience, and a
credential that is neither expired nor revoked. Every listed header must occur
exactly once; combined or duplicate values fail closed. The strict admission
projection's `protocolVersion` is the admitted `X-Kazi-Protocol-Version` header,
not a value inferred from the JSON body. Revocation invalidates the current
credential and fences stale requests by advancing the device generation. POST
and SSE apply the same checks. The machine-readable copy of this header
contract is in `manifest.json`.

## V1 operation allowlist

The complete text-first remote operation surface is:

1. `executor.status.read`
2. `workspaces.read`
3. `threads.read`
4. `thread.read`
5. `conversation.create`
6. `thread.send`
7. `thread.retry`
8. `thread.cancel`
9. `events.replay`

Unknown operations and fields fail closed. V1 never transports filesystem
paths, images, settings, worktree mutations, host-local configuration,
host-local credentials, cookies, bearer material, credential tokens, private
keys, or provider output. Executor and Desktop authentication remain in HTTP
headers and out-of-band secret handling, never in JSON envelopes.

The live relay necessarily transports `thread.send`'s bounded user text and
safe projected executor-event text transiently. The Website must never execute,
durably persist, log, trace, or audit that content. It forwards the bounded
live content only; it does not retain a provider prompt transcript or become a
prompt-history authority.

## Remote conversation creation and binding receipts

`conversation.create` is the only canonical remote creation boundary. Its
closed payload carries a stable `clientCreationId`, display-safe `title`, and
the exact `websiteDeploymentId`, `executorId`, and `remoteWorkspaceId` target.
The executor runtime atomically creates the conversation and immutable binding
and returns the strict remote `ExecutionBindingReceipt`:

`{ conversationId, kind: "remote", websiteDeploymentId, executorId, remoteWorkspaceId }`.

The Website authenticates and relays that receipt transiently. It does not
persist a conversation or binding, treat the receipt as authority, or use it to
reroute work. Canonical `thread.send`, `thread.retry`, and `thread.cancel`
payloads carry a stable `clientOperationId`, their `conversationId`, and the
exact receipt as `expectedExecutionBinding`. The reached executor runtime—not
the Website—loads its authoritative binding and compares it before mutation.

As a migration-only V1 variant, `thread.send` may carry the old new-thread
shape only when it is explicitly discriminated by `phase: "start"`. It adapts
legacy synchronized clients to create-plus-submit and is not a second
canonical creation contract. Canonical and legacy fields cannot be mixed.

Before rate accounting, executor lookup, route registration, or dispatch, the
Website checks that top-level deployment/executor coordinates exactly match
the nested creation target or receipt coordinates and that a mutation's nested
receipt `conversationId` equals its payload `conversationId`. Rejection has no
relay side effects.

## Command acceptance, results, and owner SSE

The executor journals a command before returning `command.accepted`; that
acknowledgement may be relayed as the Desktop command POST response. The
Website never accepts on the executor's behalf and never stores command
content. Subsequent non-replay outcomes use `command.result`, whose `operation`
strictly selects exactly one closed `result` shape. `events.replay` deliberately
continues to use `events.replay.result` or `events.replay.gap`.

Read results contain only opaque IDs, bounded arrays and cursors, safe display
names/titles, UTC timestamps, explicit thread/message roles and statuses, and
bounded text-first transcript pages. Mutation results expose only the opaque
thread/stream identities and launch or cancellation outcome needed for Desktop
projection. They contain no host path, setting, credential, provider detail, or
provider-native output.

`executor.status.read` identifies the executor with a bounded safe
`displayName`, reports its `idle` or `busy` state, and includes a closed
`capabilities` object. The only capability fields are the boolean availability
flags `git`, `codex`, and `claude`. Paths, versions, configuration, credentials,
model lists, and provider output are forbidden. The outer `command.result`
continues to carry `executorId` and the literal protocol version, so the nested
status result does not duplicate them.

An authenticated Desktop owner SSE stream may carry presence,
`command.result`, `executor.event`, replay result/gap, and safe `error`
envelopes transiently. Browser owner SSE remains presence-only, preventing a
browser session from receiving command or transcript content.

## Compatibility

Package `1.0.8` adds these closed creation, receipt, mutation, and result forms;
`protocolVersion` remains the literal string `1.0`. Implementations must reject any
other value with `protocol-version-mismatch`. See [COMPATIBILITY.md](COMPATIBILITY.md).
Canonical integrity data is in [manifest.json](manifest.json).
