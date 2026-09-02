/**
 * Remaining negative paths across the executor services: parser envelope
 * rejection for non-record decision bodies, the policy HTTPS guard, the
 * actor resolver's auth failure branches, and the connection registry's
 * unsubscribe/backpressure edges. All directly constructed instances —
 * every collaborator is a hand-built stub at the same seams the testDinner
 * suites stub via .methods.
 */
import { describe, it, expect, vi } from 'vitest';
import type { CompatRequest as Request } from '@noego/dinner';
import type { SseSink as Response } from '../../../src/server/services/sse_stream';
import Env from '../../../src/server/services/env';
import ConnectExecutorPolicy from '../../../src/server/services/connect_executor_policy';
import ConnectExecutorRequestParser from '../../../src/server/services/connect_executor_request_parser';
import ConnectExecutorActorResolver, {
  ConnectExecutorDeviceAuthVerifier,
} from '../../../src/server/services/connect_executor_actor_resolver';
import ConnectExecutorConnectionRegistry from '../../../src/server/services/connect_executor_connection_registry';
import {
  ConnectClock,
  ConnectCredentials,
  ConnectIdGenerator,
} from '../../../src/server/services/connect_auth_primitives';
import type ConnectSessionAuthService from '../../../src/server/services/connect_session_auth_service';
import type ConnectAuthPolicy from '../../../src/server/services/connect_auth_policy';
import type ConnectExecutorCredentialRepo from '../../../src/server/repo/connect_executor_credential_repo';
import type ConnectExecutorRepo from '../../../src/server/repo/connect_executor_repo';

const SESSION_ID = 'ses_abcdefgh';
const EXECUTOR_ID = 'exe_abcdefgh';
const DEVICE_ID = 'dev_abcdefgh';
const DEVICE_TOKEN = 'T'.repeat(43);

describe('ConnectExecutorRequestParser.decision', () => {
  const parser = new ConnectExecutorRequestParser(new ConnectExecutorPolicy(new Env()));

  it('rejects non-record decision bodies with the fallback correlation id', () => {
    expect(parser.decision('nope', 'clm_abcdefgh')).toEqual({
      ok: false, reason: 'invalid-envelope', correlationId: 'cor_invalid000',
    });
    expect(parser.decision(null, 'clm_abcdefgh')).toMatchObject({ ok: false });
  });
});

describe('ConnectExecutorPolicy.claimBaseUrl', () => {
  it('refuses a configured non-HTTPS account url', () => {
    const env = new Env();
    env.load({ KAZI_CONNECT_ACCOUNT_URL: 'http://connect.kazibee.example' });
    const policy = new ConnectExecutorPolicy(env);
    expect(() => policy.claimBaseUrl).toThrow('KAZI_CONNECT_ACCOUNT_URL must use HTTPS');
  });

  it('normalizes a configured HTTPS account url without a trailing slash', () => {
    const env = new Env();
    env.load({ KAZI_CONNECT_ACCOUNT_URL: 'https://connect.example.test/' });
    const policy = new ConnectExecutorPolicy(env);
    expect(policy.claimBaseUrl).toBe('https://connect.example.test');
  });
});

describe('ConnectExecutorActorResolver', () => {
  const authPolicy = {
    sessionCookieName: 'kazi_connect_session', csrfCookieName: 'kazi_connect_csrf',
  } as unknown as ConnectAuthPolicy;
  const credentials = new ConnectCredentials();

  const sessionRow = (sessionId: string) => ({
    ok: true as const,
    value: {
      session: { session_id: sessionId },
      account: { user_id: 'usr_owner001' },
    },
  });

  const resolver = (overrides: {
    sessions?: Record<string, unknown>;
    credentialRepo?: Record<string, unknown>;
    executorRepo?: Record<string, unknown>;
  } = {}) => new ConnectExecutorActorResolver(
    (overrides.sessions ?? {}) as unknown as ConnectSessionAuthService,
    authPolicy,
    credentials,
    (overrides.credentialRepo ?? {}) as unknown as ConnectExecutorCredentialRepo,
    (overrides.executorRepo ?? {}) as unknown as ConnectExecutorRepo,
  );

  const request = (cookies: unknown) =>
    ({ cookies, headers: {} }) as unknown as Request;

  it('rejects a browser session whose id does not match the requested one', async () => {
    const subject = resolver({
      sessions: { authenticate: async () => sessionRow('ses_otherone') },
    });
    const result = await subject.browser(request({ kazi_connect_session: 'S'.repeat(43) }), SESSION_ID, false);
    expect(result).toEqual({ ok: false, reason: 'unauthorized' });
  });

  it('treats a non-record cookie jar as an absent session cookie', async () => {
    const seen: unknown[] = [];
    const subject = resolver({
      sessions: {
        authenticate: async (token: unknown) => {
          seen.push(token);
          return { ok: false as const, reason: 'unauthorized' as const };
        },
      },
    });
    expect(await subject.browser(request(['not', 'a', 'jar']), SESSION_ID, false))
      .toEqual({ ok: false, reason: 'unauthorized' });
    expect(await subject.browser(request(null), SESSION_ID, false))
      .toEqual({ ok: false, reason: 'unauthorized' });
    expect(seen).toEqual([null, null]);
  });

  it('rejects a device without a token', async () => {
    expect(await resolver().device(null)).toEqual({ ok: false, reason: 'unauthorized' });
  });

  it('rejects a device whose credential is missing or inactive', async () => {
    const missing = resolver({ credentialRepo: { findByTokenHash: async () => null } });
    expect(await missing.device(DEVICE_TOKEN)).toEqual({ ok: false, reason: 'unauthorized' });

    const revoked = resolver({
      credentialRepo: {
        findByTokenHash: async () => ({ executor_id: EXECUTOR_ID, generation: 1, status: 'revoked' }),
      },
    });
    expect(await revoked.device(DEVICE_TOKEN)).toEqual({ ok: false, reason: 'unauthorized' });
  });

  it('rejects a device whose executor is missing, inactive, or generation-fenced', async () => {
    const credentialRepo = {
      findByTokenHash: async () => ({ executor_id: EXECUTOR_ID, generation: 1, status: 'active' }),
    };
    const rows: unknown[] = [
      null,
      { executor_id: EXECUTOR_ID, device_id: DEVICE_ID, state: 'revoked', credential_generation: 1 },
      { executor_id: EXECUTOR_ID, device_id: DEVICE_ID, state: 'active', credential_generation: 2 },
    ];
    const subject = resolver({
      credentialRepo,
      executorRepo: { findByExecutorId: async () => rows.shift() },
    });
    for (let index = 0; index < 3; index += 1) {
      expect(await subject.device(DEVICE_TOKEN)).toEqual({ ok: false, reason: 'unauthorized' });
    }
  });

  it('verifier maps a resolver rejection onto a bare not-ok', async () => {
    const verifier = new ConnectExecutorDeviceAuthVerifier(resolver());
    expect(await verifier.verify(null)).toEqual({ ok: false });
  });
});

describe('ConnectExecutorConnectionRegistry edges', () => {
  class TestClock extends ConnectClock {
    override now(): Date { return new Date(1_000); }
  }
  class TestIds extends ConnectIdGenerator {
    override channelFenceId(): string { return 'fen_test1'; }
  }

  function response() {
    const value = {
      destroyed: false,
      writableEnded: false,
      write: vi.fn(() => true),
      end: vi.fn(),
    };
    return { value: value as unknown as Response, state: value };
  }

  const registry = () => new ConnectExecutorConnectionRegistry(new TestClock(), new TestIds());

  it('stops notifying a disconnect listener after unsubscribe', () => {
    const value = registry();
    const seen: string[] = [];
    const unsubscribe = value.onDisconnect((executorId) => seen.push(executorId));
    expect(unsubscribe()).toBe(true);
    const { value: sink } = response();
    const fence = value.open({
      executorId: EXECUTOR_ID, deviceId: DEVICE_ID, generation: 1, response: sink,
    });
    value.close(EXECUTOR_ID, fence);
    expect(seen).toEqual([]);
  });

  it('treats a sink that already ended as backpressure and drops the connection', () => {
    const value = registry();
    const { value: sink, state } = response();
    value.open({
      executorId: EXECUTOR_ID, deviceId: DEVICE_ID, generation: 1, response: sink,
    });
    state.writableEnded = true;
    expect(value.dispatch(EXECUTOR_ID, { n: 1 })).toEqual({ ok: false, reason: 'backpressure' });
    expect(state.write).not.toHaveBeenCalled();
    expect(value.presence(EXECUTOR_ID)).toBe('offline');
  });
});
