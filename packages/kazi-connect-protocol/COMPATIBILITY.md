# Kazi Connect V1 compatibility matrix

| Package | Protocol | JSON Schema | Website | Executor | Desktop |
|---|---|---|---|---|---|
| `@kazibee/connect-protocol@1.0.8` | literal `1.0` | 2020-12 | authoritative owner/transient relay; durable deployment identity fence; no conversation/binding persistence | authoritative conversation/binding/journal/replay/execution/results | authenticated projection; device claim + generation-fenced relay admission |

| Peer advertises | V1 behavior |
|---|---|
| `1.0` | Validate the complete envelope and continue. |
| Missing version | Reject as `invalid-envelope`. |
| Any other version | Reject as `protocol-version-mismatch`; do not downgrade. |
| Unknown operation | Reject as `unknown-operation`; do not forward. |
| Unknown field or discriminant | Reject as `invalid-envelope`. |

Backwards-compatible V1 additions require a new package patch version while
keeping the literal protocol version `1.0`. Incompatible envelope changes
require a protocol-version change. Implementations must not silently extend an
object because every object is closed with `additionalProperties: false`.

Package `1.0.6` requires accepted Desktop claim status and decision responses to include the opaque authorizing `websiteAccountId`. The literal protocol remains `1.0`.

Package `1.0.7` requires the same stable `websiteDeploymentId` in successful
accepted Desktop and executor claim status/decision responses and in every
`command.post`. A well-formed but different deployment target is rejected as
`website-deployment-mismatch` before relay route registration or executor
dispatch. The literal protocol remains `1.0`.

Package `1.0.8` adds explicit remote `conversation.create`, the closed remote
`ExecutionBindingReceipt`, a strict creation `command.result`, and canonical
binding-aware submit/retry/cancel payloads with stable `clientOperationId`.
The old new-thread `thread.send` is retained only as the explicitly
discriminated `phase: "start"` migration variant. Top-level and nested
deployment/executor coordinates, plus mutation conversation/receipt identity,
are fenced before relay side effects. Website remains an authenticated
transient relay and never persists or interprets binding authority. The
literal protocol remains `1.0`.

Package `1.0.4` completes the additive `executor.status.read` result with its
required bounded `displayName` identity and closed redacted `capabilities`
object. Capabilities expose only boolean `git`, `codex`, and `claude`
availability; host-local paths, versions, configuration, credentials, model
lists, and provider output remain forbidden. The outer result retains
`executorId` and literal `protocolVersion`, without nested duplication.

Package `1.0.3` added the strict operation-discriminated `command.result`
envelope, bounded/path-free projection records, and Desktop-only result/replay/
error owner SSE payloads. Browser owner SSE is presence-only. It also makes the
already-required, single-valued `X-Kazi-Protocol-Version: 1.0` Desktop POST/SSE
relay header explicit in the manifest, documentation, and admission-context
description. Existing `events.replay.result` and `events.replay.gap` envelopes
remain unchanged. Website remains management plus transient relay only; it
never executes or persists commands, results, events, or transcript content.
