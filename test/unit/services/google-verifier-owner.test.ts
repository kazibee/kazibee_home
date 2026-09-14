import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { testApp } from '@noego/app';
import { resourceCase, test as control } from '@noego/testing';
import Env from '../../../src/server/services/env';
import ConnectGoogleTokenVerifier from '../../../src/server/services/connect_google_token_verifier';
import ConnectGoogleTokenInfoClient from '../../../src/server/services/connect_google_token_info_client';

const CONFIG = path.resolve(__dirname, '../../../noego.config.yml');

describe('Google verification application ownership', () => {
  it('uses the selected root environment rather than process-global Google settings', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
      .function(Env, () => {
        const value = new Env();
        value.load({ GOOGLE_CLIENT_ID: 'root-owned-client' });
        return value;
      })
      .method(ConnectGoogleTokenInfoClient, 'request', control.once(control.returns(
        Promise.resolve(Response.json({ aud: 'root-owned-client', sub: 'subject', email: 'Example@Email.test', email_verified: true })),
      )))
      .build();
    const verifier = await env.get<ConnectGoogleTokenVerifier>(ConnectGoogleTokenVerifier);
    await expect(verifier.verify('token')).resolves.toEqual({ subject: 'subject', email: 'example@email.test' });
    expect(control.inspect(env, ConnectGoogleTokenInfoClient, 'request').calls[0].args)
      .toEqual(['https://oauth2.googleapis.com/tokeninfo?id_token=token']);
  }));

  it('keeps different Google audiences isolated across simultaneous application roots', resourceCase(async () => {
    const claims = { aud: 'client-a', sub: 'subject-a', email: 'A@Email.test', email_verified: 'true' };
    const a = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
      .function(Env, () => {
        const value = new Env(); value.load({ GOOGLE_CLIENT_ID: 'client-a' }); return value;
      })
      .method(ConnectGoogleTokenInfoClient, 'request', control.once(control.returns(Promise.resolve(Response.json(claims)))))
      .build();
    const b = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
      .function(Env, () => {
        const value = new Env(); value.load({ GOOGLE_CLIENT_ID: 'client-b' }); return value;
      })
      .method(ConnectGoogleTokenInfoClient, 'request', control.once(control.returns(Promise.resolve(Response.json(claims)))))
      .build();
    const first = await a.get<ConnectGoogleTokenVerifier>(ConnectGoogleTokenVerifier);
    const second = await b.get<ConnectGoogleTokenVerifier>(ConnectGoogleTokenVerifier);
    expect(first).not.toBe(second);
    await expect(Promise.all([first.verify('token/a'), second.verify('token/b')]))
      .resolves.toEqual([{ subject: 'subject-a', email: 'a@email.test' }, null]);
    expect(control.inspect(a, ConnectGoogleTokenInfoClient, 'request').calls[0].args)
      .toEqual(['https://oauth2.googleapis.com/tokeninfo?id_token=token%2Fa']);
    expect(control.inspect(b, ConnectGoogleTokenInfoClient, 'request').calls[0].args)
      .toEqual(['https://oauth2.googleapis.com/tokeninfo?id_token=token%2Fb']);
  }));

  it('cancels an unsuccessful token-info response body before failing closed', resourceCase(async () => {
    let cancelled = 0;
    const response = new Response(new ReadableStream({ cancel() { cancelled += 1; } }), { status: 400 });
    const app = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
      .function(Env, () => {
        const value = new Env(); value.load({ GOOGLE_CLIENT_ID: 'client' }); return value;
      })
      .method(ConnectGoogleTokenInfoClient, 'request', control.once(control.returns(Promise.resolve(response))))
      .build();
    const verifier = await app.get<ConnectGoogleTokenVerifier>(ConnectGoogleTokenVerifier);
    await expect(verifier.verify('rejected')).resolves.toBeNull();
    expect(cancelled).toBe(1);
  }));

});
