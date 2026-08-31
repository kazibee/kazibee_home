/**
 * Download routes through testDinner (no server, no database, no S3).
 *
 * The real controller → logic graph runs in-process. DownloadService owns a
 * hand-constructed S3Client (not injected), so the AWS boundary is replaced
 * at the service surface via .methods('DownloadService') in tests whose claim
 * stops above S3. Kind gating (controller) and version/item validation
 * (service, which throws before any S3 call) run fully real.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { load as parseYaml } from 'js-yaml';
import { testDinner } from '@noego/dinner/testing';
import { test as control } from '@noego/testing';
import DownloadController from '../../../src/server/controller/download.controller';
import { NotFoundError } from '../../../src/server/errors/domain_errors';
import DownloadService from '../../../src/server/services/download_service';

// Real production source — the same document production stitching includes.
const downloadsSource = parseYaml(
  readFileSync(path.resolve(__dirname, '../../../src/server/openapi/downloads/downloads.yaml'), 'utf8')
) as Record<string, unknown>;

const base = () =>
  testDinner(downloadsSource)
    .select({ module: 'downloads' })
    .controllers({ 'download.controller': DownloadController })
    // Legacy {req,res} controllers: compat hooks with default real-IoC
    // construction (per-request child scope, disposed after the request).
    .hooks({});

describe('download routes through testDinner (no server, no S3)', () => {
  it('GET /downloads/binary/cli lists versions when the S3 boundary reports objects', async () => {
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
    const env = await base()
      .methods([
        [DownloadService, {
          listVersions: control.once(control.returns(Promise.resolve(versions))),
        }],
      ])
      .build();
    const response = await env.dinner.request({ method: 'GET', path: '/downloads/binary/cli' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(versions);
    await env.verify();
    await env.dispose();
  });

  it('GET /downloads/binary/<bad kind> is rejected 400 by schema validation before any boundary', async () => {
    // The yaml's enum [cli, app] rejects bad kinds ahead of the controller,
    // so its own isDownloadKind guard is defense-in-depth at this depth.
    const env = await base()
      .methods([
        [DownloadService, {
          listVersions: control.never(),
        }],
      ])
      .build();
    const response = await env.dinner.request({ method: 'GET', path: '/downloads/binary/nope' });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: true,
      message: 'Request validation failed',
      location: 'path',
    });
    await env.verify();
    await env.dispose();
  });

  it('GET /downloads/binary/cli/:version/:item redirects 302 to the signed URL', async () => {
    const env = await base()
      .methods([
        [DownloadService, {
          createDownload: control.once(control.returns(Promise.resolve({
            key: 'cli/v1.2.3/kazibee-macos.zip',
            url: 'https://s3.example/signed/kazibee-macos.zip',
          }))),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'GET',
      path: '/downloads/binary/cli/v1.2.3/kazibee-macos.zip',
    });
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://s3.example/signed/kazibee-macos.zip');
    await env.verify();
    await env.dispose();
  });

  it('invalid versions are rejected 400 by the fully real service, before S3', async () => {
    // No stubs at all: DownloadService.validateVersion throws ValidationError
    // ahead of any S3 command, so the real graph never leaves the process.
    const env = await base().build();
    const response = await env.dinner.request({
      method: 'GET',
      path: '/downloads/binary/cli/not-a-version/kazibee-macos.zip',
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: true, message: 'Invalid version' });
    await env.dispose();
  });

  it('missing objects map to 404 through the domain NotFoundError', async () => {
    const env = await base()
      .methods([
        [DownloadService, {
          createDownload: control.once(control.throws(new NotFoundError('Download item not found'))),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'GET',
      path: '/downloads/binary/app/v2.0.0/kazibee.dmg',
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: true, message: 'Download item not found' });
    await env.verify();
    await env.dispose();
  });

  it('unexpected boundary failures degrade to a structured 500', async () => {
    const env = await base()
      .methods([
        [DownloadService, {
          listVersions: control.once(control.throws(new Error('S3 unreachable'))),
        }],
      ])
      .build();
    const response = await env.dinner.request({ method: 'GET', path: '/downloads/binary/app' });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: true, message: 'Internal server error' });
    await env.verify();
    await env.dispose();
  });
});
