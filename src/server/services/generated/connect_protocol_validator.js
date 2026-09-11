// GENERATED FILE — DO NOT EDIT.
// Source: ../packages/kazi-connect-protocol/schemas/kazi-connect-v1.schema.json
// schemaSha256: 79b7a8be1338855681a3b5b5ce66e0c135eddf7c2a07bdaab96ca9552a3112ec
// ajv: 8.20.0 (Ajv2020, {"allErrors":false,"strict":true})
// Regenerate: node scripts/generate-connect-validator.mjs
// Drift check: node scripts/generate-connect-validator.mjs --check
/* eslint-disable */
export const SCHEMA_SHA256 = "79b7a8be1338855681a3b5b5ce66e0c135eddf7c2a07bdaab96ca9552a3112ec";
import func1Module from "ajv/dist/runtime/ucs2length.js";
"use strict";
export const validate = validate20;
export default validate20;
const schema31 = {"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"https://kazibee.example/schemas/kazi-connect-v1.schema.json","title":"Kazi Connect V1","oneOf":[{"$ref":"#/$defs/signupRequest"},{"$ref":"#/$defs/signupResponse"},{"$ref":"#/$defs/loginRequest"},{"$ref":"#/$defs/loginResponse"},{"$ref":"#/$defs/sessionRequest"},{"$ref":"#/$defs/sessionResponse"},{"$ref":"#/$defs/logoutRequest"},{"$ref":"#/$defs/logoutResponse"},{"$ref":"#/$defs/claimChallenge"},{"$ref":"#/$defs/claimCreateRequest"},{"$ref":"#/$defs/claimStatusResponse"},{"$ref":"#/$defs/claimDecisionRequest"},{"$ref":"#/$defs/claimDecisionResponse"},{"$ref":"#/$defs/desktopClaimCreateRequest"},{"$ref":"#/$defs/desktopClaimChallenge"},{"$ref":"#/$defs/desktopClaimStatusResponse"},{"$ref":"#/$defs/desktopClaimDecisionRequest"},{"$ref":"#/$defs/desktopClaimDecisionResponse"},{"$ref":"#/$defs/desktopRelayAuthContext"},{"$ref":"#/$defs/executorListResponse"},{"$ref":"#/$defs/executorDetailResponse"},{"$ref":"#/$defs/executorRenameRequest"},{"$ref":"#/$defs/executorActionRequest"},{"$ref":"#/$defs/executorActionResponse"},{"$ref":"#/$defs/channelHello"},{"$ref":"#/$defs/channelHeartbeat"},{"$ref":"#/$defs/channelAck"},{"$ref":"#/$defs/revokedControl"},{"$ref":"#/$defs/commandPost"},{"$ref":"#/$defs/commandAccepted"},{"$ref":"#/$defs/commandResult"},{"$ref":"#/$defs/ownerSseEvent"},{"$ref":"#/$defs/executorEventFrame"},{"$ref":"#/$defs/replayRequest"},{"$ref":"#/$defs/replayResult"},{"$ref":"#/$defs/replayGap"},{"$ref":"#/$defs/errorEnvelope"}],"$defs":{"protocolVersion":{"type":"string","const":"1.0"},"timestamp":{"type":"string","pattern":"^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$","maxLength":30},"userId":{"type":"string","pattern":"^usr_[A-Za-z0-9]{8,64}$","maxLength":68},"sessionId":{"type":"string","pattern":"^ses_[A-Za-z0-9]{8,64}$","maxLength":68},"executorId":{"type":"string","pattern":"^exe_[A-Za-z0-9]{8,64}$","maxLength":68},"deviceId":{"type":"string","pattern":"^dev_[A-Za-z0-9]{8,64}$","maxLength":68},"claimId":{"type":"string","pattern":"^clm_[A-Za-z0-9]{8,64}$","maxLength":68},"commandId":{"type":"string","pattern":"^cmd_[A-Za-z0-9]{8,64}$","maxLength":68},"correlationId":{"type":"string","pattern":"^cor_[A-Za-z0-9]{8,64}$","maxLength":68},"workspaceId":{"type":"string","pattern":"^wrk_[A-Za-z0-9]{8,64}$","maxLength":68},"threadId":{"type":"string","pattern":"^thr_[A-Za-z0-9]{8,64}$","maxLength":68},"conversationId":{"type":"string","pattern":"^thr_[A-Za-z0-9]{8,64}$","maxLength":68},"clientCreationId":{"type":"string","pattern":"^ccr_[A-Za-z0-9_-]{16,80}$","maxLength":84},"clientOperationId":{"type":"string","pattern":"^cop_[A-Za-z0-9_-]{16,80}$","maxLength":84},"messageId":{"type":"string","pattern":"^msg_[A-Za-z0-9]{8,64}$","maxLength":68},"eventId":{"type":"string","pattern":"^evt_[A-Za-z0-9]{8,64}$","maxLength":68},"streamId":{"type":"string","pattern":"^str_[A-Za-z0-9]{8,64}$","maxLength":68},"cursor":{"type":"string","pattern":"^cur_[A-Za-z0-9_-]{8,128}$","maxLength":132},"idempotencyKey":{"type":"string","pattern":"^idem_[A-Za-z0-9_-]{16,80}$","maxLength":85},"sequence":{"type":"integer","minimum":1,"maximum":9007199254740991},"role":{"type":"string","enum":["browser_session","desktop_device","executor_device","claim_challenge"]},"operation":{"type":"string","enum":["executor.status.read","workspaces.read","threads.read","thread.read","conversation.create","thread.send","thread.retry","thread.cancel","events.replay"]},"errorCode":{"type":"string","enum":["executor-offline","protocol-version-mismatch","unknown-operation","invalid-envelope","idempotency-conflict","replay-gap","revoked","website-deployment-mismatch"]},"rawUsername":{"type":"string","description":"Raw account input; implementations trim leading/trailing whitespace and lowercase ASCII letters before validation.","pattern":"^\\s*[A-Za-z0-9][A-Za-z0-9._-]{2,63}\\s*$","minLength":3,"maxLength":128},"username":{"type":"string","description":"Canonical normalized account username used for storage and responses.","pattern":"^[a-z0-9][a-z0-9._-]{2,63}$","minLength":3,"maxLength":64},"password":{"type":"string","minLength":12,"maxLength":128},"displayName":{"type":"string","pattern":"^[A-Za-z0-9][A-Za-z0-9 ._()-]{0,79}$","maxLength":80},"platform":{"type":"string","enum":["macos","linux","windows"]},"architecture":{"type":"string","enum":["x64","arm64"]},"executorVersion":{"type":"string","pattern":"^[0-9]+\\.[0-9]+\\.[0-9]+(?:[-+][A-Za-z0-9.-]{1,32})?$","maxLength":64},"desktopVersion":{"type":"string","pattern":"^[0-9]+\\.[0-9]+\\.[0-9]+(?:[-+][A-Za-z0-9.-]{1,32})?$","maxLength":64},"credentialGeneration":{"type":"integer","minimum":1,"maximum":9007199254740991},"desktopRelayAudience":{"type":"string","const":"desktop-relay"},"keyFingerprint":{"type":"string","pattern":"^[a-f0-9]{64}$","maxLength":64},"claimUrl":{"type":"string","pattern":"^https://[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?(?::[0-9]{1,5})?(?:/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*)?(?:\\?[A-Za-z0-9._~!$&'()*+,;=:@%/?-]*)?$","maxLength":512},"modelId":{"type":"string","pattern":"^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$","maxLength":128},"signupRequest":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","username","password","idempotencyKey","correlationId"],"properties":{"kind":{"const":"auth.signup.request"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"username":{"$ref":"#/$defs/rawUsername"},"password":{"$ref":"#/$defs/password"},"idempotencyKey":{"$ref":"#/$defs/idempotencyKey"},"correlationId":{"$ref":"#/$defs/correlationId"}}},"signupResponse":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","userId","username","correlationId"],"properties":{"kind":{"const":"auth.signup.response"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"userId":{"$ref":"#/$defs/userId"},"username":{"$ref":"#/$defs/username"},"correlationId":{"$ref":"#/$defs/correlationId"}}},"loginRequest":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","username","password","idempotencyKey","correlationId"],"properties":{"kind":{"const":"auth.login.request"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"username":{"$ref":"#/$defs/rawUsername"},"password":{"$ref":"#/$defs/password"},"idempotencyKey":{"$ref":"#/$defs/idempotencyKey"},"correlationId":{"$ref":"#/$defs/correlationId"}}},"loginResponse":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","userId","sessionId","actorRole","expiresAt","correlationId"],"properties":{"kind":{"const":"auth.login.response"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"userId":{"$ref":"#/$defs/userId"},"sessionId":{"$ref":"#/$defs/sessionId"},"actorRole":{"const":"browser_session"},"expiresAt":{"$ref":"#/$defs/timestamp"},"correlationId":{"$ref":"#/$defs/correlationId"}}},"sessionRequest":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","sessionId","actorRole","correlationId"],"properties":{"kind":{"const":"auth.session.request"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"sessionId":{"$ref":"#/$defs/sessionId"},"actorRole":{"const":"browser_session"},"correlationId":{"$ref":"#/$defs/correlationId"}}},"sessionResponse":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","userId","sessionId","actorRole","expiresAt","correlationId"],"properties":{"kind":{"const":"auth.session.response"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"userId":{"$ref":"#/$defs/userId"},"sessionId":{"$ref":"#/$defs/sessionId"},"actorRole":{"const":"browser_session"},"expiresAt":{"$ref":"#/$defs/timestamp"},"correlationId":{"$ref":"#/$defs/correlationId"}}},"logoutRequest":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","sessionId","actorRole","idempotencyKey","correlationId"],"properties":{"kind":{"const":"auth.logout.request"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"sessionId":{"$ref":"#/$defs/sessionId"},"actorRole":{"const":"browser_session"},"idempotencyKey":{"$ref":"#/$defs/idempotencyKey"},"correlationId":{"$ref":"#/$defs/correlationId"}}},"logoutResponse":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","sessionId","ended","correlationId"],"properties":{"kind":{"const":"auth.logout.response"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"sessionId":{"$ref":"#/$defs/sessionId"},"ended":{"const":true},"correlationId":{"$ref":"#/$defs/correlationId"}}},"claimChallenge":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","claimId","actorRole","claimUrl","shortCode","displayName","platform","architecture","executorVersion","keyFingerprint","expiresAt","correlationId"],"properties":{"kind":{"const":"executor.claim.challenge"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"claimId":{"$ref":"#/$defs/claimId"},"actorRole":{"const":"claim_challenge"},"claimUrl":{"$ref":"#/$defs/claimUrl"},"shortCode":{"type":"string","pattern":"^[A-Z]{4}-[A-Z]{4}$","maxLength":9},"displayName":{"$ref":"#/$defs/displayName"},"platform":{"$ref":"#/$defs/platform"},"architecture":{"$ref":"#/$defs/architecture"},"executorVersion":{"$ref":"#/$defs/executorVersion"},"keyFingerprint":{"$ref":"#/$defs/keyFingerprint"},"expiresAt":{"$ref":"#/$defs/timestamp"},"correlationId":{"$ref":"#/$defs/correlationId"}}},"claimCreateRequest":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","claimId","executorId","deviceId","actorRole","displayName","platform","architecture","executorVersion","keyFingerprint","idempotencyKey","correlationId"],"allOf":[{"if":{"properties":{"platform":{"const":"windows"}},"required":["platform"]},"then":{"properties":{"architecture":{"const":"x64"}}}}],"properties":{"kind":{"const":"executor.claim.create.request"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"claimId":{"$ref":"#/$defs/claimId"},"executorId":{"$ref":"#/$defs/executorId"},"deviceId":{"$ref":"#/$defs/deviceId"},"actorRole":{"const":"executor_device"},"displayName":{"$ref":"#/$defs/displayName"},"platform":{"$ref":"#/$defs/platform"},"architecture":{"$ref":"#/$defs/architecture"},"executorVersion":{"$ref":"#/$defs/executorVersion"},"keyFingerprint":{"$ref":"#/$defs/keyFingerprint"},"idempotencyKey":{"$ref":"#/$defs/idempotencyKey"},"correlationId":{"$ref":"#/$defs/correlationId"}}},"claimStatusResponse":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","claimId","status","correlationId"],"properties":{"kind":{"const":"executor.claim.status.response"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"claimId":{"$ref":"#/$defs/claimId"},"status":{"enum":["pending","accepted","denied","expired"]},"correlationId":{"$ref":"#/$defs/correlationId"},"websiteDeploymentId":{"$ref":"#/$defs/websiteDeploymentId"}},"allOf":[{"if":{"properties":{"status":{"const":"accepted"}},"required":["status"]},"then":{"required":["websiteDeploymentId"],"properties":{"websiteDeploymentId":{"$ref":"#/$defs/websiteDeploymentId"}}},"else":{"properties":{"websiteDeploymentId":false}}}]},"claimDecisionRequest":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","claimId","sessionId","actorRole","decision","idempotencyKey","correlationId"],"properties":{"kind":{"const":"executor.claim.decision.request"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"claimId":{"$ref":"#/$defs/claimId"},"sessionId":{"$ref":"#/$defs/sessionId"},"actorRole":{"const":"browser_session"},"decision":{"enum":["accept","deny"]},"idempotencyKey":{"$ref":"#/$defs/idempotencyKey"},"correlationId":{"$ref":"#/$defs/correlationId"}}},"claimDecisionResponse":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","claimId","status","correlationId"],"properties":{"kind":{"const":"executor.claim.decision.response"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"claimId":{"$ref":"#/$defs/claimId"},"status":{"enum":["accepted","denied"]},"correlationId":{"$ref":"#/$defs/correlationId"},"websiteDeploymentId":{"$ref":"#/$defs/websiteDeploymentId"}},"allOf":[{"if":{"properties":{"status":{"const":"accepted"}},"required":["status"]},"then":{"required":["websiteDeploymentId"],"properties":{"websiteDeploymentId":{"$ref":"#/$defs/websiteDeploymentId"}}},"else":{"properties":{"websiteDeploymentId":false}}}]},"desktopClaimCreateRequest":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","claimId","deviceId","actorRole","displayName","platform","architecture","desktopVersion","keyFingerprint","idempotencyKey","correlationId"],"allOf":[{"if":{"properties":{"platform":{"const":"windows"}},"required":["platform"]},"then":{"properties":{"architecture":{"const":"x64"}}}}],"properties":{"kind":{"const":"desktop.claim.create.request"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"claimId":{"$ref":"#/$defs/claimId"},"deviceId":{"$ref":"#/$defs/deviceId"},"actorRole":{"const":"desktop_device"},"displayName":{"$ref":"#/$defs/displayName"},"platform":{"$ref":"#/$defs/platform"},"architecture":{"$ref":"#/$defs/architecture"},"desktopVersion":{"$ref":"#/$defs/desktopVersion"},"keyFingerprint":{"$ref":"#/$defs/keyFingerprint"},"idempotencyKey":{"$ref":"#/$defs/idempotencyKey"},"correlationId":{"$ref":"#/$defs/correlationId"}}},"desktopClaimChallenge":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","claimId","actorRole","claimUrl","shortCode","deviceId","displayName","platform","architecture","desktopVersion","keyFingerprint","expiresAt","correlationId"],"properties":{"kind":{"const":"desktop.claim.challenge"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"claimId":{"$ref":"#/$defs/claimId"},"actorRole":{"const":"claim_challenge"},"claimUrl":{"$ref":"#/$defs/claimUrl"},"shortCode":{"type":"string","pattern":"^[A-Z]{4}-[A-Z]{4}$","maxLength":9},"deviceId":{"$ref":"#/$defs/deviceId"},"displayName":{"$ref":"#/$defs/displayName"},"platform":{"$ref":"#/$defs/platform"},"architecture":{"$ref":"#/$defs/architecture"},"desktopVersion":{"$ref":"#/$defs/desktopVersion"},"keyFingerprint":{"$ref":"#/$defs/keyFingerprint"},"expiresAt":{"$ref":"#/$defs/timestamp"},"correlationId":{"$ref":"#/$defs/correlationId"}}},"desktopClaimStatusResponse":{"oneOf":[{"$ref":"#/$defs/desktopClaimPendingStatus"},{"$ref":"#/$defs/desktopClaimAcceptedStatus"},{"$ref":"#/$defs/desktopClaimDeniedStatus"},{"$ref":"#/$defs/desktopClaimExpiredStatus"}]},"desktopClaimPendingStatus":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","claimId","status","correlationId"],"properties":{"kind":{"const":"desktop.claim.status.response"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"claimId":{"$ref":"#/$defs/claimId"},"status":{"const":"pending"},"correlationId":{"$ref":"#/$defs/correlationId"}}},"desktopClaimAcceptedStatus":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","claimId","status","deviceId","actorRole","credentialAudience","credentialGeneration","credentialExpiresAt","websiteAccountId","websiteDeploymentId","correlationId"],"properties":{"kind":{"const":"desktop.claim.status.response"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"claimId":{"$ref":"#/$defs/claimId"},"status":{"const":"accepted"},"deviceId":{"$ref":"#/$defs/deviceId"},"actorRole":{"const":"desktop_device"},"credentialAudience":{"$ref":"#/$defs/desktopRelayAudience"},"credentialGeneration":{"const":1},"credentialExpiresAt":{"$ref":"#/$defs/timestamp"},"correlationId":{"$ref":"#/$defs/correlationId"},"websiteAccountId":{"$ref":"#/$defs/websiteAccountId"},"websiteDeploymentId":{"$ref":"#/$defs/websiteDeploymentId"}}},"desktopClaimDeniedStatus":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","claimId","status","correlationId"],"properties":{"kind":{"const":"desktop.claim.status.response"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"claimId":{"$ref":"#/$defs/claimId"},"status":{"const":"denied"},"correlationId":{"$ref":"#/$defs/correlationId"}}},"desktopClaimExpiredStatus":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","claimId","status","correlationId"],"properties":{"kind":{"const":"desktop.claim.status.response"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"claimId":{"$ref":"#/$defs/claimId"},"status":{"const":"expired"},"correlationId":{"$ref":"#/$defs/correlationId"}}},"desktopClaimDecisionRequest":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","claimId","sessionId","actorRole","decision","idempotencyKey","correlationId"],"properties":{"kind":{"const":"desktop.claim.decision.request"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"claimId":{"$ref":"#/$defs/claimId"},"sessionId":{"$ref":"#/$defs/sessionId"},"actorRole":{"const":"browser_session"},"decision":{"enum":["accept","deny"]},"idempotencyKey":{"$ref":"#/$defs/idempotencyKey"},"correlationId":{"$ref":"#/$defs/correlationId"}}},"desktopClaimDecisionResponse":{"oneOf":[{"$ref":"#/$defs/desktopClaimAcceptedDecision"},{"$ref":"#/$defs/desktopClaimDeniedDecision"}]},"desktopClaimAcceptedDecision":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","claimId","status","deviceId","actorRole","credentialAudience","credentialGeneration","credentialExpiresAt","websiteAccountId","websiteDeploymentId","correlationId"],"properties":{"kind":{"const":"desktop.claim.decision.response"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"claimId":{"$ref":"#/$defs/claimId"},"status":{"const":"accepted"},"deviceId":{"$ref":"#/$defs/deviceId"},"actorRole":{"const":"desktop_device"},"credentialAudience":{"$ref":"#/$defs/desktopRelayAudience"},"credentialGeneration":{"const":1},"credentialExpiresAt":{"$ref":"#/$defs/timestamp"},"correlationId":{"$ref":"#/$defs/correlationId"},"websiteAccountId":{"$ref":"#/$defs/websiteAccountId"},"websiteDeploymentId":{"$ref":"#/$defs/websiteDeploymentId"}}},"desktopClaimDeniedDecision":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","claimId","status","correlationId"],"properties":{"kind":{"const":"desktop.claim.decision.response"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"claimId":{"$ref":"#/$defs/claimId"},"status":{"const":"denied"},"correlationId":{"$ref":"#/$defs/correlationId"}}},"desktopRelayAuthContext":{"description":"Strict admission projection after exactly one X-Kazi-Protocol-Version: 1.0 header and all Desktop relay credential headers have been validated.","oneOf":[{"$ref":"#/$defs/desktopActiveCredentialContext"},{"$ref":"#/$defs/desktopExpiredCredentialContext"},{"$ref":"#/$defs/desktopRevokedCredentialContext"}]},"desktopActiveCredentialContext":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","deviceId","actorRole","audience","credentialGeneration","credentialState","expiresAt"],"properties":{"kind":{"const":"desktop.relay.auth.context"},"protocolVersion":{"$ref":"#/$defs/protocolVersion","description":"The single admitted X-Kazi-Protocol-Version header value."},"deviceId":{"$ref":"#/$defs/deviceId"},"actorRole":{"const":"desktop_device"},"audience":{"$ref":"#/$defs/desktopRelayAudience"},"credentialGeneration":{"$ref":"#/$defs/credentialGeneration"},"credentialState":{"const":"active"},"expiresAt":{"$ref":"#/$defs/timestamp"}}},"desktopExpiredCredentialContext":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","deviceId","actorRole","audience","credentialGeneration","credentialState","expiresAt"],"properties":{"kind":{"const":"desktop.relay.auth.context"},"protocolVersion":{"$ref":"#/$defs/protocolVersion","description":"The single admitted X-Kazi-Protocol-Version header value."},"deviceId":{"$ref":"#/$defs/deviceId"},"actorRole":{"const":"desktop_device"},"audience":{"$ref":"#/$defs/desktopRelayAudience"},"credentialGeneration":{"$ref":"#/$defs/credentialGeneration"},"credentialState":{"const":"expired"},"expiresAt":{"$ref":"#/$defs/timestamp"}}},"desktopRevokedCredentialContext":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","deviceId","actorRole","audience","credentialGeneration","credentialState","expiresAt","revokedAt"],"properties":{"kind":{"const":"desktop.relay.auth.context"},"protocolVersion":{"$ref":"#/$defs/protocolVersion","description":"The single admitted X-Kazi-Protocol-Version header value."},"deviceId":{"$ref":"#/$defs/deviceId"},"actorRole":{"const":"desktop_device"},"audience":{"$ref":"#/$defs/desktopRelayAudience"},"credentialGeneration":{"$ref":"#/$defs/credentialGeneration"},"credentialState":{"const":"revoked"},"expiresAt":{"$ref":"#/$defs/timestamp"},"revokedAt":{"$ref":"#/$defs/timestamp"}}},"executorSummary":{"type":"object","additionalProperties":false,"required":["executorId","displayName","state","online","presence","protocolVersion"],"properties":{"executorId":{"$ref":"#/$defs/executorId"},"displayName":{"type":"string","minLength":1,"maxLength":80},"state":{"enum":["active","revoked","archived"]},"online":{"type":"boolean"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"presence":{"enum":["online","offline","stale"]}}},"executorListResponse":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","executors","correlationId"],"properties":{"kind":{"const":"executor.list.response"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"executors":{"type":"array","maxItems":100,"items":{"$ref":"#/$defs/executorSummary"}},"correlationId":{"$ref":"#/$defs/correlationId"}}},"executorDetailResponse":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","executor","deviceId","actorRole","lastSeenAt","correlationId"],"properties":{"kind":{"const":"executor.detail.response"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"executor":{"$ref":"#/$defs/executorSummary"},"deviceId":{"$ref":"#/$defs/deviceId"},"actorRole":{"const":"executor_device"},"lastSeenAt":{"$ref":"#/$defs/timestamp"},"correlationId":{"$ref":"#/$defs/correlationId"}}},"executorRenameRequest":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","executorId","displayName","idempotencyKey","correlationId"],"properties":{"kind":{"const":"executor.rename.request"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"executorId":{"$ref":"#/$defs/executorId"},"displayName":{"type":"string","minLength":1,"maxLength":80},"idempotencyKey":{"$ref":"#/$defs/idempotencyKey"},"correlationId":{"$ref":"#/$defs/correlationId"}}},"executorActionRequest":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","executorId","action","idempotencyKey","correlationId"],"properties":{"kind":{"const":"executor.action.request"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"executorId":{"$ref":"#/$defs/executorId"},"action":{"enum":["revoke","archive"]},"idempotencyKey":{"$ref":"#/$defs/idempotencyKey"},"correlationId":{"$ref":"#/$defs/correlationId"}}},"executorActionResponse":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","executorId","state","correlationId"],"properties":{"kind":{"const":"executor.action.response"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"executorId":{"$ref":"#/$defs/executorId"},"state":{"enum":["revoked","archived"]},"correlationId":{"$ref":"#/$defs/correlationId"}}},"channelHello":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","executorId","deviceId","actorRole","correlationId"],"properties":{"kind":{"const":"channel.hello"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"executorId":{"$ref":"#/$defs/executorId"},"deviceId":{"$ref":"#/$defs/deviceId"},"actorRole":{"const":"executor_device"},"correlationId":{"$ref":"#/$defs/correlationId"}}},"channelHeartbeat":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","executorId","deviceId","actorRole","state","sentAt","correlationId"],"properties":{"kind":{"const":"channel.heartbeat"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"executorId":{"$ref":"#/$defs/executorId"},"deviceId":{"$ref":"#/$defs/deviceId"},"actorRole":{"const":"executor_device"},"state":{"enum":["idle","busy"]},"sentAt":{"$ref":"#/$defs/timestamp"},"correlationId":{"$ref":"#/$defs/correlationId"}}},"channelAck":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","executorId","acknowledgedKind","correlationId"],"properties":{"kind":{"const":"channel.ack"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"executorId":{"$ref":"#/$defs/executorId"},"acknowledgedKind":{"enum":["channel.hello","channel.heartbeat"]},"correlationId":{"$ref":"#/$defs/correlationId"}}},"revokedControl":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","executorId","code","correlationId"],"properties":{"kind":{"const":"channel.revoked"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"executorId":{"$ref":"#/$defs/executorId"},"code":{"const":"revoked"},"correlationId":{"$ref":"#/$defs/correlationId"}}},"commandPayload":{"anyOf":[{"$ref":"#/$defs/statusPayload"},{"$ref":"#/$defs/workspacesPayload"},{"$ref":"#/$defs/threadsPayload"},{"$ref":"#/$defs/threadReadPayload"},{"$ref":"#/$defs/conversationCreatePayload"},{"$ref":"#/$defs/threadSendPayload"},{"$ref":"#/$defs/threadRetryPayload"},{"$ref":"#/$defs/threadCancelPayload"},{"$ref":"#/$defs/replayPayload"}]},"statusPayload":{"type":"object","additionalProperties":false,"required":[],"properties":{}},"workspacesPayload":{"type":"object","additionalProperties":false,"required":["limit"],"properties":{"limit":{"type":"integer","minimum":1,"maximum":100},"cursor":{"$ref":"#/$defs/cursor"}}},"threadsPayload":{"type":"object","additionalProperties":false,"required":["workspaceId","limit"],"properties":{"workspaceId":{"$ref":"#/$defs/workspaceId"},"limit":{"type":"integer","minimum":1,"maximum":100},"cursor":{"$ref":"#/$defs/cursor"}}},"threadReadPayload":{"type":"object","additionalProperties":false,"required":["threadId","afterSequence","limit"],"properties":{"threadId":{"$ref":"#/$defs/threadId"},"afterSequence":{"type":"integer","minimum":0,"maximum":9007199254740990},"limit":{"type":"integer","minimum":1,"maximum":200},"cursor":{"$ref":"#/$defs/cursor"}}},"executionBindingReceipt":{"$ref":"#/$defs/remoteExecutionBindingReceipt"},"remoteExecutionBindingReceipt":{"type":"object","additionalProperties":false,"required":["conversationId","kind","websiteDeploymentId","executorId","remoteWorkspaceId"],"properties":{"conversationId":{"$ref":"#/$defs/conversationId"},"kind":{"const":"remote"},"websiteDeploymentId":{"$ref":"#/$defs/websiteDeploymentId"},"executorId":{"$ref":"#/$defs/executorId"},"remoteWorkspaceId":{"$ref":"#/$defs/workspaceId"}}},"conversationTitle":{"type":"string","pattern":"^[A-Za-z0-9][A-Za-z0-9 ._(),:;'-]{0,159}$","minLength":1,"maxLength":160},"conversationCreatePayload":{"type":"object","additionalProperties":false,"required":["clientCreationId","title","websiteDeploymentId","executorId","remoteWorkspaceId"],"properties":{"clientCreationId":{"$ref":"#/$defs/clientCreationId"},"title":{"$ref":"#/$defs/conversationTitle"},"websiteDeploymentId":{"$ref":"#/$defs/websiteDeploymentId"},"executorId":{"$ref":"#/$defs/executorId"},"remoteWorkspaceId":{"$ref":"#/$defs/workspaceId"}}},"threadSendPayload":{"oneOf":[{"$ref":"#/$defs/threadSendExistingPayload"},{"$ref":"#/$defs/threadSendNewPayload"}]},"threadSendExistingPayload":{"type":"object","additionalProperties":false,"required":["conversationId","clientOperationId","text","mode","model","expectedExecutionBinding"],"properties":{"conversationId":{"$ref":"#/$defs/conversationId"},"clientOperationId":{"$ref":"#/$defs/clientOperationId"},"text":{"type":"string","minLength":1,"maxLength":20000},"mode":{"type":"string","enum":["normal","readonly","plan","edit"]},"model":{"$ref":"#/$defs/modelId"},"expectedExecutionBinding":{"$ref":"#/$defs/remoteExecutionBindingReceipt"}}},"threadSendNewPayload":{"type":"object","additionalProperties":false,"required":["workspaceId","title","text","mode","model","phase"],"properties":{"workspaceId":{"$ref":"#/$defs/workspaceId"},"title":{"type":"string","minLength":1,"maxLength":160},"text":{"type":"string","minLength":1,"maxLength":20000},"mode":{"type":"string","enum":["normal","readonly","plan","edit"]},"model":{"$ref":"#/$defs/modelId"},"phase":{"const":"start"}}},"threadRetryPayload":{"type":"object","additionalProperties":false,"required":["conversationId","clientOperationId","expectedExecutionBinding"],"properties":{"conversationId":{"$ref":"#/$defs/conversationId"},"clientOperationId":{"$ref":"#/$defs/clientOperationId"},"expectedExecutionBinding":{"$ref":"#/$defs/remoteExecutionBindingReceipt"},"streamId":{"$ref":"#/$defs/streamId"}}},"threadCancelPayload":{"type":"object","additionalProperties":false,"required":["conversationId","clientOperationId","expectedExecutionBinding"],"properties":{"conversationId":{"$ref":"#/$defs/conversationId"},"clientOperationId":{"$ref":"#/$defs/clientOperationId"},"expectedExecutionBinding":{"$ref":"#/$defs/remoteExecutionBindingReceipt"},"streamId":{"$ref":"#/$defs/streamId"}}},"replayPayload":{"type":"object","additionalProperties":false,"required":["threadId","afterSequence","limit"],"properties":{"threadId":{"$ref":"#/$defs/threadId"},"afterSequence":{"type":"integer","minimum":0,"maximum":9007199254740990},"limit":{"type":"integer","minimum":1,"maximum":200}}},"commandPost":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","commandId","correlationId","idempotencyKey","websiteDeploymentId","executorId","deviceId","actorRole","operation","payload"],"allOf":[{"if":{"properties":{"operation":{"const":"executor.status.read"}}},"then":{"properties":{"payload":{"$ref":"#/$defs/statusPayload"}}}},{"if":{"properties":{"operation":{"const":"workspaces.read"}}},"then":{"properties":{"payload":{"$ref":"#/$defs/workspacesPayload"}}}},{"if":{"properties":{"operation":{"const":"threads.read"}}},"then":{"properties":{"payload":{"$ref":"#/$defs/threadsPayload"}}}},{"if":{"properties":{"operation":{"const":"thread.read"}}},"then":{"properties":{"payload":{"$ref":"#/$defs/threadReadPayload"}}}},{"if":{"properties":{"operation":{"const":"conversation.create"}}},"then":{"properties":{"payload":{"$ref":"#/$defs/conversationCreatePayload"}}}},{"if":{"properties":{"operation":{"const":"thread.send"}}},"then":{"properties":{"payload":{"$ref":"#/$defs/threadSendPayload"}}}},{"if":{"properties":{"operation":{"const":"thread.retry"}}},"then":{"properties":{"payload":{"$ref":"#/$defs/threadRetryPayload"}}}},{"if":{"properties":{"operation":{"const":"thread.cancel"}}},"then":{"properties":{"payload":{"$ref":"#/$defs/threadCancelPayload"}}}},{"if":{"properties":{"operation":{"const":"events.replay"}}},"then":{"properties":{"payload":{"$ref":"#/$defs/replayPayload"}}}}],"properties":{"kind":{"const":"command.post"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"commandId":{"$ref":"#/$defs/commandId"},"correlationId":{"$ref":"#/$defs/correlationId"},"idempotencyKey":{"$ref":"#/$defs/idempotencyKey"},"executorId":{"$ref":"#/$defs/executorId"},"deviceId":{"$ref":"#/$defs/deviceId"},"actorRole":{"const":"desktop_device"},"operation":{"$ref":"#/$defs/operation"},"payload":{"$ref":"#/$defs/commandPayload"},"websiteDeploymentId":{"$ref":"#/$defs/websiteDeploymentId"}}},"commandAccepted":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","commandId","correlationId","idempotencyKey","executorId","accepted"],"properties":{"kind":{"const":"command.accepted"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"commandId":{"$ref":"#/$defs/commandId"},"correlationId":{"$ref":"#/$defs/correlationId"},"idempotencyKey":{"$ref":"#/$defs/idempotencyKey"},"executorId":{"$ref":"#/$defs/executorId"},"accepted":{"const":true}}},"commandResultOperation":{"type":"string","enum":["executor.status.read","workspaces.read","threads.read","thread.read","conversation.create","thread.send","thread.retry","thread.cancel"]},"executorRuntimeState":{"type":"string","enum":["idle","busy"]},"executorCapabilities":{"type":"object","description":"Redacted availability projection. Values report availability only and must not expose paths, versions, configuration, credentials, model lists, or provider output.","additionalProperties":false,"required":["git","codex","claude"],"properties":{"git":{"type":"boolean"},"codex":{"type":"boolean"},"claude":{"type":"boolean"}}},"threadStatus":{"type":"string","enum":["queued","running","completed","failed","cancelled"]},"messageRole":{"type":"string","enum":["user","assistant","system"]},"messageStatus":{"type":"string","enum":["pending","streaming","completed","failed","cancelled"]},"workspaceSummary":{"type":"object","additionalProperties":false,"required":["workspaceId","displayName","createdAt","updatedAt"],"properties":{"workspaceId":{"$ref":"#/$defs/workspaceId"},"displayName":{"type":"string","minLength":1,"maxLength":120},"createdAt":{"$ref":"#/$defs/timestamp"},"updatedAt":{"$ref":"#/$defs/timestamp"}}},"threadSummary":{"type":"object","additionalProperties":false,"required":["threadId","workspaceId","title","status","createdAt","updatedAt"],"properties":{"threadId":{"$ref":"#/$defs/threadId"},"workspaceId":{"$ref":"#/$defs/workspaceId"},"title":{"type":"string","minLength":1,"maxLength":160},"status":{"$ref":"#/$defs/threadStatus"},"createdAt":{"$ref":"#/$defs/timestamp"},"updatedAt":{"$ref":"#/$defs/timestamp"}}},"threadMessage":{"type":"object","additionalProperties":false,"required":["messageId","threadId","sequence","role","status","text","createdAt","updatedAt"],"properties":{"messageId":{"$ref":"#/$defs/messageId"},"threadId":{"$ref":"#/$defs/threadId"},"sequence":{"$ref":"#/$defs/sequence"},"role":{"$ref":"#/$defs/messageRole"},"status":{"$ref":"#/$defs/messageStatus"},"text":{"type":"string","maxLength":20000},"createdAt":{"$ref":"#/$defs/timestamp"},"updatedAt":{"$ref":"#/$defs/timestamp"}}},"executorStatusResult":{"type":"object","additionalProperties":false,"required":["displayName","state","capabilities","observedAt"],"properties":{"displayName":{"$ref":"#/$defs/displayName"},"state":{"$ref":"#/$defs/executorRuntimeState"},"capabilities":{"$ref":"#/$defs/executorCapabilities"},"observedAt":{"$ref":"#/$defs/timestamp"}}},"workspacesReadResult":{"type":"object","additionalProperties":false,"required":["workspaces","hasMore"],"allOf":[{"if":{"properties":{"hasMore":{"const":true}},"required":["hasMore"]},"then":{"properties":{"nextCursor":{"$ref":"#/$defs/cursor"}},"required":["nextCursor"]}},{"if":{"properties":{"hasMore":{"const":false}},"required":["hasMore"]},"then":{"not":{"properties":{"nextCursor":{}},"required":["nextCursor"]}}}],"properties":{"workspaces":{"type":"array","maxItems":100,"items":{"$ref":"#/$defs/workspaceSummary"}},"hasMore":{"type":"boolean"},"nextCursor":{"$ref":"#/$defs/cursor"}}},"threadsReadResult":{"type":"object","additionalProperties":false,"required":["workspaceId","threads","hasMore"],"allOf":[{"if":{"properties":{"hasMore":{"const":true}},"required":["hasMore"]},"then":{"properties":{"nextCursor":{"$ref":"#/$defs/cursor"}},"required":["nextCursor"]}},{"if":{"properties":{"hasMore":{"const":false}},"required":["hasMore"]},"then":{"not":{"properties":{"nextCursor":{}},"required":["nextCursor"]}}}],"properties":{"workspaceId":{"$ref":"#/$defs/workspaceId"},"threads":{"type":"array","maxItems":100,"items":{"$ref":"#/$defs/threadSummary"}},"hasMore":{"type":"boolean"},"nextCursor":{"$ref":"#/$defs/cursor"}}},"threadReadResult":{"type":"object","additionalProperties":false,"required":["thread","afterSequence","highWaterSequence","messages","hasMore"],"allOf":[{"if":{"properties":{"hasMore":{"const":true}},"required":["hasMore"]},"then":{"properties":{"nextCursor":{"$ref":"#/$defs/cursor"}},"required":["nextCursor"]}},{"if":{"properties":{"hasMore":{"const":false}},"required":["hasMore"]},"then":{"not":{"properties":{"nextCursor":{}},"required":["nextCursor"]}}}],"properties":{"thread":{"$ref":"#/$defs/threadSummary"},"afterSequence":{"type":"integer","minimum":0,"maximum":9007199254740990},"highWaterSequence":{"type":"integer","minimum":0,"maximum":9007199254740991},"messages":{"type":"array","maxItems":200,"items":{"$ref":"#/$defs/threadMessage"}},"hasMore":{"type":"boolean"},"nextCursor":{"$ref":"#/$defs/cursor"}}},"threadSendResult":{"type":"object","additionalProperties":false,"required":["thread","streamId","createdThread","startedAt"],"properties":{"thread":{"$ref":"#/$defs/threadSummary"},"streamId":{"$ref":"#/$defs/streamId"},"createdThread":{"type":"boolean"},"startedAt":{"$ref":"#/$defs/timestamp"}}},"conversationCreateResult":{"type":"object","additionalProperties":false,"required":["conversationId","title","createdAt","executionBinding"],"properties":{"conversationId":{"$ref":"#/$defs/conversationId"},"title":{"$ref":"#/$defs/conversationTitle"},"createdAt":{"$ref":"#/$defs/timestamp"},"executionBinding":{"$ref":"#/$defs/remoteExecutionBindingReceipt"}}},"threadRetryResult":{"type":"object","additionalProperties":false,"required":["threadId","streamId","status","startedAt"],"properties":{"threadId":{"$ref":"#/$defs/threadId"},"streamId":{"$ref":"#/$defs/streamId"},"status":{"const":"running"},"startedAt":{"$ref":"#/$defs/timestamp"}}},"threadCancelResult":{"type":"object","additionalProperties":false,"required":["threadId","streamId","status","cancelledAt"],"properties":{"threadId":{"$ref":"#/$defs/threadId"},"streamId":{"$ref":"#/$defs/streamId"},"status":{"const":"cancelled"},"cancelledAt":{"$ref":"#/$defs/timestamp"}}},"commandResultPayload":{"oneOf":[{"$ref":"#/$defs/executorStatusResult"},{"$ref":"#/$defs/workspacesReadResult"},{"$ref":"#/$defs/threadsReadResult"},{"$ref":"#/$defs/threadReadResult"},{"$ref":"#/$defs/conversationCreateResult"},{"$ref":"#/$defs/threadSendResult"},{"$ref":"#/$defs/threadRetryResult"},{"$ref":"#/$defs/threadCancelResult"}]},"commandResult":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","commandId","correlationId","executorId","actorRole","operation","completedAt","result"],"allOf":[{"if":{"properties":{"operation":{"const":"executor.status.read"}},"required":["operation"]},"then":{"properties":{"result":{"$ref":"#/$defs/executorStatusResult"}}}},{"if":{"properties":{"operation":{"const":"workspaces.read"}},"required":["operation"]},"then":{"properties":{"result":{"$ref":"#/$defs/workspacesReadResult"}}}},{"if":{"properties":{"operation":{"const":"threads.read"}},"required":["operation"]},"then":{"properties":{"result":{"$ref":"#/$defs/threadsReadResult"}}}},{"if":{"properties":{"operation":{"const":"thread.read"}},"required":["operation"]},"then":{"properties":{"result":{"$ref":"#/$defs/threadReadResult"}}}},{"if":{"properties":{"operation":{"const":"conversation.create"}},"required":["operation"]},"then":{"properties":{"result":{"$ref":"#/$defs/conversationCreateResult"}}}},{"if":{"properties":{"operation":{"const":"thread.send"}},"required":["operation"]},"then":{"properties":{"result":{"$ref":"#/$defs/threadSendResult"}}}},{"if":{"properties":{"operation":{"const":"thread.retry"}},"required":["operation"]},"then":{"properties":{"result":{"$ref":"#/$defs/threadRetryResult"}}}},{"if":{"properties":{"operation":{"const":"thread.cancel"}},"required":["operation"]},"then":{"properties":{"result":{"$ref":"#/$defs/threadCancelResult"}}}}],"properties":{"kind":{"const":"command.result"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"commandId":{"$ref":"#/$defs/commandId"},"correlationId":{"$ref":"#/$defs/correlationId"},"executorId":{"$ref":"#/$defs/executorId"},"actorRole":{"const":"executor_device"},"operation":{"$ref":"#/$defs/commandResultOperation"},"completedAt":{"$ref":"#/$defs/timestamp"},"result":{"$ref":"#/$defs/commandResultPayload"}}},"eventData":{"type":"object","additionalProperties":false,"required":["eventType","text"],"properties":{"eventType":{"enum":["thread.message","thread.status","command.completed","command.failed"]},"text":{"type":"string","maxLength":20000}}},"executorEventFrame":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","eventId","correlationId","executorId","threadId","sequence","occurredAt","data"],"properties":{"kind":{"const":"executor.event"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"eventId":{"$ref":"#/$defs/eventId"},"correlationId":{"$ref":"#/$defs/correlationId"},"executorId":{"$ref":"#/$defs/executorId"},"threadId":{"$ref":"#/$defs/threadId"},"sequence":{"$ref":"#/$defs/sequence"},"occurredAt":{"$ref":"#/$defs/timestamp"},"data":{"$ref":"#/$defs/eventData"}}},"executorPresenceEvent":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","executorId","status","reason","observedAt"],"properties":{"kind":{"const":"executor.presence"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"executorId":{"$ref":"#/$defs/executorId"},"status":{"type":"string","enum":["unknown","online","stale","offline"]},"reason":{"type":"string","pattern":"^[A-Za-z0-9][A-Za-z0-9 ._(),:;'-]{0,159}$","maxLength":160},"observedAt":{"$ref":"#/$defs/timestamp"}}},"ownerSseDesktopPayload":{"oneOf":[{"$ref":"#/$defs/executorPresenceEvent"},{"$ref":"#/$defs/commandResult"},{"$ref":"#/$defs/executorEventFrame"},{"$ref":"#/$defs/replayResult"},{"$ref":"#/$defs/replayGap"},{"$ref":"#/$defs/errorEnvelope"}]},"ownerSseDesktopEvent":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","deviceId","actorRole","event"],"properties":{"kind":{"const":"owner.sse.event"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"deviceId":{"$ref":"#/$defs/deviceId"},"actorRole":{"const":"desktop_device"},"event":{"$ref":"#/$defs/ownerSseDesktopPayload"}}},"ownerSseBrowserEvent":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","sessionId","actorRole","event"],"properties":{"kind":{"const":"owner.sse.event"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"sessionId":{"$ref":"#/$defs/sessionId"},"actorRole":{"const":"browser_session"},"event":{"$ref":"#/$defs/executorPresenceEvent"}}},"ownerSseEvent":{"oneOf":[{"$ref":"#/$defs/ownerSseDesktopEvent"},{"$ref":"#/$defs/ownerSseBrowserEvent"}]},"replayRequest":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","executorId","threadId","afterSequence","limit","correlationId"],"properties":{"kind":{"const":"events.replay.request"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"executorId":{"$ref":"#/$defs/executorId"},"threadId":{"$ref":"#/$defs/threadId"},"afterSequence":{"type":"integer","minimum":0,"maximum":9007199254740990},"limit":{"type":"integer","minimum":1,"maximum":200},"correlationId":{"$ref":"#/$defs/correlationId"}}},"replayResult":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","executorId","threadId","afterSequence","highWaterSequence","events","hasMore","correlationId"],"properties":{"kind":{"const":"events.replay.result"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"executorId":{"$ref":"#/$defs/executorId"},"threadId":{"$ref":"#/$defs/threadId"},"afterSequence":{"type":"integer","minimum":0,"maximum":9007199254740990},"highWaterSequence":{"type":"integer","minimum":0,"maximum":9007199254740991},"events":{"type":"array","maxItems":200,"items":{"$ref":"#/$defs/executorEventFrame"}},"hasMore":{"type":"boolean"},"correlationId":{"$ref":"#/$defs/correlationId"}}},"replayGap":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","executorId","threadId","afterSequence","earliestAvailableSequence","highWaterSequence","code","correlationId"],"properties":{"kind":{"const":"events.replay.gap"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"executorId":{"$ref":"#/$defs/executorId"},"threadId":{"$ref":"#/$defs/threadId"},"afterSequence":{"type":"integer","minimum":0,"maximum":9007199254740990},"earliestAvailableSequence":{"$ref":"#/$defs/sequence"},"highWaterSequence":{"$ref":"#/$defs/sequence"},"code":{"const":"replay-gap"},"correlationId":{"$ref":"#/$defs/correlationId"}}},"errorEnvelope":{"type":"object","additionalProperties":false,"required":["kind","protocolVersion","code","message","retryable","correlationId"],"properties":{"kind":{"const":"error"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"code":{"$ref":"#/$defs/errorCode"},"message":{"type":"string","minLength":1,"maxLength":240},"retryable":{"type":"boolean"},"correlationId":{"$ref":"#/$defs/correlationId"}}},"websiteAccountId":{"type":"string","pattern":"^usr_[A-Za-z0-9]{8,64}$","maxLength":68},"websiteDeploymentId":{"type":"string","pattern":"^wdp_[A-Za-z0-9]{32}$","maxLength":36}}};
const schema32 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","username","password","idempotencyKey","correlationId"],"properties":{"kind":{"const":"auth.signup.request"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"username":{"$ref":"#/$defs/rawUsername"},"password":{"$ref":"#/$defs/password"},"idempotencyKey":{"$ref":"#/$defs/idempotencyKey"},"correlationId":{"$ref":"#/$defs/correlationId"}}};
const schema33 = {"type":"string","const":"1.0"};
const schema34 = {"type":"string","description":"Raw account input; implementations trim leading/trailing whitespace and lowercase ASCII letters before validation.","pattern":"^\\s*[A-Za-z0-9][A-Za-z0-9._-]{2,63}\\s*$","minLength":3,"maxLength":128};
const schema35 = {"type":"string","minLength":12,"maxLength":128};
const schema36 = {"type":"string","pattern":"^idem_[A-Za-z0-9_-]{16,80}$","maxLength":85};
const schema37 = {"type":"string","pattern":"^cor_[A-Za-z0-9]{8,64}$","maxLength":68};
const func1 = typeof func1Module === "function" ? func1Module : func1Module.default;
const pattern4 = new RegExp("^\\s*[A-Za-z0-9][A-Za-z0-9._-]{2,63}\\s*$", "u");
const pattern5 = new RegExp("^idem_[A-Za-z0-9_-]{16,80}$", "u");
const pattern6 = new RegExp("^cor_[A-Za-z0-9]{8,64}$", "u");

function validate21(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate21.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.username === undefined) && (missing0 = "username"))) || ((data.password === undefined) && (missing0 = "password"))) || ((data.idempotencyKey === undefined) && (missing0 = "idempotencyKey"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate21.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "username")) || (key0 === "password")) || (key0 === "idempotencyKey")) || (key0 === "correlationId"))){
validate21.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("auth.signup.request" !== data.kind){
validate21.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "auth.signup.request"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate21.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate21.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.username !== undefined){
let data2 = data.username;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 128){
validate21.errors = [{instancePath:instancePath+"/username",schemaPath:"#/$defs/rawUsername/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"}];
return false;
}
else {
if(func1(data2) < 3){
validate21.errors = [{instancePath:instancePath+"/username",schemaPath:"#/$defs/rawUsername/minLength",keyword:"minLength",params:{limit: 3},message:"must NOT have fewer than 3 characters"}];
return false;
}
else {
if(!pattern4.test(data2)){
validate21.errors = [{instancePath:instancePath+"/username",schemaPath:"#/$defs/rawUsername/pattern",keyword:"pattern",params:{pattern: "^\\s*[A-Za-z0-9][A-Za-z0-9._-]{2,63}\\s*$"},message:"must match pattern \""+"^\\s*[A-Za-z0-9][A-Za-z0-9._-]{2,63}\\s*$"+"\""}];
return false;
}
}
}
}
else {
validate21.errors = [{instancePath:instancePath+"/username",schemaPath:"#/$defs/rawUsername/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.password !== undefined){
let data3 = data.password;
const _errs9 = errors;
const _errs10 = errors;
if(errors === _errs10){
if(typeof data3 === "string"){
if(func1(data3) > 128){
validate21.errors = [{instancePath:instancePath+"/password",schemaPath:"#/$defs/password/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"}];
return false;
}
else {
if(func1(data3) < 12){
validate21.errors = [{instancePath:instancePath+"/password",schemaPath:"#/$defs/password/minLength",keyword:"minLength",params:{limit: 12},message:"must NOT have fewer than 12 characters"}];
return false;
}
}
}
else {
validate21.errors = [{instancePath:instancePath+"/password",schemaPath:"#/$defs/password/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.idempotencyKey !== undefined){
let data4 = data.idempotencyKey;
const _errs12 = errors;
const _errs13 = errors;
if(errors === _errs13){
if(typeof data4 === "string"){
if(func1(data4) > 85){
validate21.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/maxLength",keyword:"maxLength",params:{limit: 85},message:"must NOT have more than 85 characters"}];
return false;
}
else {
if(!pattern5.test(data4)){
validate21.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/pattern",keyword:"pattern",params:{pattern: "^idem_[A-Za-z0-9_-]{16,80}$"},message:"must match pattern \""+"^idem_[A-Za-z0-9_-]{16,80}$"+"\""}];
return false;
}
}
}
else {
validate21.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data5 = data.correlationId;
const _errs15 = errors;
const _errs16 = errors;
if(errors === _errs16){
if(typeof data5 === "string"){
if(func1(data5) > 68){
validate21.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data5)){
validate21.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate21.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
else {
validate21.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate21.errors = vErrors;
return errors === 0;
}
validate21.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema38 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","userId","username","correlationId"],"properties":{"kind":{"const":"auth.signup.response"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"userId":{"$ref":"#/$defs/userId"},"username":{"$ref":"#/$defs/username"},"correlationId":{"$ref":"#/$defs/correlationId"}}};
const schema40 = {"type":"string","pattern":"^usr_[A-Za-z0-9]{8,64}$","maxLength":68};
const schema41 = {"type":"string","description":"Canonical normalized account username used for storage and responses.","pattern":"^[a-z0-9][a-z0-9._-]{2,63}$","minLength":3,"maxLength":64};
const pattern7 = new RegExp("^usr_[A-Za-z0-9]{8,64}$", "u");
const pattern8 = new RegExp("^[a-z0-9][a-z0-9._-]{2,63}$", "u");

function validate23(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate23.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.userId === undefined) && (missing0 = "userId"))) || ((data.username === undefined) && (missing0 = "username"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate23.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "userId")) || (key0 === "username")) || (key0 === "correlationId"))){
validate23.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("auth.signup.response" !== data.kind){
validate23.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "auth.signup.response"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate23.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate23.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.userId !== undefined){
let data2 = data.userId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate23.errors = [{instancePath:instancePath+"/userId",schemaPath:"#/$defs/userId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern7.test(data2)){
validate23.errors = [{instancePath:instancePath+"/userId",schemaPath:"#/$defs/userId/pattern",keyword:"pattern",params:{pattern: "^usr_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^usr_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate23.errors = [{instancePath:instancePath+"/userId",schemaPath:"#/$defs/userId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.username !== undefined){
let data3 = data.username;
const _errs9 = errors;
const _errs10 = errors;
if(errors === _errs10){
if(typeof data3 === "string"){
if(func1(data3) > 64){
validate23.errors = [{instancePath:instancePath+"/username",schemaPath:"#/$defs/username/maxLength",keyword:"maxLength",params:{limit: 64},message:"must NOT have more than 64 characters"}];
return false;
}
else {
if(func1(data3) < 3){
validate23.errors = [{instancePath:instancePath+"/username",schemaPath:"#/$defs/username/minLength",keyword:"minLength",params:{limit: 3},message:"must NOT have fewer than 3 characters"}];
return false;
}
else {
if(!pattern8.test(data3)){
validate23.errors = [{instancePath:instancePath+"/username",schemaPath:"#/$defs/username/pattern",keyword:"pattern",params:{pattern: "^[a-z0-9][a-z0-9._-]{2,63}$"},message:"must match pattern \""+"^[a-z0-9][a-z0-9._-]{2,63}$"+"\""}];
return false;
}
}
}
}
else {
validate23.errors = [{instancePath:instancePath+"/username",schemaPath:"#/$defs/username/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data4 = data.correlationId;
const _errs12 = errors;
const _errs13 = errors;
if(errors === _errs13){
if(typeof data4 === "string"){
if(func1(data4) > 68){
validate23.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data4)){
validate23.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate23.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
else {
validate23.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate23.errors = vErrors;
return errors === 0;
}
validate23.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema43 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","username","password","idempotencyKey","correlationId"],"properties":{"kind":{"const":"auth.login.request"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"username":{"$ref":"#/$defs/rawUsername"},"password":{"$ref":"#/$defs/password"},"idempotencyKey":{"$ref":"#/$defs/idempotencyKey"},"correlationId":{"$ref":"#/$defs/correlationId"}}};

function validate25(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate25.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.username === undefined) && (missing0 = "username"))) || ((data.password === undefined) && (missing0 = "password"))) || ((data.idempotencyKey === undefined) && (missing0 = "idempotencyKey"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate25.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "username")) || (key0 === "password")) || (key0 === "idempotencyKey")) || (key0 === "correlationId"))){
validate25.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("auth.login.request" !== data.kind){
validate25.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "auth.login.request"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate25.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate25.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.username !== undefined){
let data2 = data.username;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 128){
validate25.errors = [{instancePath:instancePath+"/username",schemaPath:"#/$defs/rawUsername/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"}];
return false;
}
else {
if(func1(data2) < 3){
validate25.errors = [{instancePath:instancePath+"/username",schemaPath:"#/$defs/rawUsername/minLength",keyword:"minLength",params:{limit: 3},message:"must NOT have fewer than 3 characters"}];
return false;
}
else {
if(!pattern4.test(data2)){
validate25.errors = [{instancePath:instancePath+"/username",schemaPath:"#/$defs/rawUsername/pattern",keyword:"pattern",params:{pattern: "^\\s*[A-Za-z0-9][A-Za-z0-9._-]{2,63}\\s*$"},message:"must match pattern \""+"^\\s*[A-Za-z0-9][A-Za-z0-9._-]{2,63}\\s*$"+"\""}];
return false;
}
}
}
}
else {
validate25.errors = [{instancePath:instancePath+"/username",schemaPath:"#/$defs/rawUsername/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.password !== undefined){
let data3 = data.password;
const _errs9 = errors;
const _errs10 = errors;
if(errors === _errs10){
if(typeof data3 === "string"){
if(func1(data3) > 128){
validate25.errors = [{instancePath:instancePath+"/password",schemaPath:"#/$defs/password/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"}];
return false;
}
else {
if(func1(data3) < 12){
validate25.errors = [{instancePath:instancePath+"/password",schemaPath:"#/$defs/password/minLength",keyword:"minLength",params:{limit: 12},message:"must NOT have fewer than 12 characters"}];
return false;
}
}
}
else {
validate25.errors = [{instancePath:instancePath+"/password",schemaPath:"#/$defs/password/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.idempotencyKey !== undefined){
let data4 = data.idempotencyKey;
const _errs12 = errors;
const _errs13 = errors;
if(errors === _errs13){
if(typeof data4 === "string"){
if(func1(data4) > 85){
validate25.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/maxLength",keyword:"maxLength",params:{limit: 85},message:"must NOT have more than 85 characters"}];
return false;
}
else {
if(!pattern5.test(data4)){
validate25.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/pattern",keyword:"pattern",params:{pattern: "^idem_[A-Za-z0-9_-]{16,80}$"},message:"must match pattern \""+"^idem_[A-Za-z0-9_-]{16,80}$"+"\""}];
return false;
}
}
}
else {
validate25.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data5 = data.correlationId;
const _errs15 = errors;
const _errs16 = errors;
if(errors === _errs16){
if(typeof data5 === "string"){
if(func1(data5) > 68){
validate25.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data5)){
validate25.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate25.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
else {
validate25.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate25.errors = vErrors;
return errors === 0;
}
validate25.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema49 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","userId","sessionId","actorRole","expiresAt","correlationId"],"properties":{"kind":{"const":"auth.login.response"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"userId":{"$ref":"#/$defs/userId"},"sessionId":{"$ref":"#/$defs/sessionId"},"actorRole":{"const":"browser_session"},"expiresAt":{"$ref":"#/$defs/timestamp"},"correlationId":{"$ref":"#/$defs/correlationId"}}};
const schema52 = {"type":"string","pattern":"^ses_[A-Za-z0-9]{8,64}$","maxLength":68};
const schema53 = {"type":"string","pattern":"^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$","maxLength":30};
const pattern14 = new RegExp("^ses_[A-Za-z0-9]{8,64}$", "u");
const pattern15 = new RegExp("^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$", "u");

function validate27(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate27.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.userId === undefined) && (missing0 = "userId"))) || ((data.sessionId === undefined) && (missing0 = "sessionId"))) || ((data.actorRole === undefined) && (missing0 = "actorRole"))) || ((data.expiresAt === undefined) && (missing0 = "expiresAt"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate27.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "userId")) || (key0 === "sessionId")) || (key0 === "actorRole")) || (key0 === "expiresAt")) || (key0 === "correlationId"))){
validate27.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("auth.login.response" !== data.kind){
validate27.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "auth.login.response"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate27.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate27.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.userId !== undefined){
let data2 = data.userId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate27.errors = [{instancePath:instancePath+"/userId",schemaPath:"#/$defs/userId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern7.test(data2)){
validate27.errors = [{instancePath:instancePath+"/userId",schemaPath:"#/$defs/userId/pattern",keyword:"pattern",params:{pattern: "^usr_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^usr_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate27.errors = [{instancePath:instancePath+"/userId",schemaPath:"#/$defs/userId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sessionId !== undefined){
let data3 = data.sessionId;
const _errs9 = errors;
const _errs10 = errors;
if(errors === _errs10){
if(typeof data3 === "string"){
if(func1(data3) > 68){
validate27.errors = [{instancePath:instancePath+"/sessionId",schemaPath:"#/$defs/sessionId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern14.test(data3)){
validate27.errors = [{instancePath:instancePath+"/sessionId",schemaPath:"#/$defs/sessionId/pattern",keyword:"pattern",params:{pattern: "^ses_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^ses_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate27.errors = [{instancePath:instancePath+"/sessionId",schemaPath:"#/$defs/sessionId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.actorRole !== undefined){
const _errs12 = errors;
if("browser_session" !== data.actorRole){
validate27.errors = [{instancePath:instancePath+"/actorRole",schemaPath:"#/properties/actorRole/const",keyword:"const",params:{allowedValue: "browser_session"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.expiresAt !== undefined){
let data5 = data.expiresAt;
const _errs13 = errors;
const _errs14 = errors;
if(errors === _errs14){
if(typeof data5 === "string"){
if(func1(data5) > 30){
validate27.errors = [{instancePath:instancePath+"/expiresAt",schemaPath:"#/$defs/timestamp/maxLength",keyword:"maxLength",params:{limit: 30},message:"must NOT have more than 30 characters"}];
return false;
}
else {
if(!pattern15.test(data5)){
validate27.errors = [{instancePath:instancePath+"/expiresAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"},message:"must match pattern \""+"^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"+"\""}];
return false;
}
}
}
else {
validate27.errors = [{instancePath:instancePath+"/expiresAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data6 = data.correlationId;
const _errs16 = errors;
const _errs17 = errors;
if(errors === _errs17){
if(typeof data6 === "string"){
if(func1(data6) > 68){
validate27.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data6)){
validate27.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate27.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs16 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
else {
validate27.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate27.errors = vErrors;
return errors === 0;
}
validate27.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema55 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","sessionId","actorRole","correlationId"],"properties":{"kind":{"const":"auth.session.request"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"sessionId":{"$ref":"#/$defs/sessionId"},"actorRole":{"const":"browser_session"},"correlationId":{"$ref":"#/$defs/correlationId"}}};

function validate29(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate29.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.sessionId === undefined) && (missing0 = "sessionId"))) || ((data.actorRole === undefined) && (missing0 = "actorRole"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate29.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "sessionId")) || (key0 === "actorRole")) || (key0 === "correlationId"))){
validate29.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("auth.session.request" !== data.kind){
validate29.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "auth.session.request"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate29.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate29.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sessionId !== undefined){
let data2 = data.sessionId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate29.errors = [{instancePath:instancePath+"/sessionId",schemaPath:"#/$defs/sessionId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern14.test(data2)){
validate29.errors = [{instancePath:instancePath+"/sessionId",schemaPath:"#/$defs/sessionId/pattern",keyword:"pattern",params:{pattern: "^ses_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^ses_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate29.errors = [{instancePath:instancePath+"/sessionId",schemaPath:"#/$defs/sessionId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.actorRole !== undefined){
const _errs9 = errors;
if("browser_session" !== data.actorRole){
validate29.errors = [{instancePath:instancePath+"/actorRole",schemaPath:"#/properties/actorRole/const",keyword:"const",params:{allowedValue: "browser_session"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data4 = data.correlationId;
const _errs10 = errors;
const _errs11 = errors;
if(errors === _errs11){
if(typeof data4 === "string"){
if(func1(data4) > 68){
validate29.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data4)){
validate29.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate29.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
else {
validate29.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate29.errors = vErrors;
return errors === 0;
}
validate29.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema59 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","userId","sessionId","actorRole","expiresAt","correlationId"],"properties":{"kind":{"const":"auth.session.response"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"userId":{"$ref":"#/$defs/userId"},"sessionId":{"$ref":"#/$defs/sessionId"},"actorRole":{"const":"browser_session"},"expiresAt":{"$ref":"#/$defs/timestamp"},"correlationId":{"$ref":"#/$defs/correlationId"}}};

function validate31(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate31.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.userId === undefined) && (missing0 = "userId"))) || ((data.sessionId === undefined) && (missing0 = "sessionId"))) || ((data.actorRole === undefined) && (missing0 = "actorRole"))) || ((data.expiresAt === undefined) && (missing0 = "expiresAt"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate31.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "userId")) || (key0 === "sessionId")) || (key0 === "actorRole")) || (key0 === "expiresAt")) || (key0 === "correlationId"))){
validate31.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("auth.session.response" !== data.kind){
validate31.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "auth.session.response"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate31.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate31.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.userId !== undefined){
let data2 = data.userId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate31.errors = [{instancePath:instancePath+"/userId",schemaPath:"#/$defs/userId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern7.test(data2)){
validate31.errors = [{instancePath:instancePath+"/userId",schemaPath:"#/$defs/userId/pattern",keyword:"pattern",params:{pattern: "^usr_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^usr_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate31.errors = [{instancePath:instancePath+"/userId",schemaPath:"#/$defs/userId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sessionId !== undefined){
let data3 = data.sessionId;
const _errs9 = errors;
const _errs10 = errors;
if(errors === _errs10){
if(typeof data3 === "string"){
if(func1(data3) > 68){
validate31.errors = [{instancePath:instancePath+"/sessionId",schemaPath:"#/$defs/sessionId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern14.test(data3)){
validate31.errors = [{instancePath:instancePath+"/sessionId",schemaPath:"#/$defs/sessionId/pattern",keyword:"pattern",params:{pattern: "^ses_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^ses_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate31.errors = [{instancePath:instancePath+"/sessionId",schemaPath:"#/$defs/sessionId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.actorRole !== undefined){
const _errs12 = errors;
if("browser_session" !== data.actorRole){
validate31.errors = [{instancePath:instancePath+"/actorRole",schemaPath:"#/properties/actorRole/const",keyword:"const",params:{allowedValue: "browser_session"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.expiresAt !== undefined){
let data5 = data.expiresAt;
const _errs13 = errors;
const _errs14 = errors;
if(errors === _errs14){
if(typeof data5 === "string"){
if(func1(data5) > 30){
validate31.errors = [{instancePath:instancePath+"/expiresAt",schemaPath:"#/$defs/timestamp/maxLength",keyword:"maxLength",params:{limit: 30},message:"must NOT have more than 30 characters"}];
return false;
}
else {
if(!pattern15.test(data5)){
validate31.errors = [{instancePath:instancePath+"/expiresAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"},message:"must match pattern \""+"^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"+"\""}];
return false;
}
}
}
else {
validate31.errors = [{instancePath:instancePath+"/expiresAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data6 = data.correlationId;
const _errs16 = errors;
const _errs17 = errors;
if(errors === _errs17){
if(typeof data6 === "string"){
if(func1(data6) > 68){
validate31.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data6)){
validate31.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate31.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs16 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
else {
validate31.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate31.errors = vErrors;
return errors === 0;
}
validate31.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema65 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","sessionId","actorRole","idempotencyKey","correlationId"],"properties":{"kind":{"const":"auth.logout.request"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"sessionId":{"$ref":"#/$defs/sessionId"},"actorRole":{"const":"browser_session"},"idempotencyKey":{"$ref":"#/$defs/idempotencyKey"},"correlationId":{"$ref":"#/$defs/correlationId"}}};

function validate33(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate33.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.sessionId === undefined) && (missing0 = "sessionId"))) || ((data.actorRole === undefined) && (missing0 = "actorRole"))) || ((data.idempotencyKey === undefined) && (missing0 = "idempotencyKey"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate33.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "sessionId")) || (key0 === "actorRole")) || (key0 === "idempotencyKey")) || (key0 === "correlationId"))){
validate33.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("auth.logout.request" !== data.kind){
validate33.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "auth.logout.request"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate33.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate33.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sessionId !== undefined){
let data2 = data.sessionId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate33.errors = [{instancePath:instancePath+"/sessionId",schemaPath:"#/$defs/sessionId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern14.test(data2)){
validate33.errors = [{instancePath:instancePath+"/sessionId",schemaPath:"#/$defs/sessionId/pattern",keyword:"pattern",params:{pattern: "^ses_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^ses_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate33.errors = [{instancePath:instancePath+"/sessionId",schemaPath:"#/$defs/sessionId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.actorRole !== undefined){
const _errs9 = errors;
if("browser_session" !== data.actorRole){
validate33.errors = [{instancePath:instancePath+"/actorRole",schemaPath:"#/properties/actorRole/const",keyword:"const",params:{allowedValue: "browser_session"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.idempotencyKey !== undefined){
let data4 = data.idempotencyKey;
const _errs10 = errors;
const _errs11 = errors;
if(errors === _errs11){
if(typeof data4 === "string"){
if(func1(data4) > 85){
validate33.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/maxLength",keyword:"maxLength",params:{limit: 85},message:"must NOT have more than 85 characters"}];
return false;
}
else {
if(!pattern5.test(data4)){
validate33.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/pattern",keyword:"pattern",params:{pattern: "^idem_[A-Za-z0-9_-]{16,80}$"},message:"must match pattern \""+"^idem_[A-Za-z0-9_-]{16,80}$"+"\""}];
return false;
}
}
}
else {
validate33.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data5 = data.correlationId;
const _errs13 = errors;
const _errs14 = errors;
if(errors === _errs14){
if(typeof data5 === "string"){
if(func1(data5) > 68){
validate33.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data5)){
validate33.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate33.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
else {
validate33.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate33.errors = vErrors;
return errors === 0;
}
validate33.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema70 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","sessionId","ended","correlationId"],"properties":{"kind":{"const":"auth.logout.response"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"sessionId":{"$ref":"#/$defs/sessionId"},"ended":{"const":true},"correlationId":{"$ref":"#/$defs/correlationId"}}};

function validate35(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate35.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.sessionId === undefined) && (missing0 = "sessionId"))) || ((data.ended === undefined) && (missing0 = "ended"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate35.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "sessionId")) || (key0 === "ended")) || (key0 === "correlationId"))){
validate35.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("auth.logout.response" !== data.kind){
validate35.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "auth.logout.response"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate35.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate35.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sessionId !== undefined){
let data2 = data.sessionId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate35.errors = [{instancePath:instancePath+"/sessionId",schemaPath:"#/$defs/sessionId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern14.test(data2)){
validate35.errors = [{instancePath:instancePath+"/sessionId",schemaPath:"#/$defs/sessionId/pattern",keyword:"pattern",params:{pattern: "^ses_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^ses_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate35.errors = [{instancePath:instancePath+"/sessionId",schemaPath:"#/$defs/sessionId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.ended !== undefined){
const _errs9 = errors;
if(true !== data.ended){
validate35.errors = [{instancePath:instancePath+"/ended",schemaPath:"#/properties/ended/const",keyword:"const",params:{allowedValue: true},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data4 = data.correlationId;
const _errs10 = errors;
const _errs11 = errors;
if(errors === _errs11){
if(typeof data4 === "string"){
if(func1(data4) > 68){
validate35.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data4)){
validate35.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate35.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
else {
validate35.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate35.errors = vErrors;
return errors === 0;
}
validate35.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema74 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","claimId","actorRole","claimUrl","shortCode","displayName","platform","architecture","executorVersion","keyFingerprint","expiresAt","correlationId"],"properties":{"kind":{"const":"executor.claim.challenge"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"claimId":{"$ref":"#/$defs/claimId"},"actorRole":{"const":"claim_challenge"},"claimUrl":{"$ref":"#/$defs/claimUrl"},"shortCode":{"type":"string","pattern":"^[A-Z]{4}-[A-Z]{4}$","maxLength":9},"displayName":{"$ref":"#/$defs/displayName"},"platform":{"$ref":"#/$defs/platform"},"architecture":{"$ref":"#/$defs/architecture"},"executorVersion":{"$ref":"#/$defs/executorVersion"},"keyFingerprint":{"$ref":"#/$defs/keyFingerprint"},"expiresAt":{"$ref":"#/$defs/timestamp"},"correlationId":{"$ref":"#/$defs/correlationId"}}};
const schema76 = {"type":"string","pattern":"^clm_[A-Za-z0-9]{8,64}$","maxLength":68};
const schema77 = {"type":"string","pattern":"^https://[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?(?::[0-9]{1,5})?(?:/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*)?(?:\\?[A-Za-z0-9._~!$&'()*+,;=:@%/?-]*)?$","maxLength":512};
const schema78 = {"type":"string","pattern":"^[A-Za-z0-9][A-Za-z0-9 ._()-]{0,79}$","maxLength":80};
const schema79 = {"type":"string","enum":["macos","linux","windows"]};
const schema80 = {"type":"string","enum":["x64","arm64"]};
const schema81 = {"type":"string","pattern":"^[0-9]+\\.[0-9]+\\.[0-9]+(?:[-+][A-Za-z0-9.-]{1,32})?$","maxLength":64};
const schema82 = {"type":"string","pattern":"^[a-f0-9]{64}$","maxLength":64};
const func32 = Object.prototype.hasOwnProperty;
const pattern28 = new RegExp("^clm_[A-Za-z0-9]{8,64}$", "u");
const pattern29 = new RegExp("^https://[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?(?::[0-9]{1,5})?(?:/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*)?(?:\\?[A-Za-z0-9._~!$&'()*+,;=:@%/?-]*)?$", "u");
const pattern30 = new RegExp("^[A-Z]{4}-[A-Z]{4}$", "u");
const pattern31 = new RegExp("^[A-Za-z0-9][A-Za-z0-9 ._()-]{0,79}$", "u");
const pattern32 = new RegExp("^[0-9]+\\.[0-9]+\\.[0-9]+(?:[-+][A-Za-z0-9.-]{1,32})?$", "u");
const pattern33 = new RegExp("^[a-f0-9]{64}$", "u");

function validate37(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate37.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((((((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.claimId === undefined) && (missing0 = "claimId"))) || ((data.actorRole === undefined) && (missing0 = "actorRole"))) || ((data.claimUrl === undefined) && (missing0 = "claimUrl"))) || ((data.shortCode === undefined) && (missing0 = "shortCode"))) || ((data.displayName === undefined) && (missing0 = "displayName"))) || ((data.platform === undefined) && (missing0 = "platform"))) || ((data.architecture === undefined) && (missing0 = "architecture"))) || ((data.executorVersion === undefined) && (missing0 = "executorVersion"))) || ((data.keyFingerprint === undefined) && (missing0 = "keyFingerprint"))) || ((data.expiresAt === undefined) && (missing0 = "expiresAt"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate37.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(func32.call(schema74.properties, key0))){
validate37.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("executor.claim.challenge" !== data.kind){
validate37.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "executor.claim.challenge"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate37.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate37.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.claimId !== undefined){
let data2 = data.claimId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate37.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern28.test(data2)){
validate37.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/pattern",keyword:"pattern",params:{pattern: "^clm_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^clm_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate37.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.actorRole !== undefined){
const _errs9 = errors;
if("claim_challenge" !== data.actorRole){
validate37.errors = [{instancePath:instancePath+"/actorRole",schemaPath:"#/properties/actorRole/const",keyword:"const",params:{allowedValue: "claim_challenge"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.claimUrl !== undefined){
let data4 = data.claimUrl;
const _errs10 = errors;
const _errs11 = errors;
if(errors === _errs11){
if(typeof data4 === "string"){
if(func1(data4) > 512){
validate37.errors = [{instancePath:instancePath+"/claimUrl",schemaPath:"#/$defs/claimUrl/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(!pattern29.test(data4)){
validate37.errors = [{instancePath:instancePath+"/claimUrl",schemaPath:"#/$defs/claimUrl/pattern",keyword:"pattern",params:{pattern: "^https://[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?(?::[0-9]{1,5})?(?:/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*)?(?:\\?[A-Za-z0-9._~!$&'()*+,;=:@%/?-]*)?$"},message:"must match pattern \""+"^https://[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?(?::[0-9]{1,5})?(?:/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*)?(?:\\?[A-Za-z0-9._~!$&'()*+,;=:@%/?-]*)?$"+"\""}];
return false;
}
}
}
else {
validate37.errors = [{instancePath:instancePath+"/claimUrl",schemaPath:"#/$defs/claimUrl/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.shortCode !== undefined){
let data5 = data.shortCode;
const _errs13 = errors;
if(errors === _errs13){
if(typeof data5 === "string"){
if(func1(data5) > 9){
validate37.errors = [{instancePath:instancePath+"/shortCode",schemaPath:"#/properties/shortCode/maxLength",keyword:"maxLength",params:{limit: 9},message:"must NOT have more than 9 characters"}];
return false;
}
else {
if(!pattern30.test(data5)){
validate37.errors = [{instancePath:instancePath+"/shortCode",schemaPath:"#/properties/shortCode/pattern",keyword:"pattern",params:{pattern: "^[A-Z]{4}-[A-Z]{4}$"},message:"must match pattern \""+"^[A-Z]{4}-[A-Z]{4}$"+"\""}];
return false;
}
}
}
else {
validate37.errors = [{instancePath:instancePath+"/shortCode",schemaPath:"#/properties/shortCode/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.displayName !== undefined){
let data6 = data.displayName;
const _errs15 = errors;
const _errs16 = errors;
if(errors === _errs16){
if(typeof data6 === "string"){
if(func1(data6) > 80){
validate37.errors = [{instancePath:instancePath+"/displayName",schemaPath:"#/$defs/displayName/maxLength",keyword:"maxLength",params:{limit: 80},message:"must NOT have more than 80 characters"}];
return false;
}
else {
if(!pattern31.test(data6)){
validate37.errors = [{instancePath:instancePath+"/displayName",schemaPath:"#/$defs/displayName/pattern",keyword:"pattern",params:{pattern: "^[A-Za-z0-9][A-Za-z0-9 ._()-]{0,79}$"},message:"must match pattern \""+"^[A-Za-z0-9][A-Za-z0-9 ._()-]{0,79}$"+"\""}];
return false;
}
}
}
else {
validate37.errors = [{instancePath:instancePath+"/displayName",schemaPath:"#/$defs/displayName/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.platform !== undefined){
let data7 = data.platform;
const _errs18 = errors;
if(typeof data7 !== "string"){
validate37.errors = [{instancePath:instancePath+"/platform",schemaPath:"#/$defs/platform/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data7 === "macos") || (data7 === "linux")) || (data7 === "windows"))){
validate37.errors = [{instancePath:instancePath+"/platform",schemaPath:"#/$defs/platform/enum",keyword:"enum",params:{allowedValues: schema79.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs18 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.architecture !== undefined){
let data8 = data.architecture;
const _errs21 = errors;
if(typeof data8 !== "string"){
validate37.errors = [{instancePath:instancePath+"/architecture",schemaPath:"#/$defs/architecture/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data8 === "x64") || (data8 === "arm64"))){
validate37.errors = [{instancePath:instancePath+"/architecture",schemaPath:"#/$defs/architecture/enum",keyword:"enum",params:{allowedValues: schema80.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs21 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.executorVersion !== undefined){
let data9 = data.executorVersion;
const _errs24 = errors;
const _errs25 = errors;
if(errors === _errs25){
if(typeof data9 === "string"){
if(func1(data9) > 64){
validate37.errors = [{instancePath:instancePath+"/executorVersion",schemaPath:"#/$defs/executorVersion/maxLength",keyword:"maxLength",params:{limit: 64},message:"must NOT have more than 64 characters"}];
return false;
}
else {
if(!pattern32.test(data9)){
validate37.errors = [{instancePath:instancePath+"/executorVersion",schemaPath:"#/$defs/executorVersion/pattern",keyword:"pattern",params:{pattern: "^[0-9]+\\.[0-9]+\\.[0-9]+(?:[-+][A-Za-z0-9.-]{1,32})?$"},message:"must match pattern \""+"^[0-9]+\\.[0-9]+\\.[0-9]+(?:[-+][A-Za-z0-9.-]{1,32})?$"+"\""}];
return false;
}
}
}
else {
validate37.errors = [{instancePath:instancePath+"/executorVersion",schemaPath:"#/$defs/executorVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs24 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.keyFingerprint !== undefined){
let data10 = data.keyFingerprint;
const _errs27 = errors;
const _errs28 = errors;
if(errors === _errs28){
if(typeof data10 === "string"){
if(func1(data10) > 64){
validate37.errors = [{instancePath:instancePath+"/keyFingerprint",schemaPath:"#/$defs/keyFingerprint/maxLength",keyword:"maxLength",params:{limit: 64},message:"must NOT have more than 64 characters"}];
return false;
}
else {
if(!pattern33.test(data10)){
validate37.errors = [{instancePath:instancePath+"/keyFingerprint",schemaPath:"#/$defs/keyFingerprint/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{64}$"},message:"must match pattern \""+"^[a-f0-9]{64}$"+"\""}];
return false;
}
}
}
else {
validate37.errors = [{instancePath:instancePath+"/keyFingerprint",schemaPath:"#/$defs/keyFingerprint/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs27 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.expiresAt !== undefined){
let data11 = data.expiresAt;
const _errs30 = errors;
const _errs31 = errors;
if(errors === _errs31){
if(typeof data11 === "string"){
if(func1(data11) > 30){
validate37.errors = [{instancePath:instancePath+"/expiresAt",schemaPath:"#/$defs/timestamp/maxLength",keyword:"maxLength",params:{limit: 30},message:"must NOT have more than 30 characters"}];
return false;
}
else {
if(!pattern15.test(data11)){
validate37.errors = [{instancePath:instancePath+"/expiresAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"},message:"must match pattern \""+"^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"+"\""}];
return false;
}
}
}
else {
validate37.errors = [{instancePath:instancePath+"/expiresAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs30 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data12 = data.correlationId;
const _errs33 = errors;
const _errs34 = errors;
if(errors === _errs34){
if(typeof data12 === "string"){
if(func1(data12) > 68){
validate37.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data12)){
validate37.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate37.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs33 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate37.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate37.errors = vErrors;
return errors === 0;
}
validate37.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema85 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","claimId","executorId","deviceId","actorRole","displayName","platform","architecture","executorVersion","keyFingerprint","idempotencyKey","correlationId"],"allOf":[{"if":{"properties":{"platform":{"const":"windows"}},"required":["platform"]},"then":{"properties":{"architecture":{"const":"x64"}}}}],"properties":{"kind":{"const":"executor.claim.create.request"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"claimId":{"$ref":"#/$defs/claimId"},"executorId":{"$ref":"#/$defs/executorId"},"deviceId":{"$ref":"#/$defs/deviceId"},"actorRole":{"const":"executor_device"},"displayName":{"$ref":"#/$defs/displayName"},"platform":{"$ref":"#/$defs/platform"},"architecture":{"$ref":"#/$defs/architecture"},"executorVersion":{"$ref":"#/$defs/executorVersion"},"keyFingerprint":{"$ref":"#/$defs/keyFingerprint"},"idempotencyKey":{"$ref":"#/$defs/idempotencyKey"},"correlationId":{"$ref":"#/$defs/correlationId"}}};
const schema88 = {"type":"string","pattern":"^exe_[A-Za-z0-9]{8,64}$","maxLength":68};
const schema89 = {"type":"string","pattern":"^dev_[A-Za-z0-9]{8,64}$","maxLength":68};
const pattern37 = new RegExp("^exe_[A-Za-z0-9]{8,64}$", "u");
const pattern38 = new RegExp("^dev_[A-Za-z0-9]{8,64}$", "u");

function validate39(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate39.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs2 = errors;
let valid1 = true;
const _errs3 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.platform === undefined) && (missing0 = "platform")){
const err0 = {};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
if(data.platform !== undefined){
if("windows" !== data.platform){
const err1 = {};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
}
var _valid0 = _errs3 === errors;
errors = _errs2;
if(vErrors !== null){
if(_errs2){
vErrors.length = _errs2;
}
else {
vErrors = null;
}
}
if(_valid0){
const _errs5 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.architecture !== undefined){
if("x64" !== data.architecture){
validate39.errors = [{instancePath:instancePath+"/architecture",schemaPath:"#/allOf/0/then/properties/architecture/const",keyword:"const",params:{allowedValue: "x64"},message:"must be equal to constant"}];
return false;
}
}
}
var _valid0 = _errs5 === errors;
valid1 = _valid0;
if(valid1){
var props0 = {};
props0.architecture = true;
props0.platform = true;
}
}
if(!valid1){
const err2 = {instancePath,schemaPath:"#/allOf/0/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
validate39.errors = vErrors;
return false;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing1;
if((((((((((((((data.kind === undefined) && (missing1 = "kind")) || ((data.protocolVersion === undefined) && (missing1 = "protocolVersion"))) || ((data.claimId === undefined) && (missing1 = "claimId"))) || ((data.executorId === undefined) && (missing1 = "executorId"))) || ((data.deviceId === undefined) && (missing1 = "deviceId"))) || ((data.actorRole === undefined) && (missing1 = "actorRole"))) || ((data.displayName === undefined) && (missing1 = "displayName"))) || ((data.platform === undefined) && (missing1 = "platform"))) || ((data.architecture === undefined) && (missing1 = "architecture"))) || ((data.executorVersion === undefined) && (missing1 = "executorVersion"))) || ((data.keyFingerprint === undefined) && (missing1 = "keyFingerprint"))) || ((data.idempotencyKey === undefined) && (missing1 = "idempotencyKey"))) || ((data.correlationId === undefined) && (missing1 = "correlationId"))){
validate39.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
const _errs7 = errors;
for(const key0 in data){
if(!(func32.call(schema85.properties, key0))){
validate39.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs7 === errors){
if(data.kind !== undefined){
const _errs8 = errors;
if("executor.claim.create.request" !== data.kind){
validate39.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "executor.claim.create.request"},message:"must be equal to constant"}];
return false;
}
var valid4 = _errs8 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data.protocolVersion !== undefined){
let data3 = data.protocolVersion;
const _errs9 = errors;
if(typeof data3 !== "string"){
validate39.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data3){
validate39.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid4 = _errs9 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data.claimId !== undefined){
let data4 = data.claimId;
const _errs12 = errors;
const _errs13 = errors;
if(errors === _errs13){
if(typeof data4 === "string"){
if(func1(data4) > 68){
validate39.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern28.test(data4)){
validate39.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/pattern",keyword:"pattern",params:{pattern: "^clm_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^clm_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate39.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid4 = _errs12 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data.executorId !== undefined){
let data5 = data.executorId;
const _errs15 = errors;
const _errs16 = errors;
if(errors === _errs16){
if(typeof data5 === "string"){
if(func1(data5) > 68){
validate39.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern37.test(data5)){
validate39.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/pattern",keyword:"pattern",params:{pattern: "^exe_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^exe_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate39.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid4 = _errs15 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data.deviceId !== undefined){
let data6 = data.deviceId;
const _errs18 = errors;
const _errs19 = errors;
if(errors === _errs19){
if(typeof data6 === "string"){
if(func1(data6) > 68){
validate39.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern38.test(data6)){
validate39.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/pattern",keyword:"pattern",params:{pattern: "^dev_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^dev_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate39.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid4 = _errs18 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data.actorRole !== undefined){
const _errs21 = errors;
if("executor_device" !== data.actorRole){
validate39.errors = [{instancePath:instancePath+"/actorRole",schemaPath:"#/properties/actorRole/const",keyword:"const",params:{allowedValue: "executor_device"},message:"must be equal to constant"}];
return false;
}
var valid4 = _errs21 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data.displayName !== undefined){
let data8 = data.displayName;
const _errs22 = errors;
const _errs23 = errors;
if(errors === _errs23){
if(typeof data8 === "string"){
if(func1(data8) > 80){
validate39.errors = [{instancePath:instancePath+"/displayName",schemaPath:"#/$defs/displayName/maxLength",keyword:"maxLength",params:{limit: 80},message:"must NOT have more than 80 characters"}];
return false;
}
else {
if(!pattern31.test(data8)){
validate39.errors = [{instancePath:instancePath+"/displayName",schemaPath:"#/$defs/displayName/pattern",keyword:"pattern",params:{pattern: "^[A-Za-z0-9][A-Za-z0-9 ._()-]{0,79}$"},message:"must match pattern \""+"^[A-Za-z0-9][A-Za-z0-9 ._()-]{0,79}$"+"\""}];
return false;
}
}
}
else {
validate39.errors = [{instancePath:instancePath+"/displayName",schemaPath:"#/$defs/displayName/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid4 = _errs22 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data.platform !== undefined){
let data9 = data.platform;
const _errs25 = errors;
if(typeof data9 !== "string"){
validate39.errors = [{instancePath:instancePath+"/platform",schemaPath:"#/$defs/platform/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data9 === "macos") || (data9 === "linux")) || (data9 === "windows"))){
validate39.errors = [{instancePath:instancePath+"/platform",schemaPath:"#/$defs/platform/enum",keyword:"enum",params:{allowedValues: schema79.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid4 = _errs25 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data.architecture !== undefined){
let data10 = data.architecture;
const _errs28 = errors;
if(typeof data10 !== "string"){
validate39.errors = [{instancePath:instancePath+"/architecture",schemaPath:"#/$defs/architecture/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data10 === "x64") || (data10 === "arm64"))){
validate39.errors = [{instancePath:instancePath+"/architecture",schemaPath:"#/$defs/architecture/enum",keyword:"enum",params:{allowedValues: schema80.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid4 = _errs28 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data.executorVersion !== undefined){
let data11 = data.executorVersion;
const _errs31 = errors;
const _errs32 = errors;
if(errors === _errs32){
if(typeof data11 === "string"){
if(func1(data11) > 64){
validate39.errors = [{instancePath:instancePath+"/executorVersion",schemaPath:"#/$defs/executorVersion/maxLength",keyword:"maxLength",params:{limit: 64},message:"must NOT have more than 64 characters"}];
return false;
}
else {
if(!pattern32.test(data11)){
validate39.errors = [{instancePath:instancePath+"/executorVersion",schemaPath:"#/$defs/executorVersion/pattern",keyword:"pattern",params:{pattern: "^[0-9]+\\.[0-9]+\\.[0-9]+(?:[-+][A-Za-z0-9.-]{1,32})?$"},message:"must match pattern \""+"^[0-9]+\\.[0-9]+\\.[0-9]+(?:[-+][A-Za-z0-9.-]{1,32})?$"+"\""}];
return false;
}
}
}
else {
validate39.errors = [{instancePath:instancePath+"/executorVersion",schemaPath:"#/$defs/executorVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid4 = _errs31 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data.keyFingerprint !== undefined){
let data12 = data.keyFingerprint;
const _errs34 = errors;
const _errs35 = errors;
if(errors === _errs35){
if(typeof data12 === "string"){
if(func1(data12) > 64){
validate39.errors = [{instancePath:instancePath+"/keyFingerprint",schemaPath:"#/$defs/keyFingerprint/maxLength",keyword:"maxLength",params:{limit: 64},message:"must NOT have more than 64 characters"}];
return false;
}
else {
if(!pattern33.test(data12)){
validate39.errors = [{instancePath:instancePath+"/keyFingerprint",schemaPath:"#/$defs/keyFingerprint/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{64}$"},message:"must match pattern \""+"^[a-f0-9]{64}$"+"\""}];
return false;
}
}
}
else {
validate39.errors = [{instancePath:instancePath+"/keyFingerprint",schemaPath:"#/$defs/keyFingerprint/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid4 = _errs34 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data.idempotencyKey !== undefined){
let data13 = data.idempotencyKey;
const _errs37 = errors;
const _errs38 = errors;
if(errors === _errs38){
if(typeof data13 === "string"){
if(func1(data13) > 85){
validate39.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/maxLength",keyword:"maxLength",params:{limit: 85},message:"must NOT have more than 85 characters"}];
return false;
}
else {
if(!pattern5.test(data13)){
validate39.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/pattern",keyword:"pattern",params:{pattern: "^idem_[A-Za-z0-9_-]{16,80}$"},message:"must match pattern \""+"^idem_[A-Za-z0-9_-]{16,80}$"+"\""}];
return false;
}
}
}
else {
validate39.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid4 = _errs37 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data.correlationId !== undefined){
let data14 = data.correlationId;
const _errs40 = errors;
const _errs41 = errors;
if(errors === _errs41){
if(typeof data14 === "string"){
if(func1(data14) > 68){
validate39.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data14)){
validate39.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate39.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid4 = _errs40 === errors;
}
else {
var valid4 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate39.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate39.errors = vErrors;
return errors === 0;
}
validate39.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema97 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","claimId","status","correlationId"],"properties":{"kind":{"const":"executor.claim.status.response"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"claimId":{"$ref":"#/$defs/claimId"},"status":{"enum":["pending","accepted","denied","expired"]},"correlationId":{"$ref":"#/$defs/correlationId"},"websiteDeploymentId":{"$ref":"#/$defs/websiteDeploymentId"}},"allOf":[{"if":{"properties":{"status":{"const":"accepted"}},"required":["status"]},"then":{"required":["websiteDeploymentId"],"properties":{"websiteDeploymentId":{"$ref":"#/$defs/websiteDeploymentId"}}},"else":{"properties":{"websiteDeploymentId":false}}}]};
const schema98 = {"type":"string","pattern":"^wdp_[A-Za-z0-9]{32}$","maxLength":36};
const pattern44 = new RegExp("^wdp_[A-Za-z0-9]{32}$", "u");

function validate41(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate41.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs2 = errors;
let valid1 = true;
const _errs3 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.status === undefined) && (missing0 = "status")){
const err0 = {};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
if(data.status !== undefined){
if("accepted" !== data.status){
const err1 = {};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
}
var _valid0 = _errs3 === errors;
errors = _errs2;
if(vErrors !== null){
if(_errs2){
vErrors.length = _errs2;
}
else {
vErrors = null;
}
}
let ifClause0;
if(_valid0){
const _errs5 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing1;
if((data.websiteDeploymentId === undefined) && (missing1 = "websiteDeploymentId")){
validate41.errors = [{instancePath,schemaPath:"#/allOf/0/then/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
if(data.websiteDeploymentId !== undefined){
let data1 = data.websiteDeploymentId;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data1 === "string"){
if(func1(data1) > 36){
validate41.errors = [{instancePath:instancePath+"/websiteDeploymentId",schemaPath:"#/$defs/websiteDeploymentId/maxLength",keyword:"maxLength",params:{limit: 36},message:"must NOT have more than 36 characters"}];
return false;
}
else {
if(!pattern44.test(data1)){
validate41.errors = [{instancePath:instancePath+"/websiteDeploymentId",schemaPath:"#/$defs/websiteDeploymentId/pattern",keyword:"pattern",params:{pattern: "^wdp_[A-Za-z0-9]{32}$"},message:"must match pattern \""+"^wdp_[A-Za-z0-9]{32}$"+"\""}];
return false;
}
}
}
else {
validate41.errors = [{instancePath:instancePath+"/websiteDeploymentId",schemaPath:"#/$defs/websiteDeploymentId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
}
}
var _valid0 = _errs5 === errors;
valid1 = _valid0;
if(valid1){
var props0 = {};
props0.websiteDeploymentId = true;
props0.status = true;
}
ifClause0 = "then";
}
else {
const _errs9 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.websiteDeploymentId !== undefined){
validate41.errors = [{instancePath:instancePath+"/websiteDeploymentId",schemaPath:"#/allOf/0/else/properties/websiteDeploymentId/false schema",keyword:"false schema",params:{},message:"boolean schema is false"}];
return false;
}
}
var _valid0 = _errs9 === errors;
valid1 = _valid0;
if(valid1){
if(props0 !== true){
props0 = props0 || {};
props0.websiteDeploymentId = true;
}
}
ifClause0 = "else";
}
if(!valid1){
const err2 = {instancePath,schemaPath:"#/allOf/0/if",keyword:"if",params:{failingKeyword: ifClause0},message:"must match \""+ifClause0+"\" schema"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
validate41.errors = vErrors;
return false;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing2;
if((((((data.kind === undefined) && (missing2 = "kind")) || ((data.protocolVersion === undefined) && (missing2 = "protocolVersion"))) || ((data.claimId === undefined) && (missing2 = "claimId"))) || ((data.status === undefined) && (missing2 = "status"))) || ((data.correlationId === undefined) && (missing2 = "correlationId"))){
validate41.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing2},message:"must have required property '"+missing2+"'"}];
return false;
}
else {
const _errs10 = errors;
for(const key0 in data){
if(!((((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "claimId")) || (key0 === "status")) || (key0 === "correlationId")) || (key0 === "websiteDeploymentId"))){
validate41.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs10 === errors){
if(data.kind !== undefined){
const _errs11 = errors;
if("executor.claim.status.response" !== data.kind){
validate41.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "executor.claim.status.response"},message:"must be equal to constant"}];
return false;
}
var valid6 = _errs11 === errors;
}
else {
var valid6 = true;
}
if(valid6){
if(data.protocolVersion !== undefined){
let data4 = data.protocolVersion;
const _errs12 = errors;
if(typeof data4 !== "string"){
validate41.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data4){
validate41.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid6 = _errs12 === errors;
}
else {
var valid6 = true;
}
if(valid6){
if(data.claimId !== undefined){
let data5 = data.claimId;
const _errs15 = errors;
const _errs16 = errors;
if(errors === _errs16){
if(typeof data5 === "string"){
if(func1(data5) > 68){
validate41.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern28.test(data5)){
validate41.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/pattern",keyword:"pattern",params:{pattern: "^clm_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^clm_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate41.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid6 = _errs15 === errors;
}
else {
var valid6 = true;
}
if(valid6){
if(data.status !== undefined){
let data6 = data.status;
const _errs18 = errors;
if(!((((data6 === "pending") || (data6 === "accepted")) || (data6 === "denied")) || (data6 === "expired"))){
validate41.errors = [{instancePath:instancePath+"/status",schemaPath:"#/properties/status/enum",keyword:"enum",params:{allowedValues: schema97.properties.status.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid6 = _errs18 === errors;
}
else {
var valid6 = true;
}
if(valid6){
if(data.correlationId !== undefined){
let data7 = data.correlationId;
const _errs19 = errors;
const _errs20 = errors;
if(errors === _errs20){
if(typeof data7 === "string"){
if(func1(data7) > 68){
validate41.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data7)){
validate41.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate41.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid6 = _errs19 === errors;
}
else {
var valid6 = true;
}
if(valid6){
if(data.websiteDeploymentId !== undefined){
let data8 = data.websiteDeploymentId;
const _errs22 = errors;
const _errs23 = errors;
if(errors === _errs23){
if(typeof data8 === "string"){
if(func1(data8) > 36){
validate41.errors = [{instancePath:instancePath+"/websiteDeploymentId",schemaPath:"#/$defs/websiteDeploymentId/maxLength",keyword:"maxLength",params:{limit: 36},message:"must NOT have more than 36 characters"}];
return false;
}
else {
if(!pattern44.test(data8)){
validate41.errors = [{instancePath:instancePath+"/websiteDeploymentId",schemaPath:"#/$defs/websiteDeploymentId/pattern",keyword:"pattern",params:{pattern: "^wdp_[A-Za-z0-9]{32}$"},message:"must match pattern \""+"^wdp_[A-Za-z0-9]{32}$"+"\""}];
return false;
}
}
}
else {
validate41.errors = [{instancePath:instancePath+"/websiteDeploymentId",schemaPath:"#/$defs/websiteDeploymentId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid6 = _errs22 === errors;
}
else {
var valid6 = true;
}
}
}
}
}
}
}
}
}
else {
validate41.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate41.errors = vErrors;
return errors === 0;
}
validate41.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema103 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","claimId","sessionId","actorRole","decision","idempotencyKey","correlationId"],"properties":{"kind":{"const":"executor.claim.decision.request"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"claimId":{"$ref":"#/$defs/claimId"},"sessionId":{"$ref":"#/$defs/sessionId"},"actorRole":{"const":"browser_session"},"decision":{"enum":["accept","deny"]},"idempotencyKey":{"$ref":"#/$defs/idempotencyKey"},"correlationId":{"$ref":"#/$defs/correlationId"}}};

function validate43(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate43.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.claimId === undefined) && (missing0 = "claimId"))) || ((data.sessionId === undefined) && (missing0 = "sessionId"))) || ((data.actorRole === undefined) && (missing0 = "actorRole"))) || ((data.decision === undefined) && (missing0 = "decision"))) || ((data.idempotencyKey === undefined) && (missing0 = "idempotencyKey"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate43.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "claimId")) || (key0 === "sessionId")) || (key0 === "actorRole")) || (key0 === "decision")) || (key0 === "idempotencyKey")) || (key0 === "correlationId"))){
validate43.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("executor.claim.decision.request" !== data.kind){
validate43.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "executor.claim.decision.request"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate43.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate43.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.claimId !== undefined){
let data2 = data.claimId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate43.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern28.test(data2)){
validate43.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/pattern",keyword:"pattern",params:{pattern: "^clm_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^clm_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate43.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sessionId !== undefined){
let data3 = data.sessionId;
const _errs9 = errors;
const _errs10 = errors;
if(errors === _errs10){
if(typeof data3 === "string"){
if(func1(data3) > 68){
validate43.errors = [{instancePath:instancePath+"/sessionId",schemaPath:"#/$defs/sessionId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern14.test(data3)){
validate43.errors = [{instancePath:instancePath+"/sessionId",schemaPath:"#/$defs/sessionId/pattern",keyword:"pattern",params:{pattern: "^ses_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^ses_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate43.errors = [{instancePath:instancePath+"/sessionId",schemaPath:"#/$defs/sessionId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.actorRole !== undefined){
const _errs12 = errors;
if("browser_session" !== data.actorRole){
validate43.errors = [{instancePath:instancePath+"/actorRole",schemaPath:"#/properties/actorRole/const",keyword:"const",params:{allowedValue: "browser_session"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.decision !== undefined){
let data5 = data.decision;
const _errs13 = errors;
if(!((data5 === "accept") || (data5 === "deny"))){
validate43.errors = [{instancePath:instancePath+"/decision",schemaPath:"#/properties/decision/enum",keyword:"enum",params:{allowedValues: schema103.properties.decision.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.idempotencyKey !== undefined){
let data6 = data.idempotencyKey;
const _errs14 = errors;
const _errs15 = errors;
if(errors === _errs15){
if(typeof data6 === "string"){
if(func1(data6) > 85){
validate43.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/maxLength",keyword:"maxLength",params:{limit: 85},message:"must NOT have more than 85 characters"}];
return false;
}
else {
if(!pattern5.test(data6)){
validate43.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/pattern",keyword:"pattern",params:{pattern: "^idem_[A-Za-z0-9_-]{16,80}$"},message:"must match pattern \""+"^idem_[A-Za-z0-9_-]{16,80}$"+"\""}];
return false;
}
}
}
else {
validate43.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data7 = data.correlationId;
const _errs17 = errors;
const _errs18 = errors;
if(errors === _errs18){
if(typeof data7 === "string"){
if(func1(data7) > 68){
validate43.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data7)){
validate43.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate43.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
else {
validate43.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate43.errors = vErrors;
return errors === 0;
}
validate43.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema109 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","claimId","status","correlationId"],"properties":{"kind":{"const":"executor.claim.decision.response"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"claimId":{"$ref":"#/$defs/claimId"},"status":{"enum":["accepted","denied"]},"correlationId":{"$ref":"#/$defs/correlationId"},"websiteDeploymentId":{"$ref":"#/$defs/websiteDeploymentId"}},"allOf":[{"if":{"properties":{"status":{"const":"accepted"}},"required":["status"]},"then":{"required":["websiteDeploymentId"],"properties":{"websiteDeploymentId":{"$ref":"#/$defs/websiteDeploymentId"}}},"else":{"properties":{"websiteDeploymentId":false}}}]};

function validate45(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate45.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs2 = errors;
let valid1 = true;
const _errs3 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.status === undefined) && (missing0 = "status")){
const err0 = {};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
if(data.status !== undefined){
if("accepted" !== data.status){
const err1 = {};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
}
var _valid0 = _errs3 === errors;
errors = _errs2;
if(vErrors !== null){
if(_errs2){
vErrors.length = _errs2;
}
else {
vErrors = null;
}
}
let ifClause0;
if(_valid0){
const _errs5 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing1;
if((data.websiteDeploymentId === undefined) && (missing1 = "websiteDeploymentId")){
validate45.errors = [{instancePath,schemaPath:"#/allOf/0/then/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
if(data.websiteDeploymentId !== undefined){
let data1 = data.websiteDeploymentId;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data1 === "string"){
if(func1(data1) > 36){
validate45.errors = [{instancePath:instancePath+"/websiteDeploymentId",schemaPath:"#/$defs/websiteDeploymentId/maxLength",keyword:"maxLength",params:{limit: 36},message:"must NOT have more than 36 characters"}];
return false;
}
else {
if(!pattern44.test(data1)){
validate45.errors = [{instancePath:instancePath+"/websiteDeploymentId",schemaPath:"#/$defs/websiteDeploymentId/pattern",keyword:"pattern",params:{pattern: "^wdp_[A-Za-z0-9]{32}$"},message:"must match pattern \""+"^wdp_[A-Za-z0-9]{32}$"+"\""}];
return false;
}
}
}
else {
validate45.errors = [{instancePath:instancePath+"/websiteDeploymentId",schemaPath:"#/$defs/websiteDeploymentId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
}
}
var _valid0 = _errs5 === errors;
valid1 = _valid0;
if(valid1){
var props0 = {};
props0.websiteDeploymentId = true;
props0.status = true;
}
ifClause0 = "then";
}
else {
const _errs9 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.websiteDeploymentId !== undefined){
validate45.errors = [{instancePath:instancePath+"/websiteDeploymentId",schemaPath:"#/allOf/0/else/properties/websiteDeploymentId/false schema",keyword:"false schema",params:{},message:"boolean schema is false"}];
return false;
}
}
var _valid0 = _errs9 === errors;
valid1 = _valid0;
if(valid1){
if(props0 !== true){
props0 = props0 || {};
props0.websiteDeploymentId = true;
}
}
ifClause0 = "else";
}
if(!valid1){
const err2 = {instancePath,schemaPath:"#/allOf/0/if",keyword:"if",params:{failingKeyword: ifClause0},message:"must match \""+ifClause0+"\" schema"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
validate45.errors = vErrors;
return false;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing2;
if((((((data.kind === undefined) && (missing2 = "kind")) || ((data.protocolVersion === undefined) && (missing2 = "protocolVersion"))) || ((data.claimId === undefined) && (missing2 = "claimId"))) || ((data.status === undefined) && (missing2 = "status"))) || ((data.correlationId === undefined) && (missing2 = "correlationId"))){
validate45.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing2},message:"must have required property '"+missing2+"'"}];
return false;
}
else {
const _errs10 = errors;
for(const key0 in data){
if(!((((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "claimId")) || (key0 === "status")) || (key0 === "correlationId")) || (key0 === "websiteDeploymentId"))){
validate45.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs10 === errors){
if(data.kind !== undefined){
const _errs11 = errors;
if("executor.claim.decision.response" !== data.kind){
validate45.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "executor.claim.decision.response"},message:"must be equal to constant"}];
return false;
}
var valid6 = _errs11 === errors;
}
else {
var valid6 = true;
}
if(valid6){
if(data.protocolVersion !== undefined){
let data4 = data.protocolVersion;
const _errs12 = errors;
if(typeof data4 !== "string"){
validate45.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data4){
validate45.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid6 = _errs12 === errors;
}
else {
var valid6 = true;
}
if(valid6){
if(data.claimId !== undefined){
let data5 = data.claimId;
const _errs15 = errors;
const _errs16 = errors;
if(errors === _errs16){
if(typeof data5 === "string"){
if(func1(data5) > 68){
validate45.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern28.test(data5)){
validate45.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/pattern",keyword:"pattern",params:{pattern: "^clm_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^clm_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate45.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid6 = _errs15 === errors;
}
else {
var valid6 = true;
}
if(valid6){
if(data.status !== undefined){
let data6 = data.status;
const _errs18 = errors;
if(!((data6 === "accepted") || (data6 === "denied"))){
validate45.errors = [{instancePath:instancePath+"/status",schemaPath:"#/properties/status/enum",keyword:"enum",params:{allowedValues: schema109.properties.status.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid6 = _errs18 === errors;
}
else {
var valid6 = true;
}
if(valid6){
if(data.correlationId !== undefined){
let data7 = data.correlationId;
const _errs19 = errors;
const _errs20 = errors;
if(errors === _errs20){
if(typeof data7 === "string"){
if(func1(data7) > 68){
validate45.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data7)){
validate45.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate45.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid6 = _errs19 === errors;
}
else {
var valid6 = true;
}
if(valid6){
if(data.websiteDeploymentId !== undefined){
let data8 = data.websiteDeploymentId;
const _errs22 = errors;
const _errs23 = errors;
if(errors === _errs23){
if(typeof data8 === "string"){
if(func1(data8) > 36){
validate45.errors = [{instancePath:instancePath+"/websiteDeploymentId",schemaPath:"#/$defs/websiteDeploymentId/maxLength",keyword:"maxLength",params:{limit: 36},message:"must NOT have more than 36 characters"}];
return false;
}
else {
if(!pattern44.test(data8)){
validate45.errors = [{instancePath:instancePath+"/websiteDeploymentId",schemaPath:"#/$defs/websiteDeploymentId/pattern",keyword:"pattern",params:{pattern: "^wdp_[A-Za-z0-9]{32}$"},message:"must match pattern \""+"^wdp_[A-Za-z0-9]{32}$"+"\""}];
return false;
}
}
}
else {
validate45.errors = [{instancePath:instancePath+"/websiteDeploymentId",schemaPath:"#/$defs/websiteDeploymentId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid6 = _errs22 === errors;
}
else {
var valid6 = true;
}
}
}
}
}
}
}
}
}
else {
validate45.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate45.errors = vErrors;
return errors === 0;
}
validate45.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema115 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","claimId","deviceId","actorRole","displayName","platform","architecture","desktopVersion","keyFingerprint","idempotencyKey","correlationId"],"allOf":[{"if":{"properties":{"platform":{"const":"windows"}},"required":["platform"]},"then":{"properties":{"architecture":{"const":"x64"}}}}],"properties":{"kind":{"const":"desktop.claim.create.request"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"claimId":{"$ref":"#/$defs/claimId"},"deviceId":{"$ref":"#/$defs/deviceId"},"actorRole":{"const":"desktop_device"},"displayName":{"$ref":"#/$defs/displayName"},"platform":{"$ref":"#/$defs/platform"},"architecture":{"$ref":"#/$defs/architecture"},"desktopVersion":{"$ref":"#/$defs/desktopVersion"},"keyFingerprint":{"$ref":"#/$defs/keyFingerprint"},"idempotencyKey":{"$ref":"#/$defs/idempotencyKey"},"correlationId":{"$ref":"#/$defs/correlationId"}}};
const schema122 = {"type":"string","pattern":"^[0-9]+\\.[0-9]+\\.[0-9]+(?:[-+][A-Za-z0-9.-]{1,32})?$","maxLength":64};

function validate47(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate47.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs2 = errors;
let valid1 = true;
const _errs3 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.platform === undefined) && (missing0 = "platform")){
const err0 = {};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
if(data.platform !== undefined){
if("windows" !== data.platform){
const err1 = {};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
}
var _valid0 = _errs3 === errors;
errors = _errs2;
if(vErrors !== null){
if(_errs2){
vErrors.length = _errs2;
}
else {
vErrors = null;
}
}
if(_valid0){
const _errs5 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.architecture !== undefined){
if("x64" !== data.architecture){
validate47.errors = [{instancePath:instancePath+"/architecture",schemaPath:"#/allOf/0/then/properties/architecture/const",keyword:"const",params:{allowedValue: "x64"},message:"must be equal to constant"}];
return false;
}
}
}
var _valid0 = _errs5 === errors;
valid1 = _valid0;
if(valid1){
var props0 = {};
props0.architecture = true;
props0.platform = true;
}
}
if(!valid1){
const err2 = {instancePath,schemaPath:"#/allOf/0/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
validate47.errors = vErrors;
return false;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing1;
if(((((((((((((data.kind === undefined) && (missing1 = "kind")) || ((data.protocolVersion === undefined) && (missing1 = "protocolVersion"))) || ((data.claimId === undefined) && (missing1 = "claimId"))) || ((data.deviceId === undefined) && (missing1 = "deviceId"))) || ((data.actorRole === undefined) && (missing1 = "actorRole"))) || ((data.displayName === undefined) && (missing1 = "displayName"))) || ((data.platform === undefined) && (missing1 = "platform"))) || ((data.architecture === undefined) && (missing1 = "architecture"))) || ((data.desktopVersion === undefined) && (missing1 = "desktopVersion"))) || ((data.keyFingerprint === undefined) && (missing1 = "keyFingerprint"))) || ((data.idempotencyKey === undefined) && (missing1 = "idempotencyKey"))) || ((data.correlationId === undefined) && (missing1 = "correlationId"))){
validate47.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
const _errs7 = errors;
for(const key0 in data){
if(!(func32.call(schema115.properties, key0))){
validate47.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs7 === errors){
if(data.kind !== undefined){
const _errs8 = errors;
if("desktop.claim.create.request" !== data.kind){
validate47.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "desktop.claim.create.request"},message:"must be equal to constant"}];
return false;
}
var valid4 = _errs8 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data.protocolVersion !== undefined){
let data3 = data.protocolVersion;
const _errs9 = errors;
if(typeof data3 !== "string"){
validate47.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data3){
validate47.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid4 = _errs9 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data.claimId !== undefined){
let data4 = data.claimId;
const _errs12 = errors;
const _errs13 = errors;
if(errors === _errs13){
if(typeof data4 === "string"){
if(func1(data4) > 68){
validate47.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern28.test(data4)){
validate47.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/pattern",keyword:"pattern",params:{pattern: "^clm_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^clm_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate47.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid4 = _errs12 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data.deviceId !== undefined){
let data5 = data.deviceId;
const _errs15 = errors;
const _errs16 = errors;
if(errors === _errs16){
if(typeof data5 === "string"){
if(func1(data5) > 68){
validate47.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern38.test(data5)){
validate47.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/pattern",keyword:"pattern",params:{pattern: "^dev_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^dev_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate47.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid4 = _errs15 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data.actorRole !== undefined){
const _errs18 = errors;
if("desktop_device" !== data.actorRole){
validate47.errors = [{instancePath:instancePath+"/actorRole",schemaPath:"#/properties/actorRole/const",keyword:"const",params:{allowedValue: "desktop_device"},message:"must be equal to constant"}];
return false;
}
var valid4 = _errs18 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data.displayName !== undefined){
let data7 = data.displayName;
const _errs19 = errors;
const _errs20 = errors;
if(errors === _errs20){
if(typeof data7 === "string"){
if(func1(data7) > 80){
validate47.errors = [{instancePath:instancePath+"/displayName",schemaPath:"#/$defs/displayName/maxLength",keyword:"maxLength",params:{limit: 80},message:"must NOT have more than 80 characters"}];
return false;
}
else {
if(!pattern31.test(data7)){
validate47.errors = [{instancePath:instancePath+"/displayName",schemaPath:"#/$defs/displayName/pattern",keyword:"pattern",params:{pattern: "^[A-Za-z0-9][A-Za-z0-9 ._()-]{0,79}$"},message:"must match pattern \""+"^[A-Za-z0-9][A-Za-z0-9 ._()-]{0,79}$"+"\""}];
return false;
}
}
}
else {
validate47.errors = [{instancePath:instancePath+"/displayName",schemaPath:"#/$defs/displayName/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid4 = _errs19 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data.platform !== undefined){
let data8 = data.platform;
const _errs22 = errors;
if(typeof data8 !== "string"){
validate47.errors = [{instancePath:instancePath+"/platform",schemaPath:"#/$defs/platform/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data8 === "macos") || (data8 === "linux")) || (data8 === "windows"))){
validate47.errors = [{instancePath:instancePath+"/platform",schemaPath:"#/$defs/platform/enum",keyword:"enum",params:{allowedValues: schema79.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid4 = _errs22 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data.architecture !== undefined){
let data9 = data.architecture;
const _errs25 = errors;
if(typeof data9 !== "string"){
validate47.errors = [{instancePath:instancePath+"/architecture",schemaPath:"#/$defs/architecture/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data9 === "x64") || (data9 === "arm64"))){
validate47.errors = [{instancePath:instancePath+"/architecture",schemaPath:"#/$defs/architecture/enum",keyword:"enum",params:{allowedValues: schema80.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid4 = _errs25 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data.desktopVersion !== undefined){
let data10 = data.desktopVersion;
const _errs28 = errors;
const _errs29 = errors;
if(errors === _errs29){
if(typeof data10 === "string"){
if(func1(data10) > 64){
validate47.errors = [{instancePath:instancePath+"/desktopVersion",schemaPath:"#/$defs/desktopVersion/maxLength",keyword:"maxLength",params:{limit: 64},message:"must NOT have more than 64 characters"}];
return false;
}
else {
if(!pattern32.test(data10)){
validate47.errors = [{instancePath:instancePath+"/desktopVersion",schemaPath:"#/$defs/desktopVersion/pattern",keyword:"pattern",params:{pattern: "^[0-9]+\\.[0-9]+\\.[0-9]+(?:[-+][A-Za-z0-9.-]{1,32})?$"},message:"must match pattern \""+"^[0-9]+\\.[0-9]+\\.[0-9]+(?:[-+][A-Za-z0-9.-]{1,32})?$"+"\""}];
return false;
}
}
}
else {
validate47.errors = [{instancePath:instancePath+"/desktopVersion",schemaPath:"#/$defs/desktopVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid4 = _errs28 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data.keyFingerprint !== undefined){
let data11 = data.keyFingerprint;
const _errs31 = errors;
const _errs32 = errors;
if(errors === _errs32){
if(typeof data11 === "string"){
if(func1(data11) > 64){
validate47.errors = [{instancePath:instancePath+"/keyFingerprint",schemaPath:"#/$defs/keyFingerprint/maxLength",keyword:"maxLength",params:{limit: 64},message:"must NOT have more than 64 characters"}];
return false;
}
else {
if(!pattern33.test(data11)){
validate47.errors = [{instancePath:instancePath+"/keyFingerprint",schemaPath:"#/$defs/keyFingerprint/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{64}$"},message:"must match pattern \""+"^[a-f0-9]{64}$"+"\""}];
return false;
}
}
}
else {
validate47.errors = [{instancePath:instancePath+"/keyFingerprint",schemaPath:"#/$defs/keyFingerprint/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid4 = _errs31 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data.idempotencyKey !== undefined){
let data12 = data.idempotencyKey;
const _errs34 = errors;
const _errs35 = errors;
if(errors === _errs35){
if(typeof data12 === "string"){
if(func1(data12) > 85){
validate47.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/maxLength",keyword:"maxLength",params:{limit: 85},message:"must NOT have more than 85 characters"}];
return false;
}
else {
if(!pattern5.test(data12)){
validate47.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/pattern",keyword:"pattern",params:{pattern: "^idem_[A-Za-z0-9_-]{16,80}$"},message:"must match pattern \""+"^idem_[A-Za-z0-9_-]{16,80}$"+"\""}];
return false;
}
}
}
else {
validate47.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid4 = _errs34 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data.correlationId !== undefined){
let data13 = data.correlationId;
const _errs37 = errors;
const _errs38 = errors;
if(errors === _errs38){
if(typeof data13 === "string"){
if(func1(data13) > 68){
validate47.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data13)){
validate47.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate47.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid4 = _errs37 === errors;
}
else {
var valid4 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate47.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate47.errors = vErrors;
return errors === 0;
}
validate47.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema126 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","claimId","actorRole","claimUrl","shortCode","deviceId","displayName","platform","architecture","desktopVersion","keyFingerprint","expiresAt","correlationId"],"properties":{"kind":{"const":"desktop.claim.challenge"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"claimId":{"$ref":"#/$defs/claimId"},"actorRole":{"const":"claim_challenge"},"claimUrl":{"$ref":"#/$defs/claimUrl"},"shortCode":{"type":"string","pattern":"^[A-Z]{4}-[A-Z]{4}$","maxLength":9},"deviceId":{"$ref":"#/$defs/deviceId"},"displayName":{"$ref":"#/$defs/displayName"},"platform":{"$ref":"#/$defs/platform"},"architecture":{"$ref":"#/$defs/architecture"},"desktopVersion":{"$ref":"#/$defs/desktopVersion"},"keyFingerprint":{"$ref":"#/$defs/keyFingerprint"},"expiresAt":{"$ref":"#/$defs/timestamp"},"correlationId":{"$ref":"#/$defs/correlationId"}}};

function validate49(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate49.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((((((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.claimId === undefined) && (missing0 = "claimId"))) || ((data.actorRole === undefined) && (missing0 = "actorRole"))) || ((data.claimUrl === undefined) && (missing0 = "claimUrl"))) || ((data.shortCode === undefined) && (missing0 = "shortCode"))) || ((data.deviceId === undefined) && (missing0 = "deviceId"))) || ((data.displayName === undefined) && (missing0 = "displayName"))) || ((data.platform === undefined) && (missing0 = "platform"))) || ((data.architecture === undefined) && (missing0 = "architecture"))) || ((data.desktopVersion === undefined) && (missing0 = "desktopVersion"))) || ((data.keyFingerprint === undefined) && (missing0 = "keyFingerprint"))) || ((data.expiresAt === undefined) && (missing0 = "expiresAt"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate49.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(func32.call(schema126.properties, key0))){
validate49.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("desktop.claim.challenge" !== data.kind){
validate49.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "desktop.claim.challenge"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate49.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate49.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.claimId !== undefined){
let data2 = data.claimId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate49.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern28.test(data2)){
validate49.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/pattern",keyword:"pattern",params:{pattern: "^clm_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^clm_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate49.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.actorRole !== undefined){
const _errs9 = errors;
if("claim_challenge" !== data.actorRole){
validate49.errors = [{instancePath:instancePath+"/actorRole",schemaPath:"#/properties/actorRole/const",keyword:"const",params:{allowedValue: "claim_challenge"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.claimUrl !== undefined){
let data4 = data.claimUrl;
const _errs10 = errors;
const _errs11 = errors;
if(errors === _errs11){
if(typeof data4 === "string"){
if(func1(data4) > 512){
validate49.errors = [{instancePath:instancePath+"/claimUrl",schemaPath:"#/$defs/claimUrl/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(!pattern29.test(data4)){
validate49.errors = [{instancePath:instancePath+"/claimUrl",schemaPath:"#/$defs/claimUrl/pattern",keyword:"pattern",params:{pattern: "^https://[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?(?::[0-9]{1,5})?(?:/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*)?(?:\\?[A-Za-z0-9._~!$&'()*+,;=:@%/?-]*)?$"},message:"must match pattern \""+"^https://[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?(?::[0-9]{1,5})?(?:/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*)?(?:\\?[A-Za-z0-9._~!$&'()*+,;=:@%/?-]*)?$"+"\""}];
return false;
}
}
}
else {
validate49.errors = [{instancePath:instancePath+"/claimUrl",schemaPath:"#/$defs/claimUrl/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.shortCode !== undefined){
let data5 = data.shortCode;
const _errs13 = errors;
if(errors === _errs13){
if(typeof data5 === "string"){
if(func1(data5) > 9){
validate49.errors = [{instancePath:instancePath+"/shortCode",schemaPath:"#/properties/shortCode/maxLength",keyword:"maxLength",params:{limit: 9},message:"must NOT have more than 9 characters"}];
return false;
}
else {
if(!pattern30.test(data5)){
validate49.errors = [{instancePath:instancePath+"/shortCode",schemaPath:"#/properties/shortCode/pattern",keyword:"pattern",params:{pattern: "^[A-Z]{4}-[A-Z]{4}$"},message:"must match pattern \""+"^[A-Z]{4}-[A-Z]{4}$"+"\""}];
return false;
}
}
}
else {
validate49.errors = [{instancePath:instancePath+"/shortCode",schemaPath:"#/properties/shortCode/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.deviceId !== undefined){
let data6 = data.deviceId;
const _errs15 = errors;
const _errs16 = errors;
if(errors === _errs16){
if(typeof data6 === "string"){
if(func1(data6) > 68){
validate49.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern38.test(data6)){
validate49.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/pattern",keyword:"pattern",params:{pattern: "^dev_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^dev_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate49.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.displayName !== undefined){
let data7 = data.displayName;
const _errs18 = errors;
const _errs19 = errors;
if(errors === _errs19){
if(typeof data7 === "string"){
if(func1(data7) > 80){
validate49.errors = [{instancePath:instancePath+"/displayName",schemaPath:"#/$defs/displayName/maxLength",keyword:"maxLength",params:{limit: 80},message:"must NOT have more than 80 characters"}];
return false;
}
else {
if(!pattern31.test(data7)){
validate49.errors = [{instancePath:instancePath+"/displayName",schemaPath:"#/$defs/displayName/pattern",keyword:"pattern",params:{pattern: "^[A-Za-z0-9][A-Za-z0-9 ._()-]{0,79}$"},message:"must match pattern \""+"^[A-Za-z0-9][A-Za-z0-9 ._()-]{0,79}$"+"\""}];
return false;
}
}
}
else {
validate49.errors = [{instancePath:instancePath+"/displayName",schemaPath:"#/$defs/displayName/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs18 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.platform !== undefined){
let data8 = data.platform;
const _errs21 = errors;
if(typeof data8 !== "string"){
validate49.errors = [{instancePath:instancePath+"/platform",schemaPath:"#/$defs/platform/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data8 === "macos") || (data8 === "linux")) || (data8 === "windows"))){
validate49.errors = [{instancePath:instancePath+"/platform",schemaPath:"#/$defs/platform/enum",keyword:"enum",params:{allowedValues: schema79.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs21 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.architecture !== undefined){
let data9 = data.architecture;
const _errs24 = errors;
if(typeof data9 !== "string"){
validate49.errors = [{instancePath:instancePath+"/architecture",schemaPath:"#/$defs/architecture/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data9 === "x64") || (data9 === "arm64"))){
validate49.errors = [{instancePath:instancePath+"/architecture",schemaPath:"#/$defs/architecture/enum",keyword:"enum",params:{allowedValues: schema80.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs24 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.desktopVersion !== undefined){
let data10 = data.desktopVersion;
const _errs27 = errors;
const _errs28 = errors;
if(errors === _errs28){
if(typeof data10 === "string"){
if(func1(data10) > 64){
validate49.errors = [{instancePath:instancePath+"/desktopVersion",schemaPath:"#/$defs/desktopVersion/maxLength",keyword:"maxLength",params:{limit: 64},message:"must NOT have more than 64 characters"}];
return false;
}
else {
if(!pattern32.test(data10)){
validate49.errors = [{instancePath:instancePath+"/desktopVersion",schemaPath:"#/$defs/desktopVersion/pattern",keyword:"pattern",params:{pattern: "^[0-9]+\\.[0-9]+\\.[0-9]+(?:[-+][A-Za-z0-9.-]{1,32})?$"},message:"must match pattern \""+"^[0-9]+\\.[0-9]+\\.[0-9]+(?:[-+][A-Za-z0-9.-]{1,32})?$"+"\""}];
return false;
}
}
}
else {
validate49.errors = [{instancePath:instancePath+"/desktopVersion",schemaPath:"#/$defs/desktopVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs27 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.keyFingerprint !== undefined){
let data11 = data.keyFingerprint;
const _errs30 = errors;
const _errs31 = errors;
if(errors === _errs31){
if(typeof data11 === "string"){
if(func1(data11) > 64){
validate49.errors = [{instancePath:instancePath+"/keyFingerprint",schemaPath:"#/$defs/keyFingerprint/maxLength",keyword:"maxLength",params:{limit: 64},message:"must NOT have more than 64 characters"}];
return false;
}
else {
if(!pattern33.test(data11)){
validate49.errors = [{instancePath:instancePath+"/keyFingerprint",schemaPath:"#/$defs/keyFingerprint/pattern",keyword:"pattern",params:{pattern: "^[a-f0-9]{64}$"},message:"must match pattern \""+"^[a-f0-9]{64}$"+"\""}];
return false;
}
}
}
else {
validate49.errors = [{instancePath:instancePath+"/keyFingerprint",schemaPath:"#/$defs/keyFingerprint/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs30 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.expiresAt !== undefined){
let data12 = data.expiresAt;
const _errs33 = errors;
const _errs34 = errors;
if(errors === _errs34){
if(typeof data12 === "string"){
if(func1(data12) > 30){
validate49.errors = [{instancePath:instancePath+"/expiresAt",schemaPath:"#/$defs/timestamp/maxLength",keyword:"maxLength",params:{limit: 30},message:"must NOT have more than 30 characters"}];
return false;
}
else {
if(!pattern15.test(data12)){
validate49.errors = [{instancePath:instancePath+"/expiresAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"},message:"must match pattern \""+"^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"+"\""}];
return false;
}
}
}
else {
validate49.errors = [{instancePath:instancePath+"/expiresAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs33 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data13 = data.correlationId;
const _errs36 = errors;
const _errs37 = errors;
if(errors === _errs37){
if(typeof data13 === "string"){
if(func1(data13) > 68){
validate49.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data13)){
validate49.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate49.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs36 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate49.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate49.errors = vErrors;
return errors === 0;
}
validate49.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema138 = {"oneOf":[{"$ref":"#/$defs/desktopClaimPendingStatus"},{"$ref":"#/$defs/desktopClaimAcceptedStatus"},{"$ref":"#/$defs/desktopClaimDeniedStatus"},{"$ref":"#/$defs/desktopClaimExpiredStatus"}]};
const schema139 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","claimId","status","correlationId"],"properties":{"kind":{"const":"desktop.claim.status.response"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"claimId":{"$ref":"#/$defs/claimId"},"status":{"const":"pending"},"correlationId":{"$ref":"#/$defs/correlationId"}}};

function validate52(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate52.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.claimId === undefined) && (missing0 = "claimId"))) || ((data.status === undefined) && (missing0 = "status"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate52.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "claimId")) || (key0 === "status")) || (key0 === "correlationId"))){
validate52.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("desktop.claim.status.response" !== data.kind){
validate52.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "desktop.claim.status.response"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate52.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate52.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.claimId !== undefined){
let data2 = data.claimId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate52.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern28.test(data2)){
validate52.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/pattern",keyword:"pattern",params:{pattern: "^clm_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^clm_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate52.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.status !== undefined){
const _errs9 = errors;
if("pending" !== data.status){
validate52.errors = [{instancePath:instancePath+"/status",schemaPath:"#/properties/status/const",keyword:"const",params:{allowedValue: "pending"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data4 = data.correlationId;
const _errs10 = errors;
const _errs11 = errors;
if(errors === _errs11){
if(typeof data4 === "string"){
if(func1(data4) > 68){
validate52.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data4)){
validate52.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate52.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
else {
validate52.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate52.errors = vErrors;
return errors === 0;
}
validate52.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema143 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","claimId","status","deviceId","actorRole","credentialAudience","credentialGeneration","credentialExpiresAt","websiteAccountId","websiteDeploymentId","correlationId"],"properties":{"kind":{"const":"desktop.claim.status.response"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"claimId":{"$ref":"#/$defs/claimId"},"status":{"const":"accepted"},"deviceId":{"$ref":"#/$defs/deviceId"},"actorRole":{"const":"desktop_device"},"credentialAudience":{"$ref":"#/$defs/desktopRelayAudience"},"credentialGeneration":{"const":1},"credentialExpiresAt":{"$ref":"#/$defs/timestamp"},"correlationId":{"$ref":"#/$defs/correlationId"},"websiteAccountId":{"$ref":"#/$defs/websiteAccountId"},"websiteDeploymentId":{"$ref":"#/$defs/websiteDeploymentId"}}};
const schema147 = {"type":"string","const":"desktop-relay"};
const schema150 = {"type":"string","pattern":"^usr_[A-Za-z0-9]{8,64}$","maxLength":68};

function validate54(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate54.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.claimId === undefined) && (missing0 = "claimId"))) || ((data.status === undefined) && (missing0 = "status"))) || ((data.deviceId === undefined) && (missing0 = "deviceId"))) || ((data.actorRole === undefined) && (missing0 = "actorRole"))) || ((data.credentialAudience === undefined) && (missing0 = "credentialAudience"))) || ((data.credentialGeneration === undefined) && (missing0 = "credentialGeneration"))) || ((data.credentialExpiresAt === undefined) && (missing0 = "credentialExpiresAt"))) || ((data.websiteAccountId === undefined) && (missing0 = "websiteAccountId"))) || ((data.websiteDeploymentId === undefined) && (missing0 = "websiteDeploymentId"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate54.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(func32.call(schema143.properties, key0))){
validate54.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("desktop.claim.status.response" !== data.kind){
validate54.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "desktop.claim.status.response"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate54.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate54.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.claimId !== undefined){
let data2 = data.claimId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate54.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern28.test(data2)){
validate54.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/pattern",keyword:"pattern",params:{pattern: "^clm_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^clm_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate54.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.status !== undefined){
const _errs9 = errors;
if("accepted" !== data.status){
validate54.errors = [{instancePath:instancePath+"/status",schemaPath:"#/properties/status/const",keyword:"const",params:{allowedValue: "accepted"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.deviceId !== undefined){
let data4 = data.deviceId;
const _errs10 = errors;
const _errs11 = errors;
if(errors === _errs11){
if(typeof data4 === "string"){
if(func1(data4) > 68){
validate54.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern38.test(data4)){
validate54.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/pattern",keyword:"pattern",params:{pattern: "^dev_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^dev_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate54.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.actorRole !== undefined){
const _errs13 = errors;
if("desktop_device" !== data.actorRole){
validate54.errors = [{instancePath:instancePath+"/actorRole",schemaPath:"#/properties/actorRole/const",keyword:"const",params:{allowedValue: "desktop_device"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.credentialAudience !== undefined){
let data6 = data.credentialAudience;
const _errs14 = errors;
if(typeof data6 !== "string"){
validate54.errors = [{instancePath:instancePath+"/credentialAudience",schemaPath:"#/$defs/desktopRelayAudience/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("desktop-relay" !== data6){
validate54.errors = [{instancePath:instancePath+"/credentialAudience",schemaPath:"#/$defs/desktopRelayAudience/const",keyword:"const",params:{allowedValue: "desktop-relay"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.credentialGeneration !== undefined){
const _errs17 = errors;
if(1 !== data.credentialGeneration){
validate54.errors = [{instancePath:instancePath+"/credentialGeneration",schemaPath:"#/properties/credentialGeneration/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.credentialExpiresAt !== undefined){
let data8 = data.credentialExpiresAt;
const _errs18 = errors;
const _errs19 = errors;
if(errors === _errs19){
if(typeof data8 === "string"){
if(func1(data8) > 30){
validate54.errors = [{instancePath:instancePath+"/credentialExpiresAt",schemaPath:"#/$defs/timestamp/maxLength",keyword:"maxLength",params:{limit: 30},message:"must NOT have more than 30 characters"}];
return false;
}
else {
if(!pattern15.test(data8)){
validate54.errors = [{instancePath:instancePath+"/credentialExpiresAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"},message:"must match pattern \""+"^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"+"\""}];
return false;
}
}
}
else {
validate54.errors = [{instancePath:instancePath+"/credentialExpiresAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs18 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data9 = data.correlationId;
const _errs21 = errors;
const _errs22 = errors;
if(errors === _errs22){
if(typeof data9 === "string"){
if(func1(data9) > 68){
validate54.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data9)){
validate54.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate54.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs21 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.websiteAccountId !== undefined){
let data10 = data.websiteAccountId;
const _errs24 = errors;
const _errs25 = errors;
if(errors === _errs25){
if(typeof data10 === "string"){
if(func1(data10) > 68){
validate54.errors = [{instancePath:instancePath+"/websiteAccountId",schemaPath:"#/$defs/websiteAccountId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern7.test(data10)){
validate54.errors = [{instancePath:instancePath+"/websiteAccountId",schemaPath:"#/$defs/websiteAccountId/pattern",keyword:"pattern",params:{pattern: "^usr_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^usr_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate54.errors = [{instancePath:instancePath+"/websiteAccountId",schemaPath:"#/$defs/websiteAccountId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs24 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.websiteDeploymentId !== undefined){
let data11 = data.websiteDeploymentId;
const _errs27 = errors;
const _errs28 = errors;
if(errors === _errs28){
if(typeof data11 === "string"){
if(func1(data11) > 36){
validate54.errors = [{instancePath:instancePath+"/websiteDeploymentId",schemaPath:"#/$defs/websiteDeploymentId/maxLength",keyword:"maxLength",params:{limit: 36},message:"must NOT have more than 36 characters"}];
return false;
}
else {
if(!pattern44.test(data11)){
validate54.errors = [{instancePath:instancePath+"/websiteDeploymentId",schemaPath:"#/$defs/websiteDeploymentId/pattern",keyword:"pattern",params:{pattern: "^wdp_[A-Za-z0-9]{32}$"},message:"must match pattern \""+"^wdp_[A-Za-z0-9]{32}$"+"\""}];
return false;
}
}
}
else {
validate54.errors = [{instancePath:instancePath+"/websiteDeploymentId",schemaPath:"#/$defs/websiteDeploymentId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs27 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate54.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate54.errors = vErrors;
return errors === 0;
}
validate54.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema152 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","claimId","status","correlationId"],"properties":{"kind":{"const":"desktop.claim.status.response"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"claimId":{"$ref":"#/$defs/claimId"},"status":{"const":"denied"},"correlationId":{"$ref":"#/$defs/correlationId"}}};

function validate56(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate56.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.claimId === undefined) && (missing0 = "claimId"))) || ((data.status === undefined) && (missing0 = "status"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate56.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "claimId")) || (key0 === "status")) || (key0 === "correlationId"))){
validate56.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("desktop.claim.status.response" !== data.kind){
validate56.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "desktop.claim.status.response"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate56.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate56.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.claimId !== undefined){
let data2 = data.claimId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate56.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern28.test(data2)){
validate56.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/pattern",keyword:"pattern",params:{pattern: "^clm_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^clm_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate56.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.status !== undefined){
const _errs9 = errors;
if("denied" !== data.status){
validate56.errors = [{instancePath:instancePath+"/status",schemaPath:"#/properties/status/const",keyword:"const",params:{allowedValue: "denied"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data4 = data.correlationId;
const _errs10 = errors;
const _errs11 = errors;
if(errors === _errs11){
if(typeof data4 === "string"){
if(func1(data4) > 68){
validate56.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data4)){
validate56.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate56.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
else {
validate56.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate56.errors = vErrors;
return errors === 0;
}
validate56.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema156 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","claimId","status","correlationId"],"properties":{"kind":{"const":"desktop.claim.status.response"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"claimId":{"$ref":"#/$defs/claimId"},"status":{"const":"expired"},"correlationId":{"$ref":"#/$defs/correlationId"}}};

function validate58(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate58.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.claimId === undefined) && (missing0 = "claimId"))) || ((data.status === undefined) && (missing0 = "status"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate58.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "claimId")) || (key0 === "status")) || (key0 === "correlationId"))){
validate58.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("desktop.claim.status.response" !== data.kind){
validate58.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "desktop.claim.status.response"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate58.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate58.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.claimId !== undefined){
let data2 = data.claimId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate58.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern28.test(data2)){
validate58.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/pattern",keyword:"pattern",params:{pattern: "^clm_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^clm_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate58.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.status !== undefined){
const _errs9 = errors;
if("expired" !== data.status){
validate58.errors = [{instancePath:instancePath+"/status",schemaPath:"#/properties/status/const",keyword:"const",params:{allowedValue: "expired"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data4 = data.correlationId;
const _errs10 = errors;
const _errs11 = errors;
if(errors === _errs11){
if(typeof data4 === "string"){
if(func1(data4) > 68){
validate58.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data4)){
validate58.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate58.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
else {
validate58.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate58.errors = vErrors;
return errors === 0;
}
validate58.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate51(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate51.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
if(!(validate52(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate52.errors : vErrors.concat(validate52.errors);
errors = vErrors.length;
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
var props0 = true;
}
const _errs2 = errors;
if(!(validate54(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate54.errors : vErrors.concat(validate54.errors);
errors = vErrors.length;
}
var _valid0 = _errs2 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
if(props0 !== true){
props0 = true;
}
}
const _errs3 = errors;
if(!(validate56(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate56.errors : vErrors.concat(validate56.errors);
errors = vErrors.length;
}
var _valid0 = _errs3 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 2];
}
else {
if(_valid0){
valid0 = true;
passing0 = 2;
if(props0 !== true){
props0 = true;
}
}
const _errs4 = errors;
if(!(validate58(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate58.errors : vErrors.concat(validate58.errors);
errors = vErrors.length;
}
var _valid0 = _errs4 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 3];
}
else {
if(_valid0){
valid0 = true;
passing0 = 3;
if(props0 !== true){
props0 = true;
}
}
}
}
}
if(!valid0){
const err0 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
validate51.errors = vErrors;
return false;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate51.errors = vErrors;
evaluated0.props = props0;
return errors === 0;
}
validate51.evaluated = {"dynamicProps":true,"dynamicItems":false};

const schema160 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","claimId","sessionId","actorRole","decision","idempotencyKey","correlationId"],"properties":{"kind":{"const":"desktop.claim.decision.request"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"claimId":{"$ref":"#/$defs/claimId"},"sessionId":{"$ref":"#/$defs/sessionId"},"actorRole":{"const":"browser_session"},"decision":{"enum":["accept","deny"]},"idempotencyKey":{"$ref":"#/$defs/idempotencyKey"},"correlationId":{"$ref":"#/$defs/correlationId"}}};

function validate61(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate61.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.claimId === undefined) && (missing0 = "claimId"))) || ((data.sessionId === undefined) && (missing0 = "sessionId"))) || ((data.actorRole === undefined) && (missing0 = "actorRole"))) || ((data.decision === undefined) && (missing0 = "decision"))) || ((data.idempotencyKey === undefined) && (missing0 = "idempotencyKey"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate61.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "claimId")) || (key0 === "sessionId")) || (key0 === "actorRole")) || (key0 === "decision")) || (key0 === "idempotencyKey")) || (key0 === "correlationId"))){
validate61.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("desktop.claim.decision.request" !== data.kind){
validate61.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "desktop.claim.decision.request"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate61.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate61.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.claimId !== undefined){
let data2 = data.claimId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate61.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern28.test(data2)){
validate61.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/pattern",keyword:"pattern",params:{pattern: "^clm_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^clm_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate61.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sessionId !== undefined){
let data3 = data.sessionId;
const _errs9 = errors;
const _errs10 = errors;
if(errors === _errs10){
if(typeof data3 === "string"){
if(func1(data3) > 68){
validate61.errors = [{instancePath:instancePath+"/sessionId",schemaPath:"#/$defs/sessionId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern14.test(data3)){
validate61.errors = [{instancePath:instancePath+"/sessionId",schemaPath:"#/$defs/sessionId/pattern",keyword:"pattern",params:{pattern: "^ses_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^ses_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate61.errors = [{instancePath:instancePath+"/sessionId",schemaPath:"#/$defs/sessionId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.actorRole !== undefined){
const _errs12 = errors;
if("browser_session" !== data.actorRole){
validate61.errors = [{instancePath:instancePath+"/actorRole",schemaPath:"#/properties/actorRole/const",keyword:"const",params:{allowedValue: "browser_session"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.decision !== undefined){
let data5 = data.decision;
const _errs13 = errors;
if(!((data5 === "accept") || (data5 === "deny"))){
validate61.errors = [{instancePath:instancePath+"/decision",schemaPath:"#/properties/decision/enum",keyword:"enum",params:{allowedValues: schema160.properties.decision.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.idempotencyKey !== undefined){
let data6 = data.idempotencyKey;
const _errs14 = errors;
const _errs15 = errors;
if(errors === _errs15){
if(typeof data6 === "string"){
if(func1(data6) > 85){
validate61.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/maxLength",keyword:"maxLength",params:{limit: 85},message:"must NOT have more than 85 characters"}];
return false;
}
else {
if(!pattern5.test(data6)){
validate61.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/pattern",keyword:"pattern",params:{pattern: "^idem_[A-Za-z0-9_-]{16,80}$"},message:"must match pattern \""+"^idem_[A-Za-z0-9_-]{16,80}$"+"\""}];
return false;
}
}
}
else {
validate61.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data7 = data.correlationId;
const _errs17 = errors;
const _errs18 = errors;
if(errors === _errs18){
if(typeof data7 === "string"){
if(func1(data7) > 68){
validate61.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data7)){
validate61.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate61.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
else {
validate61.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate61.errors = vErrors;
return errors === 0;
}
validate61.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema166 = {"oneOf":[{"$ref":"#/$defs/desktopClaimAcceptedDecision"},{"$ref":"#/$defs/desktopClaimDeniedDecision"}]};
const schema167 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","claimId","status","deviceId","actorRole","credentialAudience","credentialGeneration","credentialExpiresAt","websiteAccountId","websiteDeploymentId","correlationId"],"properties":{"kind":{"const":"desktop.claim.decision.response"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"claimId":{"$ref":"#/$defs/claimId"},"status":{"const":"accepted"},"deviceId":{"$ref":"#/$defs/deviceId"},"actorRole":{"const":"desktop_device"},"credentialAudience":{"$ref":"#/$defs/desktopRelayAudience"},"credentialGeneration":{"const":1},"credentialExpiresAt":{"$ref":"#/$defs/timestamp"},"correlationId":{"$ref":"#/$defs/correlationId"},"websiteAccountId":{"$ref":"#/$defs/websiteAccountId"},"websiteDeploymentId":{"$ref":"#/$defs/websiteDeploymentId"}}};

function validate64(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate64.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.claimId === undefined) && (missing0 = "claimId"))) || ((data.status === undefined) && (missing0 = "status"))) || ((data.deviceId === undefined) && (missing0 = "deviceId"))) || ((data.actorRole === undefined) && (missing0 = "actorRole"))) || ((data.credentialAudience === undefined) && (missing0 = "credentialAudience"))) || ((data.credentialGeneration === undefined) && (missing0 = "credentialGeneration"))) || ((data.credentialExpiresAt === undefined) && (missing0 = "credentialExpiresAt"))) || ((data.websiteAccountId === undefined) && (missing0 = "websiteAccountId"))) || ((data.websiteDeploymentId === undefined) && (missing0 = "websiteDeploymentId"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate64.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(func32.call(schema167.properties, key0))){
validate64.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("desktop.claim.decision.response" !== data.kind){
validate64.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "desktop.claim.decision.response"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate64.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate64.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.claimId !== undefined){
let data2 = data.claimId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate64.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern28.test(data2)){
validate64.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/pattern",keyword:"pattern",params:{pattern: "^clm_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^clm_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate64.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.status !== undefined){
const _errs9 = errors;
if("accepted" !== data.status){
validate64.errors = [{instancePath:instancePath+"/status",schemaPath:"#/properties/status/const",keyword:"const",params:{allowedValue: "accepted"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.deviceId !== undefined){
let data4 = data.deviceId;
const _errs10 = errors;
const _errs11 = errors;
if(errors === _errs11){
if(typeof data4 === "string"){
if(func1(data4) > 68){
validate64.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern38.test(data4)){
validate64.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/pattern",keyword:"pattern",params:{pattern: "^dev_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^dev_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate64.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.actorRole !== undefined){
const _errs13 = errors;
if("desktop_device" !== data.actorRole){
validate64.errors = [{instancePath:instancePath+"/actorRole",schemaPath:"#/properties/actorRole/const",keyword:"const",params:{allowedValue: "desktop_device"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.credentialAudience !== undefined){
let data6 = data.credentialAudience;
const _errs14 = errors;
if(typeof data6 !== "string"){
validate64.errors = [{instancePath:instancePath+"/credentialAudience",schemaPath:"#/$defs/desktopRelayAudience/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("desktop-relay" !== data6){
validate64.errors = [{instancePath:instancePath+"/credentialAudience",schemaPath:"#/$defs/desktopRelayAudience/const",keyword:"const",params:{allowedValue: "desktop-relay"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.credentialGeneration !== undefined){
const _errs17 = errors;
if(1 !== data.credentialGeneration){
validate64.errors = [{instancePath:instancePath+"/credentialGeneration",schemaPath:"#/properties/credentialGeneration/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.credentialExpiresAt !== undefined){
let data8 = data.credentialExpiresAt;
const _errs18 = errors;
const _errs19 = errors;
if(errors === _errs19){
if(typeof data8 === "string"){
if(func1(data8) > 30){
validate64.errors = [{instancePath:instancePath+"/credentialExpiresAt",schemaPath:"#/$defs/timestamp/maxLength",keyword:"maxLength",params:{limit: 30},message:"must NOT have more than 30 characters"}];
return false;
}
else {
if(!pattern15.test(data8)){
validate64.errors = [{instancePath:instancePath+"/credentialExpiresAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"},message:"must match pattern \""+"^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"+"\""}];
return false;
}
}
}
else {
validate64.errors = [{instancePath:instancePath+"/credentialExpiresAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs18 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data9 = data.correlationId;
const _errs21 = errors;
const _errs22 = errors;
if(errors === _errs22){
if(typeof data9 === "string"){
if(func1(data9) > 68){
validate64.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data9)){
validate64.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate64.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs21 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.websiteAccountId !== undefined){
let data10 = data.websiteAccountId;
const _errs24 = errors;
const _errs25 = errors;
if(errors === _errs25){
if(typeof data10 === "string"){
if(func1(data10) > 68){
validate64.errors = [{instancePath:instancePath+"/websiteAccountId",schemaPath:"#/$defs/websiteAccountId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern7.test(data10)){
validate64.errors = [{instancePath:instancePath+"/websiteAccountId",schemaPath:"#/$defs/websiteAccountId/pattern",keyword:"pattern",params:{pattern: "^usr_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^usr_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate64.errors = [{instancePath:instancePath+"/websiteAccountId",schemaPath:"#/$defs/websiteAccountId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs24 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.websiteDeploymentId !== undefined){
let data11 = data.websiteDeploymentId;
const _errs27 = errors;
const _errs28 = errors;
if(errors === _errs28){
if(typeof data11 === "string"){
if(func1(data11) > 36){
validate64.errors = [{instancePath:instancePath+"/websiteDeploymentId",schemaPath:"#/$defs/websiteDeploymentId/maxLength",keyword:"maxLength",params:{limit: 36},message:"must NOT have more than 36 characters"}];
return false;
}
else {
if(!pattern44.test(data11)){
validate64.errors = [{instancePath:instancePath+"/websiteDeploymentId",schemaPath:"#/$defs/websiteDeploymentId/pattern",keyword:"pattern",params:{pattern: "^wdp_[A-Za-z0-9]{32}$"},message:"must match pattern \""+"^wdp_[A-Za-z0-9]{32}$"+"\""}];
return false;
}
}
}
else {
validate64.errors = [{instancePath:instancePath+"/websiteDeploymentId",schemaPath:"#/$defs/websiteDeploymentId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs27 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate64.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate64.errors = vErrors;
return errors === 0;
}
validate64.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema176 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","claimId","status","correlationId"],"properties":{"kind":{"const":"desktop.claim.decision.response"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"claimId":{"$ref":"#/$defs/claimId"},"status":{"const":"denied"},"correlationId":{"$ref":"#/$defs/correlationId"}}};

function validate66(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate66.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.claimId === undefined) && (missing0 = "claimId"))) || ((data.status === undefined) && (missing0 = "status"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate66.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "claimId")) || (key0 === "status")) || (key0 === "correlationId"))){
validate66.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("desktop.claim.decision.response" !== data.kind){
validate66.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "desktop.claim.decision.response"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate66.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate66.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.claimId !== undefined){
let data2 = data.claimId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate66.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern28.test(data2)){
validate66.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/pattern",keyword:"pattern",params:{pattern: "^clm_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^clm_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate66.errors = [{instancePath:instancePath+"/claimId",schemaPath:"#/$defs/claimId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.status !== undefined){
const _errs9 = errors;
if("denied" !== data.status){
validate66.errors = [{instancePath:instancePath+"/status",schemaPath:"#/properties/status/const",keyword:"const",params:{allowedValue: "denied"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data4 = data.correlationId;
const _errs10 = errors;
const _errs11 = errors;
if(errors === _errs11){
if(typeof data4 === "string"){
if(func1(data4) > 68){
validate66.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data4)){
validate66.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate66.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
else {
validate66.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate66.errors = vErrors;
return errors === 0;
}
validate66.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate63(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate63.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
if(!(validate64(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate64.errors : vErrors.concat(validate64.errors);
errors = vErrors.length;
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
var props0 = true;
}
const _errs2 = errors;
if(!(validate66(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate66.errors : vErrors.concat(validate66.errors);
errors = vErrors.length;
}
var _valid0 = _errs2 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
if(props0 !== true){
props0 = true;
}
}
}
if(!valid0){
const err0 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
validate63.errors = vErrors;
return false;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate63.errors = vErrors;
evaluated0.props = props0;
return errors === 0;
}
validate63.evaluated = {"dynamicProps":true,"dynamicItems":false};

const schema180 = {"description":"Strict admission projection after exactly one X-Kazi-Protocol-Version: 1.0 header and all Desktop relay credential headers have been validated.","oneOf":[{"$ref":"#/$defs/desktopActiveCredentialContext"},{"$ref":"#/$defs/desktopExpiredCredentialContext"},{"$ref":"#/$defs/desktopRevokedCredentialContext"}]};
const schema181 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","deviceId","actorRole","audience","credentialGeneration","credentialState","expiresAt"],"properties":{"kind":{"const":"desktop.relay.auth.context"},"protocolVersion":{"$ref":"#/$defs/protocolVersion","description":"The single admitted X-Kazi-Protocol-Version header value."},"deviceId":{"$ref":"#/$defs/deviceId"},"actorRole":{"const":"desktop_device"},"audience":{"$ref":"#/$defs/desktopRelayAudience"},"credentialGeneration":{"$ref":"#/$defs/credentialGeneration"},"credentialState":{"const":"active"},"expiresAt":{"$ref":"#/$defs/timestamp"}}};
const schema185 = {"type":"integer","minimum":1,"maximum":9007199254740991};

function validate70(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate70.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.deviceId === undefined) && (missing0 = "deviceId"))) || ((data.actorRole === undefined) && (missing0 = "actorRole"))) || ((data.audience === undefined) && (missing0 = "audience"))) || ((data.credentialGeneration === undefined) && (missing0 = "credentialGeneration"))) || ((data.credentialState === undefined) && (missing0 = "credentialState"))) || ((data.expiresAt === undefined) && (missing0 = "expiresAt"))){
validate70.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "deviceId")) || (key0 === "actorRole")) || (key0 === "audience")) || (key0 === "credentialGeneration")) || (key0 === "credentialState")) || (key0 === "expiresAt"))){
validate70.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("desktop.relay.auth.context" !== data.kind){
validate70.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "desktop.relay.auth.context"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate70.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate70.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.deviceId !== undefined){
let data2 = data.deviceId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate70.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern38.test(data2)){
validate70.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/pattern",keyword:"pattern",params:{pattern: "^dev_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^dev_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate70.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.actorRole !== undefined){
const _errs9 = errors;
if("desktop_device" !== data.actorRole){
validate70.errors = [{instancePath:instancePath+"/actorRole",schemaPath:"#/properties/actorRole/const",keyword:"const",params:{allowedValue: "desktop_device"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.audience !== undefined){
let data4 = data.audience;
const _errs10 = errors;
if(typeof data4 !== "string"){
validate70.errors = [{instancePath:instancePath+"/audience",schemaPath:"#/$defs/desktopRelayAudience/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("desktop-relay" !== data4){
validate70.errors = [{instancePath:instancePath+"/audience",schemaPath:"#/$defs/desktopRelayAudience/const",keyword:"const",params:{allowedValue: "desktop-relay"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.credentialGeneration !== undefined){
let data5 = data.credentialGeneration;
const _errs13 = errors;
const _errs14 = errors;
if(!(((typeof data5 == "number") && (!(data5 % 1) && !isNaN(data5))) && (isFinite(data5)))){
validate70.errors = [{instancePath:instancePath+"/credentialGeneration",schemaPath:"#/$defs/credentialGeneration/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs14){
if((typeof data5 == "number") && (isFinite(data5))){
if(data5 > 9007199254740991 || isNaN(data5)){
validate70.errors = [{instancePath:instancePath+"/credentialGeneration",schemaPath:"#/$defs/credentialGeneration/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data5 < 1 || isNaN(data5)){
validate70.errors = [{instancePath:instancePath+"/credentialGeneration",schemaPath:"#/$defs/credentialGeneration/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"}];
return false;
}
}
}
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.credentialState !== undefined){
const _errs16 = errors;
if("active" !== data.credentialState){
validate70.errors = [{instancePath:instancePath+"/credentialState",schemaPath:"#/properties/credentialState/const",keyword:"const",params:{allowedValue: "active"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs16 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.expiresAt !== undefined){
let data7 = data.expiresAt;
const _errs17 = errors;
const _errs18 = errors;
if(errors === _errs18){
if(typeof data7 === "string"){
if(func1(data7) > 30){
validate70.errors = [{instancePath:instancePath+"/expiresAt",schemaPath:"#/$defs/timestamp/maxLength",keyword:"maxLength",params:{limit: 30},message:"must NOT have more than 30 characters"}];
return false;
}
else {
if(!pattern15.test(data7)){
validate70.errors = [{instancePath:instancePath+"/expiresAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"},message:"must match pattern \""+"^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"+"\""}];
return false;
}
}
}
else {
validate70.errors = [{instancePath:instancePath+"/expiresAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
else {
validate70.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate70.errors = vErrors;
return errors === 0;
}
validate70.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema187 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","deviceId","actorRole","audience","credentialGeneration","credentialState","expiresAt"],"properties":{"kind":{"const":"desktop.relay.auth.context"},"protocolVersion":{"$ref":"#/$defs/protocolVersion","description":"The single admitted X-Kazi-Protocol-Version header value."},"deviceId":{"$ref":"#/$defs/deviceId"},"actorRole":{"const":"desktop_device"},"audience":{"$ref":"#/$defs/desktopRelayAudience"},"credentialGeneration":{"$ref":"#/$defs/credentialGeneration"},"credentialState":{"const":"expired"},"expiresAt":{"$ref":"#/$defs/timestamp"}}};

function validate72(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate72.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.deviceId === undefined) && (missing0 = "deviceId"))) || ((data.actorRole === undefined) && (missing0 = "actorRole"))) || ((data.audience === undefined) && (missing0 = "audience"))) || ((data.credentialGeneration === undefined) && (missing0 = "credentialGeneration"))) || ((data.credentialState === undefined) && (missing0 = "credentialState"))) || ((data.expiresAt === undefined) && (missing0 = "expiresAt"))){
validate72.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "deviceId")) || (key0 === "actorRole")) || (key0 === "audience")) || (key0 === "credentialGeneration")) || (key0 === "credentialState")) || (key0 === "expiresAt"))){
validate72.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("desktop.relay.auth.context" !== data.kind){
validate72.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "desktop.relay.auth.context"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate72.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate72.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.deviceId !== undefined){
let data2 = data.deviceId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate72.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern38.test(data2)){
validate72.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/pattern",keyword:"pattern",params:{pattern: "^dev_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^dev_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate72.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.actorRole !== undefined){
const _errs9 = errors;
if("desktop_device" !== data.actorRole){
validate72.errors = [{instancePath:instancePath+"/actorRole",schemaPath:"#/properties/actorRole/const",keyword:"const",params:{allowedValue: "desktop_device"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.audience !== undefined){
let data4 = data.audience;
const _errs10 = errors;
if(typeof data4 !== "string"){
validate72.errors = [{instancePath:instancePath+"/audience",schemaPath:"#/$defs/desktopRelayAudience/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("desktop-relay" !== data4){
validate72.errors = [{instancePath:instancePath+"/audience",schemaPath:"#/$defs/desktopRelayAudience/const",keyword:"const",params:{allowedValue: "desktop-relay"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.credentialGeneration !== undefined){
let data5 = data.credentialGeneration;
const _errs13 = errors;
const _errs14 = errors;
if(!(((typeof data5 == "number") && (!(data5 % 1) && !isNaN(data5))) && (isFinite(data5)))){
validate72.errors = [{instancePath:instancePath+"/credentialGeneration",schemaPath:"#/$defs/credentialGeneration/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs14){
if((typeof data5 == "number") && (isFinite(data5))){
if(data5 > 9007199254740991 || isNaN(data5)){
validate72.errors = [{instancePath:instancePath+"/credentialGeneration",schemaPath:"#/$defs/credentialGeneration/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data5 < 1 || isNaN(data5)){
validate72.errors = [{instancePath:instancePath+"/credentialGeneration",schemaPath:"#/$defs/credentialGeneration/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"}];
return false;
}
}
}
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.credentialState !== undefined){
const _errs16 = errors;
if("expired" !== data.credentialState){
validate72.errors = [{instancePath:instancePath+"/credentialState",schemaPath:"#/properties/credentialState/const",keyword:"const",params:{allowedValue: "expired"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs16 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.expiresAt !== undefined){
let data7 = data.expiresAt;
const _errs17 = errors;
const _errs18 = errors;
if(errors === _errs18){
if(typeof data7 === "string"){
if(func1(data7) > 30){
validate72.errors = [{instancePath:instancePath+"/expiresAt",schemaPath:"#/$defs/timestamp/maxLength",keyword:"maxLength",params:{limit: 30},message:"must NOT have more than 30 characters"}];
return false;
}
else {
if(!pattern15.test(data7)){
validate72.errors = [{instancePath:instancePath+"/expiresAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"},message:"must match pattern \""+"^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"+"\""}];
return false;
}
}
}
else {
validate72.errors = [{instancePath:instancePath+"/expiresAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
else {
validate72.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate72.errors = vErrors;
return errors === 0;
}
validate72.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema193 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","deviceId","actorRole","audience","credentialGeneration","credentialState","expiresAt","revokedAt"],"properties":{"kind":{"const":"desktop.relay.auth.context"},"protocolVersion":{"$ref":"#/$defs/protocolVersion","description":"The single admitted X-Kazi-Protocol-Version header value."},"deviceId":{"$ref":"#/$defs/deviceId"},"actorRole":{"const":"desktop_device"},"audience":{"$ref":"#/$defs/desktopRelayAudience"},"credentialGeneration":{"$ref":"#/$defs/credentialGeneration"},"credentialState":{"const":"revoked"},"expiresAt":{"$ref":"#/$defs/timestamp"},"revokedAt":{"$ref":"#/$defs/timestamp"}}};

function validate74(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate74.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.deviceId === undefined) && (missing0 = "deviceId"))) || ((data.actorRole === undefined) && (missing0 = "actorRole"))) || ((data.audience === undefined) && (missing0 = "audience"))) || ((data.credentialGeneration === undefined) && (missing0 = "credentialGeneration"))) || ((data.credentialState === undefined) && (missing0 = "credentialState"))) || ((data.expiresAt === undefined) && (missing0 = "expiresAt"))) || ((data.revokedAt === undefined) && (missing0 = "revokedAt"))){
validate74.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(func32.call(schema193.properties, key0))){
validate74.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("desktop.relay.auth.context" !== data.kind){
validate74.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "desktop.relay.auth.context"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate74.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate74.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.deviceId !== undefined){
let data2 = data.deviceId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate74.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern38.test(data2)){
validate74.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/pattern",keyword:"pattern",params:{pattern: "^dev_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^dev_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate74.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.actorRole !== undefined){
const _errs9 = errors;
if("desktop_device" !== data.actorRole){
validate74.errors = [{instancePath:instancePath+"/actorRole",schemaPath:"#/properties/actorRole/const",keyword:"const",params:{allowedValue: "desktop_device"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.audience !== undefined){
let data4 = data.audience;
const _errs10 = errors;
if(typeof data4 !== "string"){
validate74.errors = [{instancePath:instancePath+"/audience",schemaPath:"#/$defs/desktopRelayAudience/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("desktop-relay" !== data4){
validate74.errors = [{instancePath:instancePath+"/audience",schemaPath:"#/$defs/desktopRelayAudience/const",keyword:"const",params:{allowedValue: "desktop-relay"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.credentialGeneration !== undefined){
let data5 = data.credentialGeneration;
const _errs13 = errors;
const _errs14 = errors;
if(!(((typeof data5 == "number") && (!(data5 % 1) && !isNaN(data5))) && (isFinite(data5)))){
validate74.errors = [{instancePath:instancePath+"/credentialGeneration",schemaPath:"#/$defs/credentialGeneration/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs14){
if((typeof data5 == "number") && (isFinite(data5))){
if(data5 > 9007199254740991 || isNaN(data5)){
validate74.errors = [{instancePath:instancePath+"/credentialGeneration",schemaPath:"#/$defs/credentialGeneration/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data5 < 1 || isNaN(data5)){
validate74.errors = [{instancePath:instancePath+"/credentialGeneration",schemaPath:"#/$defs/credentialGeneration/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"}];
return false;
}
}
}
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.credentialState !== undefined){
const _errs16 = errors;
if("revoked" !== data.credentialState){
validate74.errors = [{instancePath:instancePath+"/credentialState",schemaPath:"#/properties/credentialState/const",keyword:"const",params:{allowedValue: "revoked"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs16 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.expiresAt !== undefined){
let data7 = data.expiresAt;
const _errs17 = errors;
const _errs18 = errors;
if(errors === _errs18){
if(typeof data7 === "string"){
if(func1(data7) > 30){
validate74.errors = [{instancePath:instancePath+"/expiresAt",schemaPath:"#/$defs/timestamp/maxLength",keyword:"maxLength",params:{limit: 30},message:"must NOT have more than 30 characters"}];
return false;
}
else {
if(!pattern15.test(data7)){
validate74.errors = [{instancePath:instancePath+"/expiresAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"},message:"must match pattern \""+"^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"+"\""}];
return false;
}
}
}
else {
validate74.errors = [{instancePath:instancePath+"/expiresAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.revokedAt !== undefined){
let data8 = data.revokedAt;
const _errs20 = errors;
const _errs21 = errors;
if(errors === _errs21){
if(typeof data8 === "string"){
if(func1(data8) > 30){
validate74.errors = [{instancePath:instancePath+"/revokedAt",schemaPath:"#/$defs/timestamp/maxLength",keyword:"maxLength",params:{limit: 30},message:"must NOT have more than 30 characters"}];
return false;
}
else {
if(!pattern15.test(data8)){
validate74.errors = [{instancePath:instancePath+"/revokedAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"},message:"must match pattern \""+"^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"+"\""}];
return false;
}
}
}
else {
validate74.errors = [{instancePath:instancePath+"/revokedAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs20 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate74.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate74.errors = vErrors;
return errors === 0;
}
validate74.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate69(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate69.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
if(!(validate70(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate70.errors : vErrors.concat(validate70.errors);
errors = vErrors.length;
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
var props0 = true;
}
const _errs2 = errors;
if(!(validate72(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate72.errors : vErrors.concat(validate72.errors);
errors = vErrors.length;
}
var _valid0 = _errs2 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
if(props0 !== true){
props0 = true;
}
}
const _errs3 = errors;
if(!(validate74(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate74.errors : vErrors.concat(validate74.errors);
errors = vErrors.length;
}
var _valid0 = _errs3 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 2];
}
else {
if(_valid0){
valid0 = true;
passing0 = 2;
if(props0 !== true){
props0 = true;
}
}
}
}
if(!valid0){
const err0 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
validate69.errors = vErrors;
return false;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate69.errors = vErrors;
evaluated0.props = props0;
return errors === 0;
}
validate69.evaluated = {"dynamicProps":true,"dynamicItems":false};

const schema200 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","executors","correlationId"],"properties":{"kind":{"const":"executor.list.response"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"executors":{"type":"array","maxItems":100,"items":{"$ref":"#/$defs/executorSummary"}},"correlationId":{"$ref":"#/$defs/correlationId"}}};
const schema202 = {"type":"object","additionalProperties":false,"required":["executorId","displayName","state","online","presence","protocolVersion"],"properties":{"executorId":{"$ref":"#/$defs/executorId"},"displayName":{"type":"string","minLength":1,"maxLength":80},"state":{"enum":["active","revoked","archived"]},"online":{"type":"boolean"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"presence":{"enum":["online","offline","stale"]}}};

function validate78(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate78.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.executorId === undefined) && (missing0 = "executorId")) || ((data.displayName === undefined) && (missing0 = "displayName"))) || ((data.state === undefined) && (missing0 = "state"))) || ((data.online === undefined) && (missing0 = "online"))) || ((data.presence === undefined) && (missing0 = "presence"))) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))){
validate78.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((key0 === "executorId") || (key0 === "displayName")) || (key0 === "state")) || (key0 === "online")) || (key0 === "protocolVersion")) || (key0 === "presence"))){
validate78.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.executorId !== undefined){
let data0 = data.executorId;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 68){
validate78.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern37.test(data0)){
validate78.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/pattern",keyword:"pattern",params:{pattern: "^exe_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^exe_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate78.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.displayName !== undefined){
let data1 = data.displayName;
const _errs5 = errors;
if(errors === _errs5){
if(typeof data1 === "string"){
if(func1(data1) > 80){
validate78.errors = [{instancePath:instancePath+"/displayName",schemaPath:"#/properties/displayName/maxLength",keyword:"maxLength",params:{limit: 80},message:"must NOT have more than 80 characters"}];
return false;
}
else {
if(func1(data1) < 1){
validate78.errors = [{instancePath:instancePath+"/displayName",schemaPath:"#/properties/displayName/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate78.errors = [{instancePath:instancePath+"/displayName",schemaPath:"#/properties/displayName/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.state !== undefined){
let data2 = data.state;
const _errs7 = errors;
if(!(((data2 === "active") || (data2 === "revoked")) || (data2 === "archived"))){
validate78.errors = [{instancePath:instancePath+"/state",schemaPath:"#/properties/state/enum",keyword:"enum",params:{allowedValues: schema202.properties.state.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.online !== undefined){
const _errs8 = errors;
if(typeof data.online !== "boolean"){
validate78.errors = [{instancePath:instancePath+"/online",schemaPath:"#/properties/online/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data4 = data.protocolVersion;
const _errs10 = errors;
if(typeof data4 !== "string"){
validate78.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data4){
validate78.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.presence !== undefined){
let data5 = data.presence;
const _errs13 = errors;
if(!(((data5 === "online") || (data5 === "offline")) || (data5 === "stale"))){
validate78.errors = [{instancePath:instancePath+"/presence",schemaPath:"#/properties/presence/enum",keyword:"enum",params:{allowedValues: schema202.properties.presence.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
else {
validate78.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate78.errors = vErrors;
return errors === 0;
}
validate78.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate77(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate77.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.executors === undefined) && (missing0 = "executors"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate77.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "executors")) || (key0 === "correlationId"))){
validate77.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("executor.list.response" !== data.kind){
validate77.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "executor.list.response"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate77.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate77.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.executors !== undefined){
let data2 = data.executors;
const _errs6 = errors;
if(errors === _errs6){
if(Array.isArray(data2)){
if(data2.length > 100){
validate77.errors = [{instancePath:instancePath+"/executors",schemaPath:"#/properties/executors/maxItems",keyword:"maxItems",params:{limit: 100},message:"must NOT have more than 100 items"}];
return false;
}
else {
var valid2 = true;
const len0 = data2.length;
for(let i0=0; i0<len0; i0++){
const _errs8 = errors;
if(!(validate78(data2[i0], {instancePath:instancePath+"/executors/" + i0,parentData:data2,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate78.errors : vErrors.concat(validate78.errors);
errors = vErrors.length;
}
var valid2 = _errs8 === errors;
if(!valid2){
break;
}
}
}
}
else {
validate77.errors = [{instancePath:instancePath+"/executors",schemaPath:"#/properties/executors/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data4 = data.correlationId;
const _errs9 = errors;
const _errs10 = errors;
if(errors === _errs10){
if(typeof data4 === "string"){
if(func1(data4) > 68){
validate77.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data4)){
validate77.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate77.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
else {
validate77.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate77.errors = vErrors;
return errors === 0;
}
validate77.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema206 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","executor","deviceId","actorRole","lastSeenAt","correlationId"],"properties":{"kind":{"const":"executor.detail.response"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"executor":{"$ref":"#/$defs/executorSummary"},"deviceId":{"$ref":"#/$defs/deviceId"},"actorRole":{"const":"executor_device"},"lastSeenAt":{"$ref":"#/$defs/timestamp"},"correlationId":{"$ref":"#/$defs/correlationId"}}};

function validate81(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate81.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.executor === undefined) && (missing0 = "executor"))) || ((data.deviceId === undefined) && (missing0 = "deviceId"))) || ((data.actorRole === undefined) && (missing0 = "actorRole"))) || ((data.lastSeenAt === undefined) && (missing0 = "lastSeenAt"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate81.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "executor")) || (key0 === "deviceId")) || (key0 === "actorRole")) || (key0 === "lastSeenAt")) || (key0 === "correlationId"))){
validate81.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("executor.detail.response" !== data.kind){
validate81.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "executor.detail.response"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate81.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate81.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.executor !== undefined){
const _errs6 = errors;
if(!(validate78(data.executor, {instancePath:instancePath+"/executor",parentData:data,parentDataProperty:"executor",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate78.errors : vErrors.concat(validate78.errors);
errors = vErrors.length;
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.deviceId !== undefined){
let data3 = data.deviceId;
const _errs7 = errors;
const _errs8 = errors;
if(errors === _errs8){
if(typeof data3 === "string"){
if(func1(data3) > 68){
validate81.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern38.test(data3)){
validate81.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/pattern",keyword:"pattern",params:{pattern: "^dev_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^dev_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate81.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.actorRole !== undefined){
const _errs10 = errors;
if("executor_device" !== data.actorRole){
validate81.errors = [{instancePath:instancePath+"/actorRole",schemaPath:"#/properties/actorRole/const",keyword:"const",params:{allowedValue: "executor_device"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.lastSeenAt !== undefined){
let data5 = data.lastSeenAt;
const _errs11 = errors;
const _errs12 = errors;
if(errors === _errs12){
if(typeof data5 === "string"){
if(func1(data5) > 30){
validate81.errors = [{instancePath:instancePath+"/lastSeenAt",schemaPath:"#/$defs/timestamp/maxLength",keyword:"maxLength",params:{limit: 30},message:"must NOT have more than 30 characters"}];
return false;
}
else {
if(!pattern15.test(data5)){
validate81.errors = [{instancePath:instancePath+"/lastSeenAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"},message:"must match pattern \""+"^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"+"\""}];
return false;
}
}
}
else {
validate81.errors = [{instancePath:instancePath+"/lastSeenAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data6 = data.correlationId;
const _errs14 = errors;
const _errs15 = errors;
if(errors === _errs15){
if(typeof data6 === "string"){
if(func1(data6) > 68){
validate81.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data6)){
validate81.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate81.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
else {
validate81.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate81.errors = vErrors;
return errors === 0;
}
validate81.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema211 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","executorId","displayName","idempotencyKey","correlationId"],"properties":{"kind":{"const":"executor.rename.request"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"executorId":{"$ref":"#/$defs/executorId"},"displayName":{"type":"string","minLength":1,"maxLength":80},"idempotencyKey":{"$ref":"#/$defs/idempotencyKey"},"correlationId":{"$ref":"#/$defs/correlationId"}}};

function validate84(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate84.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.executorId === undefined) && (missing0 = "executorId"))) || ((data.displayName === undefined) && (missing0 = "displayName"))) || ((data.idempotencyKey === undefined) && (missing0 = "idempotencyKey"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate84.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "executorId")) || (key0 === "displayName")) || (key0 === "idempotencyKey")) || (key0 === "correlationId"))){
validate84.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("executor.rename.request" !== data.kind){
validate84.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "executor.rename.request"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate84.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate84.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.executorId !== undefined){
let data2 = data.executorId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate84.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern37.test(data2)){
validate84.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/pattern",keyword:"pattern",params:{pattern: "^exe_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^exe_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate84.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.displayName !== undefined){
let data3 = data.displayName;
const _errs9 = errors;
if(errors === _errs9){
if(typeof data3 === "string"){
if(func1(data3) > 80){
validate84.errors = [{instancePath:instancePath+"/displayName",schemaPath:"#/properties/displayName/maxLength",keyword:"maxLength",params:{limit: 80},message:"must NOT have more than 80 characters"}];
return false;
}
else {
if(func1(data3) < 1){
validate84.errors = [{instancePath:instancePath+"/displayName",schemaPath:"#/properties/displayName/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate84.errors = [{instancePath:instancePath+"/displayName",schemaPath:"#/properties/displayName/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.idempotencyKey !== undefined){
let data4 = data.idempotencyKey;
const _errs11 = errors;
const _errs12 = errors;
if(errors === _errs12){
if(typeof data4 === "string"){
if(func1(data4) > 85){
validate84.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/maxLength",keyword:"maxLength",params:{limit: 85},message:"must NOT have more than 85 characters"}];
return false;
}
else {
if(!pattern5.test(data4)){
validate84.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/pattern",keyword:"pattern",params:{pattern: "^idem_[A-Za-z0-9_-]{16,80}$"},message:"must match pattern \""+"^idem_[A-Za-z0-9_-]{16,80}$"+"\""}];
return false;
}
}
}
else {
validate84.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data5 = data.correlationId;
const _errs14 = errors;
const _errs15 = errors;
if(errors === _errs15){
if(typeof data5 === "string"){
if(func1(data5) > 68){
validate84.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data5)){
validate84.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate84.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
else {
validate84.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate84.errors = vErrors;
return errors === 0;
}
validate84.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema216 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","executorId","action","idempotencyKey","correlationId"],"properties":{"kind":{"const":"executor.action.request"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"executorId":{"$ref":"#/$defs/executorId"},"action":{"enum":["revoke","archive"]},"idempotencyKey":{"$ref":"#/$defs/idempotencyKey"},"correlationId":{"$ref":"#/$defs/correlationId"}}};

function validate86(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate86.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.executorId === undefined) && (missing0 = "executorId"))) || ((data.action === undefined) && (missing0 = "action"))) || ((data.idempotencyKey === undefined) && (missing0 = "idempotencyKey"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate86.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "executorId")) || (key0 === "action")) || (key0 === "idempotencyKey")) || (key0 === "correlationId"))){
validate86.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("executor.action.request" !== data.kind){
validate86.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "executor.action.request"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate86.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate86.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.executorId !== undefined){
let data2 = data.executorId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate86.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern37.test(data2)){
validate86.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/pattern",keyword:"pattern",params:{pattern: "^exe_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^exe_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate86.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.action !== undefined){
let data3 = data.action;
const _errs9 = errors;
if(!((data3 === "revoke") || (data3 === "archive"))){
validate86.errors = [{instancePath:instancePath+"/action",schemaPath:"#/properties/action/enum",keyword:"enum",params:{allowedValues: schema216.properties.action.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.idempotencyKey !== undefined){
let data4 = data.idempotencyKey;
const _errs10 = errors;
const _errs11 = errors;
if(errors === _errs11){
if(typeof data4 === "string"){
if(func1(data4) > 85){
validate86.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/maxLength",keyword:"maxLength",params:{limit: 85},message:"must NOT have more than 85 characters"}];
return false;
}
else {
if(!pattern5.test(data4)){
validate86.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/pattern",keyword:"pattern",params:{pattern: "^idem_[A-Za-z0-9_-]{16,80}$"},message:"must match pattern \""+"^idem_[A-Za-z0-9_-]{16,80}$"+"\""}];
return false;
}
}
}
else {
validate86.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data5 = data.correlationId;
const _errs13 = errors;
const _errs14 = errors;
if(errors === _errs14){
if(typeof data5 === "string"){
if(func1(data5) > 68){
validate86.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data5)){
validate86.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate86.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
else {
validate86.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate86.errors = vErrors;
return errors === 0;
}
validate86.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema221 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","executorId","state","correlationId"],"properties":{"kind":{"const":"executor.action.response"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"executorId":{"$ref":"#/$defs/executorId"},"state":{"enum":["revoked","archived"]},"correlationId":{"$ref":"#/$defs/correlationId"}}};

function validate88(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate88.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.executorId === undefined) && (missing0 = "executorId"))) || ((data.state === undefined) && (missing0 = "state"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate88.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "executorId")) || (key0 === "state")) || (key0 === "correlationId"))){
validate88.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("executor.action.response" !== data.kind){
validate88.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "executor.action.response"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate88.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate88.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.executorId !== undefined){
let data2 = data.executorId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate88.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern37.test(data2)){
validate88.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/pattern",keyword:"pattern",params:{pattern: "^exe_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^exe_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate88.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.state !== undefined){
let data3 = data.state;
const _errs9 = errors;
if(!((data3 === "revoked") || (data3 === "archived"))){
validate88.errors = [{instancePath:instancePath+"/state",schemaPath:"#/properties/state/enum",keyword:"enum",params:{allowedValues: schema221.properties.state.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data4 = data.correlationId;
const _errs10 = errors;
const _errs11 = errors;
if(errors === _errs11){
if(typeof data4 === "string"){
if(func1(data4) > 68){
validate88.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data4)){
validate88.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate88.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
else {
validate88.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate88.errors = vErrors;
return errors === 0;
}
validate88.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema225 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","executorId","deviceId","actorRole","correlationId"],"properties":{"kind":{"const":"channel.hello"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"executorId":{"$ref":"#/$defs/executorId"},"deviceId":{"$ref":"#/$defs/deviceId"},"actorRole":{"const":"executor_device"},"correlationId":{"$ref":"#/$defs/correlationId"}}};

function validate90(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate90.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.executorId === undefined) && (missing0 = "executorId"))) || ((data.deviceId === undefined) && (missing0 = "deviceId"))) || ((data.actorRole === undefined) && (missing0 = "actorRole"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate90.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "executorId")) || (key0 === "deviceId")) || (key0 === "actorRole")) || (key0 === "correlationId"))){
validate90.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("channel.hello" !== data.kind){
validate90.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "channel.hello"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate90.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate90.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.executorId !== undefined){
let data2 = data.executorId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate90.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern37.test(data2)){
validate90.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/pattern",keyword:"pattern",params:{pattern: "^exe_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^exe_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate90.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.deviceId !== undefined){
let data3 = data.deviceId;
const _errs9 = errors;
const _errs10 = errors;
if(errors === _errs10){
if(typeof data3 === "string"){
if(func1(data3) > 68){
validate90.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern38.test(data3)){
validate90.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/pattern",keyword:"pattern",params:{pattern: "^dev_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^dev_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate90.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.actorRole !== undefined){
const _errs12 = errors;
if("executor_device" !== data.actorRole){
validate90.errors = [{instancePath:instancePath+"/actorRole",schemaPath:"#/properties/actorRole/const",keyword:"const",params:{allowedValue: "executor_device"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data5 = data.correlationId;
const _errs13 = errors;
const _errs14 = errors;
if(errors === _errs14){
if(typeof data5 === "string"){
if(func1(data5) > 68){
validate90.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data5)){
validate90.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate90.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
else {
validate90.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate90.errors = vErrors;
return errors === 0;
}
validate90.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema230 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","executorId","deviceId","actorRole","state","sentAt","correlationId"],"properties":{"kind":{"const":"channel.heartbeat"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"executorId":{"$ref":"#/$defs/executorId"},"deviceId":{"$ref":"#/$defs/deviceId"},"actorRole":{"const":"executor_device"},"state":{"enum":["idle","busy"]},"sentAt":{"$ref":"#/$defs/timestamp"},"correlationId":{"$ref":"#/$defs/correlationId"}}};

function validate92(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate92.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.executorId === undefined) && (missing0 = "executorId"))) || ((data.deviceId === undefined) && (missing0 = "deviceId"))) || ((data.actorRole === undefined) && (missing0 = "actorRole"))) || ((data.state === undefined) && (missing0 = "state"))) || ((data.sentAt === undefined) && (missing0 = "sentAt"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate92.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "executorId")) || (key0 === "deviceId")) || (key0 === "actorRole")) || (key0 === "state")) || (key0 === "sentAt")) || (key0 === "correlationId"))){
validate92.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("channel.heartbeat" !== data.kind){
validate92.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "channel.heartbeat"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate92.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate92.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.executorId !== undefined){
let data2 = data.executorId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate92.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern37.test(data2)){
validate92.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/pattern",keyword:"pattern",params:{pattern: "^exe_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^exe_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate92.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.deviceId !== undefined){
let data3 = data.deviceId;
const _errs9 = errors;
const _errs10 = errors;
if(errors === _errs10){
if(typeof data3 === "string"){
if(func1(data3) > 68){
validate92.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern38.test(data3)){
validate92.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/pattern",keyword:"pattern",params:{pattern: "^dev_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^dev_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate92.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.actorRole !== undefined){
const _errs12 = errors;
if("executor_device" !== data.actorRole){
validate92.errors = [{instancePath:instancePath+"/actorRole",schemaPath:"#/properties/actorRole/const",keyword:"const",params:{allowedValue: "executor_device"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.state !== undefined){
let data5 = data.state;
const _errs13 = errors;
if(!((data5 === "idle") || (data5 === "busy"))){
validate92.errors = [{instancePath:instancePath+"/state",schemaPath:"#/properties/state/enum",keyword:"enum",params:{allowedValues: schema230.properties.state.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sentAt !== undefined){
let data6 = data.sentAt;
const _errs14 = errors;
const _errs15 = errors;
if(errors === _errs15){
if(typeof data6 === "string"){
if(func1(data6) > 30){
validate92.errors = [{instancePath:instancePath+"/sentAt",schemaPath:"#/$defs/timestamp/maxLength",keyword:"maxLength",params:{limit: 30},message:"must NOT have more than 30 characters"}];
return false;
}
else {
if(!pattern15.test(data6)){
validate92.errors = [{instancePath:instancePath+"/sentAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"},message:"must match pattern \""+"^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"+"\""}];
return false;
}
}
}
else {
validate92.errors = [{instancePath:instancePath+"/sentAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data7 = data.correlationId;
const _errs17 = errors;
const _errs18 = errors;
if(errors === _errs18){
if(typeof data7 === "string"){
if(func1(data7) > 68){
validate92.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data7)){
validate92.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate92.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
else {
validate92.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate92.errors = vErrors;
return errors === 0;
}
validate92.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema236 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","executorId","acknowledgedKind","correlationId"],"properties":{"kind":{"const":"channel.ack"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"executorId":{"$ref":"#/$defs/executorId"},"acknowledgedKind":{"enum":["channel.hello","channel.heartbeat"]},"correlationId":{"$ref":"#/$defs/correlationId"}}};

function validate94(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate94.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.executorId === undefined) && (missing0 = "executorId"))) || ((data.acknowledgedKind === undefined) && (missing0 = "acknowledgedKind"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate94.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "executorId")) || (key0 === "acknowledgedKind")) || (key0 === "correlationId"))){
validate94.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("channel.ack" !== data.kind){
validate94.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "channel.ack"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate94.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate94.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.executorId !== undefined){
let data2 = data.executorId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate94.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern37.test(data2)){
validate94.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/pattern",keyword:"pattern",params:{pattern: "^exe_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^exe_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate94.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.acknowledgedKind !== undefined){
let data3 = data.acknowledgedKind;
const _errs9 = errors;
if(!((data3 === "channel.hello") || (data3 === "channel.heartbeat"))){
validate94.errors = [{instancePath:instancePath+"/acknowledgedKind",schemaPath:"#/properties/acknowledgedKind/enum",keyword:"enum",params:{allowedValues: schema236.properties.acknowledgedKind.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data4 = data.correlationId;
const _errs10 = errors;
const _errs11 = errors;
if(errors === _errs11){
if(typeof data4 === "string"){
if(func1(data4) > 68){
validate94.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data4)){
validate94.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate94.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
else {
validate94.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate94.errors = vErrors;
return errors === 0;
}
validate94.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema240 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","executorId","code","correlationId"],"properties":{"kind":{"const":"channel.revoked"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"executorId":{"$ref":"#/$defs/executorId"},"code":{"const":"revoked"},"correlationId":{"$ref":"#/$defs/correlationId"}}};

function validate96(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate96.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.executorId === undefined) && (missing0 = "executorId"))) || ((data.code === undefined) && (missing0 = "code"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate96.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "executorId")) || (key0 === "code")) || (key0 === "correlationId"))){
validate96.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("channel.revoked" !== data.kind){
validate96.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "channel.revoked"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate96.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate96.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.executorId !== undefined){
let data2 = data.executorId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate96.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern37.test(data2)){
validate96.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/pattern",keyword:"pattern",params:{pattern: "^exe_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^exe_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate96.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.code !== undefined){
const _errs9 = errors;
if("revoked" !== data.code){
validate96.errors = [{instancePath:instancePath+"/code",schemaPath:"#/properties/code/const",keyword:"const",params:{allowedValue: "revoked"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data4 = data.correlationId;
const _errs10 = errors;
const _errs11 = errors;
if(errors === _errs11){
if(typeof data4 === "string"){
if(func1(data4) > 68){
validate96.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data4)){
validate96.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate96.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
else {
validate96.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate96.errors = vErrors;
return errors === 0;
}
validate96.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema244 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","commandId","correlationId","idempotencyKey","websiteDeploymentId","executorId","deviceId","actorRole","operation","payload"],"allOf":[{"if":{"properties":{"operation":{"const":"executor.status.read"}}},"then":{"properties":{"payload":{"$ref":"#/$defs/statusPayload"}}}},{"if":{"properties":{"operation":{"const":"workspaces.read"}}},"then":{"properties":{"payload":{"$ref":"#/$defs/workspacesPayload"}}}},{"if":{"properties":{"operation":{"const":"threads.read"}}},"then":{"properties":{"payload":{"$ref":"#/$defs/threadsPayload"}}}},{"if":{"properties":{"operation":{"const":"thread.read"}}},"then":{"properties":{"payload":{"$ref":"#/$defs/threadReadPayload"}}}},{"if":{"properties":{"operation":{"const":"conversation.create"}}},"then":{"properties":{"payload":{"$ref":"#/$defs/conversationCreatePayload"}}}},{"if":{"properties":{"operation":{"const":"thread.send"}}},"then":{"properties":{"payload":{"$ref":"#/$defs/threadSendPayload"}}}},{"if":{"properties":{"operation":{"const":"thread.retry"}}},"then":{"properties":{"payload":{"$ref":"#/$defs/threadRetryPayload"}}}},{"if":{"properties":{"operation":{"const":"thread.cancel"}}},"then":{"properties":{"payload":{"$ref":"#/$defs/threadCancelPayload"}}}},{"if":{"properties":{"operation":{"const":"events.replay"}}},"then":{"properties":{"payload":{"$ref":"#/$defs/replayPayload"}}}}],"properties":{"kind":{"const":"command.post"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"commandId":{"$ref":"#/$defs/commandId"},"correlationId":{"$ref":"#/$defs/correlationId"},"idempotencyKey":{"$ref":"#/$defs/idempotencyKey"},"executorId":{"$ref":"#/$defs/executorId"},"deviceId":{"$ref":"#/$defs/deviceId"},"actorRole":{"const":"desktop_device"},"operation":{"$ref":"#/$defs/operation"},"payload":{"$ref":"#/$defs/commandPayload"},"websiteDeploymentId":{"$ref":"#/$defs/websiteDeploymentId"}}};
const schema245 = {"type":"object","additionalProperties":false,"required":[],"properties":{}};
const schema284 = {"type":"string","pattern":"^cmd_[A-Za-z0-9]{8,64}$","maxLength":68};
const schema289 = {"type":"string","enum":["executor.status.read","workspaces.read","threads.read","thread.read","conversation.create","thread.send","thread.retry","thread.cancel","events.replay"]};
const schema246 = {"type":"object","additionalProperties":false,"required":["limit"],"properties":{"limit":{"type":"integer","minimum":1,"maximum":100},"cursor":{"$ref":"#/$defs/cursor"}}};
const schema247 = {"type":"string","pattern":"^cur_[A-Za-z0-9_-]{8,128}$","maxLength":132};
const pattern127 = new RegExp("^cur_[A-Za-z0-9_-]{8,128}$", "u");

function validate99(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate99.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.limit === undefined) && (missing0 = "limit")){
validate99.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((key0 === "limit") || (key0 === "cursor"))){
validate99.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.limit !== undefined){
let data0 = data.limit;
const _errs2 = errors;
if(!(((typeof data0 == "number") && (!(data0 % 1) && !isNaN(data0))) && (isFinite(data0)))){
validate99.errors = [{instancePath:instancePath+"/limit",schemaPath:"#/properties/limit/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs2){
if((typeof data0 == "number") && (isFinite(data0))){
if(data0 > 100 || isNaN(data0)){
validate99.errors = [{instancePath:instancePath+"/limit",schemaPath:"#/properties/limit/maximum",keyword:"maximum",params:{comparison: "<=", limit: 100},message:"must be <= 100"}];
return false;
}
else {
if(data0 < 1 || isNaN(data0)){
validate99.errors = [{instancePath:instancePath+"/limit",schemaPath:"#/properties/limit/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"}];
return false;
}
}
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.cursor !== undefined){
let data1 = data.cursor;
const _errs4 = errors;
const _errs5 = errors;
if(errors === _errs5){
if(typeof data1 === "string"){
if(func1(data1) > 132){
validate99.errors = [{instancePath:instancePath+"/cursor",schemaPath:"#/$defs/cursor/maxLength",keyword:"maxLength",params:{limit: 132},message:"must NOT have more than 132 characters"}];
return false;
}
else {
if(!pattern127.test(data1)){
validate99.errors = [{instancePath:instancePath+"/cursor",schemaPath:"#/$defs/cursor/pattern",keyword:"pattern",params:{pattern: "^cur_[A-Za-z0-9_-]{8,128}$"},message:"must match pattern \""+"^cur_[A-Za-z0-9_-]{8,128}$"+"\""}];
return false;
}
}
}
else {
validate99.errors = [{instancePath:instancePath+"/cursor",schemaPath:"#/$defs/cursor/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
else {
validate99.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate99.errors = vErrors;
return errors === 0;
}
validate99.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema248 = {"type":"object","additionalProperties":false,"required":["workspaceId","limit"],"properties":{"workspaceId":{"$ref":"#/$defs/workspaceId"},"limit":{"type":"integer","minimum":1,"maximum":100},"cursor":{"$ref":"#/$defs/cursor"}}};
const schema249 = {"type":"string","pattern":"^wrk_[A-Za-z0-9]{8,64}$","maxLength":68};
const pattern128 = new RegExp("^wrk_[A-Za-z0-9]{8,64}$", "u");

function validate101(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate101.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((data.workspaceId === undefined) && (missing0 = "workspaceId")) || ((data.limit === undefined) && (missing0 = "limit"))){
validate101.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((key0 === "workspaceId") || (key0 === "limit")) || (key0 === "cursor"))){
validate101.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.workspaceId !== undefined){
let data0 = data.workspaceId;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 68){
validate101.errors = [{instancePath:instancePath+"/workspaceId",schemaPath:"#/$defs/workspaceId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern128.test(data0)){
validate101.errors = [{instancePath:instancePath+"/workspaceId",schemaPath:"#/$defs/workspaceId/pattern",keyword:"pattern",params:{pattern: "^wrk_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^wrk_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate101.errors = [{instancePath:instancePath+"/workspaceId",schemaPath:"#/$defs/workspaceId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.limit !== undefined){
let data1 = data.limit;
const _errs5 = errors;
if(!(((typeof data1 == "number") && (!(data1 % 1) && !isNaN(data1))) && (isFinite(data1)))){
validate101.errors = [{instancePath:instancePath+"/limit",schemaPath:"#/properties/limit/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs5){
if((typeof data1 == "number") && (isFinite(data1))){
if(data1 > 100 || isNaN(data1)){
validate101.errors = [{instancePath:instancePath+"/limit",schemaPath:"#/properties/limit/maximum",keyword:"maximum",params:{comparison: "<=", limit: 100},message:"must be <= 100"}];
return false;
}
else {
if(data1 < 1 || isNaN(data1)){
validate101.errors = [{instancePath:instancePath+"/limit",schemaPath:"#/properties/limit/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"}];
return false;
}
}
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.cursor !== undefined){
let data2 = data.cursor;
const _errs7 = errors;
const _errs8 = errors;
if(errors === _errs8){
if(typeof data2 === "string"){
if(func1(data2) > 132){
validate101.errors = [{instancePath:instancePath+"/cursor",schemaPath:"#/$defs/cursor/maxLength",keyword:"maxLength",params:{limit: 132},message:"must NOT have more than 132 characters"}];
return false;
}
else {
if(!pattern127.test(data2)){
validate101.errors = [{instancePath:instancePath+"/cursor",schemaPath:"#/$defs/cursor/pattern",keyword:"pattern",params:{pattern: "^cur_[A-Za-z0-9_-]{8,128}$"},message:"must match pattern \""+"^cur_[A-Za-z0-9_-]{8,128}$"+"\""}];
return false;
}
}
}
else {
validate101.errors = [{instancePath:instancePath+"/cursor",schemaPath:"#/$defs/cursor/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
else {
validate101.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate101.errors = vErrors;
return errors === 0;
}
validate101.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema251 = {"type":"object","additionalProperties":false,"required":["threadId","afterSequence","limit"],"properties":{"threadId":{"$ref":"#/$defs/threadId"},"afterSequence":{"type":"integer","minimum":0,"maximum":9007199254740990},"limit":{"type":"integer","minimum":1,"maximum":200},"cursor":{"$ref":"#/$defs/cursor"}}};
const schema252 = {"type":"string","pattern":"^thr_[A-Za-z0-9]{8,64}$","maxLength":68};
const pattern130 = new RegExp("^thr_[A-Za-z0-9]{8,64}$", "u");

function validate103(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate103.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((data.threadId === undefined) && (missing0 = "threadId")) || ((data.afterSequence === undefined) && (missing0 = "afterSequence"))) || ((data.limit === undefined) && (missing0 = "limit"))){
validate103.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "threadId") || (key0 === "afterSequence")) || (key0 === "limit")) || (key0 === "cursor"))){
validate103.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.threadId !== undefined){
let data0 = data.threadId;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 68){
validate103.errors = [{instancePath:instancePath+"/threadId",schemaPath:"#/$defs/threadId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern130.test(data0)){
validate103.errors = [{instancePath:instancePath+"/threadId",schemaPath:"#/$defs/threadId/pattern",keyword:"pattern",params:{pattern: "^thr_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^thr_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate103.errors = [{instancePath:instancePath+"/threadId",schemaPath:"#/$defs/threadId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.afterSequence !== undefined){
let data1 = data.afterSequence;
const _errs5 = errors;
if(!(((typeof data1 == "number") && (!(data1 % 1) && !isNaN(data1))) && (isFinite(data1)))){
validate103.errors = [{instancePath:instancePath+"/afterSequence",schemaPath:"#/properties/afterSequence/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs5){
if((typeof data1 == "number") && (isFinite(data1))){
if(data1 > 9007199254740990 || isNaN(data1)){
validate103.errors = [{instancePath:instancePath+"/afterSequence",schemaPath:"#/properties/afterSequence/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740990},message:"must be <= 9007199254740990"}];
return false;
}
else {
if(data1 < 0 || isNaN(data1)){
validate103.errors = [{instancePath:instancePath+"/afterSequence",schemaPath:"#/properties/afterSequence/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.limit !== undefined){
let data2 = data.limit;
const _errs7 = errors;
if(!(((typeof data2 == "number") && (!(data2 % 1) && !isNaN(data2))) && (isFinite(data2)))){
validate103.errors = [{instancePath:instancePath+"/limit",schemaPath:"#/properties/limit/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs7){
if((typeof data2 == "number") && (isFinite(data2))){
if(data2 > 200 || isNaN(data2)){
validate103.errors = [{instancePath:instancePath+"/limit",schemaPath:"#/properties/limit/maximum",keyword:"maximum",params:{comparison: "<=", limit: 200},message:"must be <= 200"}];
return false;
}
else {
if(data2 < 1 || isNaN(data2)){
validate103.errors = [{instancePath:instancePath+"/limit",schemaPath:"#/properties/limit/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"}];
return false;
}
}
}
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.cursor !== undefined){
let data3 = data.cursor;
const _errs9 = errors;
const _errs10 = errors;
if(errors === _errs10){
if(typeof data3 === "string"){
if(func1(data3) > 132){
validate103.errors = [{instancePath:instancePath+"/cursor",schemaPath:"#/$defs/cursor/maxLength",keyword:"maxLength",params:{limit: 132},message:"must NOT have more than 132 characters"}];
return false;
}
else {
if(!pattern127.test(data3)){
validate103.errors = [{instancePath:instancePath+"/cursor",schemaPath:"#/$defs/cursor/pattern",keyword:"pattern",params:{pattern: "^cur_[A-Za-z0-9_-]{8,128}$"},message:"must match pattern \""+"^cur_[A-Za-z0-9_-]{8,128}$"+"\""}];
return false;
}
}
}
else {
validate103.errors = [{instancePath:instancePath+"/cursor",schemaPath:"#/$defs/cursor/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
else {
validate103.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate103.errors = vErrors;
return errors === 0;
}
validate103.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema254 = {"type":"object","additionalProperties":false,"required":["clientCreationId","title","websiteDeploymentId","executorId","remoteWorkspaceId"],"properties":{"clientCreationId":{"$ref":"#/$defs/clientCreationId"},"title":{"$ref":"#/$defs/conversationTitle"},"websiteDeploymentId":{"$ref":"#/$defs/websiteDeploymentId"},"executorId":{"$ref":"#/$defs/executorId"},"remoteWorkspaceId":{"$ref":"#/$defs/workspaceId"}}};
const schema255 = {"type":"string","pattern":"^ccr_[A-Za-z0-9_-]{16,80}$","maxLength":84};
const schema256 = {"type":"string","pattern":"^[A-Za-z0-9][A-Za-z0-9 ._(),:;'-]{0,159}$","minLength":1,"maxLength":160};
const pattern132 = new RegExp("^ccr_[A-Za-z0-9_-]{16,80}$", "u");
const pattern133 = new RegExp("^[A-Za-z0-9][A-Za-z0-9 ._(),:;'-]{0,159}$", "u");

function validate105(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate105.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((data.clientCreationId === undefined) && (missing0 = "clientCreationId")) || ((data.title === undefined) && (missing0 = "title"))) || ((data.websiteDeploymentId === undefined) && (missing0 = "websiteDeploymentId"))) || ((data.executorId === undefined) && (missing0 = "executorId"))) || ((data.remoteWorkspaceId === undefined) && (missing0 = "remoteWorkspaceId"))){
validate105.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((((key0 === "clientCreationId") || (key0 === "title")) || (key0 === "websiteDeploymentId")) || (key0 === "executorId")) || (key0 === "remoteWorkspaceId"))){
validate105.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.clientCreationId !== undefined){
let data0 = data.clientCreationId;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 84){
validate105.errors = [{instancePath:instancePath+"/clientCreationId",schemaPath:"#/$defs/clientCreationId/maxLength",keyword:"maxLength",params:{limit: 84},message:"must NOT have more than 84 characters"}];
return false;
}
else {
if(!pattern132.test(data0)){
validate105.errors = [{instancePath:instancePath+"/clientCreationId",schemaPath:"#/$defs/clientCreationId/pattern",keyword:"pattern",params:{pattern: "^ccr_[A-Za-z0-9_-]{16,80}$"},message:"must match pattern \""+"^ccr_[A-Za-z0-9_-]{16,80}$"+"\""}];
return false;
}
}
}
else {
validate105.errors = [{instancePath:instancePath+"/clientCreationId",schemaPath:"#/$defs/clientCreationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.title !== undefined){
let data1 = data.title;
const _errs5 = errors;
const _errs6 = errors;
if(errors === _errs6){
if(typeof data1 === "string"){
if(func1(data1) > 160){
validate105.errors = [{instancePath:instancePath+"/title",schemaPath:"#/$defs/conversationTitle/maxLength",keyword:"maxLength",params:{limit: 160},message:"must NOT have more than 160 characters"}];
return false;
}
else {
if(func1(data1) < 1){
validate105.errors = [{instancePath:instancePath+"/title",schemaPath:"#/$defs/conversationTitle/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
else {
if(!pattern133.test(data1)){
validate105.errors = [{instancePath:instancePath+"/title",schemaPath:"#/$defs/conversationTitle/pattern",keyword:"pattern",params:{pattern: "^[A-Za-z0-9][A-Za-z0-9 ._(),:;'-]{0,159}$"},message:"must match pattern \""+"^[A-Za-z0-9][A-Za-z0-9 ._(),:;'-]{0,159}$"+"\""}];
return false;
}
}
}
}
else {
validate105.errors = [{instancePath:instancePath+"/title",schemaPath:"#/$defs/conversationTitle/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.websiteDeploymentId !== undefined){
let data2 = data.websiteDeploymentId;
const _errs8 = errors;
const _errs9 = errors;
if(errors === _errs9){
if(typeof data2 === "string"){
if(func1(data2) > 36){
validate105.errors = [{instancePath:instancePath+"/websiteDeploymentId",schemaPath:"#/$defs/websiteDeploymentId/maxLength",keyword:"maxLength",params:{limit: 36},message:"must NOT have more than 36 characters"}];
return false;
}
else {
if(!pattern44.test(data2)){
validate105.errors = [{instancePath:instancePath+"/websiteDeploymentId",schemaPath:"#/$defs/websiteDeploymentId/pattern",keyword:"pattern",params:{pattern: "^wdp_[A-Za-z0-9]{32}$"},message:"must match pattern \""+"^wdp_[A-Za-z0-9]{32}$"+"\""}];
return false;
}
}
}
else {
validate105.errors = [{instancePath:instancePath+"/websiteDeploymentId",schemaPath:"#/$defs/websiteDeploymentId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.executorId !== undefined){
let data3 = data.executorId;
const _errs11 = errors;
const _errs12 = errors;
if(errors === _errs12){
if(typeof data3 === "string"){
if(func1(data3) > 68){
validate105.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern37.test(data3)){
validate105.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/pattern",keyword:"pattern",params:{pattern: "^exe_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^exe_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate105.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.remoteWorkspaceId !== undefined){
let data4 = data.remoteWorkspaceId;
const _errs14 = errors;
const _errs15 = errors;
if(errors === _errs15){
if(typeof data4 === "string"){
if(func1(data4) > 68){
validate105.errors = [{instancePath:instancePath+"/remoteWorkspaceId",schemaPath:"#/$defs/workspaceId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern128.test(data4)){
validate105.errors = [{instancePath:instancePath+"/remoteWorkspaceId",schemaPath:"#/$defs/workspaceId/pattern",keyword:"pattern",params:{pattern: "^wrk_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^wrk_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate105.errors = [{instancePath:instancePath+"/remoteWorkspaceId",schemaPath:"#/$defs/workspaceId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
else {
validate105.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate105.errors = vErrors;
return errors === 0;
}
validate105.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema260 = {"oneOf":[{"$ref":"#/$defs/threadSendExistingPayload"},{"$ref":"#/$defs/threadSendNewPayload"}]};
const schema261 = {"type":"object","additionalProperties":false,"required":["conversationId","clientOperationId","text","mode","model","expectedExecutionBinding"],"properties":{"conversationId":{"$ref":"#/$defs/conversationId"},"clientOperationId":{"$ref":"#/$defs/clientOperationId"},"text":{"type":"string","minLength":1,"maxLength":20000},"mode":{"type":"string","enum":["normal","readonly","plan","edit"]},"model":{"$ref":"#/$defs/modelId"},"expectedExecutionBinding":{"$ref":"#/$defs/remoteExecutionBindingReceipt"}}};
const schema262 = {"type":"string","pattern":"^thr_[A-Za-z0-9]{8,64}$","maxLength":68};
const schema263 = {"type":"string","pattern":"^cop_[A-Za-z0-9_-]{16,80}$","maxLength":84};
const schema264 = {"type":"string","pattern":"^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$","maxLength":128};
const pattern138 = new RegExp("^cop_[A-Za-z0-9_-]{16,80}$", "u");
const pattern139 = new RegExp("^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$", "u");
const schema265 = {"type":"object","additionalProperties":false,"required":["conversationId","kind","websiteDeploymentId","executorId","remoteWorkspaceId"],"properties":{"conversationId":{"$ref":"#/$defs/conversationId"},"kind":{"const":"remote"},"websiteDeploymentId":{"$ref":"#/$defs/websiteDeploymentId"},"executorId":{"$ref":"#/$defs/executorId"},"remoteWorkspaceId":{"$ref":"#/$defs/workspaceId"}}};

function validate109(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate109.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((data.conversationId === undefined) && (missing0 = "conversationId")) || ((data.kind === undefined) && (missing0 = "kind"))) || ((data.websiteDeploymentId === undefined) && (missing0 = "websiteDeploymentId"))) || ((data.executorId === undefined) && (missing0 = "executorId"))) || ((data.remoteWorkspaceId === undefined) && (missing0 = "remoteWorkspaceId"))){
validate109.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((((key0 === "conversationId") || (key0 === "kind")) || (key0 === "websiteDeploymentId")) || (key0 === "executorId")) || (key0 === "remoteWorkspaceId"))){
validate109.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.conversationId !== undefined){
let data0 = data.conversationId;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 68){
validate109.errors = [{instancePath:instancePath+"/conversationId",schemaPath:"#/$defs/conversationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern130.test(data0)){
validate109.errors = [{instancePath:instancePath+"/conversationId",schemaPath:"#/$defs/conversationId/pattern",keyword:"pattern",params:{pattern: "^thr_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^thr_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate109.errors = [{instancePath:instancePath+"/conversationId",schemaPath:"#/$defs/conversationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.kind !== undefined){
const _errs5 = errors;
if("remote" !== data.kind){
validate109.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "remote"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.websiteDeploymentId !== undefined){
let data2 = data.websiteDeploymentId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 36){
validate109.errors = [{instancePath:instancePath+"/websiteDeploymentId",schemaPath:"#/$defs/websiteDeploymentId/maxLength",keyword:"maxLength",params:{limit: 36},message:"must NOT have more than 36 characters"}];
return false;
}
else {
if(!pattern44.test(data2)){
validate109.errors = [{instancePath:instancePath+"/websiteDeploymentId",schemaPath:"#/$defs/websiteDeploymentId/pattern",keyword:"pattern",params:{pattern: "^wdp_[A-Za-z0-9]{32}$"},message:"must match pattern \""+"^wdp_[A-Za-z0-9]{32}$"+"\""}];
return false;
}
}
}
else {
validate109.errors = [{instancePath:instancePath+"/websiteDeploymentId",schemaPath:"#/$defs/websiteDeploymentId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.executorId !== undefined){
let data3 = data.executorId;
const _errs9 = errors;
const _errs10 = errors;
if(errors === _errs10){
if(typeof data3 === "string"){
if(func1(data3) > 68){
validate109.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern37.test(data3)){
validate109.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/pattern",keyword:"pattern",params:{pattern: "^exe_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^exe_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate109.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.remoteWorkspaceId !== undefined){
let data4 = data.remoteWorkspaceId;
const _errs12 = errors;
const _errs13 = errors;
if(errors === _errs13){
if(typeof data4 === "string"){
if(func1(data4) > 68){
validate109.errors = [{instancePath:instancePath+"/remoteWorkspaceId",schemaPath:"#/$defs/workspaceId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern128.test(data4)){
validate109.errors = [{instancePath:instancePath+"/remoteWorkspaceId",schemaPath:"#/$defs/workspaceId/pattern",keyword:"pattern",params:{pattern: "^wrk_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^wrk_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate109.errors = [{instancePath:instancePath+"/remoteWorkspaceId",schemaPath:"#/$defs/workspaceId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
else {
validate109.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate109.errors = vErrors;
return errors === 0;
}
validate109.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate108(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate108.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.conversationId === undefined) && (missing0 = "conversationId")) || ((data.clientOperationId === undefined) && (missing0 = "clientOperationId"))) || ((data.text === undefined) && (missing0 = "text"))) || ((data.mode === undefined) && (missing0 = "mode"))) || ((data.model === undefined) && (missing0 = "model"))) || ((data.expectedExecutionBinding === undefined) && (missing0 = "expectedExecutionBinding"))){
validate108.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((key0 === "conversationId") || (key0 === "clientOperationId")) || (key0 === "text")) || (key0 === "mode")) || (key0 === "model")) || (key0 === "expectedExecutionBinding"))){
validate108.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.conversationId !== undefined){
let data0 = data.conversationId;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 68){
validate108.errors = [{instancePath:instancePath+"/conversationId",schemaPath:"#/$defs/conversationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern130.test(data0)){
validate108.errors = [{instancePath:instancePath+"/conversationId",schemaPath:"#/$defs/conversationId/pattern",keyword:"pattern",params:{pattern: "^thr_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^thr_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate108.errors = [{instancePath:instancePath+"/conversationId",schemaPath:"#/$defs/conversationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.clientOperationId !== undefined){
let data1 = data.clientOperationId;
const _errs5 = errors;
const _errs6 = errors;
if(errors === _errs6){
if(typeof data1 === "string"){
if(func1(data1) > 84){
validate108.errors = [{instancePath:instancePath+"/clientOperationId",schemaPath:"#/$defs/clientOperationId/maxLength",keyword:"maxLength",params:{limit: 84},message:"must NOT have more than 84 characters"}];
return false;
}
else {
if(!pattern138.test(data1)){
validate108.errors = [{instancePath:instancePath+"/clientOperationId",schemaPath:"#/$defs/clientOperationId/pattern",keyword:"pattern",params:{pattern: "^cop_[A-Za-z0-9_-]{16,80}$"},message:"must match pattern \""+"^cop_[A-Za-z0-9_-]{16,80}$"+"\""}];
return false;
}
}
}
else {
validate108.errors = [{instancePath:instancePath+"/clientOperationId",schemaPath:"#/$defs/clientOperationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.text !== undefined){
let data2 = data.text;
const _errs8 = errors;
if(errors === _errs8){
if(typeof data2 === "string"){
if(func1(data2) > 20000){
validate108.errors = [{instancePath:instancePath+"/text",schemaPath:"#/properties/text/maxLength",keyword:"maxLength",params:{limit: 20000},message:"must NOT have more than 20000 characters"}];
return false;
}
else {
if(func1(data2) < 1){
validate108.errors = [{instancePath:instancePath+"/text",schemaPath:"#/properties/text/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate108.errors = [{instancePath:instancePath+"/text",schemaPath:"#/properties/text/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.mode !== undefined){
let data3 = data.mode;
const _errs10 = errors;
if(typeof data3 !== "string"){
validate108.errors = [{instancePath:instancePath+"/mode",schemaPath:"#/properties/mode/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((data3 === "normal") || (data3 === "readonly")) || (data3 === "plan")) || (data3 === "edit"))){
validate108.errors = [{instancePath:instancePath+"/mode",schemaPath:"#/properties/mode/enum",keyword:"enum",params:{allowedValues: schema261.properties.mode.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.model !== undefined){
let data4 = data.model;
const _errs12 = errors;
const _errs13 = errors;
if(errors === _errs13){
if(typeof data4 === "string"){
if(func1(data4) > 128){
validate108.errors = [{instancePath:instancePath+"/model",schemaPath:"#/$defs/modelId/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"}];
return false;
}
else {
if(!pattern139.test(data4)){
validate108.errors = [{instancePath:instancePath+"/model",schemaPath:"#/$defs/modelId/pattern",keyword:"pattern",params:{pattern: "^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$"},message:"must match pattern \""+"^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$"+"\""}];
return false;
}
}
}
else {
validate108.errors = [{instancePath:instancePath+"/model",schemaPath:"#/$defs/modelId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.expectedExecutionBinding !== undefined){
const _errs15 = errors;
if(!(validate109(data.expectedExecutionBinding, {instancePath:instancePath+"/expectedExecutionBinding",parentData:data,parentDataProperty:"expectedExecutionBinding",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate109.errors : vErrors.concat(validate109.errors);
errors = vErrors.length;
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
else {
validate108.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate108.errors = vErrors;
return errors === 0;
}
validate108.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema270 = {"type":"object","additionalProperties":false,"required":["workspaceId","title","text","mode","model","phase"],"properties":{"workspaceId":{"$ref":"#/$defs/workspaceId"},"title":{"type":"string","minLength":1,"maxLength":160},"text":{"type":"string","minLength":1,"maxLength":20000},"mode":{"type":"string","enum":["normal","readonly","plan","edit"]},"model":{"$ref":"#/$defs/modelId"},"phase":{"const":"start"}}};

function validate112(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate112.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.workspaceId === undefined) && (missing0 = "workspaceId")) || ((data.title === undefined) && (missing0 = "title"))) || ((data.text === undefined) && (missing0 = "text"))) || ((data.mode === undefined) && (missing0 = "mode"))) || ((data.model === undefined) && (missing0 = "model"))) || ((data.phase === undefined) && (missing0 = "phase"))){
validate112.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((key0 === "workspaceId") || (key0 === "title")) || (key0 === "text")) || (key0 === "mode")) || (key0 === "model")) || (key0 === "phase"))){
validate112.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.workspaceId !== undefined){
let data0 = data.workspaceId;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 68){
validate112.errors = [{instancePath:instancePath+"/workspaceId",schemaPath:"#/$defs/workspaceId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern128.test(data0)){
validate112.errors = [{instancePath:instancePath+"/workspaceId",schemaPath:"#/$defs/workspaceId/pattern",keyword:"pattern",params:{pattern: "^wrk_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^wrk_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate112.errors = [{instancePath:instancePath+"/workspaceId",schemaPath:"#/$defs/workspaceId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.title !== undefined){
let data1 = data.title;
const _errs5 = errors;
if(errors === _errs5){
if(typeof data1 === "string"){
if(func1(data1) > 160){
validate112.errors = [{instancePath:instancePath+"/title",schemaPath:"#/properties/title/maxLength",keyword:"maxLength",params:{limit: 160},message:"must NOT have more than 160 characters"}];
return false;
}
else {
if(func1(data1) < 1){
validate112.errors = [{instancePath:instancePath+"/title",schemaPath:"#/properties/title/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate112.errors = [{instancePath:instancePath+"/title",schemaPath:"#/properties/title/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.text !== undefined){
let data2 = data.text;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 20000){
validate112.errors = [{instancePath:instancePath+"/text",schemaPath:"#/properties/text/maxLength",keyword:"maxLength",params:{limit: 20000},message:"must NOT have more than 20000 characters"}];
return false;
}
else {
if(func1(data2) < 1){
validate112.errors = [{instancePath:instancePath+"/text",schemaPath:"#/properties/text/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate112.errors = [{instancePath:instancePath+"/text",schemaPath:"#/properties/text/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.mode !== undefined){
let data3 = data.mode;
const _errs9 = errors;
if(typeof data3 !== "string"){
validate112.errors = [{instancePath:instancePath+"/mode",schemaPath:"#/properties/mode/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((data3 === "normal") || (data3 === "readonly")) || (data3 === "plan")) || (data3 === "edit"))){
validate112.errors = [{instancePath:instancePath+"/mode",schemaPath:"#/properties/mode/enum",keyword:"enum",params:{allowedValues: schema270.properties.mode.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.model !== undefined){
let data4 = data.model;
const _errs11 = errors;
const _errs12 = errors;
if(errors === _errs12){
if(typeof data4 === "string"){
if(func1(data4) > 128){
validate112.errors = [{instancePath:instancePath+"/model",schemaPath:"#/$defs/modelId/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"}];
return false;
}
else {
if(!pattern139.test(data4)){
validate112.errors = [{instancePath:instancePath+"/model",schemaPath:"#/$defs/modelId/pattern",keyword:"pattern",params:{pattern: "^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$"},message:"must match pattern \""+"^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$"+"\""}];
return false;
}
}
}
else {
validate112.errors = [{instancePath:instancePath+"/model",schemaPath:"#/$defs/modelId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.phase !== undefined){
const _errs14 = errors;
if("start" !== data.phase){
validate112.errors = [{instancePath:instancePath+"/phase",schemaPath:"#/properties/phase/const",keyword:"const",params:{allowedValue: "start"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
else {
validate112.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate112.errors = vErrors;
return errors === 0;
}
validate112.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate107(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate107.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
if(!(validate108(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate108.errors : vErrors.concat(validate108.errors);
errors = vErrors.length;
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
var props0 = true;
}
const _errs2 = errors;
if(!(validate112(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate112.errors : vErrors.concat(validate112.errors);
errors = vErrors.length;
}
var _valid0 = _errs2 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
if(props0 !== true){
props0 = true;
}
}
}
if(!valid0){
const err0 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
validate107.errors = vErrors;
return false;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate107.errors = vErrors;
evaluated0.props = props0;
return errors === 0;
}
validate107.evaluated = {"dynamicProps":true,"dynamicItems":false};

const schema273 = {"type":"object","additionalProperties":false,"required":["conversationId","clientOperationId","expectedExecutionBinding"],"properties":{"conversationId":{"$ref":"#/$defs/conversationId"},"clientOperationId":{"$ref":"#/$defs/clientOperationId"},"expectedExecutionBinding":{"$ref":"#/$defs/remoteExecutionBindingReceipt"},"streamId":{"$ref":"#/$defs/streamId"}}};
const schema276 = {"type":"string","pattern":"^str_[A-Za-z0-9]{8,64}$","maxLength":68};
const pattern148 = new RegExp("^str_[A-Za-z0-9]{8,64}$", "u");

function validate115(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate115.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((data.conversationId === undefined) && (missing0 = "conversationId")) || ((data.clientOperationId === undefined) && (missing0 = "clientOperationId"))) || ((data.expectedExecutionBinding === undefined) && (missing0 = "expectedExecutionBinding"))){
validate115.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "conversationId") || (key0 === "clientOperationId")) || (key0 === "expectedExecutionBinding")) || (key0 === "streamId"))){
validate115.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.conversationId !== undefined){
let data0 = data.conversationId;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 68){
validate115.errors = [{instancePath:instancePath+"/conversationId",schemaPath:"#/$defs/conversationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern130.test(data0)){
validate115.errors = [{instancePath:instancePath+"/conversationId",schemaPath:"#/$defs/conversationId/pattern",keyword:"pattern",params:{pattern: "^thr_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^thr_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate115.errors = [{instancePath:instancePath+"/conversationId",schemaPath:"#/$defs/conversationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.clientOperationId !== undefined){
let data1 = data.clientOperationId;
const _errs5 = errors;
const _errs6 = errors;
if(errors === _errs6){
if(typeof data1 === "string"){
if(func1(data1) > 84){
validate115.errors = [{instancePath:instancePath+"/clientOperationId",schemaPath:"#/$defs/clientOperationId/maxLength",keyword:"maxLength",params:{limit: 84},message:"must NOT have more than 84 characters"}];
return false;
}
else {
if(!pattern138.test(data1)){
validate115.errors = [{instancePath:instancePath+"/clientOperationId",schemaPath:"#/$defs/clientOperationId/pattern",keyword:"pattern",params:{pattern: "^cop_[A-Za-z0-9_-]{16,80}$"},message:"must match pattern \""+"^cop_[A-Za-z0-9_-]{16,80}$"+"\""}];
return false;
}
}
}
else {
validate115.errors = [{instancePath:instancePath+"/clientOperationId",schemaPath:"#/$defs/clientOperationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.expectedExecutionBinding !== undefined){
const _errs8 = errors;
if(!(validate109(data.expectedExecutionBinding, {instancePath:instancePath+"/expectedExecutionBinding",parentData:data,parentDataProperty:"expectedExecutionBinding",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate109.errors : vErrors.concat(validate109.errors);
errors = vErrors.length;
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.streamId !== undefined){
let data3 = data.streamId;
const _errs9 = errors;
const _errs10 = errors;
if(errors === _errs10){
if(typeof data3 === "string"){
if(func1(data3) > 68){
validate115.errors = [{instancePath:instancePath+"/streamId",schemaPath:"#/$defs/streamId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern148.test(data3)){
validate115.errors = [{instancePath:instancePath+"/streamId",schemaPath:"#/$defs/streamId/pattern",keyword:"pattern",params:{pattern: "^str_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^str_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate115.errors = [{instancePath:instancePath+"/streamId",schemaPath:"#/$defs/streamId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
else {
validate115.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate115.errors = vErrors;
return errors === 0;
}
validate115.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema277 = {"type":"object","additionalProperties":false,"required":["conversationId","clientOperationId","expectedExecutionBinding"],"properties":{"conversationId":{"$ref":"#/$defs/conversationId"},"clientOperationId":{"$ref":"#/$defs/clientOperationId"},"expectedExecutionBinding":{"$ref":"#/$defs/remoteExecutionBindingReceipt"},"streamId":{"$ref":"#/$defs/streamId"}}};

function validate118(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate118.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((data.conversationId === undefined) && (missing0 = "conversationId")) || ((data.clientOperationId === undefined) && (missing0 = "clientOperationId"))) || ((data.expectedExecutionBinding === undefined) && (missing0 = "expectedExecutionBinding"))){
validate118.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "conversationId") || (key0 === "clientOperationId")) || (key0 === "expectedExecutionBinding")) || (key0 === "streamId"))){
validate118.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.conversationId !== undefined){
let data0 = data.conversationId;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 68){
validate118.errors = [{instancePath:instancePath+"/conversationId",schemaPath:"#/$defs/conversationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern130.test(data0)){
validate118.errors = [{instancePath:instancePath+"/conversationId",schemaPath:"#/$defs/conversationId/pattern",keyword:"pattern",params:{pattern: "^thr_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^thr_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate118.errors = [{instancePath:instancePath+"/conversationId",schemaPath:"#/$defs/conversationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.clientOperationId !== undefined){
let data1 = data.clientOperationId;
const _errs5 = errors;
const _errs6 = errors;
if(errors === _errs6){
if(typeof data1 === "string"){
if(func1(data1) > 84){
validate118.errors = [{instancePath:instancePath+"/clientOperationId",schemaPath:"#/$defs/clientOperationId/maxLength",keyword:"maxLength",params:{limit: 84},message:"must NOT have more than 84 characters"}];
return false;
}
else {
if(!pattern138.test(data1)){
validate118.errors = [{instancePath:instancePath+"/clientOperationId",schemaPath:"#/$defs/clientOperationId/pattern",keyword:"pattern",params:{pattern: "^cop_[A-Za-z0-9_-]{16,80}$"},message:"must match pattern \""+"^cop_[A-Za-z0-9_-]{16,80}$"+"\""}];
return false;
}
}
}
else {
validate118.errors = [{instancePath:instancePath+"/clientOperationId",schemaPath:"#/$defs/clientOperationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.expectedExecutionBinding !== undefined){
const _errs8 = errors;
if(!(validate109(data.expectedExecutionBinding, {instancePath:instancePath+"/expectedExecutionBinding",parentData:data,parentDataProperty:"expectedExecutionBinding",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate109.errors : vErrors.concat(validate109.errors);
errors = vErrors.length;
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.streamId !== undefined){
let data3 = data.streamId;
const _errs9 = errors;
const _errs10 = errors;
if(errors === _errs10){
if(typeof data3 === "string"){
if(func1(data3) > 68){
validate118.errors = [{instancePath:instancePath+"/streamId",schemaPath:"#/$defs/streamId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern148.test(data3)){
validate118.errors = [{instancePath:instancePath+"/streamId",schemaPath:"#/$defs/streamId/pattern",keyword:"pattern",params:{pattern: "^str_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^str_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate118.errors = [{instancePath:instancePath+"/streamId",schemaPath:"#/$defs/streamId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
else {
validate118.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate118.errors = vErrors;
return errors === 0;
}
validate118.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema281 = {"type":"object","additionalProperties":false,"required":["threadId","afterSequence","limit"],"properties":{"threadId":{"$ref":"#/$defs/threadId"},"afterSequence":{"type":"integer","minimum":0,"maximum":9007199254740990},"limit":{"type":"integer","minimum":1,"maximum":200}}};

function validate121(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate121.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((data.threadId === undefined) && (missing0 = "threadId")) || ((data.afterSequence === undefined) && (missing0 = "afterSequence"))) || ((data.limit === undefined) && (missing0 = "limit"))){
validate121.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((key0 === "threadId") || (key0 === "afterSequence")) || (key0 === "limit"))){
validate121.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.threadId !== undefined){
let data0 = data.threadId;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 68){
validate121.errors = [{instancePath:instancePath+"/threadId",schemaPath:"#/$defs/threadId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern130.test(data0)){
validate121.errors = [{instancePath:instancePath+"/threadId",schemaPath:"#/$defs/threadId/pattern",keyword:"pattern",params:{pattern: "^thr_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^thr_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate121.errors = [{instancePath:instancePath+"/threadId",schemaPath:"#/$defs/threadId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.afterSequence !== undefined){
let data1 = data.afterSequence;
const _errs5 = errors;
if(!(((typeof data1 == "number") && (!(data1 % 1) && !isNaN(data1))) && (isFinite(data1)))){
validate121.errors = [{instancePath:instancePath+"/afterSequence",schemaPath:"#/properties/afterSequence/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs5){
if((typeof data1 == "number") && (isFinite(data1))){
if(data1 > 9007199254740990 || isNaN(data1)){
validate121.errors = [{instancePath:instancePath+"/afterSequence",schemaPath:"#/properties/afterSequence/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740990},message:"must be <= 9007199254740990"}];
return false;
}
else {
if(data1 < 0 || isNaN(data1)){
validate121.errors = [{instancePath:instancePath+"/afterSequence",schemaPath:"#/properties/afterSequence/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.limit !== undefined){
let data2 = data.limit;
const _errs7 = errors;
if(!(((typeof data2 == "number") && (!(data2 % 1) && !isNaN(data2))) && (isFinite(data2)))){
validate121.errors = [{instancePath:instancePath+"/limit",schemaPath:"#/properties/limit/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs7){
if((typeof data2 == "number") && (isFinite(data2))){
if(data2 > 200 || isNaN(data2)){
validate121.errors = [{instancePath:instancePath+"/limit",schemaPath:"#/properties/limit/maximum",keyword:"maximum",params:{comparison: "<=", limit: 200},message:"must be <= 200"}];
return false;
}
else {
if(data2 < 1 || isNaN(data2)){
validate121.errors = [{instancePath:instancePath+"/limit",schemaPath:"#/properties/limit/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"}];
return false;
}
}
}
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
else {
validate121.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate121.errors = vErrors;
return errors === 0;
}
validate121.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema290 = {"anyOf":[{"$ref":"#/$defs/statusPayload"},{"$ref":"#/$defs/workspacesPayload"},{"$ref":"#/$defs/threadsPayload"},{"$ref":"#/$defs/threadReadPayload"},{"$ref":"#/$defs/conversationCreatePayload"},{"$ref":"#/$defs/threadSendPayload"},{"$ref":"#/$defs/threadRetryPayload"},{"$ref":"#/$defs/threadCancelPayload"},{"$ref":"#/$defs/replayPayload"}]};

function validate123(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate123.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
const _errs1 = errors;
const _errs2 = errors;
if(errors === _errs2){
if(data && typeof data == "object" && !Array.isArray(data)){
for(const key0 in data){
const err0 = {instancePath,schemaPath:"#/$defs/statusPayload/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
break;
}
}
else {
const err1 = {instancePath,schemaPath:"#/$defs/statusPayload/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
var _valid0 = _errs1 === errors;
valid0 = valid0 || _valid0;
if(_valid0){
var props0 = true;
}
const _errs5 = errors;
if(!(validate99(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate99.errors : vErrors.concat(validate99.errors);
errors = vErrors.length;
}
var _valid0 = _errs5 === errors;
valid0 = valid0 || _valid0;
if(_valid0){
if(props0 !== true){
props0 = true;
}
}
const _errs6 = errors;
if(!(validate101(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate101.errors : vErrors.concat(validate101.errors);
errors = vErrors.length;
}
var _valid0 = _errs6 === errors;
valid0 = valid0 || _valid0;
if(_valid0){
if(props0 !== true){
props0 = true;
}
}
const _errs7 = errors;
if(!(validate103(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate103.errors : vErrors.concat(validate103.errors);
errors = vErrors.length;
}
var _valid0 = _errs7 === errors;
valid0 = valid0 || _valid0;
if(_valid0){
if(props0 !== true){
props0 = true;
}
}
const _errs8 = errors;
if(!(validate105(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate105.errors : vErrors.concat(validate105.errors);
errors = vErrors.length;
}
var _valid0 = _errs8 === errors;
valid0 = valid0 || _valid0;
if(_valid0){
if(props0 !== true){
props0 = true;
}
}
const _errs9 = errors;
if(!(validate107(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate107.errors : vErrors.concat(validate107.errors);
errors = vErrors.length;
}
else {
var props1 = validate107.evaluated.props;
}
var _valid0 = _errs9 === errors;
valid0 = valid0 || _valid0;
if(_valid0){
if(props0 !== true && props1 !== undefined){
if(props1 === true){
props0 = true;
}
else {
props0 = props0 || {};
Object.assign(props0, props1);
}
}
}
const _errs10 = errors;
if(!(validate115(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate115.errors : vErrors.concat(validate115.errors);
errors = vErrors.length;
}
var _valid0 = _errs10 === errors;
valid0 = valid0 || _valid0;
if(_valid0){
if(props0 !== true){
props0 = true;
}
}
const _errs11 = errors;
if(!(validate118(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate118.errors : vErrors.concat(validate118.errors);
errors = vErrors.length;
}
var _valid0 = _errs11 === errors;
valid0 = valid0 || _valid0;
if(_valid0){
if(props0 !== true){
props0 = true;
}
}
const _errs12 = errors;
if(!(validate121(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate121.errors : vErrors.concat(validate121.errors);
errors = vErrors.length;
}
var _valid0 = _errs12 === errors;
valid0 = valid0 || _valid0;
if(_valid0){
if(props0 !== true){
props0 = true;
}
}
if(!valid0){
const err2 = {instancePath,schemaPath:"#/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
validate123.errors = vErrors;
return false;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate123.errors = vErrors;
evaluated0.props = props0;
return errors === 0;
}
validate123.evaluated = {"dynamicProps":true,"dynamicItems":false};

const pattern153 = new RegExp("^cmd_[A-Za-z0-9]{8,64}$", "u");

function validate98(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate98.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs1 = errors;
const _errs2 = errors;
let valid1 = true;
const _errs3 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.operation !== undefined){
if("executor.status.read" !== data.operation){
const err0 = {};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
}
}
var _valid0 = _errs3 === errors;
errors = _errs2;
if(vErrors !== null){
if(_errs2){
vErrors.length = _errs2;
}
else {
vErrors = null;
}
}
if(_valid0){
const _errs5 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.payload !== undefined){
let data1 = data.payload;
const _errs7 = errors;
if(errors === _errs7){
if(data1 && typeof data1 == "object" && !Array.isArray(data1)){
for(const key0 in data1){
validate98.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/$defs/statusPayload/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
else {
validate98.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/$defs/statusPayload/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
}
}
var _valid0 = _errs5 === errors;
valid1 = _valid0;
if(valid1){
var props0 = {};
props0.payload = true;
props0.operation = true;
}
}
if(!valid1){
const err1 = {instancePath,schemaPath:"#/allOf/0/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
validate98.errors = vErrors;
return false;
}
var valid0 = _errs1 === errors;
if(valid0){
const _errs10 = errors;
const _errs11 = errors;
let valid5 = true;
const _errs12 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.operation !== undefined){
if("workspaces.read" !== data.operation){
const err2 = {};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
}
var _valid1 = _errs12 === errors;
errors = _errs11;
if(vErrors !== null){
if(_errs11){
vErrors.length = _errs11;
}
else {
vErrors = null;
}
}
if(_valid1){
const _errs14 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.payload !== undefined){
if(!(validate99(data.payload, {instancePath:instancePath+"/payload",parentData:data,parentDataProperty:"payload",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate99.errors : vErrors.concat(validate99.errors);
errors = vErrors.length;
}
}
}
var _valid1 = _errs14 === errors;
valid5 = _valid1;
if(valid5){
var props1 = {};
props1.payload = true;
props1.operation = true;
}
}
if(!valid5){
const err3 = {instancePath,schemaPath:"#/allOf/1/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
validate98.errors = vErrors;
return false;
}
var valid0 = _errs10 === errors;
if(valid0){
if(props0 !== true && props1 !== undefined){
if(props1 === true){
props0 = true;
}
else {
props0 = props0 || {};
Object.assign(props0, props1);
}
}
const _errs16 = errors;
const _errs17 = errors;
let valid8 = true;
const _errs18 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.operation !== undefined){
if("threads.read" !== data.operation){
const err4 = {};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
}
var _valid2 = _errs18 === errors;
errors = _errs17;
if(vErrors !== null){
if(_errs17){
vErrors.length = _errs17;
}
else {
vErrors = null;
}
}
if(_valid2){
const _errs20 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.payload !== undefined){
if(!(validate101(data.payload, {instancePath:instancePath+"/payload",parentData:data,parentDataProperty:"payload",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate101.errors : vErrors.concat(validate101.errors);
errors = vErrors.length;
}
}
}
var _valid2 = _errs20 === errors;
valid8 = _valid2;
if(valid8){
var props2 = {};
props2.payload = true;
props2.operation = true;
}
}
if(!valid8){
const err5 = {instancePath,schemaPath:"#/allOf/2/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
validate98.errors = vErrors;
return false;
}
var valid0 = _errs16 === errors;
if(valid0){
if(props0 !== true && props2 !== undefined){
if(props2 === true){
props0 = true;
}
else {
props0 = props0 || {};
Object.assign(props0, props2);
}
}
const _errs22 = errors;
const _errs23 = errors;
let valid11 = true;
const _errs24 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.operation !== undefined){
if("thread.read" !== data.operation){
const err6 = {};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
}
var _valid3 = _errs24 === errors;
errors = _errs23;
if(vErrors !== null){
if(_errs23){
vErrors.length = _errs23;
}
else {
vErrors = null;
}
}
if(_valid3){
const _errs26 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.payload !== undefined){
if(!(validate103(data.payload, {instancePath:instancePath+"/payload",parentData:data,parentDataProperty:"payload",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate103.errors : vErrors.concat(validate103.errors);
errors = vErrors.length;
}
}
}
var _valid3 = _errs26 === errors;
valid11 = _valid3;
if(valid11){
var props3 = {};
props3.payload = true;
props3.operation = true;
}
}
if(!valid11){
const err7 = {instancePath,schemaPath:"#/allOf/3/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
validate98.errors = vErrors;
return false;
}
var valid0 = _errs22 === errors;
if(valid0){
if(props0 !== true && props3 !== undefined){
if(props3 === true){
props0 = true;
}
else {
props0 = props0 || {};
Object.assign(props0, props3);
}
}
const _errs28 = errors;
const _errs29 = errors;
let valid14 = true;
const _errs30 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.operation !== undefined){
if("conversation.create" !== data.operation){
const err8 = {};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
}
var _valid4 = _errs30 === errors;
errors = _errs29;
if(vErrors !== null){
if(_errs29){
vErrors.length = _errs29;
}
else {
vErrors = null;
}
}
if(_valid4){
const _errs32 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.payload !== undefined){
if(!(validate105(data.payload, {instancePath:instancePath+"/payload",parentData:data,parentDataProperty:"payload",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate105.errors : vErrors.concat(validate105.errors);
errors = vErrors.length;
}
}
}
var _valid4 = _errs32 === errors;
valid14 = _valid4;
if(valid14){
var props4 = {};
props4.payload = true;
props4.operation = true;
}
}
if(!valid14){
const err9 = {instancePath,schemaPath:"#/allOf/4/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
validate98.errors = vErrors;
return false;
}
var valid0 = _errs28 === errors;
if(valid0){
if(props0 !== true && props4 !== undefined){
if(props4 === true){
props0 = true;
}
else {
props0 = props0 || {};
Object.assign(props0, props4);
}
}
const _errs34 = errors;
const _errs35 = errors;
let valid17 = true;
const _errs36 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.operation !== undefined){
if("thread.send" !== data.operation){
const err10 = {};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
}
var _valid5 = _errs36 === errors;
errors = _errs35;
if(vErrors !== null){
if(_errs35){
vErrors.length = _errs35;
}
else {
vErrors = null;
}
}
if(_valid5){
const _errs38 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.payload !== undefined){
if(!(validate107(data.payload, {instancePath:instancePath+"/payload",parentData:data,parentDataProperty:"payload",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate107.errors : vErrors.concat(validate107.errors);
errors = vErrors.length;
}
}
}
var _valid5 = _errs38 === errors;
valid17 = _valid5;
if(valid17){
var props6 = {};
props6.payload = true;
props6.operation = true;
}
}
if(!valid17){
const err11 = {instancePath,schemaPath:"#/allOf/5/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
validate98.errors = vErrors;
return false;
}
var valid0 = _errs34 === errors;
if(valid0){
if(props0 !== true && props6 !== undefined){
if(props6 === true){
props0 = true;
}
else {
props0 = props0 || {};
Object.assign(props0, props6);
}
}
const _errs40 = errors;
const _errs41 = errors;
let valid20 = true;
const _errs42 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.operation !== undefined){
if("thread.retry" !== data.operation){
const err12 = {};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
}
var _valid6 = _errs42 === errors;
errors = _errs41;
if(vErrors !== null){
if(_errs41){
vErrors.length = _errs41;
}
else {
vErrors = null;
}
}
if(_valid6){
const _errs44 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.payload !== undefined){
if(!(validate115(data.payload, {instancePath:instancePath+"/payload",parentData:data,parentDataProperty:"payload",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate115.errors : vErrors.concat(validate115.errors);
errors = vErrors.length;
}
}
}
var _valid6 = _errs44 === errors;
valid20 = _valid6;
if(valid20){
var props7 = {};
props7.payload = true;
props7.operation = true;
}
}
if(!valid20){
const err13 = {instancePath,schemaPath:"#/allOf/6/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
validate98.errors = vErrors;
return false;
}
var valid0 = _errs40 === errors;
if(valid0){
if(props0 !== true && props7 !== undefined){
if(props7 === true){
props0 = true;
}
else {
props0 = props0 || {};
Object.assign(props0, props7);
}
}
const _errs46 = errors;
const _errs47 = errors;
let valid23 = true;
const _errs48 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.operation !== undefined){
if("thread.cancel" !== data.operation){
const err14 = {};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
}
var _valid7 = _errs48 === errors;
errors = _errs47;
if(vErrors !== null){
if(_errs47){
vErrors.length = _errs47;
}
else {
vErrors = null;
}
}
if(_valid7){
const _errs50 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.payload !== undefined){
if(!(validate118(data.payload, {instancePath:instancePath+"/payload",parentData:data,parentDataProperty:"payload",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate118.errors : vErrors.concat(validate118.errors);
errors = vErrors.length;
}
}
}
var _valid7 = _errs50 === errors;
valid23 = _valid7;
if(valid23){
var props8 = {};
props8.payload = true;
props8.operation = true;
}
}
if(!valid23){
const err15 = {instancePath,schemaPath:"#/allOf/7/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
validate98.errors = vErrors;
return false;
}
var valid0 = _errs46 === errors;
if(valid0){
if(props0 !== true && props8 !== undefined){
if(props8 === true){
props0 = true;
}
else {
props0 = props0 || {};
Object.assign(props0, props8);
}
}
const _errs52 = errors;
const _errs53 = errors;
let valid26 = true;
const _errs54 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.operation !== undefined){
if("events.replay" !== data.operation){
const err16 = {};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
}
var _valid8 = _errs54 === errors;
errors = _errs53;
if(vErrors !== null){
if(_errs53){
vErrors.length = _errs53;
}
else {
vErrors = null;
}
}
if(_valid8){
const _errs56 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.payload !== undefined){
if(!(validate121(data.payload, {instancePath:instancePath+"/payload",parentData:data,parentDataProperty:"payload",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate121.errors : vErrors.concat(validate121.errors);
errors = vErrors.length;
}
}
}
var _valid8 = _errs56 === errors;
valid26 = _valid8;
if(valid26){
var props9 = {};
props9.payload = true;
props9.operation = true;
}
}
if(!valid26){
const err17 = {instancePath,schemaPath:"#/allOf/8/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
validate98.errors = vErrors;
return false;
}
var valid0 = _errs52 === errors;
if(valid0){
if(props0 !== true && props9 !== undefined){
if(props9 === true){
props0 = true;
}
else {
props0 = props0 || {};
Object.assign(props0, props9);
}
}
}
}
}
}
}
}
}
}
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.commandId === undefined) && (missing0 = "commandId"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))) || ((data.idempotencyKey === undefined) && (missing0 = "idempotencyKey"))) || ((data.websiteDeploymentId === undefined) && (missing0 = "websiteDeploymentId"))) || ((data.executorId === undefined) && (missing0 = "executorId"))) || ((data.deviceId === undefined) && (missing0 = "deviceId"))) || ((data.actorRole === undefined) && (missing0 = "actorRole"))) || ((data.operation === undefined) && (missing0 = "operation"))) || ((data.payload === undefined) && (missing0 = "payload"))){
validate98.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs58 = errors;
for(const key1 in data){
if(!(func32.call(schema244.properties, key1))){
validate98.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs58 === errors){
if(data.kind !== undefined){
const _errs59 = errors;
if("command.post" !== data.kind){
validate98.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "command.post"},message:"must be equal to constant"}];
return false;
}
var valid29 = _errs59 === errors;
}
else {
var valid29 = true;
}
if(valid29){
if(data.protocolVersion !== undefined){
let data19 = data.protocolVersion;
const _errs60 = errors;
if(typeof data19 !== "string"){
validate98.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data19){
validate98.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid29 = _errs60 === errors;
}
else {
var valid29 = true;
}
if(valid29){
if(data.commandId !== undefined){
let data20 = data.commandId;
const _errs63 = errors;
const _errs64 = errors;
if(errors === _errs64){
if(typeof data20 === "string"){
if(func1(data20) > 68){
validate98.errors = [{instancePath:instancePath+"/commandId",schemaPath:"#/$defs/commandId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern153.test(data20)){
validate98.errors = [{instancePath:instancePath+"/commandId",schemaPath:"#/$defs/commandId/pattern",keyword:"pattern",params:{pattern: "^cmd_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cmd_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate98.errors = [{instancePath:instancePath+"/commandId",schemaPath:"#/$defs/commandId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid29 = _errs63 === errors;
}
else {
var valid29 = true;
}
if(valid29){
if(data.correlationId !== undefined){
let data21 = data.correlationId;
const _errs66 = errors;
const _errs67 = errors;
if(errors === _errs67){
if(typeof data21 === "string"){
if(func1(data21) > 68){
validate98.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data21)){
validate98.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate98.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid29 = _errs66 === errors;
}
else {
var valid29 = true;
}
if(valid29){
if(data.idempotencyKey !== undefined){
let data22 = data.idempotencyKey;
const _errs69 = errors;
const _errs70 = errors;
if(errors === _errs70){
if(typeof data22 === "string"){
if(func1(data22) > 85){
validate98.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/maxLength",keyword:"maxLength",params:{limit: 85},message:"must NOT have more than 85 characters"}];
return false;
}
else {
if(!pattern5.test(data22)){
validate98.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/pattern",keyword:"pattern",params:{pattern: "^idem_[A-Za-z0-9_-]{16,80}$"},message:"must match pattern \""+"^idem_[A-Za-z0-9_-]{16,80}$"+"\""}];
return false;
}
}
}
else {
validate98.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid29 = _errs69 === errors;
}
else {
var valid29 = true;
}
if(valid29){
if(data.executorId !== undefined){
let data23 = data.executorId;
const _errs72 = errors;
const _errs73 = errors;
if(errors === _errs73){
if(typeof data23 === "string"){
if(func1(data23) > 68){
validate98.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern37.test(data23)){
validate98.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/pattern",keyword:"pattern",params:{pattern: "^exe_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^exe_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate98.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid29 = _errs72 === errors;
}
else {
var valid29 = true;
}
if(valid29){
if(data.deviceId !== undefined){
let data24 = data.deviceId;
const _errs75 = errors;
const _errs76 = errors;
if(errors === _errs76){
if(typeof data24 === "string"){
if(func1(data24) > 68){
validate98.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern38.test(data24)){
validate98.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/pattern",keyword:"pattern",params:{pattern: "^dev_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^dev_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate98.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid29 = _errs75 === errors;
}
else {
var valid29 = true;
}
if(valid29){
if(data.actorRole !== undefined){
const _errs78 = errors;
if("desktop_device" !== data.actorRole){
validate98.errors = [{instancePath:instancePath+"/actorRole",schemaPath:"#/properties/actorRole/const",keyword:"const",params:{allowedValue: "desktop_device"},message:"must be equal to constant"}];
return false;
}
var valid29 = _errs78 === errors;
}
else {
var valid29 = true;
}
if(valid29){
if(data.operation !== undefined){
let data26 = data.operation;
const _errs79 = errors;
if(typeof data26 !== "string"){
validate98.errors = [{instancePath:instancePath+"/operation",schemaPath:"#/$defs/operation/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((((((((data26 === "executor.status.read") || (data26 === "workspaces.read")) || (data26 === "threads.read")) || (data26 === "thread.read")) || (data26 === "conversation.create")) || (data26 === "thread.send")) || (data26 === "thread.retry")) || (data26 === "thread.cancel")) || (data26 === "events.replay"))){
validate98.errors = [{instancePath:instancePath+"/operation",schemaPath:"#/$defs/operation/enum",keyword:"enum",params:{allowedValues: schema289.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid29 = _errs79 === errors;
}
else {
var valid29 = true;
}
if(valid29){
if(data.payload !== undefined){
const _errs82 = errors;
if(!(validate123(data.payload, {instancePath:instancePath+"/payload",parentData:data,parentDataProperty:"payload",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate123.errors : vErrors.concat(validate123.errors);
errors = vErrors.length;
}
var valid29 = _errs82 === errors;
}
else {
var valid29 = true;
}
if(valid29){
if(data.websiteDeploymentId !== undefined){
let data28 = data.websiteDeploymentId;
const _errs83 = errors;
const _errs84 = errors;
if(errors === _errs84){
if(typeof data28 === "string"){
if(func1(data28) > 36){
validate98.errors = [{instancePath:instancePath+"/websiteDeploymentId",schemaPath:"#/$defs/websiteDeploymentId/maxLength",keyword:"maxLength",params:{limit: 36},message:"must NOT have more than 36 characters"}];
return false;
}
else {
if(!pattern44.test(data28)){
validate98.errors = [{instancePath:instancePath+"/websiteDeploymentId",schemaPath:"#/$defs/websiteDeploymentId/pattern",keyword:"pattern",params:{pattern: "^wdp_[A-Za-z0-9]{32}$"},message:"must match pattern \""+"^wdp_[A-Za-z0-9]{32}$"+"\""}];
return false;
}
}
}
else {
validate98.errors = [{instancePath:instancePath+"/websiteDeploymentId",schemaPath:"#/$defs/websiteDeploymentId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid29 = _errs83 === errors;
}
else {
var valid29 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate98.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate98.errors = vErrors;
return errors === 0;
}
validate98.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema293 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","commandId","correlationId","idempotencyKey","executorId","accepted"],"properties":{"kind":{"const":"command.accepted"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"commandId":{"$ref":"#/$defs/commandId"},"correlationId":{"$ref":"#/$defs/correlationId"},"idempotencyKey":{"$ref":"#/$defs/idempotencyKey"},"executorId":{"$ref":"#/$defs/executorId"},"accepted":{"const":true}}};

function validate134(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate134.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.commandId === undefined) && (missing0 = "commandId"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))) || ((data.idempotencyKey === undefined) && (missing0 = "idempotencyKey"))) || ((data.executorId === undefined) && (missing0 = "executorId"))) || ((data.accepted === undefined) && (missing0 = "accepted"))){
validate134.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "commandId")) || (key0 === "correlationId")) || (key0 === "idempotencyKey")) || (key0 === "executorId")) || (key0 === "accepted"))){
validate134.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("command.accepted" !== data.kind){
validate134.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "command.accepted"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate134.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate134.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.commandId !== undefined){
let data2 = data.commandId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate134.errors = [{instancePath:instancePath+"/commandId",schemaPath:"#/$defs/commandId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern153.test(data2)){
validate134.errors = [{instancePath:instancePath+"/commandId",schemaPath:"#/$defs/commandId/pattern",keyword:"pattern",params:{pattern: "^cmd_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cmd_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate134.errors = [{instancePath:instancePath+"/commandId",schemaPath:"#/$defs/commandId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data3 = data.correlationId;
const _errs9 = errors;
const _errs10 = errors;
if(errors === _errs10){
if(typeof data3 === "string"){
if(func1(data3) > 68){
validate134.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data3)){
validate134.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate134.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.idempotencyKey !== undefined){
let data4 = data.idempotencyKey;
const _errs12 = errors;
const _errs13 = errors;
if(errors === _errs13){
if(typeof data4 === "string"){
if(func1(data4) > 85){
validate134.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/maxLength",keyword:"maxLength",params:{limit: 85},message:"must NOT have more than 85 characters"}];
return false;
}
else {
if(!pattern5.test(data4)){
validate134.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/pattern",keyword:"pattern",params:{pattern: "^idem_[A-Za-z0-9_-]{16,80}$"},message:"must match pattern \""+"^idem_[A-Za-z0-9_-]{16,80}$"+"\""}];
return false;
}
}
}
else {
validate134.errors = [{instancePath:instancePath+"/idempotencyKey",schemaPath:"#/$defs/idempotencyKey/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.executorId !== undefined){
let data5 = data.executorId;
const _errs15 = errors;
const _errs16 = errors;
if(errors === _errs16){
if(typeof data5 === "string"){
if(func1(data5) > 68){
validate134.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern37.test(data5)){
validate134.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/pattern",keyword:"pattern",params:{pattern: "^exe_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^exe_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate134.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.accepted !== undefined){
const _errs18 = errors;
if(true !== data.accepted){
validate134.errors = [{instancePath:instancePath+"/accepted",schemaPath:"#/properties/accepted/const",keyword:"const",params:{allowedValue: true},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs18 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
else {
validate134.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate134.errors = vErrors;
return errors === 0;
}
validate134.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema299 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","commandId","correlationId","executorId","actorRole","operation","completedAt","result"],"allOf":[{"if":{"properties":{"operation":{"const":"executor.status.read"}},"required":["operation"]},"then":{"properties":{"result":{"$ref":"#/$defs/executorStatusResult"}}}},{"if":{"properties":{"operation":{"const":"workspaces.read"}},"required":["operation"]},"then":{"properties":{"result":{"$ref":"#/$defs/workspacesReadResult"}}}},{"if":{"properties":{"operation":{"const":"threads.read"}},"required":["operation"]},"then":{"properties":{"result":{"$ref":"#/$defs/threadsReadResult"}}}},{"if":{"properties":{"operation":{"const":"thread.read"}},"required":["operation"]},"then":{"properties":{"result":{"$ref":"#/$defs/threadReadResult"}}}},{"if":{"properties":{"operation":{"const":"conversation.create"}},"required":["operation"]},"then":{"properties":{"result":{"$ref":"#/$defs/conversationCreateResult"}}}},{"if":{"properties":{"operation":{"const":"thread.send"}},"required":["operation"]},"then":{"properties":{"result":{"$ref":"#/$defs/threadSendResult"}}}},{"if":{"properties":{"operation":{"const":"thread.retry"}},"required":["operation"]},"then":{"properties":{"result":{"$ref":"#/$defs/threadRetryResult"}}}},{"if":{"properties":{"operation":{"const":"thread.cancel"}},"required":["operation"]},"then":{"properties":{"result":{"$ref":"#/$defs/threadCancelResult"}}}}],"properties":{"kind":{"const":"command.result"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"commandId":{"$ref":"#/$defs/commandId"},"correlationId":{"$ref":"#/$defs/correlationId"},"executorId":{"$ref":"#/$defs/executorId"},"actorRole":{"const":"executor_device"},"operation":{"$ref":"#/$defs/commandResultOperation"},"completedAt":{"$ref":"#/$defs/timestamp"},"result":{"$ref":"#/$defs/commandResultPayload"}}};
const schema352 = {"type":"string","enum":["executor.status.read","workspaces.read","threads.read","thread.read","conversation.create","thread.send","thread.retry","thread.cancel"]};
const schema300 = {"type":"object","additionalProperties":false,"required":["displayName","state","capabilities","observedAt"],"properties":{"displayName":{"$ref":"#/$defs/displayName"},"state":{"$ref":"#/$defs/executorRuntimeState"},"capabilities":{"$ref":"#/$defs/executorCapabilities"},"observedAt":{"$ref":"#/$defs/timestamp"}}};
const schema302 = {"type":"string","enum":["idle","busy"]};
const schema303 = {"type":"object","description":"Redacted availability projection. Values report availability only and must not expose paths, versions, configuration, credentials, model lists, or provider output.","additionalProperties":false,"required":["git","codex","claude"],"properties":{"git":{"type":"boolean"},"codex":{"type":"boolean"},"claude":{"type":"boolean"}}};

function validate137(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate137.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((data.displayName === undefined) && (missing0 = "displayName")) || ((data.state === undefined) && (missing0 = "state"))) || ((data.capabilities === undefined) && (missing0 = "capabilities"))) || ((data.observedAt === undefined) && (missing0 = "observedAt"))){
validate137.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "displayName") || (key0 === "state")) || (key0 === "capabilities")) || (key0 === "observedAt"))){
validate137.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.displayName !== undefined){
let data0 = data.displayName;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 80){
validate137.errors = [{instancePath:instancePath+"/displayName",schemaPath:"#/$defs/displayName/maxLength",keyword:"maxLength",params:{limit: 80},message:"must NOT have more than 80 characters"}];
return false;
}
else {
if(!pattern31.test(data0)){
validate137.errors = [{instancePath:instancePath+"/displayName",schemaPath:"#/$defs/displayName/pattern",keyword:"pattern",params:{pattern: "^[A-Za-z0-9][A-Za-z0-9 ._()-]{0,79}$"},message:"must match pattern \""+"^[A-Za-z0-9][A-Za-z0-9 ._()-]{0,79}$"+"\""}];
return false;
}
}
}
else {
validate137.errors = [{instancePath:instancePath+"/displayName",schemaPath:"#/$defs/displayName/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.state !== undefined){
let data1 = data.state;
const _errs5 = errors;
if(typeof data1 !== "string"){
validate137.errors = [{instancePath:instancePath+"/state",schemaPath:"#/$defs/executorRuntimeState/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data1 === "idle") || (data1 === "busy"))){
validate137.errors = [{instancePath:instancePath+"/state",schemaPath:"#/$defs/executorRuntimeState/enum",keyword:"enum",params:{allowedValues: schema302.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.capabilities !== undefined){
let data2 = data.capabilities;
const _errs8 = errors;
const _errs9 = errors;
if(errors === _errs9){
if(data2 && typeof data2 == "object" && !Array.isArray(data2)){
let missing1;
if((((data2.git === undefined) && (missing1 = "git")) || ((data2.codex === undefined) && (missing1 = "codex"))) || ((data2.claude === undefined) && (missing1 = "claude"))){
validate137.errors = [{instancePath:instancePath+"/capabilities",schemaPath:"#/$defs/executorCapabilities/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
const _errs11 = errors;
for(const key1 in data2){
if(!(((key1 === "git") || (key1 === "codex")) || (key1 === "claude"))){
validate137.errors = [{instancePath:instancePath+"/capabilities",schemaPath:"#/$defs/executorCapabilities/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs11 === errors){
if(data2.git !== undefined){
const _errs12 = errors;
if(typeof data2.git !== "boolean"){
validate137.errors = [{instancePath:instancePath+"/capabilities/git",schemaPath:"#/$defs/executorCapabilities/properties/git/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid4 = _errs12 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data2.codex !== undefined){
const _errs14 = errors;
if(typeof data2.codex !== "boolean"){
validate137.errors = [{instancePath:instancePath+"/capabilities/codex",schemaPath:"#/$defs/executorCapabilities/properties/codex/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid4 = _errs14 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data2.claude !== undefined){
const _errs16 = errors;
if(typeof data2.claude !== "boolean"){
validate137.errors = [{instancePath:instancePath+"/capabilities/claude",schemaPath:"#/$defs/executorCapabilities/properties/claude/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid4 = _errs16 === errors;
}
else {
var valid4 = true;
}
}
}
}
}
}
else {
validate137.errors = [{instancePath:instancePath+"/capabilities",schemaPath:"#/$defs/executorCapabilities/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.observedAt !== undefined){
let data6 = data.observedAt;
const _errs18 = errors;
const _errs19 = errors;
if(errors === _errs19){
if(typeof data6 === "string"){
if(func1(data6) > 30){
validate137.errors = [{instancePath:instancePath+"/observedAt",schemaPath:"#/$defs/timestamp/maxLength",keyword:"maxLength",params:{limit: 30},message:"must NOT have more than 30 characters"}];
return false;
}
else {
if(!pattern15.test(data6)){
validate137.errors = [{instancePath:instancePath+"/observedAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"},message:"must match pattern \""+"^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"+"\""}];
return false;
}
}
}
else {
validate137.errors = [{instancePath:instancePath+"/observedAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs18 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
else {
validate137.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate137.errors = vErrors;
return errors === 0;
}
validate137.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema305 = {"type":"object","additionalProperties":false,"required":["workspaces","hasMore"],"allOf":[{"if":{"properties":{"hasMore":{"const":true}},"required":["hasMore"]},"then":{"properties":{"nextCursor":{"$ref":"#/$defs/cursor"}},"required":["nextCursor"]}},{"if":{"properties":{"hasMore":{"const":false}},"required":["hasMore"]},"then":{"not":{"properties":{"nextCursor":{}},"required":["nextCursor"]}}}],"properties":{"workspaces":{"type":"array","maxItems":100,"items":{"$ref":"#/$defs/workspaceSummary"}},"hasMore":{"type":"boolean"},"nextCursor":{"$ref":"#/$defs/cursor"}}};
const schema307 = {"type":"object","additionalProperties":false,"required":["workspaceId","displayName","createdAt","updatedAt"],"properties":{"workspaceId":{"$ref":"#/$defs/workspaceId"},"displayName":{"type":"string","minLength":1,"maxLength":120},"createdAt":{"$ref":"#/$defs/timestamp"},"updatedAt":{"$ref":"#/$defs/timestamp"}}};

function validate140(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate140.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((data.workspaceId === undefined) && (missing0 = "workspaceId")) || ((data.displayName === undefined) && (missing0 = "displayName"))) || ((data.createdAt === undefined) && (missing0 = "createdAt"))) || ((data.updatedAt === undefined) && (missing0 = "updatedAt"))){
validate140.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "workspaceId") || (key0 === "displayName")) || (key0 === "createdAt")) || (key0 === "updatedAt"))){
validate140.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.workspaceId !== undefined){
let data0 = data.workspaceId;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 68){
validate140.errors = [{instancePath:instancePath+"/workspaceId",schemaPath:"#/$defs/workspaceId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern128.test(data0)){
validate140.errors = [{instancePath:instancePath+"/workspaceId",schemaPath:"#/$defs/workspaceId/pattern",keyword:"pattern",params:{pattern: "^wrk_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^wrk_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate140.errors = [{instancePath:instancePath+"/workspaceId",schemaPath:"#/$defs/workspaceId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.displayName !== undefined){
let data1 = data.displayName;
const _errs5 = errors;
if(errors === _errs5){
if(typeof data1 === "string"){
if(func1(data1) > 120){
validate140.errors = [{instancePath:instancePath+"/displayName",schemaPath:"#/properties/displayName/maxLength",keyword:"maxLength",params:{limit: 120},message:"must NOT have more than 120 characters"}];
return false;
}
else {
if(func1(data1) < 1){
validate140.errors = [{instancePath:instancePath+"/displayName",schemaPath:"#/properties/displayName/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate140.errors = [{instancePath:instancePath+"/displayName",schemaPath:"#/properties/displayName/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.createdAt !== undefined){
let data2 = data.createdAt;
const _errs7 = errors;
const _errs8 = errors;
if(errors === _errs8){
if(typeof data2 === "string"){
if(func1(data2) > 30){
validate140.errors = [{instancePath:instancePath+"/createdAt",schemaPath:"#/$defs/timestamp/maxLength",keyword:"maxLength",params:{limit: 30},message:"must NOT have more than 30 characters"}];
return false;
}
else {
if(!pattern15.test(data2)){
validate140.errors = [{instancePath:instancePath+"/createdAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"},message:"must match pattern \""+"^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"+"\""}];
return false;
}
}
}
else {
validate140.errors = [{instancePath:instancePath+"/createdAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.updatedAt !== undefined){
let data3 = data.updatedAt;
const _errs10 = errors;
const _errs11 = errors;
if(errors === _errs11){
if(typeof data3 === "string"){
if(func1(data3) > 30){
validate140.errors = [{instancePath:instancePath+"/updatedAt",schemaPath:"#/$defs/timestamp/maxLength",keyword:"maxLength",params:{limit: 30},message:"must NOT have more than 30 characters"}];
return false;
}
else {
if(!pattern15.test(data3)){
validate140.errors = [{instancePath:instancePath+"/updatedAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"},message:"must match pattern \""+"^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"+"\""}];
return false;
}
}
}
else {
validate140.errors = [{instancePath:instancePath+"/updatedAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
else {
validate140.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate140.errors = vErrors;
return errors === 0;
}
validate140.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate139(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate139.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs1 = errors;
const _errs2 = errors;
let valid1 = true;
const _errs3 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.hasMore === undefined) && (missing0 = "hasMore")){
const err0 = {};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
if(data.hasMore !== undefined){
if(true !== data.hasMore){
const err1 = {};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
}
var _valid0 = _errs3 === errors;
errors = _errs2;
if(vErrors !== null){
if(_errs2){
vErrors.length = _errs2;
}
else {
vErrors = null;
}
}
if(_valid0){
const _errs5 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing1;
if((data.nextCursor === undefined) && (missing1 = "nextCursor")){
validate139.errors = [{instancePath,schemaPath:"#/allOf/0/then/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
if(data.nextCursor !== undefined){
let data1 = data.nextCursor;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data1 === "string"){
if(func1(data1) > 132){
validate139.errors = [{instancePath:instancePath+"/nextCursor",schemaPath:"#/$defs/cursor/maxLength",keyword:"maxLength",params:{limit: 132},message:"must NOT have more than 132 characters"}];
return false;
}
else {
if(!pattern127.test(data1)){
validate139.errors = [{instancePath:instancePath+"/nextCursor",schemaPath:"#/$defs/cursor/pattern",keyword:"pattern",params:{pattern: "^cur_[A-Za-z0-9_-]{8,128}$"},message:"must match pattern \""+"^cur_[A-Za-z0-9_-]{8,128}$"+"\""}];
return false;
}
}
}
else {
validate139.errors = [{instancePath:instancePath+"/nextCursor",schemaPath:"#/$defs/cursor/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
}
}
var _valid0 = _errs5 === errors;
valid1 = _valid0;
if(valid1){
var props0 = {};
props0.nextCursor = true;
props0.hasMore = true;
}
}
if(!valid1){
const err2 = {instancePath,schemaPath:"#/allOf/0/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
validate139.errors = vErrors;
return false;
}
var valid0 = _errs1 === errors;
if(valid0){
const _errs9 = errors;
const _errs10 = errors;
let valid5 = true;
const _errs11 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing2;
if((data.hasMore === undefined) && (missing2 = "hasMore")){
const err3 = {};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
else {
if(data.hasMore !== undefined){
if(false !== data.hasMore){
const err4 = {};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
}
}
var _valid1 = _errs11 === errors;
errors = _errs10;
if(vErrors !== null){
if(_errs10){
vErrors.length = _errs10;
}
else {
vErrors = null;
}
}
if(_valid1){
const _errs13 = errors;
const _errs14 = errors;
const _errs15 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing3;
if((data.nextCursor === undefined) && (missing3 = "nextCursor")){
const err5 = {};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
var valid7 = _errs15 === errors;
if(valid7){
validate139.errors = [{instancePath,schemaPath:"#/allOf/1/then/not",keyword:"not",params:{},message:"must NOT be valid"}];
return false;
}
else {
errors = _errs14;
if(vErrors !== null){
if(_errs14){
vErrors.length = _errs14;
}
else {
vErrors = null;
}
}
}
var _valid1 = _errs13 === errors;
valid5 = _valid1;
}
if(!valid5){
const err6 = {instancePath,schemaPath:"#/allOf/1/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
validate139.errors = vErrors;
return false;
}
var valid0 = _errs9 === errors;
if(valid0){
if(props0 !== true){
props0 = props0 || {};
props0.hasMore = true;
}
}
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing4;
if(((data.workspaces === undefined) && (missing4 = "workspaces")) || ((data.hasMore === undefined) && (missing4 = "hasMore"))){
validate139.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing4},message:"must have required property '"+missing4+"'"}];
return false;
}
else {
const _errs16 = errors;
for(const key0 in data){
if(!(((key0 === "workspaces") || (key0 === "hasMore")) || (key0 === "nextCursor"))){
validate139.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs16 === errors){
if(data.workspaces !== undefined){
let data3 = data.workspaces;
const _errs17 = errors;
if(errors === _errs17){
if(Array.isArray(data3)){
if(data3.length > 100){
validate139.errors = [{instancePath:instancePath+"/workspaces",schemaPath:"#/properties/workspaces/maxItems",keyword:"maxItems",params:{limit: 100},message:"must NOT have more than 100 items"}];
return false;
}
else {
var valid9 = true;
const len0 = data3.length;
for(let i0=0; i0<len0; i0++){
const _errs19 = errors;
if(!(validate140(data3[i0], {instancePath:instancePath+"/workspaces/" + i0,parentData:data3,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate140.errors : vErrors.concat(validate140.errors);
errors = vErrors.length;
}
var valid9 = _errs19 === errors;
if(!valid9){
break;
}
}
}
}
else {
validate139.errors = [{instancePath:instancePath+"/workspaces",schemaPath:"#/properties/workspaces/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid8 = _errs17 === errors;
}
else {
var valid8 = true;
}
if(valid8){
if(data.hasMore !== undefined){
const _errs20 = errors;
if(typeof data.hasMore !== "boolean"){
validate139.errors = [{instancePath:instancePath+"/hasMore",schemaPath:"#/properties/hasMore/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid8 = _errs20 === errors;
}
else {
var valid8 = true;
}
if(valid8){
if(data.nextCursor !== undefined){
let data6 = data.nextCursor;
const _errs22 = errors;
const _errs23 = errors;
if(errors === _errs23){
if(typeof data6 === "string"){
if(func1(data6) > 132){
validate139.errors = [{instancePath:instancePath+"/nextCursor",schemaPath:"#/$defs/cursor/maxLength",keyword:"maxLength",params:{limit: 132},message:"must NOT have more than 132 characters"}];
return false;
}
else {
if(!pattern127.test(data6)){
validate139.errors = [{instancePath:instancePath+"/nextCursor",schemaPath:"#/$defs/cursor/pattern",keyword:"pattern",params:{pattern: "^cur_[A-Za-z0-9_-]{8,128}$"},message:"must match pattern \""+"^cur_[A-Za-z0-9_-]{8,128}$"+"\""}];
return false;
}
}
}
else {
validate139.errors = [{instancePath:instancePath+"/nextCursor",schemaPath:"#/$defs/cursor/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid8 = _errs22 === errors;
}
else {
var valid8 = true;
}
}
}
}
}
}
else {
validate139.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate139.errors = vErrors;
return errors === 0;
}
validate139.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema312 = {"type":"object","additionalProperties":false,"required":["workspaceId","threads","hasMore"],"allOf":[{"if":{"properties":{"hasMore":{"const":true}},"required":["hasMore"]},"then":{"properties":{"nextCursor":{"$ref":"#/$defs/cursor"}},"required":["nextCursor"]}},{"if":{"properties":{"hasMore":{"const":false}},"required":["hasMore"]},"then":{"not":{"properties":{"nextCursor":{}},"required":["nextCursor"]}}}],"properties":{"workspaceId":{"$ref":"#/$defs/workspaceId"},"threads":{"type":"array","maxItems":100,"items":{"$ref":"#/$defs/threadSummary"}},"hasMore":{"type":"boolean"},"nextCursor":{"$ref":"#/$defs/cursor"}}};
const schema315 = {"type":"object","additionalProperties":false,"required":["threadId","workspaceId","title","status","createdAt","updatedAt"],"properties":{"threadId":{"$ref":"#/$defs/threadId"},"workspaceId":{"$ref":"#/$defs/workspaceId"},"title":{"type":"string","minLength":1,"maxLength":160},"status":{"$ref":"#/$defs/threadStatus"},"createdAt":{"$ref":"#/$defs/timestamp"},"updatedAt":{"$ref":"#/$defs/timestamp"}}};
const schema318 = {"type":"string","enum":["queued","running","completed","failed","cancelled"]};

function validate144(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate144.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.threadId === undefined) && (missing0 = "threadId")) || ((data.workspaceId === undefined) && (missing0 = "workspaceId"))) || ((data.title === undefined) && (missing0 = "title"))) || ((data.status === undefined) && (missing0 = "status"))) || ((data.createdAt === undefined) && (missing0 = "createdAt"))) || ((data.updatedAt === undefined) && (missing0 = "updatedAt"))){
validate144.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((key0 === "threadId") || (key0 === "workspaceId")) || (key0 === "title")) || (key0 === "status")) || (key0 === "createdAt")) || (key0 === "updatedAt"))){
validate144.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.threadId !== undefined){
let data0 = data.threadId;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 68){
validate144.errors = [{instancePath:instancePath+"/threadId",schemaPath:"#/$defs/threadId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern130.test(data0)){
validate144.errors = [{instancePath:instancePath+"/threadId",schemaPath:"#/$defs/threadId/pattern",keyword:"pattern",params:{pattern: "^thr_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^thr_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate144.errors = [{instancePath:instancePath+"/threadId",schemaPath:"#/$defs/threadId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.workspaceId !== undefined){
let data1 = data.workspaceId;
const _errs5 = errors;
const _errs6 = errors;
if(errors === _errs6){
if(typeof data1 === "string"){
if(func1(data1) > 68){
validate144.errors = [{instancePath:instancePath+"/workspaceId",schemaPath:"#/$defs/workspaceId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern128.test(data1)){
validate144.errors = [{instancePath:instancePath+"/workspaceId",schemaPath:"#/$defs/workspaceId/pattern",keyword:"pattern",params:{pattern: "^wrk_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^wrk_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate144.errors = [{instancePath:instancePath+"/workspaceId",schemaPath:"#/$defs/workspaceId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.title !== undefined){
let data2 = data.title;
const _errs8 = errors;
if(errors === _errs8){
if(typeof data2 === "string"){
if(func1(data2) > 160){
validate144.errors = [{instancePath:instancePath+"/title",schemaPath:"#/properties/title/maxLength",keyword:"maxLength",params:{limit: 160},message:"must NOT have more than 160 characters"}];
return false;
}
else {
if(func1(data2) < 1){
validate144.errors = [{instancePath:instancePath+"/title",schemaPath:"#/properties/title/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate144.errors = [{instancePath:instancePath+"/title",schemaPath:"#/properties/title/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.status !== undefined){
let data3 = data.status;
const _errs10 = errors;
if(typeof data3 !== "string"){
validate144.errors = [{instancePath:instancePath+"/status",schemaPath:"#/$defs/threadStatus/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((((data3 === "queued") || (data3 === "running")) || (data3 === "completed")) || (data3 === "failed")) || (data3 === "cancelled"))){
validate144.errors = [{instancePath:instancePath+"/status",schemaPath:"#/$defs/threadStatus/enum",keyword:"enum",params:{allowedValues: schema318.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.createdAt !== undefined){
let data4 = data.createdAt;
const _errs13 = errors;
const _errs14 = errors;
if(errors === _errs14){
if(typeof data4 === "string"){
if(func1(data4) > 30){
validate144.errors = [{instancePath:instancePath+"/createdAt",schemaPath:"#/$defs/timestamp/maxLength",keyword:"maxLength",params:{limit: 30},message:"must NOT have more than 30 characters"}];
return false;
}
else {
if(!pattern15.test(data4)){
validate144.errors = [{instancePath:instancePath+"/createdAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"},message:"must match pattern \""+"^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"+"\""}];
return false;
}
}
}
else {
validate144.errors = [{instancePath:instancePath+"/createdAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.updatedAt !== undefined){
let data5 = data.updatedAt;
const _errs16 = errors;
const _errs17 = errors;
if(errors === _errs17){
if(typeof data5 === "string"){
if(func1(data5) > 30){
validate144.errors = [{instancePath:instancePath+"/updatedAt",schemaPath:"#/$defs/timestamp/maxLength",keyword:"maxLength",params:{limit: 30},message:"must NOT have more than 30 characters"}];
return false;
}
else {
if(!pattern15.test(data5)){
validate144.errors = [{instancePath:instancePath+"/updatedAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"},message:"must match pattern \""+"^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"+"\""}];
return false;
}
}
}
else {
validate144.errors = [{instancePath:instancePath+"/updatedAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs16 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
else {
validate144.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate144.errors = vErrors;
return errors === 0;
}
validate144.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate143(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate143.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs1 = errors;
const _errs2 = errors;
let valid1 = true;
const _errs3 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.hasMore === undefined) && (missing0 = "hasMore")){
const err0 = {};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
if(data.hasMore !== undefined){
if(true !== data.hasMore){
const err1 = {};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
}
var _valid0 = _errs3 === errors;
errors = _errs2;
if(vErrors !== null){
if(_errs2){
vErrors.length = _errs2;
}
else {
vErrors = null;
}
}
if(_valid0){
const _errs5 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing1;
if((data.nextCursor === undefined) && (missing1 = "nextCursor")){
validate143.errors = [{instancePath,schemaPath:"#/allOf/0/then/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
if(data.nextCursor !== undefined){
let data1 = data.nextCursor;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data1 === "string"){
if(func1(data1) > 132){
validate143.errors = [{instancePath:instancePath+"/nextCursor",schemaPath:"#/$defs/cursor/maxLength",keyword:"maxLength",params:{limit: 132},message:"must NOT have more than 132 characters"}];
return false;
}
else {
if(!pattern127.test(data1)){
validate143.errors = [{instancePath:instancePath+"/nextCursor",schemaPath:"#/$defs/cursor/pattern",keyword:"pattern",params:{pattern: "^cur_[A-Za-z0-9_-]{8,128}$"},message:"must match pattern \""+"^cur_[A-Za-z0-9_-]{8,128}$"+"\""}];
return false;
}
}
}
else {
validate143.errors = [{instancePath:instancePath+"/nextCursor",schemaPath:"#/$defs/cursor/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
}
}
var _valid0 = _errs5 === errors;
valid1 = _valid0;
if(valid1){
var props0 = {};
props0.nextCursor = true;
props0.hasMore = true;
}
}
if(!valid1){
const err2 = {instancePath,schemaPath:"#/allOf/0/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
validate143.errors = vErrors;
return false;
}
var valid0 = _errs1 === errors;
if(valid0){
const _errs9 = errors;
const _errs10 = errors;
let valid5 = true;
const _errs11 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing2;
if((data.hasMore === undefined) && (missing2 = "hasMore")){
const err3 = {};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
else {
if(data.hasMore !== undefined){
if(false !== data.hasMore){
const err4 = {};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
}
}
var _valid1 = _errs11 === errors;
errors = _errs10;
if(vErrors !== null){
if(_errs10){
vErrors.length = _errs10;
}
else {
vErrors = null;
}
}
if(_valid1){
const _errs13 = errors;
const _errs14 = errors;
const _errs15 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing3;
if((data.nextCursor === undefined) && (missing3 = "nextCursor")){
const err5 = {};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
var valid7 = _errs15 === errors;
if(valid7){
validate143.errors = [{instancePath,schemaPath:"#/allOf/1/then/not",keyword:"not",params:{},message:"must NOT be valid"}];
return false;
}
else {
errors = _errs14;
if(vErrors !== null){
if(_errs14){
vErrors.length = _errs14;
}
else {
vErrors = null;
}
}
}
var _valid1 = _errs13 === errors;
valid5 = _valid1;
}
if(!valid5){
const err6 = {instancePath,schemaPath:"#/allOf/1/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
validate143.errors = vErrors;
return false;
}
var valid0 = _errs9 === errors;
if(valid0){
if(props0 !== true){
props0 = props0 || {};
props0.hasMore = true;
}
}
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing4;
if((((data.workspaceId === undefined) && (missing4 = "workspaceId")) || ((data.threads === undefined) && (missing4 = "threads"))) || ((data.hasMore === undefined) && (missing4 = "hasMore"))){
validate143.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing4},message:"must have required property '"+missing4+"'"}];
return false;
}
else {
const _errs16 = errors;
for(const key0 in data){
if(!((((key0 === "workspaceId") || (key0 === "threads")) || (key0 === "hasMore")) || (key0 === "nextCursor"))){
validate143.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs16 === errors){
if(data.workspaceId !== undefined){
let data3 = data.workspaceId;
const _errs17 = errors;
const _errs18 = errors;
if(errors === _errs18){
if(typeof data3 === "string"){
if(func1(data3) > 68){
validate143.errors = [{instancePath:instancePath+"/workspaceId",schemaPath:"#/$defs/workspaceId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern128.test(data3)){
validate143.errors = [{instancePath:instancePath+"/workspaceId",schemaPath:"#/$defs/workspaceId/pattern",keyword:"pattern",params:{pattern: "^wrk_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^wrk_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate143.errors = [{instancePath:instancePath+"/workspaceId",schemaPath:"#/$defs/workspaceId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid8 = _errs17 === errors;
}
else {
var valid8 = true;
}
if(valid8){
if(data.threads !== undefined){
let data4 = data.threads;
const _errs20 = errors;
if(errors === _errs20){
if(Array.isArray(data4)){
if(data4.length > 100){
validate143.errors = [{instancePath:instancePath+"/threads",schemaPath:"#/properties/threads/maxItems",keyword:"maxItems",params:{limit: 100},message:"must NOT have more than 100 items"}];
return false;
}
else {
var valid10 = true;
const len0 = data4.length;
for(let i0=0; i0<len0; i0++){
const _errs22 = errors;
if(!(validate144(data4[i0], {instancePath:instancePath+"/threads/" + i0,parentData:data4,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate144.errors : vErrors.concat(validate144.errors);
errors = vErrors.length;
}
var valid10 = _errs22 === errors;
if(!valid10){
break;
}
}
}
}
else {
validate143.errors = [{instancePath:instancePath+"/threads",schemaPath:"#/properties/threads/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid8 = _errs20 === errors;
}
else {
var valid8 = true;
}
if(valid8){
if(data.hasMore !== undefined){
const _errs23 = errors;
if(typeof data.hasMore !== "boolean"){
validate143.errors = [{instancePath:instancePath+"/hasMore",schemaPath:"#/properties/hasMore/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid8 = _errs23 === errors;
}
else {
var valid8 = true;
}
if(valid8){
if(data.nextCursor !== undefined){
let data7 = data.nextCursor;
const _errs25 = errors;
const _errs26 = errors;
if(errors === _errs26){
if(typeof data7 === "string"){
if(func1(data7) > 132){
validate143.errors = [{instancePath:instancePath+"/nextCursor",schemaPath:"#/$defs/cursor/maxLength",keyword:"maxLength",params:{limit: 132},message:"must NOT have more than 132 characters"}];
return false;
}
else {
if(!pattern127.test(data7)){
validate143.errors = [{instancePath:instancePath+"/nextCursor",schemaPath:"#/$defs/cursor/pattern",keyword:"pattern",params:{pattern: "^cur_[A-Za-z0-9_-]{8,128}$"},message:"must match pattern \""+"^cur_[A-Za-z0-9_-]{8,128}$"+"\""}];
return false;
}
}
}
else {
validate143.errors = [{instancePath:instancePath+"/nextCursor",schemaPath:"#/$defs/cursor/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid8 = _errs25 === errors;
}
else {
var valid8 = true;
}
}
}
}
}
}
}
else {
validate143.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate143.errors = vErrors;
return errors === 0;
}
validate143.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema322 = {"type":"object","additionalProperties":false,"required":["thread","afterSequence","highWaterSequence","messages","hasMore"],"allOf":[{"if":{"properties":{"hasMore":{"const":true}},"required":["hasMore"]},"then":{"properties":{"nextCursor":{"$ref":"#/$defs/cursor"}},"required":["nextCursor"]}},{"if":{"properties":{"hasMore":{"const":false}},"required":["hasMore"]},"then":{"not":{"properties":{"nextCursor":{}},"required":["nextCursor"]}}}],"properties":{"thread":{"$ref":"#/$defs/threadSummary"},"afterSequence":{"type":"integer","minimum":0,"maximum":9007199254740990},"highWaterSequence":{"type":"integer","minimum":0,"maximum":9007199254740991},"messages":{"type":"array","maxItems":200,"items":{"$ref":"#/$defs/threadMessage"}},"hasMore":{"type":"boolean"},"nextCursor":{"$ref":"#/$defs/cursor"}}};
const schema324 = {"type":"object","additionalProperties":false,"required":["messageId","threadId","sequence","role","status","text","createdAt","updatedAt"],"properties":{"messageId":{"$ref":"#/$defs/messageId"},"threadId":{"$ref":"#/$defs/threadId"},"sequence":{"$ref":"#/$defs/sequence"},"role":{"$ref":"#/$defs/messageRole"},"status":{"$ref":"#/$defs/messageStatus"},"text":{"type":"string","maxLength":20000},"createdAt":{"$ref":"#/$defs/timestamp"},"updatedAt":{"$ref":"#/$defs/timestamp"}}};
const schema325 = {"type":"string","pattern":"^msg_[A-Za-z0-9]{8,64}$","maxLength":68};
const schema327 = {"type":"integer","minimum":1,"maximum":9007199254740991};
const schema328 = {"type":"string","enum":["user","assistant","system"]};
const schema329 = {"type":"string","enum":["pending","streaming","completed","failed","cancelled"]};
const pattern178 = new RegExp("^msg_[A-Za-z0-9]{8,64}$", "u");

function validate149(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate149.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((((data.messageId === undefined) && (missing0 = "messageId")) || ((data.threadId === undefined) && (missing0 = "threadId"))) || ((data.sequence === undefined) && (missing0 = "sequence"))) || ((data.role === undefined) && (missing0 = "role"))) || ((data.status === undefined) && (missing0 = "status"))) || ((data.text === undefined) && (missing0 = "text"))) || ((data.createdAt === undefined) && (missing0 = "createdAt"))) || ((data.updatedAt === undefined) && (missing0 = "updatedAt"))){
validate149.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((((key0 === "messageId") || (key0 === "threadId")) || (key0 === "sequence")) || (key0 === "role")) || (key0 === "status")) || (key0 === "text")) || (key0 === "createdAt")) || (key0 === "updatedAt"))){
validate149.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.messageId !== undefined){
let data0 = data.messageId;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 68){
validate149.errors = [{instancePath:instancePath+"/messageId",schemaPath:"#/$defs/messageId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern178.test(data0)){
validate149.errors = [{instancePath:instancePath+"/messageId",schemaPath:"#/$defs/messageId/pattern",keyword:"pattern",params:{pattern: "^msg_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^msg_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate149.errors = [{instancePath:instancePath+"/messageId",schemaPath:"#/$defs/messageId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.threadId !== undefined){
let data1 = data.threadId;
const _errs5 = errors;
const _errs6 = errors;
if(errors === _errs6){
if(typeof data1 === "string"){
if(func1(data1) > 68){
validate149.errors = [{instancePath:instancePath+"/threadId",schemaPath:"#/$defs/threadId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern130.test(data1)){
validate149.errors = [{instancePath:instancePath+"/threadId",schemaPath:"#/$defs/threadId/pattern",keyword:"pattern",params:{pattern: "^thr_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^thr_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate149.errors = [{instancePath:instancePath+"/threadId",schemaPath:"#/$defs/threadId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sequence !== undefined){
let data2 = data.sequence;
const _errs8 = errors;
const _errs9 = errors;
if(!(((typeof data2 == "number") && (!(data2 % 1) && !isNaN(data2))) && (isFinite(data2)))){
validate149.errors = [{instancePath:instancePath+"/sequence",schemaPath:"#/$defs/sequence/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs9){
if((typeof data2 == "number") && (isFinite(data2))){
if(data2 > 9007199254740991 || isNaN(data2)){
validate149.errors = [{instancePath:instancePath+"/sequence",schemaPath:"#/$defs/sequence/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data2 < 1 || isNaN(data2)){
validate149.errors = [{instancePath:instancePath+"/sequence",schemaPath:"#/$defs/sequence/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"}];
return false;
}
}
}
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.role !== undefined){
let data3 = data.role;
const _errs11 = errors;
if(typeof data3 !== "string"){
validate149.errors = [{instancePath:instancePath+"/role",schemaPath:"#/$defs/messageRole/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data3 === "user") || (data3 === "assistant")) || (data3 === "system"))){
validate149.errors = [{instancePath:instancePath+"/role",schemaPath:"#/$defs/messageRole/enum",keyword:"enum",params:{allowedValues: schema328.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.status !== undefined){
let data4 = data.status;
const _errs14 = errors;
if(typeof data4 !== "string"){
validate149.errors = [{instancePath:instancePath+"/status",schemaPath:"#/$defs/messageStatus/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((((data4 === "pending") || (data4 === "streaming")) || (data4 === "completed")) || (data4 === "failed")) || (data4 === "cancelled"))){
validate149.errors = [{instancePath:instancePath+"/status",schemaPath:"#/$defs/messageStatus/enum",keyword:"enum",params:{allowedValues: schema329.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.text !== undefined){
let data5 = data.text;
const _errs17 = errors;
if(errors === _errs17){
if(typeof data5 === "string"){
if(func1(data5) > 20000){
validate149.errors = [{instancePath:instancePath+"/text",schemaPath:"#/properties/text/maxLength",keyword:"maxLength",params:{limit: 20000},message:"must NOT have more than 20000 characters"}];
return false;
}
}
else {
validate149.errors = [{instancePath:instancePath+"/text",schemaPath:"#/properties/text/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.createdAt !== undefined){
let data6 = data.createdAt;
const _errs19 = errors;
const _errs20 = errors;
if(errors === _errs20){
if(typeof data6 === "string"){
if(func1(data6) > 30){
validate149.errors = [{instancePath:instancePath+"/createdAt",schemaPath:"#/$defs/timestamp/maxLength",keyword:"maxLength",params:{limit: 30},message:"must NOT have more than 30 characters"}];
return false;
}
else {
if(!pattern15.test(data6)){
validate149.errors = [{instancePath:instancePath+"/createdAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"},message:"must match pattern \""+"^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"+"\""}];
return false;
}
}
}
else {
validate149.errors = [{instancePath:instancePath+"/createdAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs19 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.updatedAt !== undefined){
let data7 = data.updatedAt;
const _errs22 = errors;
const _errs23 = errors;
if(errors === _errs23){
if(typeof data7 === "string"){
if(func1(data7) > 30){
validate149.errors = [{instancePath:instancePath+"/updatedAt",schemaPath:"#/$defs/timestamp/maxLength",keyword:"maxLength",params:{limit: 30},message:"must NOT have more than 30 characters"}];
return false;
}
else {
if(!pattern15.test(data7)){
validate149.errors = [{instancePath:instancePath+"/updatedAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"},message:"must match pattern \""+"^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"+"\""}];
return false;
}
}
}
else {
validate149.errors = [{instancePath:instancePath+"/updatedAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs22 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
else {
validate149.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate149.errors = vErrors;
return errors === 0;
}
validate149.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate147(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate147.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs1 = errors;
const _errs2 = errors;
let valid1 = true;
const _errs3 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.hasMore === undefined) && (missing0 = "hasMore")){
const err0 = {};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
if(data.hasMore !== undefined){
if(true !== data.hasMore){
const err1 = {};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
}
var _valid0 = _errs3 === errors;
errors = _errs2;
if(vErrors !== null){
if(_errs2){
vErrors.length = _errs2;
}
else {
vErrors = null;
}
}
if(_valid0){
const _errs5 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing1;
if((data.nextCursor === undefined) && (missing1 = "nextCursor")){
validate147.errors = [{instancePath,schemaPath:"#/allOf/0/then/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
if(data.nextCursor !== undefined){
let data1 = data.nextCursor;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data1 === "string"){
if(func1(data1) > 132){
validate147.errors = [{instancePath:instancePath+"/nextCursor",schemaPath:"#/$defs/cursor/maxLength",keyword:"maxLength",params:{limit: 132},message:"must NOT have more than 132 characters"}];
return false;
}
else {
if(!pattern127.test(data1)){
validate147.errors = [{instancePath:instancePath+"/nextCursor",schemaPath:"#/$defs/cursor/pattern",keyword:"pattern",params:{pattern: "^cur_[A-Za-z0-9_-]{8,128}$"},message:"must match pattern \""+"^cur_[A-Za-z0-9_-]{8,128}$"+"\""}];
return false;
}
}
}
else {
validate147.errors = [{instancePath:instancePath+"/nextCursor",schemaPath:"#/$defs/cursor/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
}
}
var _valid0 = _errs5 === errors;
valid1 = _valid0;
if(valid1){
var props0 = {};
props0.nextCursor = true;
props0.hasMore = true;
}
}
if(!valid1){
const err2 = {instancePath,schemaPath:"#/allOf/0/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
validate147.errors = vErrors;
return false;
}
var valid0 = _errs1 === errors;
if(valid0){
const _errs9 = errors;
const _errs10 = errors;
let valid5 = true;
const _errs11 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing2;
if((data.hasMore === undefined) && (missing2 = "hasMore")){
const err3 = {};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
else {
if(data.hasMore !== undefined){
if(false !== data.hasMore){
const err4 = {};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
}
}
var _valid1 = _errs11 === errors;
errors = _errs10;
if(vErrors !== null){
if(_errs10){
vErrors.length = _errs10;
}
else {
vErrors = null;
}
}
if(_valid1){
const _errs13 = errors;
const _errs14 = errors;
const _errs15 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing3;
if((data.nextCursor === undefined) && (missing3 = "nextCursor")){
const err5 = {};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
var valid7 = _errs15 === errors;
if(valid7){
validate147.errors = [{instancePath,schemaPath:"#/allOf/1/then/not",keyword:"not",params:{},message:"must NOT be valid"}];
return false;
}
else {
errors = _errs14;
if(vErrors !== null){
if(_errs14){
vErrors.length = _errs14;
}
else {
vErrors = null;
}
}
}
var _valid1 = _errs13 === errors;
valid5 = _valid1;
}
if(!valid5){
const err6 = {instancePath,schemaPath:"#/allOf/1/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
validate147.errors = vErrors;
return false;
}
var valid0 = _errs9 === errors;
if(valid0){
if(props0 !== true){
props0 = props0 || {};
props0.hasMore = true;
}
}
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing4;
if((((((data.thread === undefined) && (missing4 = "thread")) || ((data.afterSequence === undefined) && (missing4 = "afterSequence"))) || ((data.highWaterSequence === undefined) && (missing4 = "highWaterSequence"))) || ((data.messages === undefined) && (missing4 = "messages"))) || ((data.hasMore === undefined) && (missing4 = "hasMore"))){
validate147.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing4},message:"must have required property '"+missing4+"'"}];
return false;
}
else {
const _errs16 = errors;
for(const key0 in data){
if(!((((((key0 === "thread") || (key0 === "afterSequence")) || (key0 === "highWaterSequence")) || (key0 === "messages")) || (key0 === "hasMore")) || (key0 === "nextCursor"))){
validate147.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs16 === errors){
if(data.thread !== undefined){
const _errs17 = errors;
if(!(validate144(data.thread, {instancePath:instancePath+"/thread",parentData:data,parentDataProperty:"thread",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate144.errors : vErrors.concat(validate144.errors);
errors = vErrors.length;
}
var valid8 = _errs17 === errors;
}
else {
var valid8 = true;
}
if(valid8){
if(data.afterSequence !== undefined){
let data4 = data.afterSequence;
const _errs18 = errors;
if(!(((typeof data4 == "number") && (!(data4 % 1) && !isNaN(data4))) && (isFinite(data4)))){
validate147.errors = [{instancePath:instancePath+"/afterSequence",schemaPath:"#/properties/afterSequence/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs18){
if((typeof data4 == "number") && (isFinite(data4))){
if(data4 > 9007199254740990 || isNaN(data4)){
validate147.errors = [{instancePath:instancePath+"/afterSequence",schemaPath:"#/properties/afterSequence/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740990},message:"must be <= 9007199254740990"}];
return false;
}
else {
if(data4 < 0 || isNaN(data4)){
validate147.errors = [{instancePath:instancePath+"/afterSequence",schemaPath:"#/properties/afterSequence/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
}
var valid8 = _errs18 === errors;
}
else {
var valid8 = true;
}
if(valid8){
if(data.highWaterSequence !== undefined){
let data5 = data.highWaterSequence;
const _errs20 = errors;
if(!(((typeof data5 == "number") && (!(data5 % 1) && !isNaN(data5))) && (isFinite(data5)))){
validate147.errors = [{instancePath:instancePath+"/highWaterSequence",schemaPath:"#/properties/highWaterSequence/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs20){
if((typeof data5 == "number") && (isFinite(data5))){
if(data5 > 9007199254740991 || isNaN(data5)){
validate147.errors = [{instancePath:instancePath+"/highWaterSequence",schemaPath:"#/properties/highWaterSequence/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data5 < 0 || isNaN(data5)){
validate147.errors = [{instancePath:instancePath+"/highWaterSequence",schemaPath:"#/properties/highWaterSequence/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
}
var valid8 = _errs20 === errors;
}
else {
var valid8 = true;
}
if(valid8){
if(data.messages !== undefined){
let data6 = data.messages;
const _errs22 = errors;
if(errors === _errs22){
if(Array.isArray(data6)){
if(data6.length > 200){
validate147.errors = [{instancePath:instancePath+"/messages",schemaPath:"#/properties/messages/maxItems",keyword:"maxItems",params:{limit: 200},message:"must NOT have more than 200 items"}];
return false;
}
else {
var valid9 = true;
const len0 = data6.length;
for(let i0=0; i0<len0; i0++){
const _errs24 = errors;
if(!(validate149(data6[i0], {instancePath:instancePath+"/messages/" + i0,parentData:data6,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate149.errors : vErrors.concat(validate149.errors);
errors = vErrors.length;
}
var valid9 = _errs24 === errors;
if(!valid9){
break;
}
}
}
}
else {
validate147.errors = [{instancePath:instancePath+"/messages",schemaPath:"#/properties/messages/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid8 = _errs22 === errors;
}
else {
var valid8 = true;
}
if(valid8){
if(data.hasMore !== undefined){
const _errs25 = errors;
if(typeof data.hasMore !== "boolean"){
validate147.errors = [{instancePath:instancePath+"/hasMore",schemaPath:"#/properties/hasMore/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid8 = _errs25 === errors;
}
else {
var valid8 = true;
}
if(valid8){
if(data.nextCursor !== undefined){
let data9 = data.nextCursor;
const _errs27 = errors;
const _errs28 = errors;
if(errors === _errs28){
if(typeof data9 === "string"){
if(func1(data9) > 132){
validate147.errors = [{instancePath:instancePath+"/nextCursor",schemaPath:"#/$defs/cursor/maxLength",keyword:"maxLength",params:{limit: 132},message:"must NOT have more than 132 characters"}];
return false;
}
else {
if(!pattern127.test(data9)){
validate147.errors = [{instancePath:instancePath+"/nextCursor",schemaPath:"#/$defs/cursor/pattern",keyword:"pattern",params:{pattern: "^cur_[A-Za-z0-9_-]{8,128}$"},message:"must match pattern \""+"^cur_[A-Za-z0-9_-]{8,128}$"+"\""}];
return false;
}
}
}
else {
validate147.errors = [{instancePath:instancePath+"/nextCursor",schemaPath:"#/$defs/cursor/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid8 = _errs27 === errors;
}
else {
var valid8 = true;
}
}
}
}
}
}
}
}
}
else {
validate147.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate147.errors = vErrors;
return errors === 0;
}
validate147.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema333 = {"type":"object","additionalProperties":false,"required":["conversationId","title","createdAt","executionBinding"],"properties":{"conversationId":{"$ref":"#/$defs/conversationId"},"title":{"$ref":"#/$defs/conversationTitle"},"createdAt":{"$ref":"#/$defs/timestamp"},"executionBinding":{"$ref":"#/$defs/remoteExecutionBindingReceipt"}}};

function validate152(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate152.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((data.conversationId === undefined) && (missing0 = "conversationId")) || ((data.title === undefined) && (missing0 = "title"))) || ((data.createdAt === undefined) && (missing0 = "createdAt"))) || ((data.executionBinding === undefined) && (missing0 = "executionBinding"))){
validate152.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "conversationId") || (key0 === "title")) || (key0 === "createdAt")) || (key0 === "executionBinding"))){
validate152.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.conversationId !== undefined){
let data0 = data.conversationId;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 68){
validate152.errors = [{instancePath:instancePath+"/conversationId",schemaPath:"#/$defs/conversationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern130.test(data0)){
validate152.errors = [{instancePath:instancePath+"/conversationId",schemaPath:"#/$defs/conversationId/pattern",keyword:"pattern",params:{pattern: "^thr_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^thr_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate152.errors = [{instancePath:instancePath+"/conversationId",schemaPath:"#/$defs/conversationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.title !== undefined){
let data1 = data.title;
const _errs5 = errors;
const _errs6 = errors;
if(errors === _errs6){
if(typeof data1 === "string"){
if(func1(data1) > 160){
validate152.errors = [{instancePath:instancePath+"/title",schemaPath:"#/$defs/conversationTitle/maxLength",keyword:"maxLength",params:{limit: 160},message:"must NOT have more than 160 characters"}];
return false;
}
else {
if(func1(data1) < 1){
validate152.errors = [{instancePath:instancePath+"/title",schemaPath:"#/$defs/conversationTitle/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
else {
if(!pattern133.test(data1)){
validate152.errors = [{instancePath:instancePath+"/title",schemaPath:"#/$defs/conversationTitle/pattern",keyword:"pattern",params:{pattern: "^[A-Za-z0-9][A-Za-z0-9 ._(),:;'-]{0,159}$"},message:"must match pattern \""+"^[A-Za-z0-9][A-Za-z0-9 ._(),:;'-]{0,159}$"+"\""}];
return false;
}
}
}
}
else {
validate152.errors = [{instancePath:instancePath+"/title",schemaPath:"#/$defs/conversationTitle/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.createdAt !== undefined){
let data2 = data.createdAt;
const _errs8 = errors;
const _errs9 = errors;
if(errors === _errs9){
if(typeof data2 === "string"){
if(func1(data2) > 30){
validate152.errors = [{instancePath:instancePath+"/createdAt",schemaPath:"#/$defs/timestamp/maxLength",keyword:"maxLength",params:{limit: 30},message:"must NOT have more than 30 characters"}];
return false;
}
else {
if(!pattern15.test(data2)){
validate152.errors = [{instancePath:instancePath+"/createdAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"},message:"must match pattern \""+"^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"+"\""}];
return false;
}
}
}
else {
validate152.errors = [{instancePath:instancePath+"/createdAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.executionBinding !== undefined){
const _errs11 = errors;
if(!(validate109(data.executionBinding, {instancePath:instancePath+"/executionBinding",parentData:data,parentDataProperty:"executionBinding",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate109.errors : vErrors.concat(validate109.errors);
errors = vErrors.length;
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
else {
validate152.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate152.errors = vErrors;
return errors === 0;
}
validate152.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema337 = {"type":"object","additionalProperties":false,"required":["thread","streamId","createdThread","startedAt"],"properties":{"thread":{"$ref":"#/$defs/threadSummary"},"streamId":{"$ref":"#/$defs/streamId"},"createdThread":{"type":"boolean"},"startedAt":{"$ref":"#/$defs/timestamp"}}};

function validate155(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate155.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((data.thread === undefined) && (missing0 = "thread")) || ((data.streamId === undefined) && (missing0 = "streamId"))) || ((data.createdThread === undefined) && (missing0 = "createdThread"))) || ((data.startedAt === undefined) && (missing0 = "startedAt"))){
validate155.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "thread") || (key0 === "streamId")) || (key0 === "createdThread")) || (key0 === "startedAt"))){
validate155.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.thread !== undefined){
const _errs2 = errors;
if(!(validate144(data.thread, {instancePath:instancePath+"/thread",parentData:data,parentDataProperty:"thread",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate144.errors : vErrors.concat(validate144.errors);
errors = vErrors.length;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.streamId !== undefined){
let data1 = data.streamId;
const _errs3 = errors;
const _errs4 = errors;
if(errors === _errs4){
if(typeof data1 === "string"){
if(func1(data1) > 68){
validate155.errors = [{instancePath:instancePath+"/streamId",schemaPath:"#/$defs/streamId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern148.test(data1)){
validate155.errors = [{instancePath:instancePath+"/streamId",schemaPath:"#/$defs/streamId/pattern",keyword:"pattern",params:{pattern: "^str_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^str_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate155.errors = [{instancePath:instancePath+"/streamId",schemaPath:"#/$defs/streamId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.createdThread !== undefined){
const _errs6 = errors;
if(typeof data.createdThread !== "boolean"){
validate155.errors = [{instancePath:instancePath+"/createdThread",schemaPath:"#/properties/createdThread/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.startedAt !== undefined){
let data3 = data.startedAt;
const _errs8 = errors;
const _errs9 = errors;
if(errors === _errs9){
if(typeof data3 === "string"){
if(func1(data3) > 30){
validate155.errors = [{instancePath:instancePath+"/startedAt",schemaPath:"#/$defs/timestamp/maxLength",keyword:"maxLength",params:{limit: 30},message:"must NOT have more than 30 characters"}];
return false;
}
else {
if(!pattern15.test(data3)){
validate155.errors = [{instancePath:instancePath+"/startedAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"},message:"must match pattern \""+"^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"+"\""}];
return false;
}
}
}
else {
validate155.errors = [{instancePath:instancePath+"/startedAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
else {
validate155.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate155.errors = vErrors;
return errors === 0;
}
validate155.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema340 = {"type":"object","additionalProperties":false,"required":["threadId","streamId","status","startedAt"],"properties":{"threadId":{"$ref":"#/$defs/threadId"},"streamId":{"$ref":"#/$defs/streamId"},"status":{"const":"running"},"startedAt":{"$ref":"#/$defs/timestamp"}}};

function validate158(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate158.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((data.threadId === undefined) && (missing0 = "threadId")) || ((data.streamId === undefined) && (missing0 = "streamId"))) || ((data.status === undefined) && (missing0 = "status"))) || ((data.startedAt === undefined) && (missing0 = "startedAt"))){
validate158.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "threadId") || (key0 === "streamId")) || (key0 === "status")) || (key0 === "startedAt"))){
validate158.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.threadId !== undefined){
let data0 = data.threadId;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 68){
validate158.errors = [{instancePath:instancePath+"/threadId",schemaPath:"#/$defs/threadId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern130.test(data0)){
validate158.errors = [{instancePath:instancePath+"/threadId",schemaPath:"#/$defs/threadId/pattern",keyword:"pattern",params:{pattern: "^thr_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^thr_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate158.errors = [{instancePath:instancePath+"/threadId",schemaPath:"#/$defs/threadId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.streamId !== undefined){
let data1 = data.streamId;
const _errs5 = errors;
const _errs6 = errors;
if(errors === _errs6){
if(typeof data1 === "string"){
if(func1(data1) > 68){
validate158.errors = [{instancePath:instancePath+"/streamId",schemaPath:"#/$defs/streamId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern148.test(data1)){
validate158.errors = [{instancePath:instancePath+"/streamId",schemaPath:"#/$defs/streamId/pattern",keyword:"pattern",params:{pattern: "^str_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^str_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate158.errors = [{instancePath:instancePath+"/streamId",schemaPath:"#/$defs/streamId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.status !== undefined){
const _errs8 = errors;
if("running" !== data.status){
validate158.errors = [{instancePath:instancePath+"/status",schemaPath:"#/properties/status/const",keyword:"const",params:{allowedValue: "running"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.startedAt !== undefined){
let data3 = data.startedAt;
const _errs9 = errors;
const _errs10 = errors;
if(errors === _errs10){
if(typeof data3 === "string"){
if(func1(data3) > 30){
validate158.errors = [{instancePath:instancePath+"/startedAt",schemaPath:"#/$defs/timestamp/maxLength",keyword:"maxLength",params:{limit: 30},message:"must NOT have more than 30 characters"}];
return false;
}
else {
if(!pattern15.test(data3)){
validate158.errors = [{instancePath:instancePath+"/startedAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"},message:"must match pattern \""+"^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"+"\""}];
return false;
}
}
}
else {
validate158.errors = [{instancePath:instancePath+"/startedAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
else {
validate158.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate158.errors = vErrors;
return errors === 0;
}
validate158.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema344 = {"type":"object","additionalProperties":false,"required":["threadId","streamId","status","cancelledAt"],"properties":{"threadId":{"$ref":"#/$defs/threadId"},"streamId":{"$ref":"#/$defs/streamId"},"status":{"const":"cancelled"},"cancelledAt":{"$ref":"#/$defs/timestamp"}}};

function validate160(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate160.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((data.threadId === undefined) && (missing0 = "threadId")) || ((data.streamId === undefined) && (missing0 = "streamId"))) || ((data.status === undefined) && (missing0 = "status"))) || ((data.cancelledAt === undefined) && (missing0 = "cancelledAt"))){
validate160.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "threadId") || (key0 === "streamId")) || (key0 === "status")) || (key0 === "cancelledAt"))){
validate160.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.threadId !== undefined){
let data0 = data.threadId;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 68){
validate160.errors = [{instancePath:instancePath+"/threadId",schemaPath:"#/$defs/threadId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern130.test(data0)){
validate160.errors = [{instancePath:instancePath+"/threadId",schemaPath:"#/$defs/threadId/pattern",keyword:"pattern",params:{pattern: "^thr_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^thr_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate160.errors = [{instancePath:instancePath+"/threadId",schemaPath:"#/$defs/threadId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.streamId !== undefined){
let data1 = data.streamId;
const _errs5 = errors;
const _errs6 = errors;
if(errors === _errs6){
if(typeof data1 === "string"){
if(func1(data1) > 68){
validate160.errors = [{instancePath:instancePath+"/streamId",schemaPath:"#/$defs/streamId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern148.test(data1)){
validate160.errors = [{instancePath:instancePath+"/streamId",schemaPath:"#/$defs/streamId/pattern",keyword:"pattern",params:{pattern: "^str_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^str_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate160.errors = [{instancePath:instancePath+"/streamId",schemaPath:"#/$defs/streamId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.status !== undefined){
const _errs8 = errors;
if("cancelled" !== data.status){
validate160.errors = [{instancePath:instancePath+"/status",schemaPath:"#/properties/status/const",keyword:"const",params:{allowedValue: "cancelled"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.cancelledAt !== undefined){
let data3 = data.cancelledAt;
const _errs9 = errors;
const _errs10 = errors;
if(errors === _errs10){
if(typeof data3 === "string"){
if(func1(data3) > 30){
validate160.errors = [{instancePath:instancePath+"/cancelledAt",schemaPath:"#/$defs/timestamp/maxLength",keyword:"maxLength",params:{limit: 30},message:"must NOT have more than 30 characters"}];
return false;
}
else {
if(!pattern15.test(data3)){
validate160.errors = [{instancePath:instancePath+"/cancelledAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"},message:"must match pattern \""+"^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"+"\""}];
return false;
}
}
}
else {
validate160.errors = [{instancePath:instancePath+"/cancelledAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
else {
validate160.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate160.errors = vErrors;
return errors === 0;
}
validate160.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema354 = {"oneOf":[{"$ref":"#/$defs/executorStatusResult"},{"$ref":"#/$defs/workspacesReadResult"},{"$ref":"#/$defs/threadsReadResult"},{"$ref":"#/$defs/threadReadResult"},{"$ref":"#/$defs/conversationCreateResult"},{"$ref":"#/$defs/threadSendResult"},{"$ref":"#/$defs/threadRetryResult"},{"$ref":"#/$defs/threadCancelResult"}]};

function validate162(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate162.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
if(!(validate137(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate137.errors : vErrors.concat(validate137.errors);
errors = vErrors.length;
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
var props0 = true;
}
const _errs2 = errors;
if(!(validate139(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate139.errors : vErrors.concat(validate139.errors);
errors = vErrors.length;
}
var _valid0 = _errs2 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
if(props0 !== true){
props0 = true;
}
}
const _errs3 = errors;
if(!(validate143(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate143.errors : vErrors.concat(validate143.errors);
errors = vErrors.length;
}
var _valid0 = _errs3 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 2];
}
else {
if(_valid0){
valid0 = true;
passing0 = 2;
if(props0 !== true){
props0 = true;
}
}
const _errs4 = errors;
if(!(validate147(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate147.errors : vErrors.concat(validate147.errors);
errors = vErrors.length;
}
var _valid0 = _errs4 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 3];
}
else {
if(_valid0){
valid0 = true;
passing0 = 3;
if(props0 !== true){
props0 = true;
}
}
const _errs5 = errors;
if(!(validate152(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate152.errors : vErrors.concat(validate152.errors);
errors = vErrors.length;
}
var _valid0 = _errs5 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 4];
}
else {
if(_valid0){
valid0 = true;
passing0 = 4;
if(props0 !== true){
props0 = true;
}
}
const _errs6 = errors;
if(!(validate155(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate155.errors : vErrors.concat(validate155.errors);
errors = vErrors.length;
}
var _valid0 = _errs6 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 5];
}
else {
if(_valid0){
valid0 = true;
passing0 = 5;
if(props0 !== true){
props0 = true;
}
}
const _errs7 = errors;
if(!(validate158(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate158.errors : vErrors.concat(validate158.errors);
errors = vErrors.length;
}
var _valid0 = _errs7 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 6];
}
else {
if(_valid0){
valid0 = true;
passing0 = 6;
if(props0 !== true){
props0 = true;
}
}
const _errs8 = errors;
if(!(validate160(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate160.errors : vErrors.concat(validate160.errors);
errors = vErrors.length;
}
var _valid0 = _errs8 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 7];
}
else {
if(_valid0){
valid0 = true;
passing0 = 7;
if(props0 !== true){
props0 = true;
}
}
}
}
}
}
}
}
}
if(!valid0){
const err0 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
validate162.errors = vErrors;
return false;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate162.errors = vErrors;
evaluated0.props = props0;
return errors === 0;
}
validate162.evaluated = {"dynamicProps":true,"dynamicItems":false};


function validate136(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate136.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs1 = errors;
const _errs2 = errors;
let valid1 = true;
const _errs3 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.operation === undefined) && (missing0 = "operation")){
const err0 = {};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
if(data.operation !== undefined){
if("executor.status.read" !== data.operation){
const err1 = {};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
}
var _valid0 = _errs3 === errors;
errors = _errs2;
if(vErrors !== null){
if(_errs2){
vErrors.length = _errs2;
}
else {
vErrors = null;
}
}
if(_valid0){
const _errs5 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.result !== undefined){
if(!(validate137(data.result, {instancePath:instancePath+"/result",parentData:data,parentDataProperty:"result",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate137.errors : vErrors.concat(validate137.errors);
errors = vErrors.length;
}
}
}
var _valid0 = _errs5 === errors;
valid1 = _valid0;
if(valid1){
var props0 = {};
props0.result = true;
props0.operation = true;
}
}
if(!valid1){
const err2 = {instancePath,schemaPath:"#/allOf/0/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
validate136.errors = vErrors;
return false;
}
var valid0 = _errs1 === errors;
if(valid0){
const _errs7 = errors;
const _errs8 = errors;
let valid4 = true;
const _errs9 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing1;
if((data.operation === undefined) && (missing1 = "operation")){
const err3 = {};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
else {
if(data.operation !== undefined){
if("workspaces.read" !== data.operation){
const err4 = {};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
}
}
var _valid1 = _errs9 === errors;
errors = _errs8;
if(vErrors !== null){
if(_errs8){
vErrors.length = _errs8;
}
else {
vErrors = null;
}
}
if(_valid1){
const _errs11 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.result !== undefined){
if(!(validate139(data.result, {instancePath:instancePath+"/result",parentData:data,parentDataProperty:"result",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate139.errors : vErrors.concat(validate139.errors);
errors = vErrors.length;
}
}
}
var _valid1 = _errs11 === errors;
valid4 = _valid1;
if(valid4){
var props1 = {};
props1.result = true;
props1.operation = true;
}
}
if(!valid4){
const err5 = {instancePath,schemaPath:"#/allOf/1/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
validate136.errors = vErrors;
return false;
}
var valid0 = _errs7 === errors;
if(valid0){
if(props0 !== true && props1 !== undefined){
if(props1 === true){
props0 = true;
}
else {
props0 = props0 || {};
Object.assign(props0, props1);
}
}
const _errs13 = errors;
const _errs14 = errors;
let valid7 = true;
const _errs15 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing2;
if((data.operation === undefined) && (missing2 = "operation")){
const err6 = {};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
else {
if(data.operation !== undefined){
if("threads.read" !== data.operation){
const err7 = {};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
}
}
var _valid2 = _errs15 === errors;
errors = _errs14;
if(vErrors !== null){
if(_errs14){
vErrors.length = _errs14;
}
else {
vErrors = null;
}
}
if(_valid2){
const _errs17 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.result !== undefined){
if(!(validate143(data.result, {instancePath:instancePath+"/result",parentData:data,parentDataProperty:"result",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate143.errors : vErrors.concat(validate143.errors);
errors = vErrors.length;
}
}
}
var _valid2 = _errs17 === errors;
valid7 = _valid2;
if(valid7){
var props2 = {};
props2.result = true;
props2.operation = true;
}
}
if(!valid7){
const err8 = {instancePath,schemaPath:"#/allOf/2/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
validate136.errors = vErrors;
return false;
}
var valid0 = _errs13 === errors;
if(valid0){
if(props0 !== true && props2 !== undefined){
if(props2 === true){
props0 = true;
}
else {
props0 = props0 || {};
Object.assign(props0, props2);
}
}
const _errs19 = errors;
const _errs20 = errors;
let valid10 = true;
const _errs21 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing3;
if((data.operation === undefined) && (missing3 = "operation")){
const err9 = {};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
else {
if(data.operation !== undefined){
if("thread.read" !== data.operation){
const err10 = {};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
}
}
var _valid3 = _errs21 === errors;
errors = _errs20;
if(vErrors !== null){
if(_errs20){
vErrors.length = _errs20;
}
else {
vErrors = null;
}
}
if(_valid3){
const _errs23 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.result !== undefined){
if(!(validate147(data.result, {instancePath:instancePath+"/result",parentData:data,parentDataProperty:"result",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate147.errors : vErrors.concat(validate147.errors);
errors = vErrors.length;
}
}
}
var _valid3 = _errs23 === errors;
valid10 = _valid3;
if(valid10){
var props3 = {};
props3.result = true;
props3.operation = true;
}
}
if(!valid10){
const err11 = {instancePath,schemaPath:"#/allOf/3/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
validate136.errors = vErrors;
return false;
}
var valid0 = _errs19 === errors;
if(valid0){
if(props0 !== true && props3 !== undefined){
if(props3 === true){
props0 = true;
}
else {
props0 = props0 || {};
Object.assign(props0, props3);
}
}
const _errs25 = errors;
const _errs26 = errors;
let valid13 = true;
const _errs27 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing4;
if((data.operation === undefined) && (missing4 = "operation")){
const err12 = {};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
else {
if(data.operation !== undefined){
if("conversation.create" !== data.operation){
const err13 = {};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
}
}
var _valid4 = _errs27 === errors;
errors = _errs26;
if(vErrors !== null){
if(_errs26){
vErrors.length = _errs26;
}
else {
vErrors = null;
}
}
if(_valid4){
const _errs29 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.result !== undefined){
if(!(validate152(data.result, {instancePath:instancePath+"/result",parentData:data,parentDataProperty:"result",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate152.errors : vErrors.concat(validate152.errors);
errors = vErrors.length;
}
}
}
var _valid4 = _errs29 === errors;
valid13 = _valid4;
if(valid13){
var props4 = {};
props4.result = true;
props4.operation = true;
}
}
if(!valid13){
const err14 = {instancePath,schemaPath:"#/allOf/4/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
validate136.errors = vErrors;
return false;
}
var valid0 = _errs25 === errors;
if(valid0){
if(props0 !== true && props4 !== undefined){
if(props4 === true){
props0 = true;
}
else {
props0 = props0 || {};
Object.assign(props0, props4);
}
}
const _errs31 = errors;
const _errs32 = errors;
let valid16 = true;
const _errs33 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing5;
if((data.operation === undefined) && (missing5 = "operation")){
const err15 = {};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
else {
if(data.operation !== undefined){
if("thread.send" !== data.operation){
const err16 = {};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
}
}
var _valid5 = _errs33 === errors;
errors = _errs32;
if(vErrors !== null){
if(_errs32){
vErrors.length = _errs32;
}
else {
vErrors = null;
}
}
if(_valid5){
const _errs35 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.result !== undefined){
if(!(validate155(data.result, {instancePath:instancePath+"/result",parentData:data,parentDataProperty:"result",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate155.errors : vErrors.concat(validate155.errors);
errors = vErrors.length;
}
}
}
var _valid5 = _errs35 === errors;
valid16 = _valid5;
if(valid16){
var props5 = {};
props5.result = true;
props5.operation = true;
}
}
if(!valid16){
const err17 = {instancePath,schemaPath:"#/allOf/5/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
validate136.errors = vErrors;
return false;
}
var valid0 = _errs31 === errors;
if(valid0){
if(props0 !== true && props5 !== undefined){
if(props5 === true){
props0 = true;
}
else {
props0 = props0 || {};
Object.assign(props0, props5);
}
}
const _errs37 = errors;
const _errs38 = errors;
let valid19 = true;
const _errs39 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing6;
if((data.operation === undefined) && (missing6 = "operation")){
const err18 = {};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
else {
if(data.operation !== undefined){
if("thread.retry" !== data.operation){
const err19 = {};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
}
}
var _valid6 = _errs39 === errors;
errors = _errs38;
if(vErrors !== null){
if(_errs38){
vErrors.length = _errs38;
}
else {
vErrors = null;
}
}
if(_valid6){
const _errs41 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.result !== undefined){
if(!(validate158(data.result, {instancePath:instancePath+"/result",parentData:data,parentDataProperty:"result",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate158.errors : vErrors.concat(validate158.errors);
errors = vErrors.length;
}
}
}
var _valid6 = _errs41 === errors;
valid19 = _valid6;
if(valid19){
var props6 = {};
props6.result = true;
props6.operation = true;
}
}
if(!valid19){
const err20 = {instancePath,schemaPath:"#/allOf/6/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
validate136.errors = vErrors;
return false;
}
var valid0 = _errs37 === errors;
if(valid0){
if(props0 !== true && props6 !== undefined){
if(props6 === true){
props0 = true;
}
else {
props0 = props0 || {};
Object.assign(props0, props6);
}
}
const _errs43 = errors;
const _errs44 = errors;
let valid22 = true;
const _errs45 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing7;
if((data.operation === undefined) && (missing7 = "operation")){
const err21 = {};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
else {
if(data.operation !== undefined){
if("thread.cancel" !== data.operation){
const err22 = {};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
}
}
}
var _valid7 = _errs45 === errors;
errors = _errs44;
if(vErrors !== null){
if(_errs44){
vErrors.length = _errs44;
}
else {
vErrors = null;
}
}
if(_valid7){
const _errs47 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.result !== undefined){
if(!(validate160(data.result, {instancePath:instancePath+"/result",parentData:data,parentDataProperty:"result",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate160.errors : vErrors.concat(validate160.errors);
errors = vErrors.length;
}
}
}
var _valid7 = _errs47 === errors;
valid22 = _valid7;
if(valid22){
var props7 = {};
props7.result = true;
props7.operation = true;
}
}
if(!valid22){
const err23 = {instancePath,schemaPath:"#/allOf/7/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
validate136.errors = vErrors;
return false;
}
var valid0 = _errs43 === errors;
if(valid0){
if(props0 !== true && props7 !== undefined){
if(props7 === true){
props0 = true;
}
else {
props0 = props0 || {};
Object.assign(props0, props7);
}
}
}
}
}
}
}
}
}
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing8;
if((((((((((data.kind === undefined) && (missing8 = "kind")) || ((data.protocolVersion === undefined) && (missing8 = "protocolVersion"))) || ((data.commandId === undefined) && (missing8 = "commandId"))) || ((data.correlationId === undefined) && (missing8 = "correlationId"))) || ((data.executorId === undefined) && (missing8 = "executorId"))) || ((data.actorRole === undefined) && (missing8 = "actorRole"))) || ((data.operation === undefined) && (missing8 = "operation"))) || ((data.completedAt === undefined) && (missing8 = "completedAt"))) || ((data.result === undefined) && (missing8 = "result"))){
validate136.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing8},message:"must have required property '"+missing8+"'"}];
return false;
}
else {
const _errs49 = errors;
for(const key0 in data){
if(!(func32.call(schema299.properties, key0))){
validate136.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs49 === errors){
if(data.kind !== undefined){
const _errs50 = errors;
if("command.result" !== data.kind){
validate136.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "command.result"},message:"must be equal to constant"}];
return false;
}
var valid25 = _errs50 === errors;
}
else {
var valid25 = true;
}
if(valid25){
if(data.protocolVersion !== undefined){
let data17 = data.protocolVersion;
const _errs51 = errors;
if(typeof data17 !== "string"){
validate136.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data17){
validate136.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid25 = _errs51 === errors;
}
else {
var valid25 = true;
}
if(valid25){
if(data.commandId !== undefined){
let data18 = data.commandId;
const _errs54 = errors;
const _errs55 = errors;
if(errors === _errs55){
if(typeof data18 === "string"){
if(func1(data18) > 68){
validate136.errors = [{instancePath:instancePath+"/commandId",schemaPath:"#/$defs/commandId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern153.test(data18)){
validate136.errors = [{instancePath:instancePath+"/commandId",schemaPath:"#/$defs/commandId/pattern",keyword:"pattern",params:{pattern: "^cmd_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cmd_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate136.errors = [{instancePath:instancePath+"/commandId",schemaPath:"#/$defs/commandId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid25 = _errs54 === errors;
}
else {
var valid25 = true;
}
if(valid25){
if(data.correlationId !== undefined){
let data19 = data.correlationId;
const _errs57 = errors;
const _errs58 = errors;
if(errors === _errs58){
if(typeof data19 === "string"){
if(func1(data19) > 68){
validate136.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data19)){
validate136.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate136.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid25 = _errs57 === errors;
}
else {
var valid25 = true;
}
if(valid25){
if(data.executorId !== undefined){
let data20 = data.executorId;
const _errs60 = errors;
const _errs61 = errors;
if(errors === _errs61){
if(typeof data20 === "string"){
if(func1(data20) > 68){
validate136.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern37.test(data20)){
validate136.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/pattern",keyword:"pattern",params:{pattern: "^exe_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^exe_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate136.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid25 = _errs60 === errors;
}
else {
var valid25 = true;
}
if(valid25){
if(data.actorRole !== undefined){
const _errs63 = errors;
if("executor_device" !== data.actorRole){
validate136.errors = [{instancePath:instancePath+"/actorRole",schemaPath:"#/properties/actorRole/const",keyword:"const",params:{allowedValue: "executor_device"},message:"must be equal to constant"}];
return false;
}
var valid25 = _errs63 === errors;
}
else {
var valid25 = true;
}
if(valid25){
if(data.operation !== undefined){
let data22 = data.operation;
const _errs64 = errors;
if(typeof data22 !== "string"){
validate136.errors = [{instancePath:instancePath+"/operation",schemaPath:"#/$defs/commandResultOperation/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((((((data22 === "executor.status.read") || (data22 === "workspaces.read")) || (data22 === "threads.read")) || (data22 === "thread.read")) || (data22 === "conversation.create")) || (data22 === "thread.send")) || (data22 === "thread.retry")) || (data22 === "thread.cancel"))){
validate136.errors = [{instancePath:instancePath+"/operation",schemaPath:"#/$defs/commandResultOperation/enum",keyword:"enum",params:{allowedValues: schema352.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid25 = _errs64 === errors;
}
else {
var valid25 = true;
}
if(valid25){
if(data.completedAt !== undefined){
let data23 = data.completedAt;
const _errs67 = errors;
const _errs68 = errors;
if(errors === _errs68){
if(typeof data23 === "string"){
if(func1(data23) > 30){
validate136.errors = [{instancePath:instancePath+"/completedAt",schemaPath:"#/$defs/timestamp/maxLength",keyword:"maxLength",params:{limit: 30},message:"must NOT have more than 30 characters"}];
return false;
}
else {
if(!pattern15.test(data23)){
validate136.errors = [{instancePath:instancePath+"/completedAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"},message:"must match pattern \""+"^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"+"\""}];
return false;
}
}
}
else {
validate136.errors = [{instancePath:instancePath+"/completedAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid25 = _errs67 === errors;
}
else {
var valid25 = true;
}
if(valid25){
if(data.result !== undefined){
const _errs70 = errors;
if(!(validate162(data.result, {instancePath:instancePath+"/result",parentData:data,parentDataProperty:"result",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate162.errors : vErrors.concat(validate162.errors);
errors = vErrors.length;
}
var valid25 = _errs70 === errors;
}
else {
var valid25 = true;
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate136.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate136.errors = vErrors;
return errors === 0;
}
validate136.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema355 = {"oneOf":[{"$ref":"#/$defs/ownerSseDesktopEvent"},{"$ref":"#/$defs/ownerSseBrowserEvent"}]};
const schema356 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","deviceId","actorRole","event"],"properties":{"kind":{"const":"owner.sse.event"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"deviceId":{"$ref":"#/$defs/deviceId"},"actorRole":{"const":"desktop_device"},"event":{"$ref":"#/$defs/ownerSseDesktopPayload"}}};
const schema359 = {"oneOf":[{"$ref":"#/$defs/executorPresenceEvent"},{"$ref":"#/$defs/commandResult"},{"$ref":"#/$defs/executorEventFrame"},{"$ref":"#/$defs/replayResult"},{"$ref":"#/$defs/replayGap"},{"$ref":"#/$defs/errorEnvelope"}]};
const schema360 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","executorId","status","reason","observedAt"],"properties":{"kind":{"const":"executor.presence"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"executorId":{"$ref":"#/$defs/executorId"},"status":{"type":"string","enum":["unknown","online","stale","offline"]},"reason":{"type":"string","pattern":"^[A-Za-z0-9][A-Za-z0-9 ._(),:;'-]{0,159}$","maxLength":160},"observedAt":{"$ref":"#/$defs/timestamp"}}};

function validate176(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate176.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.executorId === undefined) && (missing0 = "executorId"))) || ((data.status === undefined) && (missing0 = "status"))) || ((data.reason === undefined) && (missing0 = "reason"))) || ((data.observedAt === undefined) && (missing0 = "observedAt"))){
validate176.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "executorId")) || (key0 === "status")) || (key0 === "reason")) || (key0 === "observedAt"))){
validate176.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("executor.presence" !== data.kind){
validate176.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "executor.presence"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate176.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate176.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.executorId !== undefined){
let data2 = data.executorId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate176.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern37.test(data2)){
validate176.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/pattern",keyword:"pattern",params:{pattern: "^exe_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^exe_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate176.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.status !== undefined){
let data3 = data.status;
const _errs9 = errors;
if(typeof data3 !== "string"){
validate176.errors = [{instancePath:instancePath+"/status",schemaPath:"#/properties/status/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((data3 === "unknown") || (data3 === "online")) || (data3 === "stale")) || (data3 === "offline"))){
validate176.errors = [{instancePath:instancePath+"/status",schemaPath:"#/properties/status/enum",keyword:"enum",params:{allowedValues: schema360.properties.status.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.reason !== undefined){
let data4 = data.reason;
const _errs11 = errors;
if(errors === _errs11){
if(typeof data4 === "string"){
if(func1(data4) > 160){
validate176.errors = [{instancePath:instancePath+"/reason",schemaPath:"#/properties/reason/maxLength",keyword:"maxLength",params:{limit: 160},message:"must NOT have more than 160 characters"}];
return false;
}
else {
if(!pattern133.test(data4)){
validate176.errors = [{instancePath:instancePath+"/reason",schemaPath:"#/properties/reason/pattern",keyword:"pattern",params:{pattern: "^[A-Za-z0-9][A-Za-z0-9 ._(),:;'-]{0,159}$"},message:"must match pattern \""+"^[A-Za-z0-9][A-Za-z0-9 ._(),:;'-]{0,159}$"+"\""}];
return false;
}
}
}
else {
validate176.errors = [{instancePath:instancePath+"/reason",schemaPath:"#/properties/reason/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.observedAt !== undefined){
let data5 = data.observedAt;
const _errs13 = errors;
const _errs14 = errors;
if(errors === _errs14){
if(typeof data5 === "string"){
if(func1(data5) > 30){
validate176.errors = [{instancePath:instancePath+"/observedAt",schemaPath:"#/$defs/timestamp/maxLength",keyword:"maxLength",params:{limit: 30},message:"must NOT have more than 30 characters"}];
return false;
}
else {
if(!pattern15.test(data5)){
validate176.errors = [{instancePath:instancePath+"/observedAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"},message:"must match pattern \""+"^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"+"\""}];
return false;
}
}
}
else {
validate176.errors = [{instancePath:instancePath+"/observedAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
else {
validate176.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate176.errors = vErrors;
return errors === 0;
}
validate176.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema364 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","eventId","correlationId","executorId","threadId","sequence","occurredAt","data"],"properties":{"kind":{"const":"executor.event"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"eventId":{"$ref":"#/$defs/eventId"},"correlationId":{"$ref":"#/$defs/correlationId"},"executorId":{"$ref":"#/$defs/executorId"},"threadId":{"$ref":"#/$defs/threadId"},"sequence":{"$ref":"#/$defs/sequence"},"occurredAt":{"$ref":"#/$defs/timestamp"},"data":{"$ref":"#/$defs/eventData"}}};
const schema366 = {"type":"string","pattern":"^evt_[A-Za-z0-9]{8,64}$","maxLength":68};
const schema372 = {"type":"object","additionalProperties":false,"required":["eventType","text"],"properties":{"eventType":{"enum":["thread.message","thread.status","command.completed","command.failed"]},"text":{"type":"string","maxLength":20000}}};
const pattern202 = new RegExp("^evt_[A-Za-z0-9]{8,64}$", "u");

function validate179(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate179.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.eventId === undefined) && (missing0 = "eventId"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))) || ((data.executorId === undefined) && (missing0 = "executorId"))) || ((data.threadId === undefined) && (missing0 = "threadId"))) || ((data.sequence === undefined) && (missing0 = "sequence"))) || ((data.occurredAt === undefined) && (missing0 = "occurredAt"))) || ((data.data === undefined) && (missing0 = "data"))){
validate179.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(func32.call(schema364.properties, key0))){
validate179.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("executor.event" !== data.kind){
validate179.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "executor.event"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate179.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate179.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.eventId !== undefined){
let data2 = data.eventId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate179.errors = [{instancePath:instancePath+"/eventId",schemaPath:"#/$defs/eventId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern202.test(data2)){
validate179.errors = [{instancePath:instancePath+"/eventId",schemaPath:"#/$defs/eventId/pattern",keyword:"pattern",params:{pattern: "^evt_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^evt_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate179.errors = [{instancePath:instancePath+"/eventId",schemaPath:"#/$defs/eventId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data3 = data.correlationId;
const _errs9 = errors;
const _errs10 = errors;
if(errors === _errs10){
if(typeof data3 === "string"){
if(func1(data3) > 68){
validate179.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data3)){
validate179.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate179.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.executorId !== undefined){
let data4 = data.executorId;
const _errs12 = errors;
const _errs13 = errors;
if(errors === _errs13){
if(typeof data4 === "string"){
if(func1(data4) > 68){
validate179.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern37.test(data4)){
validate179.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/pattern",keyword:"pattern",params:{pattern: "^exe_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^exe_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate179.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.threadId !== undefined){
let data5 = data.threadId;
const _errs15 = errors;
const _errs16 = errors;
if(errors === _errs16){
if(typeof data5 === "string"){
if(func1(data5) > 68){
validate179.errors = [{instancePath:instancePath+"/threadId",schemaPath:"#/$defs/threadId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern130.test(data5)){
validate179.errors = [{instancePath:instancePath+"/threadId",schemaPath:"#/$defs/threadId/pattern",keyword:"pattern",params:{pattern: "^thr_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^thr_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate179.errors = [{instancePath:instancePath+"/threadId",schemaPath:"#/$defs/threadId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sequence !== undefined){
let data6 = data.sequence;
const _errs18 = errors;
const _errs19 = errors;
if(!(((typeof data6 == "number") && (!(data6 % 1) && !isNaN(data6))) && (isFinite(data6)))){
validate179.errors = [{instancePath:instancePath+"/sequence",schemaPath:"#/$defs/sequence/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs19){
if((typeof data6 == "number") && (isFinite(data6))){
if(data6 > 9007199254740991 || isNaN(data6)){
validate179.errors = [{instancePath:instancePath+"/sequence",schemaPath:"#/$defs/sequence/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data6 < 1 || isNaN(data6)){
validate179.errors = [{instancePath:instancePath+"/sequence",schemaPath:"#/$defs/sequence/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"}];
return false;
}
}
}
}
var valid0 = _errs18 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.occurredAt !== undefined){
let data7 = data.occurredAt;
const _errs21 = errors;
const _errs22 = errors;
if(errors === _errs22){
if(typeof data7 === "string"){
if(func1(data7) > 30){
validate179.errors = [{instancePath:instancePath+"/occurredAt",schemaPath:"#/$defs/timestamp/maxLength",keyword:"maxLength",params:{limit: 30},message:"must NOT have more than 30 characters"}];
return false;
}
else {
if(!pattern15.test(data7)){
validate179.errors = [{instancePath:instancePath+"/occurredAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"},message:"must match pattern \""+"^(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$"+"\""}];
return false;
}
}
}
else {
validate179.errors = [{instancePath:instancePath+"/occurredAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs21 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.data !== undefined){
let data8 = data.data;
const _errs24 = errors;
const _errs25 = errors;
if(errors === _errs25){
if(data8 && typeof data8 == "object" && !Array.isArray(data8)){
let missing1;
if(((data8.eventType === undefined) && (missing1 = "eventType")) || ((data8.text === undefined) && (missing1 = "text"))){
validate179.errors = [{instancePath:instancePath+"/data",schemaPath:"#/$defs/eventData/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
const _errs27 = errors;
for(const key1 in data8){
if(!((key1 === "eventType") || (key1 === "text"))){
validate179.errors = [{instancePath:instancePath+"/data",schemaPath:"#/$defs/eventData/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs27 === errors){
if(data8.eventType !== undefined){
let data9 = data8.eventType;
const _errs28 = errors;
if(!((((data9 === "thread.message") || (data9 === "thread.status")) || (data9 === "command.completed")) || (data9 === "command.failed"))){
validate179.errors = [{instancePath:instancePath+"/data/eventType",schemaPath:"#/$defs/eventData/properties/eventType/enum",keyword:"enum",params:{allowedValues: schema372.properties.eventType.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid9 = _errs28 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data8.text !== undefined){
let data10 = data8.text;
const _errs29 = errors;
if(errors === _errs29){
if(typeof data10 === "string"){
if(func1(data10) > 20000){
validate179.errors = [{instancePath:instancePath+"/data/text",schemaPath:"#/$defs/eventData/properties/text/maxLength",keyword:"maxLength",params:{limit: 20000},message:"must NOT have more than 20000 characters"}];
return false;
}
}
else {
validate179.errors = [{instancePath:instancePath+"/data/text",schemaPath:"#/$defs/eventData/properties/text/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid9 = _errs29 === errors;
}
else {
var valid9 = true;
}
}
}
}
}
else {
validate179.errors = [{instancePath:instancePath+"/data",schemaPath:"#/$defs/eventData/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs24 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate179.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate179.errors = vErrors;
return errors === 0;
}
validate179.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema373 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","executorId","threadId","afterSequence","highWaterSequence","events","hasMore","correlationId"],"properties":{"kind":{"const":"events.replay.result"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"executorId":{"$ref":"#/$defs/executorId"},"threadId":{"$ref":"#/$defs/threadId"},"afterSequence":{"type":"integer","minimum":0,"maximum":9007199254740990},"highWaterSequence":{"type":"integer","minimum":0,"maximum":9007199254740991},"events":{"type":"array","maxItems":200,"items":{"$ref":"#/$defs/executorEventFrame"}},"hasMore":{"type":"boolean"},"correlationId":{"$ref":"#/$defs/correlationId"}}};

function validate181(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate181.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.executorId === undefined) && (missing0 = "executorId"))) || ((data.threadId === undefined) && (missing0 = "threadId"))) || ((data.afterSequence === undefined) && (missing0 = "afterSequence"))) || ((data.highWaterSequence === undefined) && (missing0 = "highWaterSequence"))) || ((data.events === undefined) && (missing0 = "events"))) || ((data.hasMore === undefined) && (missing0 = "hasMore"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate181.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(func32.call(schema373.properties, key0))){
validate181.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("events.replay.result" !== data.kind){
validate181.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "events.replay.result"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate181.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate181.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.executorId !== undefined){
let data2 = data.executorId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate181.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern37.test(data2)){
validate181.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/pattern",keyword:"pattern",params:{pattern: "^exe_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^exe_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate181.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.threadId !== undefined){
let data3 = data.threadId;
const _errs9 = errors;
const _errs10 = errors;
if(errors === _errs10){
if(typeof data3 === "string"){
if(func1(data3) > 68){
validate181.errors = [{instancePath:instancePath+"/threadId",schemaPath:"#/$defs/threadId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern130.test(data3)){
validate181.errors = [{instancePath:instancePath+"/threadId",schemaPath:"#/$defs/threadId/pattern",keyword:"pattern",params:{pattern: "^thr_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^thr_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate181.errors = [{instancePath:instancePath+"/threadId",schemaPath:"#/$defs/threadId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.afterSequence !== undefined){
let data4 = data.afterSequence;
const _errs12 = errors;
if(!(((typeof data4 == "number") && (!(data4 % 1) && !isNaN(data4))) && (isFinite(data4)))){
validate181.errors = [{instancePath:instancePath+"/afterSequence",schemaPath:"#/properties/afterSequence/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs12){
if((typeof data4 == "number") && (isFinite(data4))){
if(data4 > 9007199254740990 || isNaN(data4)){
validate181.errors = [{instancePath:instancePath+"/afterSequence",schemaPath:"#/properties/afterSequence/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740990},message:"must be <= 9007199254740990"}];
return false;
}
else {
if(data4 < 0 || isNaN(data4)){
validate181.errors = [{instancePath:instancePath+"/afterSequence",schemaPath:"#/properties/afterSequence/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.highWaterSequence !== undefined){
let data5 = data.highWaterSequence;
const _errs14 = errors;
if(!(((typeof data5 == "number") && (!(data5 % 1) && !isNaN(data5))) && (isFinite(data5)))){
validate181.errors = [{instancePath:instancePath+"/highWaterSequence",schemaPath:"#/properties/highWaterSequence/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs14){
if((typeof data5 == "number") && (isFinite(data5))){
if(data5 > 9007199254740991 || isNaN(data5)){
validate181.errors = [{instancePath:instancePath+"/highWaterSequence",schemaPath:"#/properties/highWaterSequence/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data5 < 0 || isNaN(data5)){
validate181.errors = [{instancePath:instancePath+"/highWaterSequence",schemaPath:"#/properties/highWaterSequence/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.events !== undefined){
let data6 = data.events;
const _errs16 = errors;
if(errors === _errs16){
if(Array.isArray(data6)){
if(data6.length > 200){
validate181.errors = [{instancePath:instancePath+"/events",schemaPath:"#/properties/events/maxItems",keyword:"maxItems",params:{limit: 200},message:"must NOT have more than 200 items"}];
return false;
}
else {
var valid4 = true;
const len0 = data6.length;
for(let i0=0; i0<len0; i0++){
const _errs18 = errors;
if(!(validate179(data6[i0], {instancePath:instancePath+"/events/" + i0,parentData:data6,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate179.errors : vErrors.concat(validate179.errors);
errors = vErrors.length;
}
var valid4 = _errs18 === errors;
if(!valid4){
break;
}
}
}
}
else {
validate181.errors = [{instancePath:instancePath+"/events",schemaPath:"#/properties/events/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs16 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.hasMore !== undefined){
const _errs19 = errors;
if(typeof data.hasMore !== "boolean"){
validate181.errors = [{instancePath:instancePath+"/hasMore",schemaPath:"#/properties/hasMore/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs19 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data9 = data.correlationId;
const _errs21 = errors;
const _errs22 = errors;
if(errors === _errs22){
if(typeof data9 === "string"){
if(func1(data9) > 68){
validate181.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data9)){
validate181.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate181.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs21 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate181.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate181.errors = vErrors;
return errors === 0;
}
validate181.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema378 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","executorId","threadId","afterSequence","earliestAvailableSequence","highWaterSequence","code","correlationId"],"properties":{"kind":{"const":"events.replay.gap"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"executorId":{"$ref":"#/$defs/executorId"},"threadId":{"$ref":"#/$defs/threadId"},"afterSequence":{"type":"integer","minimum":0,"maximum":9007199254740990},"earliestAvailableSequence":{"$ref":"#/$defs/sequence"},"highWaterSequence":{"$ref":"#/$defs/sequence"},"code":{"const":"replay-gap"},"correlationId":{"$ref":"#/$defs/correlationId"}}};

function validate184(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate184.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.executorId === undefined) && (missing0 = "executorId"))) || ((data.threadId === undefined) && (missing0 = "threadId"))) || ((data.afterSequence === undefined) && (missing0 = "afterSequence"))) || ((data.earliestAvailableSequence === undefined) && (missing0 = "earliestAvailableSequence"))) || ((data.highWaterSequence === undefined) && (missing0 = "highWaterSequence"))) || ((data.code === undefined) && (missing0 = "code"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate184.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(func32.call(schema378.properties, key0))){
validate184.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("events.replay.gap" !== data.kind){
validate184.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "events.replay.gap"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate184.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate184.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.executorId !== undefined){
let data2 = data.executorId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate184.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern37.test(data2)){
validate184.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/pattern",keyword:"pattern",params:{pattern: "^exe_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^exe_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate184.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.threadId !== undefined){
let data3 = data.threadId;
const _errs9 = errors;
const _errs10 = errors;
if(errors === _errs10){
if(typeof data3 === "string"){
if(func1(data3) > 68){
validate184.errors = [{instancePath:instancePath+"/threadId",schemaPath:"#/$defs/threadId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern130.test(data3)){
validate184.errors = [{instancePath:instancePath+"/threadId",schemaPath:"#/$defs/threadId/pattern",keyword:"pattern",params:{pattern: "^thr_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^thr_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate184.errors = [{instancePath:instancePath+"/threadId",schemaPath:"#/$defs/threadId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.afterSequence !== undefined){
let data4 = data.afterSequence;
const _errs12 = errors;
if(!(((typeof data4 == "number") && (!(data4 % 1) && !isNaN(data4))) && (isFinite(data4)))){
validate184.errors = [{instancePath:instancePath+"/afterSequence",schemaPath:"#/properties/afterSequence/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs12){
if((typeof data4 == "number") && (isFinite(data4))){
if(data4 > 9007199254740990 || isNaN(data4)){
validate184.errors = [{instancePath:instancePath+"/afterSequence",schemaPath:"#/properties/afterSequence/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740990},message:"must be <= 9007199254740990"}];
return false;
}
else {
if(data4 < 0 || isNaN(data4)){
validate184.errors = [{instancePath:instancePath+"/afterSequence",schemaPath:"#/properties/afterSequence/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.earliestAvailableSequence !== undefined){
let data5 = data.earliestAvailableSequence;
const _errs14 = errors;
const _errs15 = errors;
if(!(((typeof data5 == "number") && (!(data5 % 1) && !isNaN(data5))) && (isFinite(data5)))){
validate184.errors = [{instancePath:instancePath+"/earliestAvailableSequence",schemaPath:"#/$defs/sequence/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs15){
if((typeof data5 == "number") && (isFinite(data5))){
if(data5 > 9007199254740991 || isNaN(data5)){
validate184.errors = [{instancePath:instancePath+"/earliestAvailableSequence",schemaPath:"#/$defs/sequence/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data5 < 1 || isNaN(data5)){
validate184.errors = [{instancePath:instancePath+"/earliestAvailableSequence",schemaPath:"#/$defs/sequence/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"}];
return false;
}
}
}
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.highWaterSequence !== undefined){
let data6 = data.highWaterSequence;
const _errs17 = errors;
const _errs18 = errors;
if(!(((typeof data6 == "number") && (!(data6 % 1) && !isNaN(data6))) && (isFinite(data6)))){
validate184.errors = [{instancePath:instancePath+"/highWaterSequence",schemaPath:"#/$defs/sequence/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs18){
if((typeof data6 == "number") && (isFinite(data6))){
if(data6 > 9007199254740991 || isNaN(data6)){
validate184.errors = [{instancePath:instancePath+"/highWaterSequence",schemaPath:"#/$defs/sequence/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data6 < 1 || isNaN(data6)){
validate184.errors = [{instancePath:instancePath+"/highWaterSequence",schemaPath:"#/$defs/sequence/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"}];
return false;
}
}
}
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.code !== undefined){
const _errs20 = errors;
if("replay-gap" !== data.code){
validate184.errors = [{instancePath:instancePath+"/code",schemaPath:"#/properties/code/const",keyword:"const",params:{allowedValue: "replay-gap"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs20 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data8 = data.correlationId;
const _errs21 = errors;
const _errs22 = errors;
if(errors === _errs22){
if(typeof data8 === "string"){
if(func1(data8) > 68){
validate184.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data8)){
validate184.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate184.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs21 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate184.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate184.errors = vErrors;
return errors === 0;
}
validate184.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema385 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","code","message","retryable","correlationId"],"properties":{"kind":{"const":"error"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"code":{"$ref":"#/$defs/errorCode"},"message":{"type":"string","minLength":1,"maxLength":240},"retryable":{"type":"boolean"},"correlationId":{"$ref":"#/$defs/correlationId"}}};
const schema387 = {"type":"string","enum":["executor-offline","protocol-version-mismatch","unknown-operation","invalid-envelope","idempotency-conflict","replay-gap","revoked","website-deployment-mismatch"]};

function validate186(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate186.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.code === undefined) && (missing0 = "code"))) || ((data.message === undefined) && (missing0 = "message"))) || ((data.retryable === undefined) && (missing0 = "retryable"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate186.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "code")) || (key0 === "message")) || (key0 === "retryable")) || (key0 === "correlationId"))){
validate186.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("error" !== data.kind){
validate186.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "error"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate186.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate186.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.code !== undefined){
let data2 = data.code;
const _errs6 = errors;
if(typeof data2 !== "string"){
validate186.errors = [{instancePath:instancePath+"/code",schemaPath:"#/$defs/errorCode/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((((((data2 === "executor-offline") || (data2 === "protocol-version-mismatch")) || (data2 === "unknown-operation")) || (data2 === "invalid-envelope")) || (data2 === "idempotency-conflict")) || (data2 === "replay-gap")) || (data2 === "revoked")) || (data2 === "website-deployment-mismatch"))){
validate186.errors = [{instancePath:instancePath+"/code",schemaPath:"#/$defs/errorCode/enum",keyword:"enum",params:{allowedValues: schema387.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.message !== undefined){
let data3 = data.message;
const _errs9 = errors;
if(errors === _errs9){
if(typeof data3 === "string"){
if(func1(data3) > 240){
validate186.errors = [{instancePath:instancePath+"/message",schemaPath:"#/properties/message/maxLength",keyword:"maxLength",params:{limit: 240},message:"must NOT have more than 240 characters"}];
return false;
}
else {
if(func1(data3) < 1){
validate186.errors = [{instancePath:instancePath+"/message",schemaPath:"#/properties/message/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate186.errors = [{instancePath:instancePath+"/message",schemaPath:"#/properties/message/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.retryable !== undefined){
const _errs11 = errors;
if(typeof data.retryable !== "boolean"){
validate186.errors = [{instancePath:instancePath+"/retryable",schemaPath:"#/properties/retryable/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data5 = data.correlationId;
const _errs13 = errors;
const _errs14 = errors;
if(errors === _errs14){
if(typeof data5 === "string"){
if(func1(data5) > 68){
validate186.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data5)){
validate186.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate186.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
else {
validate186.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate186.errors = vErrors;
return errors === 0;
}
validate186.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate175(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate175.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
if(!(validate176(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate176.errors : vErrors.concat(validate176.errors);
errors = vErrors.length;
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
var props0 = true;
}
const _errs2 = errors;
if(!(validate136(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate136.errors : vErrors.concat(validate136.errors);
errors = vErrors.length;
}
var _valid0 = _errs2 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
if(props0 !== true){
props0 = true;
}
}
const _errs3 = errors;
if(!(validate179(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate179.errors : vErrors.concat(validate179.errors);
errors = vErrors.length;
}
var _valid0 = _errs3 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 2];
}
else {
if(_valid0){
valid0 = true;
passing0 = 2;
if(props0 !== true){
props0 = true;
}
}
const _errs4 = errors;
if(!(validate181(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate181.errors : vErrors.concat(validate181.errors);
errors = vErrors.length;
}
var _valid0 = _errs4 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 3];
}
else {
if(_valid0){
valid0 = true;
passing0 = 3;
if(props0 !== true){
props0 = true;
}
}
const _errs5 = errors;
if(!(validate184(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate184.errors : vErrors.concat(validate184.errors);
errors = vErrors.length;
}
var _valid0 = _errs5 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 4];
}
else {
if(_valid0){
valid0 = true;
passing0 = 4;
if(props0 !== true){
props0 = true;
}
}
const _errs6 = errors;
if(!(validate186(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate186.errors : vErrors.concat(validate186.errors);
errors = vErrors.length;
}
var _valid0 = _errs6 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 5];
}
else {
if(_valid0){
valid0 = true;
passing0 = 5;
if(props0 !== true){
props0 = true;
}
}
}
}
}
}
}
if(!valid0){
const err0 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
validate175.errors = vErrors;
return false;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate175.errors = vErrors;
evaluated0.props = props0;
return errors === 0;
}
validate175.evaluated = {"dynamicProps":true,"dynamicItems":false};


function validate174(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate174.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.deviceId === undefined) && (missing0 = "deviceId"))) || ((data.actorRole === undefined) && (missing0 = "actorRole"))) || ((data.event === undefined) && (missing0 = "event"))){
validate174.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "deviceId")) || (key0 === "actorRole")) || (key0 === "event"))){
validate174.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("owner.sse.event" !== data.kind){
validate174.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "owner.sse.event"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate174.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate174.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.deviceId !== undefined){
let data2 = data.deviceId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate174.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern38.test(data2)){
validate174.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/pattern",keyword:"pattern",params:{pattern: "^dev_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^dev_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate174.errors = [{instancePath:instancePath+"/deviceId",schemaPath:"#/$defs/deviceId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.actorRole !== undefined){
const _errs9 = errors;
if("desktop_device" !== data.actorRole){
validate174.errors = [{instancePath:instancePath+"/actorRole",schemaPath:"#/properties/actorRole/const",keyword:"const",params:{allowedValue: "desktop_device"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.event !== undefined){
const _errs10 = errors;
if(!(validate175(data.event, {instancePath:instancePath+"/event",parentData:data,parentDataProperty:"event",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate175.errors : vErrors.concat(validate175.errors);
errors = vErrors.length;
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
else {
validate174.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate174.errors = vErrors;
return errors === 0;
}
validate174.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema389 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","sessionId","actorRole","event"],"properties":{"kind":{"const":"owner.sse.event"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"sessionId":{"$ref":"#/$defs/sessionId"},"actorRole":{"const":"browser_session"},"event":{"$ref":"#/$defs/executorPresenceEvent"}}};

function validate190(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate190.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.sessionId === undefined) && (missing0 = "sessionId"))) || ((data.actorRole === undefined) && (missing0 = "actorRole"))) || ((data.event === undefined) && (missing0 = "event"))){
validate190.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "sessionId")) || (key0 === "actorRole")) || (key0 === "event"))){
validate190.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("owner.sse.event" !== data.kind){
validate190.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "owner.sse.event"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate190.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate190.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sessionId !== undefined){
let data2 = data.sessionId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate190.errors = [{instancePath:instancePath+"/sessionId",schemaPath:"#/$defs/sessionId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern14.test(data2)){
validate190.errors = [{instancePath:instancePath+"/sessionId",schemaPath:"#/$defs/sessionId/pattern",keyword:"pattern",params:{pattern: "^ses_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^ses_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate190.errors = [{instancePath:instancePath+"/sessionId",schemaPath:"#/$defs/sessionId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.actorRole !== undefined){
const _errs9 = errors;
if("browser_session" !== data.actorRole){
validate190.errors = [{instancePath:instancePath+"/actorRole",schemaPath:"#/properties/actorRole/const",keyword:"const",params:{allowedValue: "browser_session"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.event !== undefined){
const _errs10 = errors;
if(!(validate176(data.event, {instancePath:instancePath+"/event",parentData:data,parentDataProperty:"event",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate176.errors : vErrors.concat(validate176.errors);
errors = vErrors.length;
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
else {
validate190.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate190.errors = vErrors;
return errors === 0;
}
validate190.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate173(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate173.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
if(!(validate174(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate174.errors : vErrors.concat(validate174.errors);
errors = vErrors.length;
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
var props0 = true;
}
const _errs2 = errors;
if(!(validate190(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate190.errors : vErrors.concat(validate190.errors);
errors = vErrors.length;
}
var _valid0 = _errs2 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
if(props0 !== true){
props0 = true;
}
}
}
if(!valid0){
const err0 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
validate173.errors = vErrors;
return false;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate173.errors = vErrors;
evaluated0.props = props0;
return errors === 0;
}
validate173.evaluated = {"dynamicProps":true,"dynamicItems":false};

const schema392 = {"type":"object","additionalProperties":false,"required":["kind","protocolVersion","executorId","threadId","afterSequence","limit","correlationId"],"properties":{"kind":{"const":"events.replay.request"},"protocolVersion":{"$ref":"#/$defs/protocolVersion"},"executorId":{"$ref":"#/$defs/executorId"},"threadId":{"$ref":"#/$defs/threadId"},"afterSequence":{"type":"integer","minimum":0,"maximum":9007199254740990},"limit":{"type":"integer","minimum":1,"maximum":200},"correlationId":{"$ref":"#/$defs/correlationId"}}};

function validate195(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate195.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((((data.kind === undefined) && (missing0 = "kind")) || ((data.protocolVersion === undefined) && (missing0 = "protocolVersion"))) || ((data.executorId === undefined) && (missing0 = "executorId"))) || ((data.threadId === undefined) && (missing0 = "threadId"))) || ((data.afterSequence === undefined) && (missing0 = "afterSequence"))) || ((data.limit === undefined) && (missing0 = "limit"))) || ((data.correlationId === undefined) && (missing0 = "correlationId"))){
validate195.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((((((key0 === "kind") || (key0 === "protocolVersion")) || (key0 === "executorId")) || (key0 === "threadId")) || (key0 === "afterSequence")) || (key0 === "limit")) || (key0 === "correlationId"))){
validate195.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
const _errs2 = errors;
if("events.replay.request" !== data.kind){
validate195.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "events.replay.request"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
let data1 = data.protocolVersion;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate195.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data1){
validate195.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/$defs/protocolVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.executorId !== undefined){
let data2 = data.executorId;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data2 === "string"){
if(func1(data2) > 68){
validate195.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern37.test(data2)){
validate195.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/pattern",keyword:"pattern",params:{pattern: "^exe_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^exe_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate195.errors = [{instancePath:instancePath+"/executorId",schemaPath:"#/$defs/executorId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.threadId !== undefined){
let data3 = data.threadId;
const _errs9 = errors;
const _errs10 = errors;
if(errors === _errs10){
if(typeof data3 === "string"){
if(func1(data3) > 68){
validate195.errors = [{instancePath:instancePath+"/threadId",schemaPath:"#/$defs/threadId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern130.test(data3)){
validate195.errors = [{instancePath:instancePath+"/threadId",schemaPath:"#/$defs/threadId/pattern",keyword:"pattern",params:{pattern: "^thr_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^thr_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate195.errors = [{instancePath:instancePath+"/threadId",schemaPath:"#/$defs/threadId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.afterSequence !== undefined){
let data4 = data.afterSequence;
const _errs12 = errors;
if(!(((typeof data4 == "number") && (!(data4 % 1) && !isNaN(data4))) && (isFinite(data4)))){
validate195.errors = [{instancePath:instancePath+"/afterSequence",schemaPath:"#/properties/afterSequence/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs12){
if((typeof data4 == "number") && (isFinite(data4))){
if(data4 > 9007199254740990 || isNaN(data4)){
validate195.errors = [{instancePath:instancePath+"/afterSequence",schemaPath:"#/properties/afterSequence/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740990},message:"must be <= 9007199254740990"}];
return false;
}
else {
if(data4 < 0 || isNaN(data4)){
validate195.errors = [{instancePath:instancePath+"/afterSequence",schemaPath:"#/properties/afterSequence/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.limit !== undefined){
let data5 = data.limit;
const _errs14 = errors;
if(!(((typeof data5 == "number") && (!(data5 % 1) && !isNaN(data5))) && (isFinite(data5)))){
validate195.errors = [{instancePath:instancePath+"/limit",schemaPath:"#/properties/limit/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs14){
if((typeof data5 == "number") && (isFinite(data5))){
if(data5 > 200 || isNaN(data5)){
validate195.errors = [{instancePath:instancePath+"/limit",schemaPath:"#/properties/limit/maximum",keyword:"maximum",params:{comparison: "<=", limit: 200},message:"must be <= 200"}];
return false;
}
else {
if(data5 < 1 || isNaN(data5)){
validate195.errors = [{instancePath:instancePath+"/limit",schemaPath:"#/properties/limit/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"}];
return false;
}
}
}
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correlationId !== undefined){
let data6 = data.correlationId;
const _errs16 = errors;
const _errs17 = errors;
if(errors === _errs17){
if(typeof data6 === "string"){
if(func1(data6) > 68){
validate195.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/maxLength",keyword:"maxLength",params:{limit: 68},message:"must NOT have more than 68 characters"}];
return false;
}
else {
if(!pattern6.test(data6)){
validate195.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/pattern",keyword:"pattern",params:{pattern: "^cor_[A-Za-z0-9]{8,64}$"},message:"must match pattern \""+"^cor_[A-Za-z0-9]{8,64}$"+"\""}];
return false;
}
}
}
else {
validate195.errors = [{instancePath:instancePath+"/correlationId",schemaPath:"#/$defs/correlationId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs16 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
else {
validate195.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate195.errors = vErrors;
return errors === 0;
}
validate195.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate20(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="https://kazibee.example/schemas/kazi-connect-v1.schema.json" */;
let vErrors = null;
let errors = 0;
const evaluated0 = validate20.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
if(!(validate21(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate21.errors : vErrors.concat(validate21.errors);
errors = vErrors.length;
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
var props0 = true;
}
const _errs2 = errors;
if(!(validate23(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate23.errors : vErrors.concat(validate23.errors);
errors = vErrors.length;
}
var _valid0 = _errs2 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
if(props0 !== true){
props0 = true;
}
}
const _errs3 = errors;
if(!(validate25(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate25.errors : vErrors.concat(validate25.errors);
errors = vErrors.length;
}
var _valid0 = _errs3 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 2];
}
else {
if(_valid0){
valid0 = true;
passing0 = 2;
if(props0 !== true){
props0 = true;
}
}
const _errs4 = errors;
if(!(validate27(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate27.errors : vErrors.concat(validate27.errors);
errors = vErrors.length;
}
var _valid0 = _errs4 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 3];
}
else {
if(_valid0){
valid0 = true;
passing0 = 3;
if(props0 !== true){
props0 = true;
}
}
const _errs5 = errors;
if(!(validate29(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate29.errors : vErrors.concat(validate29.errors);
errors = vErrors.length;
}
var _valid0 = _errs5 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 4];
}
else {
if(_valid0){
valid0 = true;
passing0 = 4;
if(props0 !== true){
props0 = true;
}
}
const _errs6 = errors;
if(!(validate31(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate31.errors : vErrors.concat(validate31.errors);
errors = vErrors.length;
}
var _valid0 = _errs6 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 5];
}
else {
if(_valid0){
valid0 = true;
passing0 = 5;
if(props0 !== true){
props0 = true;
}
}
const _errs7 = errors;
if(!(validate33(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate33.errors : vErrors.concat(validate33.errors);
errors = vErrors.length;
}
var _valid0 = _errs7 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 6];
}
else {
if(_valid0){
valid0 = true;
passing0 = 6;
if(props0 !== true){
props0 = true;
}
}
const _errs8 = errors;
if(!(validate35(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate35.errors : vErrors.concat(validate35.errors);
errors = vErrors.length;
}
var _valid0 = _errs8 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 7];
}
else {
if(_valid0){
valid0 = true;
passing0 = 7;
if(props0 !== true){
props0 = true;
}
}
const _errs9 = errors;
if(!(validate37(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate37.errors : vErrors.concat(validate37.errors);
errors = vErrors.length;
}
var _valid0 = _errs9 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 8];
}
else {
if(_valid0){
valid0 = true;
passing0 = 8;
if(props0 !== true){
props0 = true;
}
}
const _errs10 = errors;
if(!(validate39(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate39.errors : vErrors.concat(validate39.errors);
errors = vErrors.length;
}
var _valid0 = _errs10 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 9];
}
else {
if(_valid0){
valid0 = true;
passing0 = 9;
if(props0 !== true){
props0 = true;
}
}
const _errs11 = errors;
if(!(validate41(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate41.errors : vErrors.concat(validate41.errors);
errors = vErrors.length;
}
var _valid0 = _errs11 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 10];
}
else {
if(_valid0){
valid0 = true;
passing0 = 10;
if(props0 !== true){
props0 = true;
}
}
const _errs12 = errors;
if(!(validate43(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate43.errors : vErrors.concat(validate43.errors);
errors = vErrors.length;
}
var _valid0 = _errs12 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 11];
}
else {
if(_valid0){
valid0 = true;
passing0 = 11;
if(props0 !== true){
props0 = true;
}
}
const _errs13 = errors;
if(!(validate45(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate45.errors : vErrors.concat(validate45.errors);
errors = vErrors.length;
}
var _valid0 = _errs13 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 12];
}
else {
if(_valid0){
valid0 = true;
passing0 = 12;
if(props0 !== true){
props0 = true;
}
}
const _errs14 = errors;
if(!(validate47(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate47.errors : vErrors.concat(validate47.errors);
errors = vErrors.length;
}
var _valid0 = _errs14 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 13];
}
else {
if(_valid0){
valid0 = true;
passing0 = 13;
if(props0 !== true){
props0 = true;
}
}
const _errs15 = errors;
if(!(validate49(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate49.errors : vErrors.concat(validate49.errors);
errors = vErrors.length;
}
var _valid0 = _errs15 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 14];
}
else {
if(_valid0){
valid0 = true;
passing0 = 14;
if(props0 !== true){
props0 = true;
}
}
const _errs16 = errors;
if(!(validate51(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate51.errors : vErrors.concat(validate51.errors);
errors = vErrors.length;
}
else {
var props1 = validate51.evaluated.props;
}
var _valid0 = _errs16 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 15];
}
else {
if(_valid0){
valid0 = true;
passing0 = 15;
if(props0 !== true && props1 !== undefined){
if(props1 === true){
props0 = true;
}
else {
props0 = props0 || {};
Object.assign(props0, props1);
}
}
}
const _errs17 = errors;
if(!(validate61(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate61.errors : vErrors.concat(validate61.errors);
errors = vErrors.length;
}
var _valid0 = _errs17 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 16];
}
else {
if(_valid0){
valid0 = true;
passing0 = 16;
if(props0 !== true){
props0 = true;
}
}
const _errs18 = errors;
if(!(validate63(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate63.errors : vErrors.concat(validate63.errors);
errors = vErrors.length;
}
else {
var props2 = validate63.evaluated.props;
}
var _valid0 = _errs18 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 17];
}
else {
if(_valid0){
valid0 = true;
passing0 = 17;
if(props0 !== true && props2 !== undefined){
if(props2 === true){
props0 = true;
}
else {
props0 = props0 || {};
Object.assign(props0, props2);
}
}
}
const _errs19 = errors;
if(!(validate69(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate69.errors : vErrors.concat(validate69.errors);
errors = vErrors.length;
}
else {
var props3 = validate69.evaluated.props;
}
var _valid0 = _errs19 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 18];
}
else {
if(_valid0){
valid0 = true;
passing0 = 18;
if(props0 !== true && props3 !== undefined){
if(props3 === true){
props0 = true;
}
else {
props0 = props0 || {};
Object.assign(props0, props3);
}
}
}
const _errs20 = errors;
if(!(validate77(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate77.errors : vErrors.concat(validate77.errors);
errors = vErrors.length;
}
var _valid0 = _errs20 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 19];
}
else {
if(_valid0){
valid0 = true;
passing0 = 19;
if(props0 !== true){
props0 = true;
}
}
const _errs21 = errors;
if(!(validate81(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
var _valid0 = _errs21 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 20];
}
else {
if(_valid0){
valid0 = true;
passing0 = 20;
if(props0 !== true){
props0 = true;
}
}
const _errs22 = errors;
if(!(validate84(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
var _valid0 = _errs22 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 21];
}
else {
if(_valid0){
valid0 = true;
passing0 = 21;
if(props0 !== true){
props0 = true;
}
}
const _errs23 = errors;
if(!(validate86(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate86.errors : vErrors.concat(validate86.errors);
errors = vErrors.length;
}
var _valid0 = _errs23 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 22];
}
else {
if(_valid0){
valid0 = true;
passing0 = 22;
if(props0 !== true){
props0 = true;
}
}
const _errs24 = errors;
if(!(validate88(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate88.errors : vErrors.concat(validate88.errors);
errors = vErrors.length;
}
var _valid0 = _errs24 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 23];
}
else {
if(_valid0){
valid0 = true;
passing0 = 23;
if(props0 !== true){
props0 = true;
}
}
const _errs25 = errors;
if(!(validate90(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate90.errors : vErrors.concat(validate90.errors);
errors = vErrors.length;
}
var _valid0 = _errs25 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 24];
}
else {
if(_valid0){
valid0 = true;
passing0 = 24;
if(props0 !== true){
props0 = true;
}
}
const _errs26 = errors;
if(!(validate92(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate92.errors : vErrors.concat(validate92.errors);
errors = vErrors.length;
}
var _valid0 = _errs26 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 25];
}
else {
if(_valid0){
valid0 = true;
passing0 = 25;
if(props0 !== true){
props0 = true;
}
}
const _errs27 = errors;
if(!(validate94(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate94.errors : vErrors.concat(validate94.errors);
errors = vErrors.length;
}
var _valid0 = _errs27 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 26];
}
else {
if(_valid0){
valid0 = true;
passing0 = 26;
if(props0 !== true){
props0 = true;
}
}
const _errs28 = errors;
if(!(validate96(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate96.errors : vErrors.concat(validate96.errors);
errors = vErrors.length;
}
var _valid0 = _errs28 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 27];
}
else {
if(_valid0){
valid0 = true;
passing0 = 27;
if(props0 !== true){
props0 = true;
}
}
const _errs29 = errors;
if(!(validate98(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate98.errors : vErrors.concat(validate98.errors);
errors = vErrors.length;
}
var _valid0 = _errs29 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 28];
}
else {
if(_valid0){
valid0 = true;
passing0 = 28;
if(props0 !== true){
props0 = true;
}
}
const _errs30 = errors;
if(!(validate134(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate134.errors : vErrors.concat(validate134.errors);
errors = vErrors.length;
}
var _valid0 = _errs30 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 29];
}
else {
if(_valid0){
valid0 = true;
passing0 = 29;
if(props0 !== true){
props0 = true;
}
}
const _errs31 = errors;
if(!(validate136(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate136.errors : vErrors.concat(validate136.errors);
errors = vErrors.length;
}
var _valid0 = _errs31 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 30];
}
else {
if(_valid0){
valid0 = true;
passing0 = 30;
if(props0 !== true){
props0 = true;
}
}
const _errs32 = errors;
if(!(validate173(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate173.errors : vErrors.concat(validate173.errors);
errors = vErrors.length;
}
else {
var props4 = validate173.evaluated.props;
}
var _valid0 = _errs32 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 31];
}
else {
if(_valid0){
valid0 = true;
passing0 = 31;
if(props0 !== true && props4 !== undefined){
if(props4 === true){
props0 = true;
}
else {
props0 = props0 || {};
Object.assign(props0, props4);
}
}
}
const _errs33 = errors;
if(!(validate179(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate179.errors : vErrors.concat(validate179.errors);
errors = vErrors.length;
}
var _valid0 = _errs33 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 32];
}
else {
if(_valid0){
valid0 = true;
passing0 = 32;
if(props0 !== true){
props0 = true;
}
}
const _errs34 = errors;
if(!(validate195(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate195.errors : vErrors.concat(validate195.errors);
errors = vErrors.length;
}
var _valid0 = _errs34 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 33];
}
else {
if(_valid0){
valid0 = true;
passing0 = 33;
if(props0 !== true){
props0 = true;
}
}
const _errs35 = errors;
if(!(validate181(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate181.errors : vErrors.concat(validate181.errors);
errors = vErrors.length;
}
var _valid0 = _errs35 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 34];
}
else {
if(_valid0){
valid0 = true;
passing0 = 34;
if(props0 !== true){
props0 = true;
}
}
const _errs36 = errors;
if(!(validate184(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate184.errors : vErrors.concat(validate184.errors);
errors = vErrors.length;
}
var _valid0 = _errs36 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 35];
}
else {
if(_valid0){
valid0 = true;
passing0 = 35;
if(props0 !== true){
props0 = true;
}
}
const _errs37 = errors;
if(!(validate186(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate186.errors : vErrors.concat(validate186.errors);
errors = vErrors.length;
}
var _valid0 = _errs37 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 36];
}
else {
if(_valid0){
valid0 = true;
passing0 = 36;
if(props0 !== true){
props0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
if(!valid0){
const err0 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
validate20.errors = vErrors;
return false;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate20.errors = vErrors;
evaluated0.props = props0;
return errors === 0;
}
validate20.evaluated = {"dynamicProps":true,"dynamicItems":false};

