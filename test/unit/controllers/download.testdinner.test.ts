/** Original 6 HTTP cases migrated to root testApp and the original config.
 * Historical case names remain stable. Source routing/error handling stays real;
 * the declared method controls stop claims at the existing service/logic boundary.
 * resourceCase owns cleanup on every exit. No listening app, database, or S3 call.
 */
import { describe, it, expect } from 'vitest';

import path from 'node:path';

import { testApp } from '@noego/app';
import { test as control, resourceCase } from '@noego/testing';

import { NotFoundError } from '../../../src/server/errors/domain_errors';
import DownloadService from '../../../src/server/services/download_service';

// Real production source — the same document production stitching includes.

const CONFIG = path.resolve(__dirname, '../../../noego.config.yml');

describe('download routes through testDinner (no server, no S3)', () => {
  it('GET /downloads/binary/cli lists versions when the S3 boundary reports objects', resourceCase(async () => {
    const versions = {
      versions: [
        {
          version: 'v1.2.3',
          downloads: [
            { name: 'kazibee-macos.zip', href: '/downloads/binary/cli/v1.2.3/kazibee-macos.zip', size: 42, lastModified: null },
          ],
        },
      ],
    };
    const env = await testApp(CONFIG).select({ server: { module: ["downloads"] } }).method(DownloadService, "listVersions", control.once(control.returns(Promise.resolve(versions))))
      .build();
    const response = await env.request({ method: 'GET', path: '/downloads/binary/cli' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(versions);
    await env.verify();

  }));

  it('GET /downloads/binary/<bad kind> is rejected 400 by schema validation before any boundary', resourceCase(async () => {
    // The yaml's enum [cli, app] rejects bad kinds ahead of the controller,
    // so its own isDownloadKind guard is defense-in-depth at this depth.
    const env = await testApp(CONFIG).select({ server: { module: ["downloads"] } }).method(DownloadService, "listVersions", control.never())
      .build();
    const response = await env.request({ method: 'GET', path: '/downloads/binary/nope' });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: true,
      message: 'Request validation failed',
      location: 'path',
    });
    await env.verify();

  }));

  it('GET /downloads/binary/cli/:version/:item redirects 302 to the signed URL', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["downloads"] } }).method(DownloadService, "createDownload", control.once(control.returns(Promise.resolve({
            key: 'cli/v1.2.3/kazibee-macos.zip',
            url: 'https://s3.example/signed/kazibee-macos.zip',
          }))))
      .build();
    const response = await env.request({
      method: 'GET',
      path: '/downloads/binary/cli/v1.2.3/kazibee-macos.zip',
    });
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://s3.example/signed/kazibee-macos.zip');
    await env.verify();

  }));

  it('invalid versions are rejected 400 by the fully real service, before S3', resourceCase(async () => {
    // No stubs at all: DownloadService.validateVersion throws ValidationError
    // ahead of any S3 command, so the real graph never leaves the process.
    const env = await testApp(CONFIG).select({ server: { module: ["downloads"] } }).build();
    const response = await env.request({
      method: 'GET',
      path: '/downloads/binary/cli/not-a-version/kazibee-macos.zip',
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: true, message: 'Invalid version' });

  }));

  it('missing objects map to 404 through the domain NotFoundError', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["downloads"] } }).method(DownloadService, "createDownload", control.once(control.throws(new NotFoundError('Download item not found'))))
      .build();
    const response = await env.request({
      method: 'GET',
      path: '/downloads/binary/app/v2.0.0/kazibee.dmg',
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: true, message: 'Download item not found' });
    await env.verify();

  }));

  it('unexpected boundary failures degrade to a structured 500', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["downloads"] } }).method(DownloadService, "listVersions", control.once(control.throws(new Error('S3 unreachable'))))
      .build();
    const response = await env.request({ method: 'GET', path: '/downloads/binary/app' });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: true, message: 'Internal server error' });
    await env.verify();

  }));
});
