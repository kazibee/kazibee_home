/**
 * Update (Squirrel auto-update) routes through testDinner (no server, no S3).
 *
 * The real controller runs in-process against its production updates.yaml
 * source; the logic boundary (UpdateLogic) is controlled via .methods so the
 * controller's arch validation and error mapping run fully real.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { load as parseYaml } from 'js-yaml';
import { testDinner } from '@noego/dinner/testing';
import { test as control } from '@noego/testing';
import UpdateController from '../../../src/server/controller/update.controller';
import { NotFoundError, ValidationError } from '../../../src/server/errors/domain_errors';

const updatesSource = parseYaml(
  readFileSync(path.resolve(__dirname, '../../../src/server/openapi/updates/updates.yaml'), 'utf8')
) as Record<string, unknown>;

const base = () =>
  testDinner(updatesSource)
    .select({ module: 'updates' })
    .controllers({ 'update.controller': UpdateController })
    .hooks({});

describe('update routes through testDinner (no server, no S3)', () => {
  it('GET /updates/darwin/:arch/RELEASES.json returns the feed for a valid arch', async () => {
    const feed = { currentRelease: '1.4.2', releases: [] };
    const env = await base()
      .methods({
        UpdateLogic: { createFeed: control.once(control.returns(Promise.resolve(feed))) },
      })
      .build();
    const response = await env.dinner.request({
      method: 'GET', path: '/updates/darwin/arm64/RELEASES.json',
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(feed);
    await env.verify();
    await env.dispose();
  });

  it('a NotFoundError from the feed logic maps to 404', async () => {
    const env = await base()
      .methods({
        UpdateLogic: {
          createFeed: control.once(control.throws(new NotFoundError('No app releases available'))),
        },
      })
      .build();
    const response = await env.dinner.request({
      method: 'GET', path: '/updates/darwin/x64/RELEASES.json',
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: true, message: 'No app releases available' });
    await env.verify();
    await env.dispose();
  });

  it('an unexpected feed failure degrades to a structured 500', async () => {
    const env = await base()
      .methods({
        UpdateLogic: { createFeed: control.once(control.throws(new Error('S3 unreachable'))) },
      })
      .build();
    const response = await env.dinner.request({
      method: 'GET', path: '/updates/darwin/arm64/RELEASES.json',
    });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: true, message: 'Internal server error' });
    await env.verify();
    await env.dispose();
  });

  it('GET /updates/win32/:arch/RELEASES serves the manifest as text/plain', async () => {
    const manifest = 'HASH kazibee-1.4.2-full.nupkg 12345';
    const env = await base()
      .methods({
        UpdateLogic: {
          createWindowsReleases: control.once(control.returns(Promise.resolve(manifest))),
        },
      })
      .build();
    const response = await env.dinner.request({
      method: 'GET', path: '/updates/win32/x64/RELEASES',
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/plain');
    expect(await response.text()).toBe(manifest);
    await env.verify();
    await env.dispose();
  });

  it('windows releases map ValidationError to 400 and NotFoundError to 404', async () => {
    for (const { error, status } of [
      { error: new ValidationError('Invalid package name'), status: 400 },
      { error: new NotFoundError('No published release with a RELEASES manifest'), status: 404 },
    ]) {
      const env = await base()
        .methods({
          UpdateLogic: { createWindowsReleases: control.once(control.throws(error)) },
        })
        .build();
      const response = await env.dinner.request({
        method: 'GET', path: '/updates/win32/x64/RELEASES',
      });
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ error: true, message: error.message });
      await env.verify();
      await env.dispose();
    }
  });

  it('GET /updates/win32/:arch/:file redirects 302 to the temporary package URL', async () => {
    const env = await base()
      .methods({
        UpdateLogic: {
          createWindowsPackageDownload: control.once(
            control.returns(Promise.resolve('https://s3.example/signed/kazibee-full.nupkg')),
          ),
        },
      })
      .build();
    const response = await env.dinner.request({
      method: 'GET', path: '/updates/win32/x64/kazibee-1.4.2-full.nupkg',
    });
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://s3.example/signed/kazibee-full.nupkg');
    await env.verify();
    await env.dispose();
  });

  it('a missing windows package maps to 404; an invalid one to 400; a crash to 500', async () => {
    for (const { error, status } of [
      { error: new NotFoundError('Package not found'), status: 404 },
      { error: new ValidationError('Invalid download item'), status: 400 },
      { error: new Error('presign blew up'), status: 500 },
    ]) {
      const env = await base()
        .methods({
          UpdateLogic: { createWindowsPackageDownload: control.once(control.throws(error)) },
        })
        .build();
      const response = await env.dinner.request({
        method: 'GET', path: '/updates/win32/x64/kazibee-1.4.2-full.nupkg',
      });
      expect(response.status).toBe(status);
      await env.verify();
      await env.dispose();
    }
  });

  it('an arch outside the schema enum is rejected before the controller logic runs', async () => {
    const env = await base()
      .methods({ UpdateLogic: { createFeed: control.never() } })
      .build();
    const response = await env.dinner.request({
      method: 'GET', path: '/updates/darwin/ia32/RELEASES.json',
    });
    expect(response.status).toBe(400);
    await env.verify();
    await env.dispose();
  });
});
