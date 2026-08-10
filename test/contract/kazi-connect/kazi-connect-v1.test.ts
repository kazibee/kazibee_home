import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';

const root = resolve('packages/kazi-connect-protocol');
const schemaPath = join(root, 'schemas/kazi-connect-v1.schema.json');
const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(path, 'utf8')) as T;

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Fixture = {
  name: string;
  schema: string;
  payload: Json;
  expectedKeyword?: string;
  expectedInstancePath?: string;
};

const schema = readJson<Record<string, Json>>(schemaPath);
const positives = readJson<Fixture[]>(join(root, 'fixtures/positive.json'));
const negatives = readJson<Fixture[]>(join(root, 'fixtures/negative.json'));
const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
});
ajv.addSchema(schema);
const schemaId = String(schema.$id);

const validatorFor = (definition: string) => {
  const validator = ajv.getSchema(`${schemaId}#/$defs/${definition}`);
  expect(validator, `missing schema definition ${definition}`).toBeDefined();
  return validator!;
};

const findJsonFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? findJsonFiles(path) : path.endsWith('.json') ? [path] : [];
    })
    .sort();

describe('Kazi Connect V1 fixtures', () => {
  it.each(positives)('accepts positive fixture: $name', ({ schema: definition, payload }) => {
    const validate = validatorFor(definition);
    expect(validate(payload), JSON.stringify(validate.errors, null, 2)).toBe(true);
  });

  it.each(negatives)(
    'rejects negative fixture for its intended reason: $name',
    ({ schema: definition, payload, expectedKeyword, expectedInstancePath }) => {
      const validate = validatorFor(definition);
      expect(validate(payload)).toBe(false);
      expect(validate.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            keyword: expectedKeyword,
            instancePath: expectedInstancePath,
          }),
        ]),
      );
    },
  );

  it('enumerates every fixture exactly once', () => {
    const names = [...positives, ...negatives].map(({ name }) => name);
    expect(names.length).toBe(positives.length + negatives.length);
    expect(new Set(names).size).toBe(names.length);
    expect(positives.length).toBeGreaterThanOrEqual(25);
    expect(negatives.length).toBeGreaterThanOrEqual(10);
  });
});

describe('closed, bounded protocol surface', () => {
  it('has exactly the frozen operation allowlist', () => {
    const operation = (schema.$defs as Record<string, Record<string, Json>>).operation;
    expect(operation.enum).toEqual([
      'executor.status.read',
      'workspaces.read',
      'threads.read',
      'thread.read',
      'conversation.create',
      'thread.send',
      'thread.retry',
      'thread.cancel',
      'events.replay',
    ]);
  });

  it('has exactly the canonical error codes', () => {
    const errorCode = (schema.$defs as Record<string, Record<string, Json>>).errorCode;
    expect(errorCode.enum).toEqual([
      'executor-offline',
      'protocol-version-mismatch',
      'unknown-operation',
      'invalid-envelope',
      'idempotency-conflict',
      'replay-gap',
      'revoked',
      'website-deployment-mismatch',
    ]);
  });

  it('closes every recursively declared object schema and declares required fields', () => {
    const failures: string[] = [];
    const visit = (value: Json, pointer: string): void => {
      if (Array.isArray(value)) {
        value.forEach((item, index) => visit(item, `${pointer}/${index}`));
        return;
      }
      if (!value || typeof value !== 'object') return;
      if (value.type === 'object') {
        if (value.additionalProperties !== false) failures.push(`${pointer}: additionalProperties`);
        if (!Array.isArray(value.required)) failures.push(`${pointer}: required`);
        if (!value.properties || typeof value.properties !== 'object') failures.push(`${pointer}: properties`);
      }
      Object.entries(value).forEach(([key, child]) => visit(child, `${pointer}/${key}`));
    };
    visit(schema as Json, '#');
    expect(failures).toEqual([]);
  });

  it('keeps roles distinct and uses positive executor sequences', () => {
    const defs = schema.$defs as Record<string, Record<string, Json>>;
    expect(defs.role.enum).toEqual([
      'browser_session',
      'desktop_device',
      'executor_device',
      'claim_challenge',
    ]);
    expect(defs.sequence.minimum).toBe(1);
    expect(
      positives
        .filter(({ schema: definition }) => definition === 'replayResult')
        .every(({ payload }) => {
          const result = payload as { afterSequence: number; events: Array<{ sequence: number }> };
          return result.events.every(({ sequence }) => sequence > result.afterSequence);
        }),
    ).toBe(true);
  });

  it('requires the bounded executor discovery presence projection', () => {
    const defs = schema.$defs as Record<string, Record<string, Json>>;
    const summary = defs.executorSummary;
    const properties = summary.properties as Record<string, Record<string, Json>>;
    expect(summary.required).toContain('presence');
    expect(properties.presence.enum).toEqual(['online', 'offline', 'stale']);
    expect(properties.online.type).toBe('boolean');
  });

  it('distinguishes normalizable raw username input from canonical response username', () => {
    const defs = schema.$defs as Record<string, Record<string, Json>>;
    const signupRequest = defs.signupRequest.properties as Record<string, Record<string, Json>>;
    const signupResponse = defs.signupResponse.properties as Record<string, Record<string, Json>>;
    const loginRequest = defs.loginRequest.properties as Record<string, Record<string, Json>>;
    expect(signupRequest.username.$ref).toBe('#/$defs/rawUsername');
    expect(loginRequest.username.$ref).toBe('#/$defs/rawUsername');
    expect(signupResponse.username.$ref).toBe('#/$defs/username');
    expect(defs.rawUsername.maxLength).toBe(128);
    expect(defs.username.pattern).toBe('^[a-z0-9][a-z0-9._-]{2,63}$');
    expect(
      (positives.find(({ name }) => name === 'signup request')!.payload as Record<string, Json>)
        .username,
    ).toBe('  Sample.User  ');
    expect(
      (positives.find(({ name }) => name === 'signup response')!.payload as Record<string, Json>)
        .username,
    ).toBe('sample.user');
  });

  it('defines thread.send as exactly the strict existing and new thread shapes', () => {
    const defs = schema.$defs as Record<string, Record<string, Json>>;
    expect(defs.threadSendPayload.oneOf).toEqual([
      { $ref: '#/$defs/threadSendExistingPayload' },
      { $ref: '#/$defs/threadSendNewPayload' },
    ]);
    expect(defs.threadSendExistingPayload.required).toEqual([
      'conversationId',
      'clientOperationId',
      'text',
      'mode',
      'model',
      'expectedExecutionBinding',
    ]);
    expect(defs.threadSendNewPayload.required).toEqual([
      'workspaceId',
      'title',
      'text',
      'mode',
      'model',
      'phase',
    ]);
    expect(defs.threadSendExistingPayload.additionalProperties).toBe(false);
    expect(defs.threadSendNewPayload.additionalProperties).toBe(false);
  });

  it('defines exact remote creation, receipt, and binding-aware mutation schemas', () => {
    const defs = schema.$defs as Record<string, Record<string, Json>>;
    expect(defs.conversationCreatePayload.required).toEqual([
      'clientCreationId', 'title', 'websiteDeploymentId', 'executorId', 'remoteWorkspaceId',
    ]);
    expect(defs.remoteExecutionBindingReceipt.required).toEqual([
      'conversationId', 'kind', 'websiteDeploymentId', 'executorId', 'remoteWorkspaceId',
    ]);
    expect(defs.remoteExecutionBindingReceipt.additionalProperties).toBe(false);
    expect(defs.threadRetryPayload.required).toEqual([
      'conversationId', 'clientOperationId', 'expectedExecutionBinding',
    ]);
    expect(defs.threadCancelPayload.required).toEqual([
      'conversationId', 'clientOperationId', 'expectedExecutionBinding',
    ]);
    expect(
      (defs.threadSendNewPayload.properties as Record<string, Record<string, Json>>).phase.const,
    ).toBe('start');
  });

  it('accepts current Codex and Claude model identifiers in thread.send', () => {
    const validate = validatorFor('threadSendPayload');
    const existing = positives.find(({ name }) => name === 'existing thread send with Codex model');
    const created = positives.find(({ name }) => name === 'new thread send with Claude model');
    expect(existing).toBeDefined();
    expect(created).toBeDefined();
    expect(validate(existing!.payload), JSON.stringify(validate.errors, null, 2)).toBe(true);
    expect(validate(created!.payload), JSON.stringify(validate.errors, null, 2)).toBe(true);
  });

  it('requires the claim link, platform projection, version, and public-key fingerprint', () => {
    const defs = schema.$defs as Record<string, Record<string, Json>>;
    expect(defs.claimChallenge.required).toEqual(
      expect.arrayContaining([
        'claimUrl',
        'shortCode',
        'displayName',
        'platform',
        'architecture',
        'executorVersion',
        'keyFingerprint',
        'expiresAt',
      ]),
    );
    expect(defs.claimCreateRequest.required).toEqual(
      expect.arrayContaining([
        'platform',
        'architecture',
        'executorVersion',
        'keyFingerprint',
      ]),
    );
    expect(defs.claimUrl.pattern).toMatch(/^\^https:/);
    expect(defs.keyFingerprint.pattern).toBe('^[a-f0-9]{64}$');
  });

  it('keeps Desktop claim and accepted credential promotion distinct from executor enrollment', () => {
    const defs = schema.$defs as Record<string, Record<string, Json>>;
    const create = defs.desktopClaimCreateRequest.properties as Record<string, Record<string, Json>>;
    const challenge = defs.desktopClaimChallenge.properties as Record<string, Record<string, Json>>;
    const accepted = defs.desktopClaimAcceptedStatus.properties as Record<string, Record<string, Json>>;

    expect(create.kind.const).toBe('desktop.claim.create.request');
    expect(create.actorRole.const).toBe('desktop_device');
    expect(create.desktopVersion.$ref).toBe('#/$defs/desktopVersion');
    expect(create.executorVersion).toBeUndefined();
    expect(challenge.kind.const).toBe('desktop.claim.challenge');
    expect(challenge.actorRole.const).toBe('claim_challenge');
    expect(accepted.credentialAudience.$ref).toBe('#/$defs/desktopRelayAudience');
    expect(accepted.websiteAccountId.$ref).toBe('#/$defs/websiteAccountId');
    expect(accepted.websiteDeploymentId.$ref).toBe('#/$defs/websiteDeploymentId');
    expect((defs.desktopClaimAcceptedStatus.required as string[])).toContain('websiteAccountId');
    expect((defs.desktopClaimAcceptedDecision.required as string[])).toContain('websiteAccountId');
    expect((defs.desktopClaimAcceptedStatus.required as string[])).toContain('websiteDeploymentId');
    expect((defs.desktopClaimAcceptedDecision.required as string[])).toContain('websiteDeploymentId');
    expect(defs.websiteAccountId.pattern).toBe('^usr_[A-Za-z0-9]{8,64}$');
    expect(accepted.credentialGeneration.const).toBe(1);
  });

  it('models active, expired, and revoked Desktop relay admission contexts', () => {
    const defs = schema.$defs as Record<string, Record<string, Json>>;
    expect(defs.desktopRelayAuthContext.oneOf).toEqual([
      { $ref: '#/$defs/desktopActiveCredentialContext' },
      { $ref: '#/$defs/desktopExpiredCredentialContext' },
      { $ref: '#/$defs/desktopRevokedCredentialContext' },
    ]);
    expect(
      (defs.desktopActiveCredentialContext.properties as Record<string, Record<string, Json>>)
        .audience.$ref,
    ).toBe('#/$defs/desktopRelayAudience');
    expect(String(defs.desktopRelayAuthContext.description)).toContain(
      'exactly one X-Kazi-Protocol-Version: 1.0 header',
    );
    expect(
      (defs.desktopActiveCredentialContext.properties as Record<string, Record<string, Json>>)
        .protocolVersion.description,
    ).toBe('The single admitted X-Kazi-Protocol-Version header value.');
    expect(defs.desktopRevokedCredentialContext.required).toContain('revokedAt');
    expect(defs.credentialGeneration.minimum).toBe(1);
  });

  it('routes data-plane payloads only to Desktop owner SSE and keeps browsers presence-only', () => {
    const defs = schema.$defs as Record<string, Record<string, Json>>;
    expect(defs.ownerSseEvent.oneOf).toEqual([
      { $ref: '#/$defs/ownerSseDesktopEvent' },
      { $ref: '#/$defs/ownerSseBrowserEvent' },
    ]);
    expect(defs.ownerSseDesktopPayload.oneOf).toEqual([
      { $ref: '#/$defs/executorPresenceEvent' },
      { $ref: '#/$defs/commandResult' },
      { $ref: '#/$defs/executorEventFrame' },
      { $ref: '#/$defs/replayResult' },
      { $ref: '#/$defs/replayGap' },
      { $ref: '#/$defs/errorEnvelope' },
    ]);
    expect(
      (defs.ownerSseBrowserEvent.properties as Record<string, Record<string, Json>>).event.$ref,
    ).toBe('#/$defs/executorPresenceEvent');
    expect((defs.executorPresenceEvent.properties as Record<string, Record<string, Json>>).status.enum)
      .toEqual(['unknown', 'online', 'stale', 'offline']);
  });

  it('defines closed operation-discriminated command results and keeps replay separate', () => {
    const defs = schema.$defs as Record<string, Record<string, Json>>;
    expect(defs.commandResultOperation.enum).toEqual([
      'executor.status.read',
      'workspaces.read',
      'threads.read',
      'thread.read',
      'conversation.create',
      'thread.send',
      'thread.retry',
      'thread.cancel',
    ]);
    expect(defs.commandResultOperation.enum).not.toContain('events.replay');
    expect(defs.commandResult.allOf).toHaveLength(8);
    expect(defs.commandResultPayload.oneOf).toEqual([
      { $ref: '#/$defs/executorStatusResult' },
      { $ref: '#/$defs/workspacesReadResult' },
      { $ref: '#/$defs/threadsReadResult' },
      { $ref: '#/$defs/threadReadResult' },
      { $ref: '#/$defs/conversationCreateResult' },
      { $ref: '#/$defs/threadSendResult' },
      { $ref: '#/$defs/threadRetryResult' },
      { $ref: '#/$defs/threadCancelResult' },
    ]);
    expect(
      (defs.commandResult.properties as Record<string, Record<string, Json>>).actorRole.const,
    ).toBe('executor_device');
  });

  it('keeps executor status identity bounded and capabilities boolean-only and redacted', () => {
    const defs = schema.$defs as Record<string, Record<string, Json>>;
    const status = defs.executorStatusResult;
    const statusProperties = status.properties as Record<string, Record<string, Json>>;
    const capabilities = defs.executorCapabilities;
    const capabilityProperties = capabilities.properties as Record<string, Record<string, Json>>;

    expect(status.required).toEqual(['displayName', 'state', 'capabilities', 'observedAt']);
    expect(statusProperties.displayName.$ref).toBe('#/$defs/displayName');
    expect(statusProperties.executorId).toBeUndefined();
    expect(statusProperties.protocolVersion).toBeUndefined();
    expect(defs.displayName.maxLength).toBe(80);
    expect(capabilities.additionalProperties).toBe(false);
    expect(capabilities.required).toEqual(['git', 'codex', 'claude']);
    expect(Object.keys(capabilityProperties)).toEqual(['git', 'codex', 'claude']);
    expect(Object.values(capabilityProperties).every(({ type }) => type === 'boolean')).toBe(true);

    const negativeNames = negatives.map(({ name }) => name);
    expect(negativeNames).toEqual(expect.arrayContaining([
      'rejects executor status missing display name',
      'rejects executor status missing capabilities',
      'rejects executor status extra field',
      'rejects executor status capability wrong type',
      'rejects executor status capability path attempt',
      'rejects executor status capability version attempt',
      'rejects executor status capability config attempt',
      'rejects executor status capability credential attempt',
      'rejects executor status capability model list attempt',
      'rejects executor status capability provider output attempt',
    ]));
  });

  it('bounds path-free projection records, transcript pages, and opaque cursors', () => {
    const defs = schema.$defs as Record<string, Record<string, Json>>;
    const threadRead = defs.threadReadResult.properties as Record<string, Record<string, Json>>;
    const message = defs.threadMessage.properties as Record<string, Record<string, Json>>;
    const workspaces = defs.workspacesReadResult.properties as Record<string, Record<string, Json>>;
    const threads = defs.threadsReadResult.properties as Record<string, Record<string, Json>>;
    expect(workspaces.workspaces.maxItems).toBe(100);
    expect(threads.threads.maxItems).toBe(100);
    expect(threadRead.messages.maxItems).toBe(200);
    expect(message.text.maxLength).toBe(20000);
    expect(defs.cursor.pattern).toBe('^cur_[A-Za-z0-9_-]{8,128}$');
    expect(defs.messageRole.enum).toEqual(['user', 'assistant', 'system']);
    expect(defs.messageStatus.enum).toEqual([
      'pending', 'streaming', 'completed', 'failed', 'cancelled',
    ]);
    expect(defs.threadStatus.enum).toEqual([
      'queued', 'running', 'completed', 'failed', 'cancelled',
    ]);
  });
});

describe('artifact safety and integrity', () => {
  const artifactFiles = [
    ...findJsonFiles(join(root, 'schemas')),
    ...findJsonFiles(join(root, 'fixtures')),
    ...findJsonFiles(join(root, 'scenarios')),
  ];

  it.each(artifactFiles)('contains no forbidden content: %s', (path) => {
    const text = readFileSync(path, 'utf8');
    expect(text).not.toMatch(/-----BEGIN [A-Z ]*PRIVATE KEY-----/i);
    expect(text).not.toMatch(/\b(?:bearer|api[_-]?key|access[_-]?token|refresh[_-]?token)\b/i);
    expect(text).not.toMatch(/(?:^|["\s])(?:\/(?:Users|home|var|etc|tmp)\/|[A-Za-z]:\\\\)/m);

    const value = readJson<Json>(path);
    const forbiddenKeys = /^(?:path|filePath|baseFolderPath|worktreePath|metadata|image|images|settings|credentials|credentialToken|privateKey|authorization|authToken|secret|cookie|cookies|token|tokens|prompt|providerOutput|hostConfig)$/i;
    const found: string[] = [];
    const walk = (node: Json, pointer: string): void => {
      if (Array.isArray(node)) {
        node.forEach((item, index) => walk(item, `${pointer}/${index}`));
      } else if (node && typeof node === 'object') {
        Object.entries(node).forEach(([key, child]) => {
          if (forbiddenKeys.test(key)) found.push(`${pointer}/${key}`);
          walk(child, `${pointer}/${key}`);
        });
      }
    };
    walk(value, '#');
    expect(found).toEqual([]);
  });

  it('uses only the deterministic non-secret password sentinel in fixtures', () => {
    const authValues = positives
      .map(({ payload }) => payload)
      .filter((payload): payload is Record<string, Json> => !!payload && typeof payload === 'object' && !Array.isArray(payload))
      .filter((payload) => Object.hasOwn(payload, 'password'))
      .map((payload) => payload.password);
    expect(authValues).toEqual(['SAFE-TEST-VALUE-ONLY', 'SAFE-TEST-VALUE-ONLY']);
  });

  it('verifies the canonical SHA-256 manifest', () => {
    const manifest = readJson<{
      package: string;
      packageVersion: string;
      checksumAlgorithm: string;
      authContracts: {
        desktopClaimCreate: {
          header: string;
          jsonField: boolean;
        };
        desktopRelay: {
          transports: string[];
          headers: Record<string, Record<string, Json>>;
          admissionContextSchema: string;
          actorRole: string;
          acceptedBootstrapPromotion: {
            credentialGeneration: number;
            reuseAcceptedBootstrapHash: boolean;
            returnsRawCredential: boolean;
          };
        };
      };
      files: Array<{ path: string; sha256: string }>;
    }>(join(root, 'manifest.json'));
    const packageMetadata = readJson<{ name: string; version: string }>(
      join(root, 'package.json'),
    );
    const expected = [
      ...findJsonFiles(join(root, 'fixtures')),
      ...findJsonFiles(join(root, 'scenarios')),
      ...findJsonFiles(join(root, 'schemas')),
      join(root, 'types-by-schema.d.ts'),
    ].map((path) => relative(root, path));
    expect(manifest.package).toBe(packageMetadata.name);
    expect(manifest.packageVersion).toBe(packageMetadata.version);
    expect(manifest.packageVersion).toBe('1.0.8');
    expect(manifest.checksumAlgorithm).toBe('sha256');
    expect(manifest.authContracts.desktopClaimCreate).toEqual(
      expect.objectContaining({
        header: 'X-Kazi-Bootstrap-Token',
        jsonField: false,
      }),
    );
    expect(manifest.authContracts.desktopRelay).toEqual(
      expect.objectContaining({
        transports: ['POST', 'SSE'],
        admissionContextSchema: '#/$defs/desktopRelayAuthContext',
        actorRole: 'desktop_device',
        acceptedBootstrapPromotion: {
          credentialGeneration: 1,
          reuseAcceptedBootstrapHash: true,
          returnsRawCredential: false,
        },
      }),
    );
    expect(manifest.authContracts.desktopRelay.headers.audience.literal).toBe('desktop-relay');
    expect(manifest.authContracts.desktopRelay.headers.credentialGeneration.name)
      .toBe('X-Kazi-Credential-Generation');
    expect(manifest.authContracts.desktopRelay.headers.protocolVersion).toEqual({
      name: 'X-Kazi-Protocol-Version',
      literal: '1.0',
      singleValue: true,
    });
    expect(manifest.files.map(({ path }) => path)).toEqual(expected.sort());
    for (const entry of manifest.files) {
      expect(isAbsolute(entry.path)).toBe(false);
      const digest = createHash('sha256')
        .update(readFileSync(join(root, entry.path)))
        .digest('hex');
      expect(digest, entry.path).toBe(entry.sha256);
    }
  });

  it('keeps deterministic scenarios monotonic and fixture-backed', () => {
    const fixtureNames = new Set(positives.map(({ name }) => name));
    for (const path of findJsonFiles(join(root, 'scenarios'))) {
      const scenario = readJson<{
        clock: string;
        steps: Array<{ atMs: number; fixture: string }>;
        expectedClaimUrl?: string;
        expectedCredentialGeneration?: number;
        expectedAudience?: string;
        expectedCapabilities?: string[];
      }>(path);
      expect(scenario.clock).toBe('2030-01-01T00:00:00Z');
      expect(scenario.steps.length).toBeGreaterThan(0);
      expect(scenario.steps.map(({ atMs }) => atMs)).toEqual(
        [...scenario.steps.map(({ atMs }) => atMs)].sort((a, b) => a - b),
      );
      scenario.steps.forEach(({ fixture }) => expect(fixtureNames.has(fixture), fixture).toBe(true));
      if (path.endsWith('/claim-accept.json')) {
        const claim = positives.find(({ name }) => name === scenario.steps[0].fixture);
        expect(scenario.expectedClaimUrl).toBe(
          (claim!.payload as Record<string, Json>).claimUrl,
        );
      }
      if (path.endsWith('desktop-claim-accept.json')) {
        expect(scenario.expectedCredentialGeneration).toBe(1);
        expect(scenario.expectedAudience).toBe('desktop-relay');
      }
      if (path.endsWith('status-result.json')) {
        expect(scenario.expectedCapabilities).toEqual(['git', 'codex', 'claude']);
      }
    }
  });
});
