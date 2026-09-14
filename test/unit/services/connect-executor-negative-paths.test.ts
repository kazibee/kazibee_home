/**
 * Remaining negative paths across the executor services: parser envelope
 * rejection for non-record decision bodies, the policy HTTPS guard, the
 * actor resolver's auth failure branches, and the connection registry's
 * unsubscribe/backpressure edges. Every subject is the real production
 * instance resolved from the original-config root testApp (connectExecutors
 * module, no server, no database); only the session/repo boundaries are
 * replaced through singular method controls, the registry's clock/id
 * primitives through class replacements, and environment data through a
 * caller-built Env. resourceCase owns environment cleanup.
 */
import { describe, it, expect, vi } from 'vitest';
import path from 'node:path';
import { testApp } from '@noego/app';
import { resourceCase, test as control } from '@noego/testing';
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
  ConnectIdGenerator,
} from '../../../src/server/services/connect_auth_primitives';
import ConnectSessionAuthService from '../../../src/server/services/connect_session_auth_service';
import ConnectExecutorCredentialRepo from '../../../src/server/repo/connect_executor_credential_repo';
import ConnectExecutorRepo from '../../../src/server/repo/connect_executor_repo';

const CONFIG = path.resolve(__dirname, '../../../noego.config.yml');
const SELECT = { server: { module: ['connectExecutors'] } } as const;

const SESSION_ID = 'ses_abcdefgh';
const EXECUTOR_ID = 'exe_abcdefgh';
const DEVICE_ID = 'dev_abcdefgh';
const DEVICE_TOKEN = 'T'.repeat(43);

const returns = (value: unknown) => control.returns(Promise.resolve(value));

// Environment data for one case: a caller-built Env loaded with exactly the
// case's variables; process.env is never mutated.
const envWith = (data: Record<string, string>) => () => {
  const env = new Env();
  env.load(data);
  return env;
};

describe('ConnectExecutorRequestParser.decision', () => {
  it('rejects non-record decision bodies with the fallback correlation id', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).build();
    const parser = await env.get<ConnectExecutorRequestParser>(ConnectExecutorRequestParser);
    expect(parser.decision('nope', 'clm_abcdefgh')).toEqual({
      ok: false, reason: 'invalid-envelope', correlationId: 'cor_invalid000',
    });
    expect(parser.decision(null, 'clm_abcdefgh')).toMatchObject({ ok: false });
  }));
});

describe('ConnectExecutorPolicy.claimBaseUrl', () => {
  it('refuses a configured non-HTTPS account url', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .function(Env, envWith({ KAZI_CONNECT_ACCOUNT_URL: 'http://connect.kazibee.example' }))
      .build();
    const policy = await env.get<ConnectExecutorPolicy>(ConnectExecutorPolicy);
    expect(() => policy.claimBaseUrl).toThrow('KAZI_CONNECT_ACCOUNT_URL must use HTTPS');
  }));

  it('normalizes a configured HTTPS account url without a trailing slash', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .function(Env, envWith({ KAZI_CONNECT_ACCOUNT_URL: 'https://connect.example.test/' }))
      .build();
    const policy = await env.get<ConnectExecutorPolicy>(ConnectExecutorPolicy);
    expect(policy.claimBaseUrl).toBe('https://connect.example.test');
  }));
});

describe('ConnectExecutorActorResolver', () => {
  const sessionRow = (sessionId: string) => ({
    ok: true as const,
    value: {
      session: { session_id: sessionId },
      account: { user_id: 'usr_owner001' },
    },
  });

  const request = (cookies: unknown) =>
    ({ cookies, headers: {} }) as unknown as Request;

  it('rejects a browser session whose id does not match the requested one', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .method(ConnectSessionAuthService, 'authenticate', control.once(returns(sessionRow('ses_otherone'))))
      .build();
    const subject = await env.get<ConnectExecutorActorResolver>(ConnectExecutorActorResolver);
    const result = await subject.browser(request({ kazi_connect_session: 'S'.repeat(43) }), SESSION_ID, false);
    expect(result).toEqual({ ok: false, reason: 'unauthorized' });
    await env.verify();
  }));

  it('treats a non-record cookie jar as an absent session cookie', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .method(ConnectSessionAuthService, 'authenticate',
        control.times(2, returns({ ok: false as const, reason: 'unauthorized' as const })))
      .build();
    const subject = await env.get<ConnectExecutorActorResolver>(ConnectExecutorActorResolver);
    expect(await subject.browser(request(['not', 'a', 'jar']), SESSION_ID, false))
      .toEqual({ ok: false, reason: 'unauthorized' });
    expect(await subject.browser(request(null), SESSION_ID, false))
      .toEqual({ ok: false, reason: 'unauthorized' });
    const seen = control.inspect(env, 'ConnectSessionAuthService', 'authenticate')
      .calls.map((call) => call.args[0]);
    expect(seen).toEqual([null, null]);
    await env.verify();
  }));

  it('rejects a device without a token', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .method(ConnectExecutorCredentialRepo, 'findByTokenHash', control.never())
      .method(ConnectExecutorRepo, 'findByExecutorId', control.never())
      .build();
    const subject = await env.get<ConnectExecutorActorResolver>(ConnectExecutorActorResolver);
    expect(await subject.device(null)).toEqual({ ok: false, reason: 'unauthorized' });
    await env.verify();
  }));

  it('rejects a device whose credential is missing or inactive', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .method(ConnectExecutorCredentialRepo, 'findByTokenHash', control.calls([
        returns(null),
        returns({ executor_id: EXECUTOR_ID, generation: 1, status: 'revoked' }),
      ]))
      .method(ConnectExecutorRepo, 'findByExecutorId', control.never())
      .build();
    const subject = await env.get<ConnectExecutorActorResolver>(ConnectExecutorActorResolver);
    expect(await subject.device(DEVICE_TOKEN)).toEqual({ ok: false, reason: 'unauthorized' });
    expect(await subject.device(DEVICE_TOKEN)).toEqual({ ok: false, reason: 'unauthorized' });
    await env.verify();
  }));

  it('rejects a device whose executor is missing, inactive, or generation-fenced', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .method(ConnectExecutorCredentialRepo, 'findByTokenHash',
        control.times(3, returns({ executor_id: EXECUTOR_ID, generation: 1, status: 'active' })))
      .method(ConnectExecutorRepo, 'findByExecutorId', control.calls([
        returns(null),
        returns({ executor_id: EXECUTOR_ID, device_id: DEVICE_ID, state: 'revoked', credential_generation: 1 }),
        returns({ executor_id: EXECUTOR_ID, device_id: DEVICE_ID, state: 'active', credential_generation: 2 }),
      ]))
      .build();
    const subject = await env.get<ConnectExecutorActorResolver>(ConnectExecutorActorResolver);
    for (let index = 0; index < 3; index += 1) {
      expect(await subject.device(DEVICE_TOKEN)).toEqual({ ok: false, reason: 'unauthorized' });
    }
    await env.verify();
  }));

  it('verifier maps a resolver rejection onto a bare not-ok', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .method(ConnectExecutorCredentialRepo, 'findByTokenHash', control.never())
      .method(ConnectExecutorRepo, 'findByExecutorId', control.never())
      .build();
    const verifier = await env.get<ConnectExecutorDeviceAuthVerifier>(ConnectExecutorDeviceAuthVerifier);
    expect(await verifier.verify(null)).toEqual({ ok: false });
    await env.verify();
  }));
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

  it('stops notifying a disconnect listener after unsubscribe', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, TestClock)
      .class(ConnectIdGenerator, TestIds)
      .build();
    const value = await env.get<ConnectExecutorConnectionRegistry>(ConnectExecutorConnectionRegistry);
    const seen: string[] = [];
    const unsubscribe = value.onDisconnect((executorId) => seen.push(executorId));
    expect(unsubscribe()).toBe(true);
    const { value: sink } = response();
    const fence = value.open({
      executorId: EXECUTOR_ID, deviceId: DEVICE_ID, generation: 1, response: sink,
    });
    try {
      value.close(EXECUTOR_ID, fence);
      expect(seen).toEqual([]);
    } finally {
      value.close(EXECUTOR_ID);
    }
  }));

  it('treats a sink that already ended as backpressure and drops the connection', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, TestClock)
      .class(ConnectIdGenerator, TestIds)
      .build();
    const value = await env.get<ConnectExecutorConnectionRegistry>(ConnectExecutorConnectionRegistry);
    const { value: sink, state } = response();
    value.open({
      executorId: EXECUTOR_ID, deviceId: DEVICE_ID, generation: 1, response: sink,
    });
    try {
      state.writableEnded = true;
      expect(value.dispatch(EXECUTOR_ID, { n: 1 })).toEqual({ ok: false, reason: 'backpressure' });
      expect(state.write).not.toHaveBeenCalled();
      expect(value.presence(EXECUTOR_ID)).toBe('offline');
    } finally {
      value.close(EXECUTOR_ID);
    }
  }));
});
