/**
 * Regression: deployed GET /v1/connect/client-relay/executors answers
 * HTTP 500 `{ error: true, message: 'Code generation from strings disallowed
 * for this context', statusCode: 500 }` with NO x-kazi-protocol-version header
 * on the public dev endpoint (Cloudflare Workers runtime).
 *
 * Root cause under test: ConnectClientRelayRequestParser compiles the
 * canonical protocol schema with Ajv2020 per instance
 * (src/server/services/connect_client_relay_request_parser.ts:29). Ajv
 * generates validator source and materialises it with `new Function(...)`,
 * which Cloudflare Workers (workerd) forbids at runtime with an EvalError.
 * The original-config route suite (connect_client_relay.testdinner.test.ts)
 * runs the same real graph on unrestricted Node and therefore never saw it.
 *
 * This file drives the SAME real production graph (root testApp CONFIG, real
 * connectClientRelay module, real controller → parser/resolver → logic →
 * service) while a SIMULATED Cloudflare no-runtime-codegen constraint is in
 * force: the global string-to-code entry points (`Function`, `eval`, and the
 * async/generator function constructors) are replaced with throwers that
 * raise V8's exact EvalError. This is a model of workerd's constraint, not
 * workerd itself. The guard is scoped: installed after the harness has
 * built the application (framework setup may legitimately need codegen) and
 * always restored in `finally`, so neighbouring test files are unaffected.
 *
 * Only repository external boundaries (credential/device/executor repos) are
 * replaced; parser, controller, and resolver are the production classes.
 *
 * These cases originally reproduced HTTP 500 instead of 200 / 401.
 * The parsers now use a generated validator, and testApp precompiles its
 * route validators before this guard, matching Cloudflare build preparation.
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { testApp } from '@noego/app';
import { test as control, testStub, resourceCase } from '@noego/testing';
import Ajv2020 from 'ajv/dist/2020.js';
import protocolSchema from '@kazibee-internal/connect-protocol/canonical/schemas/kazi-connect-v1.schema.json' with { type: 'json' };
import ConnectExecutorRepo from '../../../src/server/repo/connect_executor_repo';
import ConnectExecutorCredentialRepo from '../../../src/server/repo/connect_executor_credential_repo';
import ConnectDesktopCredentialRepo from '../../../src/server/repo/connect_desktop_credential_repo';
import ConnectDesktopDeviceRepo from '../../../src/server/repo/connect_desktop_device_repo';

const CONFIG = path.resolve(__dirname, '../../../noego.config.yml');

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

const TOKEN = 'D'.repeat(43);
const DEVICE_ID = 'dev_desktop01';
const EXECUTOR_ID = 'exe_machine01';
const OWNER_ID = 'usr_owner001';
const CORRELATION_ID = 'cor_abcdefgh';
const FUTURE = '2999-01-01T00:00:00.000Z';

/** V8's exact message when dynamic code generation is disallowed (matches the deployed 500 body). */
const CODEGEN_MESSAGE = 'Code generation from strings disallowed for this context';

const relayHeaders = () => ({
  authorization: `Bearer ${TOKEN}`,
  'x-kazi-device-id': DEVICE_ID,
  'x-kazi-credential-generation': '1',
  'x-kazi-audience': 'desktop-relay',
  'x-kazi-protocol-version': '1.0',
});

const credentialRow = () => ({
  credential_id: 'cred_desktop01',
  device_id: DEVICE_ID,
  generation: 1,
  token_hash: sha256(TOKEN),
  audience: 'desktop-relay',
  status: 'active',
  created_at: '2026-01-01T00:00:00.000Z',
  expires_at: FUTURE,
  revoked_at: null,
});

const deviceRow = () => ({
  device_id: DEVICE_ID,
  owner_user_id: OWNER_ID,
  display_name: 'Desk',
  platform: 'macos',
  architecture: 'arm64',
  desktop_version: '1.0.0',
  key_fingerprint: 'b'.repeat(64),
  state: 'active',
  credential_generation: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  claimed_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  last_seen_at: '2026-01-01T00:00:00.000Z',
});

const executorRow = () => ({
  executor_id: EXECUTOR_ID,
  device_id: 'dev_machine01',
  owner_user_id: OWNER_ID,
  display_name: 'Build Box',
  platform: 'macos',
  architecture: 'arm64',
  executor_version: '1.2.3',
  key_fingerprint: 'a'.repeat(64),
  state: 'active',
  credential_generation: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  claimed_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  last_seen_at: '2026-01-01T00:00:00.000Z',
});

const desktopAuth = () => testStub()
  .method(ConnectDesktopCredentialRepo, 'findByTokenHash', control.returns(Promise.resolve(credentialRow())))
  .method(ConnectDesktopDeviceRepo, 'findByDeviceId', control.returns(Promise.resolve(deviceRow())));

const executorListResponse = () => ({
  kind: 'executor.list.response',
  protocolVersion: '1.0',
  executors: [{
    executorId: EXECUTOR_ID,
    displayName: 'Build Box',
    state: 'active',
    online: false,
    presence: 'offline',
    protocolVersion: '1.0',
  }],
  correlationId: CORRELATION_ID,
});

// ---------------------------------------------------------------------------
// Simulated Cloudflare Workers no-runtime-codegen constraint.
//
// workerd refuses string-to-code at runtime: `new Function(...)`, `eval(...)`
// and the async/generator function constructors all throw EvalError with the
// message above. Node has no per-context switch for this that can be flipped
// inside a running vitest worker, so the same entry points are replaced on
// globalThis with throwers for the duration of `run` and restored afterwards.
// This is a MODEL of the constraint — it does not run workerd.
// ---------------------------------------------------------------------------
type CodegenEntry = { holder: object; key: PropertyKey; descriptor: PropertyDescriptor };

const codegenEntryPoints = (): CodegenEntry[] => {
  const entries: CodegenEntry[] = [];
  const capture = (holder: object, key: PropertyKey) => {
    const descriptor = Object.getOwnPropertyDescriptor(holder, key);
    if (descriptor) entries.push({ holder, key, descriptor });
  };
  capture(globalThis, 'Function');
  capture(Function.prototype, 'constructor');
  capture(globalThis, 'eval');
  // Async / generator function constructors are only reachable via prototypes.
  const asyncFn = (async () => {}).constructor;
  const genFn = (function* () {}).constructor;
  const asyncGenFn = (async function* () {}).constructor;
  for (const ctor of [asyncFn, genFn, asyncGenFn]) {
    capture((ctor as { prototype: object }).prototype, 'constructor');
  }
  return entries;
};

const thrower = (original: unknown) => {
  const deny = function () {
    throw new EvalError(CODEGEN_MESSAGE);
  };
  // Keep `instanceof Function` / prototype identity intact for code that only inspects it.
  if (typeof original === 'function') {
    Object.defineProperty(deny, 'prototype', { value: original.prototype, writable: false });
  }
  return deny;
};

/** Runs `body` with runtime codegen disallowed; always restores the globals. */
async function withoutRuntimeCodegen<T>(body: () => Promise<T>): Promise<T> {
  const entries = codegenEntryPoints();
  for (const { holder, key, descriptor } of entries) {
    Object.defineProperty(holder, key, { ...descriptor, value: thrower(descriptor.value) });
  }
  try {
    return await body();
  } finally {
    for (const { holder, key, descriptor } of entries) {
      Object.defineProperty(holder, key, descriptor);
    }
  }
}

describe('connect client relay routes under the Cloudflare no-runtime-codegen constraint (simulated)', () => {
  // --- positive controls -------------------------------------------------

  it('control: the guard blocks new Function / eval with the exact deployed EvalError and restores them', async () => {
    await withoutRuntimeCodegen(async () => {
      expect(() => new Function('return 1')).toThrowError(new EvalError(CODEGEN_MESSAGE));
      expect(() => Function('return 1')).toThrowError(new EvalError(CODEGEN_MESSAGE));
      expect(() => (function () {}).constructor('return 1')).toThrowError(new EvalError(CODEGEN_MESSAGE));
      // eslint-disable-next-line no-eval
      expect(() => eval('1')).toThrowError(new EvalError(CODEGEN_MESSAGE));
      expect(() => (async () => {}).constructor('return 1')).toThrowError(new EvalError(CODEGEN_MESSAGE));
    });
    expect(new Function('return 1')()).toBe(1);
    // eslint-disable-next-line no-eval
    expect(eval('1 + 1')).toBe(2);
  });

  it('control: the parser\'s Ajv2020.compile of the canonical protocol schema is what the guard catches', async () => {
    // Exactly the construction at connect_client_relay_request_parser.ts:29.
    const compileCanonicalSchema = () => new Ajv2020({ allErrors: false, strict: true }).compile(protocolSchema);
    expect(() => compileCanonicalSchema()).not.toThrow();
    await withoutRuntimeCodegen(async () => {
      expect(() => compileCanonicalSchema()).toThrowError(new EvalError(CODEGEN_MESSAGE));
    });
  });

  it('control: on unrestricted Node the real route answers 200 with the protocol header', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectClientRelay'] } })
      .use(desktopAuth())
      .method(ConnectExecutorRepo, 'listByOwner', control.once(control.returns(Promise.resolve([executorRow()]))))
      .build();
    const response = await env.request({
      method: 'GET',
      path: '/v1/connect/client-relay/executors',
      headers: relayHeaders(),
      query: { correlationId: CORRELATION_ID },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('x-kazi-protocol-version')).toBe('1.0');
    expect(await response.json()).toEqual(executorListResponse());
    await env.verify();
  }));

  it('GET /executors accepts the existing executor machine credential without runtime codegen', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectClientRelay'] } })
      .method(ConnectExecutorCredentialRepo, 'findByTokenHash', control.returns(Promise.resolve({
        credential_id: 'cred_machine01', executor_id: EXECUTOR_ID, generation: 1,
        token_hash: sha256(TOKEN), status: 'active', created_at: '2026-01-01T00:00:00.000Z', revoked_at: null,
      })))
      .method(ConnectExecutorRepo, 'findByExecutorId', control.returns(Promise.resolve(executorRow())))
      .method(ConnectExecutorRepo, 'listByOwner', control.returns(Promise.resolve([executorRow()])))
      .method(ConnectDesktopCredentialRepo, 'findByTokenHash', control.never())
      .method(ConnectDesktopDeviceRepo, 'findByDeviceId', control.never())
      .build();
    const response = await withoutRuntimeCodegen(() => env.request({
      method: 'GET', path: '/v1/connect/client-relay/executors',
      headers: { ...relayHeaders(), 'x-kazi-audience': 'executor-relay', 'x-kazi-device-id': 'dev_machine01' },
      query: { correlationId: CORRELATION_ID },
    }));
    expect({
      status: response.status, protocolVersion: response.headers.get('x-kazi-protocol-version'),
      body: await response.json(),
    }).toEqual({ status: 200, protocolVersion: '1.0', body: executorListResponse() });
  }));

  // --- regression cases: cold request handling must not compile code --------

  it('GET /executors with a valid Desktop credential answers 200 when runtime codegen is disallowed', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectClientRelay'] } })
      .use(desktopAuth())
      .method(ConnectExecutorRepo, 'listByOwner', control.returns(Promise.resolve([executorRow()])))
      .build();
    // Guard is scoped to the request: the framework has finished its setup,
    // the controller/parser are resolved cold on the request path, while
    // framework route validators are already prepared as in the worker build.
    const response = await withoutRuntimeCodegen(() => env.request({
      method: 'GET',
      path: '/v1/connect/client-relay/executors',
      headers: relayHeaders(),
      query: { correlationId: CORRELATION_ID },
    }));
    const body = await response.json();
    expect({ status: response.status, protocolVersion: response.headers.get('x-kazi-protocol-version'), body })
      .toEqual({ status: 200, protocolVersion: '1.0', body: executorListResponse() });
    await env.verify();
  }));

  it('GET /executors with an unknown credential answers 401 revoked with the protocol header when runtime codegen is disallowed', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectClientRelay'] } })
      .method(ConnectDesktopCredentialRepo, 'findByTokenHash', control.returns(Promise.resolve(null)))
      .method(ConnectExecutorRepo, 'listByOwner', control.never())
      .build();
    const response = await withoutRuntimeCodegen(() => env.request({
      method: 'GET',
      path: '/v1/connect/client-relay/executors',
      headers: relayHeaders(),
      query: { correlationId: CORRELATION_ID },
    }));
    const body = await response.json();
    expect({ status: response.status, protocolVersion: response.headers.get('x-kazi-protocol-version'), body })
      .toMatchObject({
        status: 401,
        protocolVersion: '1.0',
        body: { kind: 'error', protocolVersion: '1.0', code: 'revoked', correlationId: CORRELATION_ID },
      });
    await env.verify();
  }));
});
