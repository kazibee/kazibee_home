/** Original 8 HTTP cases migrated to root testApp and the original config.
 * Historical case names remain stable. Source routing/error handling stays real;
 * the declared method controls stop claims at the existing service/logic boundary.
 * resourceCase owns cleanup on every exit. No listening app, database, or S3 call.
 */
import { describe, it, expect } from 'vitest';

import path from 'node:path';

import { testApp } from '@noego/app';
import { test as control, resourceCase } from '@noego/testing';

import { NotFoundError, ValidationError } from '../../../src/server/errors/domain_errors';
import UpdateLogic from '../../../src/server/logic/update.logic';

const CONFIG = path.resolve(__dirname, '../../../noego.config.yml');

describe('update routes through testDinner (no server, no S3)', () => {
  it('GET /updates/darwin/:arch/RELEASES.json returns the feed for a valid arch', resourceCase(async () => {
    const feed = { currentRelease: '1.4.2', releases: [] };
    const env = await testApp(CONFIG).select({ server: { module: ["updates"] } }).method(UpdateLogic, "createFeed", control.once(control.returns(Promise.resolve(feed))))
      .build();
    const response = await env.request({
      method: 'GET', path: '/updates/darwin/arm64/RELEASES.json',
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(feed);
    await env.verify();

  }));

  it('a NotFoundError from the feed logic maps to 404', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["updates"] } }).method(UpdateLogic, "createFeed", control.once(control.throws(new NotFoundError('No app releases available'))))
      .build();
    const response = await env.request({
      method: 'GET', path: '/updates/darwin/x64/RELEASES.json',
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: true, message: 'No app releases available' });
    await env.verify();

  }));

  it('an unexpected feed failure degrades to a structured 500', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["updates"] } }).method(UpdateLogic, "createFeed", control.once(control.throws(new Error('S3 unreachable'))))
      .build();
    const response = await env.request({
      method: 'GET', path: '/updates/darwin/arm64/RELEASES.json',
    });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: true, message: 'Internal server error' });
    await env.verify();

  }));

  it('GET /updates/win32/:arch/RELEASES serves the manifest as text/plain', resourceCase(async () => {
    const manifest = 'HASH kazibee-1.4.2-full.nupkg 12345';
    const env = await testApp(CONFIG).select({ server: { module: ["updates"] } }).method(UpdateLogic, "createWindowsReleases", control.once(control.returns(Promise.resolve(manifest))))
      .build();
    const response = await env.request({
      method: 'GET', path: '/updates/win32/x64/RELEASES',
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/plain');
    expect(await response.text()).toBe(manifest);
    await env.verify();

  }));

  it('windows releases map ValidationError to 400 and NotFoundError to 404', resourceCase(async () => {
    for (const { error, status } of [
      { error: new ValidationError('Invalid package name'), status: 400 },
      { error: new NotFoundError('No published release with a RELEASES manifest'), status: 404 },
    ]) {
      const env = await testApp(CONFIG).select({ server: { module: ["updates"] } }).method(UpdateLogic, "createWindowsReleases", control.once(control.throws(error)))
        .build();
      const response = await env.request({
        method: 'GET', path: '/updates/win32/x64/RELEASES',
      });
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ error: true, message: error.message });
      await env.verify();

    }
  }));

  it('GET /updates/win32/:arch/:file redirects 302 to the temporary package URL', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["updates"] } }).method(UpdateLogic, "createWindowsPackageDownload", control.once(
            control.returns(Promise.resolve('https://s3.example/signed/kazibee-full.nupkg')),
          ))
      .build();
    const response = await env.request({
      method: 'GET', path: '/updates/win32/x64/kazibee-1.4.2-full.nupkg',
    });
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://s3.example/signed/kazibee-full.nupkg');
    await env.verify();

  }));

  it('a missing windows package maps to 404; an invalid one to 400; a crash to 500', resourceCase(async () => {
    for (const { error, status } of [
      { error: new NotFoundError('Package not found'), status: 404 },
      { error: new ValidationError('Invalid download item'), status: 400 },
      { error: new Error('presign blew up'), status: 500 },
    ]) {
      const env = await testApp(CONFIG).select({ server: { module: ["updates"] } }).method(UpdateLogic, "createWindowsPackageDownload", control.once(control.throws(error)))
        .build();
      const response = await env.request({
        method: 'GET', path: '/updates/win32/x64/kazibee-1.4.2-full.nupkg',
      });
      expect(response.status).toBe(status);
      await response.body?.cancel(); // Status-only assertion still owns its HTTP body lease.
      await env.verify();

    }
  }));

  it('an arch outside the schema enum is rejected before the controller logic runs', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["updates"] } }).method(UpdateLogic, "createFeed", control.never())
      .build();
    const response = await env.request({
      method: 'GET', path: '/updates/darwin/ia32/RELEASES.json',
    });
    expect(response.status).toBe(400);
    await response.body?.cancel();
    await env.verify();

  }));
});
