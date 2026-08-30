/**
 * ConnectExecutorRequestParser envelope validation, in isolation.
 *
 * The parser is pure over its inputs; its single dependency
 * (ConnectExecutorPolicy) only contributes the bootstrap header name, so a
 * directly constructed instance with a fresh Env is the whole graph.
 */
import { describe, it, expect } from 'vitest';
import type { CompatRequest } from '@noego/dinner';
import Env from '../../../src/server/services/env';
import ConnectExecutorPolicy from '../../../src/server/services/connect_executor_policy';
import ConnectExecutorRequestParser from '../../../src/server/services/connect_executor_request_parser';

const parser = new ConnectExecutorRequestParser(new ConnectExecutorPolicy(new Env()));

const COR = 'cor_abcdefgh';

const claimBody = (overrides: Record<string, unknown> = {}) => ({
  kind: 'executor.claim.create.request', protocolVersion: '1.0',
  claimId: 'clm_abcdefgh', executorId: 'exe_abcdefgh', deviceId: 'dev_abcdefgh',
  actorRole: 'executor_device', displayName: 'Build Box', platform: 'macos',
  architecture: 'arm64', executorVersion: '1.2.3',
  keyFingerprint: 'a'.repeat(64), idempotencyKey: 'idem_0123456789abcdef',
  correlationId: COR,
  ...overrides,
});

const decisionBody = (overrides: Record<string, unknown> = {}) => ({
  kind: 'executor.claim.decision.request', protocolVersion: '1.0',
  claimId: 'clm_abcdefgh', sessionId: 'ses_abcdefgh', actorRole: 'browser_session',
  decision: 'accept', idempotencyKey: 'idem_0123456789abcdef', correlationId: COR,
  ...overrides,
});

const asRequest = (value: { query?: Record<string, unknown>; headers?: Record<string, unknown> }) =>
  ({ query: value.query ?? {}, headers: value.headers ?? {} }) as unknown as CompatRequest;

describe('claimCreate', () => {
  it('accepts a fully valid envelope', () => {
    const result = parser.claimCreate(claimBody());
    expect(result).toMatchObject({ ok: true, value: { claimId: 'clm_abcdefgh' } });
  });

  it('rejects non-record bodies with the fallback correlation id', () => {
    expect(parser.claimCreate('nope')).toEqual({
      ok: false, reason: 'invalid-envelope', correlationId: 'cor_invalid000',
    });
    expect(parser.claimCreate([claimBody()])).toMatchObject({ ok: false });
  });

  it('rejects extra or missing keys but keeps a valid correlation id', () => {
    expect(parser.claimCreate({ ...claimBody(), extra: 1 })).toEqual({
      ok: false, reason: 'invalid-envelope', correlationId: COR,
    });
    const { displayName: _dropped, ...missing } = claimBody();
    expect(parser.claimCreate(missing)).toMatchObject({ ok: false, reason: 'invalid-envelope' });
  });

  it('reports protocol-version-mismatch with the envelope correlation id', () => {
    expect(parser.claimCreate(claimBody({ protocolVersion: '2.0' }))).toEqual({
      ok: false, reason: 'protocol-version-mismatch', correlationId: COR,
    });
  });

  it.each([
    ['kind', 'other.kind'],
    ['actorRole', 'browser_session'],
    ['claimId', 'bad'],
    ['executorId', 'exe_!'],
    ['deviceId', 'dev'],
    ['displayName', ' leading-space'],
    ['platform', 'beos'],
    ['architecture', 'riscv'],
    ['executorVersion', 'not-semver'],
    ['keyFingerprint', 'Z'.repeat(64)],
    ['idempotencyKey', 'idem_short'],
    ['correlationId', 'cor'],
  ])('rejects an invalid %s', (key, value) => {
    expect(parser.claimCreate(claimBody({ [key]: value }))).toMatchObject({
      ok: false, reason: 'invalid-envelope',
    });
  });

  it('rejects the windows/arm64 combination but allows windows/x64', () => {
    expect(parser.claimCreate(claimBody({ platform: 'windows', architecture: 'arm64' })))
      .toMatchObject({ ok: false });
    expect(parser.claimCreate(claimBody({ platform: 'windows', architecture: 'x64' })))
      .toMatchObject({ ok: true });
  });
});

describe('decision', () => {
  it('accepts a valid decision envelope matched to the path claim id', () => {
    expect(parser.decision(decisionBody(), 'clm_abcdefgh')).toMatchObject({ ok: true });
    expect(parser.decision(decisionBody({ decision: 'deny' }), 'clm_abcdefgh')).toMatchObject({ ok: true });
  });

  it('rejects a body/path claim id mismatch', () => {
    expect(parser.decision(decisionBody(), 'clm_otherid1')).toMatchObject({
      ok: false, reason: 'invalid-envelope', correlationId: COR,
    });
  });

  it('rejects an unknown decision and a bad session id', () => {
    expect(parser.decision(decisionBody({ decision: 'maybe' }), 'clm_abcdefgh')).toMatchObject({ ok: false });
    expect(parser.decision(decisionBody({ sessionId: 'nope' }), 'clm_abcdefgh')).toMatchObject({ ok: false });
  });

  it('reports protocol mismatch before field validation', () => {
    expect(parser.decision(decisionBody({ protocolVersion: '9.9' }), 'clm_abcdefgh')).toMatchObject({
      ok: false, reason: 'protocol-version-mismatch',
    });
  });
});

describe('rename / revoke', () => {
  const renameBody = (overrides: Record<string, unknown> = {}) => ({
    kind: 'executor.rename.request', protocolVersion: '1.0', executorId: 'exe_abcdefgh',
    displayName: 'New Name', idempotencyKey: 'idem_0123456789abcdef', correlationId: COR,
    ...overrides,
  });
  const revokeBody = (overrides: Record<string, unknown> = {}) => ({
    kind: 'executor.action.request', protocolVersion: '1.0', executorId: 'exe_abcdefgh',
    action: 'revoke', idempotencyKey: 'idem_0123456789abcdef', correlationId: COR,
    ...overrides,
  });

  it('accepts valid rename and revoke envelopes', () => {
    expect(parser.rename(renameBody(), 'exe_abcdefgh')).toMatchObject({ ok: true });
    expect(parser.revoke(revokeBody(), 'exe_abcdefgh')).toMatchObject({ ok: true });
  });

  it('rejects executor id mismatch and invalid display names', () => {
    expect(parser.rename(renameBody(), 'exe_otherid1')).toMatchObject({ ok: false });
    expect(parser.rename(renameBody({ displayName: '"quoted"' }), 'exe_abcdefgh')).toMatchObject({ ok: false });
  });

  it('rejects a rename envelope with the wrong kind and a revoke with the wrong action', () => {
    expect(parser.rename(renameBody({ kind: 'executor.action.request', displayName: 'x' }), 'exe_abcdefgh'))
      .toMatchObject({ ok: false });
    expect(parser.revoke(revokeBody({ action: 'detonate' }), 'exe_abcdefgh')).toMatchObject({ ok: false });
    expect(parser.revoke(revokeBody({ kind: 'executor.rename.request' }), 'exe_abcdefgh')).toMatchObject({ ok: false });
  });

  it('reports protocol mismatch and rejects missing keys', () => {
    expect(parser.revoke(revokeBody({ protocolVersion: '0.9' }), 'exe_abcdefgh')).toMatchObject({
      ok: false, reason: 'protocol-version-mismatch',
    });
    const { idempotencyKey: _dropped, ...missing } = renameBody();
    expect(parser.rename(missing, 'exe_abcdefgh')).toMatchObject({ ok: false });
  });
});

describe('request helpers', () => {
  it('correlation() returns the query value or the fallback', () => {
    expect(parser.correlation(asRequest({ query: { correlationId: COR } }))).toBe(COR);
    expect(parser.correlation(asRequest({ query: { correlationId: 'bad' } }))).toBe('cor_invalid000');
    expect(parser.correlation(asRequest({ query: {} }))).toBe('cor_invalid000');
  });

  it('bootstrapToken() only accepts a 43-char url-safe header value', () => {
    const token = 'B'.repeat(43);
    expect(parser.bootstrapToken(asRequest({ headers: { 'x-kazi-bootstrap-token': token } }))).toBe(token);
    expect(parser.bootstrapToken(asRequest({ headers: { 'x-kazi-bootstrap-token': 'short' } }))).toBeNull();
    expect(parser.bootstrapToken(asRequest({ headers: {} }))).toBeNull();
  });

  it('lookup() distinguishes claim ids, short codes, and garbage', () => {
    expect(parser.lookup('clm_abcdefgh')).toEqual({ claimId: 'clm_abcdefgh' });
    expect(parser.lookup('ABCD-EFGH')).toEqual({ code: 'ABCD-EFGH' });
    expect(parser.lookup('nonsense')).toBeNull();
    expect(parser.lookup(42)).toBeNull();
  });

  it('browserQuery() demands exactly sessionId and correlationId', () => {
    expect(parser.browserQuery(asRequest({ query: { sessionId: 'ses_abcdefgh', correlationId: COR } })))
      .toEqual({ ok: true, value: { sessionId: 'ses_abcdefgh', correlationId: COR } });
    expect(parser.browserQuery(asRequest({ query: { sessionId: 'ses_abcdefgh', correlationId: COR, extra: '1' } })))
      .toMatchObject({ ok: false, reason: 'invalid-envelope', correlationId: COR });
    expect(parser.browserQuery(asRequest({ query: { sessionId: 'bad', correlationId: COR } })))
      .toMatchObject({ ok: false });
    expect(parser.browserQuery(asRequest({ query: {} }))).toMatchObject({ ok: false });
  });
});
