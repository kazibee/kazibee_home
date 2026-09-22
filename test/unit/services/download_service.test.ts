/**
 * DownloadService against a stubbed AWS boundary.
 *
 * Every subject is the real production instance resolved from the
 * original-config root testApp (downloads module, no server, no database).
 * The AWS boundary is the injectable DownloadObjectStore (S3 send + presign),
 * replaced per case through immutable method controls; the real SDK command
 * classes are what the service constructs and what the assertions inspect.
 * Configuration comes from a caller-built Env loaded with exactly the case's
 * variables (process.env is never mutated). resourceCase owns cleanup.
 */
import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { testApp } from '@noego/app';
import { resourceCase, testStub, test as control } from '@noego/testing';
import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import Env from '../../../src/server/services/env';
import DownloadService, { isDownloadKind } from '../../../src/server/services/download_service';
import DownloadObjectStore from '../../../src/server/services/download_object_store';
import { NotFoundError, ValidationError } from '../../../src/server/errors/domain_errors';

const CONFIG = path.resolve(__dirname, '../../../noego.config.yml');
const SELECT = { server: { module: ['downloads'] } } as const;

const SIGNED_URL = 'https://s3.example/signed-url';

// Configuration for one case: a caller-built Env loaded with exactly the
// case's variables (defaults apply for everything else); process.env is never mutated.
const envWith = (data: Record<string, string>) => () => {
  const env = new Env();
  env.load(data);
  return env;
};

type SendHandler = (command: unknown) => Promise<unknown>;

/** S3 send behavior for one case: a handler over the real SDK command, recorded by the environment. */
const sendWith = (handler: SendHandler) =>
  control.watch(() => (command: unknown) => handler(command));

function missingObjectError(): S3ServiceException {
  return new S3ServiceException({
    name: 'NotFound',
    $fault: 'client',
    $metadata: { httpStatusCode: 404 },
  });
}

/** What S3 returns for a mis-signed / clock-skewed request (or a real denial). */
function forbiddenError(name: string): S3ServiceException {
  return new S3ServiceException({
    name,
    $fault: 'client',
    $metadata: { httpStatusCode: 403, attempts: 1 },
  });
}

describe('DownloadService (stubbed AWS SDK boundary)', () => {
  describe('listVersions', () => {
    it('paginates, groups by version, sorts latest first and SHA256SUMS last', resourceCase(async () => {
      const pageOne = {
        Contents: [
          { Key: 'cli/v1.2.3/kazibee-macos.zip', Size: 42, LastModified: new Date('2026-01-01T00:00:00Z') },
          { Key: 'cli/v1.2.3/SHA256SUMS', Size: 1 },
          { Key: 'cli/v1.2.3/', Size: 0 }, // directory marker: skipped
          { Key: 'cli/not-a-version/thing.zip', Size: 9 }, // invalid version: skipped
          { Key: 'cli/v1.2.3/nested/too-deep.zip', Size: 9 }, // extra segment: skipped
          { Key: 'other/v9.9.9/outside-prefix.zip', Size: 9 }, // wrong prefix: skipped
        ],
        NextContinuationToken: 'page-2',
      };
      const pageTwo = {
        Contents: [
          { Key: 'cli/latest/kazibee-macos.zip', Size: 7 },
          { Key: 'cli/v1.10.0/kazibee-linux.tar.gz', Size: 8 },
        ],
      };
      const env = await testApp(CONFIG).select(SELECT).use(testStub())
        .function(Env, envWith({}))
        .method(DownloadObjectStore, 'send', sendWith(async (command) => {
          expect(command).toBeInstanceOf(ListObjectsV2Command);
          const input = (command as ListObjectsV2Command).input;
          expect(input.Bucket).toBe('kazibee');
          expect(input.Prefix).toBe('cli/');
          return input.ContinuationToken === 'page-2' ? pageTwo : pageOne;
        }))
        .build();

      const service = await env.get<DownloadService>(DownloadService);
      const result = await service.listVersions('cli');

      expect(control.inspect(env, DownloadObjectStore, 'send').count).toBe(2);
      expect(result.versions.map((entry) => entry.version)).toEqual(['latest', 'v1.10.0', 'v1.2.3']);
      const v123 = result.versions.find((entry) => entry.version === 'v1.2.3');
      expect(v123?.downloads.map((item) => item.name)).toEqual(['kazibee-macos.zip', 'SHA256SUMS']);
      expect(v123?.downloads[0]).toEqual({
        name: 'kazibee-macos.zip',
        href: '/downloads/binary/cli/v1.2.3/kazibee-macos.zip',
        size: 42,
        lastModified: '2026-01-01T00:00:00.000Z',
      });
      expect(v123?.downloads[1].lastModified).toBeNull();
    }));

    it('tolerates pages without Contents, objects without a Size, and sorts SHA256SUMS behind names', resourceCase(async () => {
      const env = await testApp(CONFIG).select(SELECT).use(testStub())
        .function(Env, envWith({}))
        .method(DownloadObjectStore, 'send', sendWith(async (command) => {
          const input = (command as ListObjectsV2Command).input;
          if (!input.ContinuationToken) {
            return { NextContinuationToken: 'page-2' }; // no Contents at all
          }
          return {
            Contents: [
              { Key: 'cli/v1.2.3/beta.zip' }, // no Size, no LastModified
              { Key: 'cli/v1.2.3/SHA256SUMS', Size: 1 },
              { Key: 'cli/v1.2.3/alpha.zip', Size: 2 },
            ],
          };
        }))
        .build();

      const service = await env.get<DownloadService>(DownloadService);
      const result = await service.listVersions('cli');

      const [only] = result.versions;
      expect(only.version).toBe('v1.2.3');
      expect(only.downloads.map((item) => item.name)).toEqual(['alpha.zip', 'beta.zip', 'SHA256SUMS']);
      expect(only.downloads.find((item) => item.name === 'beta.zip')).toMatchObject({
        size: 0,
        lastModified: null,
      });
    }));

    it('a slash-only prefix normalizes to the empty prefix', resourceCase(async () => {
      const env = await testApp(CONFIG).select(SELECT).use(testStub())
        .function(Env, envWith({ KAZIBEE_CLI_PREFIX: '/' }))
        .method(DownloadObjectStore, 'send', sendWith(async (command) => {
          expect((command as ListObjectsV2Command).input.Prefix).toBe('');
          return { Contents: [{ Key: 'v1.2.3/root.zip', Size: 3 }] };
        }))
        .build();
      const service = await env.get<DownloadService>(DownloadService);
      const result = await service.listVersions('cli');
      expect(result.versions).toEqual([
        {
          version: 'v1.2.3',
          downloads: [
            {
              name: 'root.zip',
              href: '/downloads/binary/cli/v1.2.3/root.zip',
              size: 3,
              lastModified: null,
            },
          ],
        },
      ]);
    }));

    it('honors a custom prefix without a trailing slash and an empty bucket throws', resourceCase(async () => {
      const env = await testApp(CONFIG).select(SELECT).use(testStub())
        .function(Env, envWith({ KAZIBEE_CLI_PREFIX: '/custom-cli' }))
        .method(DownloadObjectStore, 'send', sendWith(async (command) => {
          expect((command as ListObjectsV2Command).input.Prefix).toBe('custom-cli/');
          return { Contents: [] };
        }))
        .build();
      const service = await env.get<DownloadService>(DownloadService);
      await expect(service.listVersions('cli')).resolves.toEqual({ versions: [] });

      const unconfiguredEnv = await testApp(CONFIG).select(SELECT).use(testStub())
        .function(Env, envWith({ KAZIBEE_DOWNLOAD_BUCKET: '' }))
        .method(DownloadObjectStore, 'send', control.never())
        .build();
      const unconfigured = await unconfiguredEnv.get<DownloadService>(DownloadService);
      await expect(unconfigured.listVersions('cli')).rejects.toThrow('Download bucket is not configured');
    }));
  });

  describe('createDownload', () => {
    it('probes the first byte of the object then presigns a GetObject with attachment disposition', resourceCase(async () => {
      let drained = 0;
      const env = await testApp(CONFIG).select(SELECT).use(testStub())
        .function(Env, envWith({ KAZIBEE_DOWNLOAD_EXPIRES_SECONDS: '120' }))
        .method(DownloadObjectStore, 'send', sendWith(async (command) => {
          expect(command).toBeInstanceOf(GetObjectCommand);
          expect((command as GetObjectCommand).input.Key).toBe('app/v2.0.0/kazibee.dmg');
          expect((command as GetObjectCommand).input.Range).toBe('bytes=0-0');
          return { Body: { transformToByteArray: async () => { drained += 1; return new Uint8Array(1); } } };
        }))
        .method(DownloadObjectStore, 'presign', control.returns(Promise.resolve(SIGNED_URL)))
        .build();
      const service = await env.get<DownloadService>(DownloadService);
      const result = await service.createDownload('app', 'v2.0.0', 'kazibee.dmg');

      expect(control.inspect(env, DownloadObjectStore, 'send').count).toBe(1);
      expect(drained).toBe(1);
      expect(result).toEqual({ key: 'app/v2.0.0/kazibee.dmg', url: SIGNED_URL });
      const signed = control.inspect(env, DownloadObjectStore, 'presign');
      expect(signed.count).toBe(1);
      const [command, options] = signed.calls[0].args;
      expect(command).toBeInstanceOf(GetObjectCommand);
      expect((command as GetObjectCommand).input.ResponseContentDisposition)
        .toBe('attachment; filename="kazibee.dmg"');
      expect(options).toEqual({ expiresIn: 120 });
    }));

    it('an explicit expiresIn option overrides the env default (and bad env falls back to 600)', resourceCase(async () => {
      const env = await testApp(CONFIG).select(SELECT).use(testStub())
        .function(Env, envWith({ KAZIBEE_DOWNLOAD_EXPIRES_SECONDS: 'not-a-number' }))
        .method(DownloadObjectStore, 'send', sendWith(async () => ({})))
        .method(DownloadObjectStore, 'presign', control.returns(Promise.resolve(SIGNED_URL)))
        .build();
      const service = await env.get<DownloadService>(DownloadService);
      await service.createDownload('cli', 'latest', 'kazibee-macos.zip', { expiresIn: 30 });
      expect(control.inspect(env, DownloadObjectStore, 'presign').calls.at(-1)?.args[1]).toEqual({ expiresIn: 30 });

      await service.createDownload('cli', 'latest', 'kazibee-macos.zip');
      expect(control.inspect(env, DownloadObjectStore, 'presign').calls.at(-1)?.args[1]).toEqual({ expiresIn: 600 });
    }));

    it('maps a missing object to NotFoundError and rethrows other S3 failures', resourceCase(async () => {
      const env = await testApp(CONFIG).select(SELECT).use(testStub())
        .function(Env, envWith({}))
        .method(DownloadObjectStore, 'send', control.calls([
          control.throws(missingObjectError()),
          control.throws(new Error('access denied')),
        ]))
        .method(DownloadObjectStore, 'presign', control.never())
        .build();
      const service = await env.get<DownloadService>(DownloadService);
      await expect(service.createDownload('cli', 'v1.2.3', 'kazibee-macos.zip'))
        .rejects.toThrow(NotFoundError);

      await expect(service.createDownload('cli', 'v1.2.3', 'kazibee-macos.zip'))
        .rejects.toThrow('access denied');
    }));

    it('recognizes NoSuchKey by name and rethrows other S3ServiceExceptions', resourceCase(async () => {
      const env = await testApp(CONFIG).select(SELECT).use(testStub())
        .function(Env, envWith({}))
        .method(DownloadObjectStore, 'send', control.calls([
          control.throws(new S3ServiceException({
            name: 'NoSuchKey',
            $fault: 'client',
            $metadata: { httpStatusCode: 500 },
          })),
          control.throws(new S3ServiceException({
            name: 'SlowDown',
            $fault: 'server',
            $metadata: { httpStatusCode: 503 },
          })),
        ]))
        .method(DownloadObjectStore, 'presign', control.never())
        .build();
      const service = await env.get<DownloadService>(DownloadService);
      await expect(service.createDownload('cli', 'v1.2.3', 'kazibee-macos.zip'))
        .rejects.toThrow(NotFoundError);

      await expect(service.createDownload('cli', 'v1.2.3', 'kazibee-macos.zip'))
        .rejects.toBeInstanceOf(S3ServiceException);
    }));

    it('retries the probe once after a 403 (signer clock rejection) and then presigns', resourceCase(async () => {
      const env = await testApp(CONFIG).select(SELECT).use(testStub())
        .function(Env, envWith({}))
        .method(DownloadObjectStore, 'send', control.calls([
          control.throws(forbiddenError('RequestTimeTooSkewed')),
          control.returns(Promise.resolve({})),
        ]))
        .method(DownloadObjectStore, 'presign', control.returns(Promise.resolve(SIGNED_URL)))
        .build();
      const service = await env.get<DownloadService>(DownloadService);
      await expect(service.createDownload('cli', 'v1.2.3', 'kazibee-macos.zip'))
        .resolves.toEqual({ key: 'cli/v1.2.3/kazibee-macos.zip', url: SIGNED_URL });
      expect(control.inspect(env, DownloadObjectStore, 'send').count).toBe(2);
      expect(control.inspect(env, DownloadObjectStore, 'presign').count).toBe(1);
    }));

    it('a 403 followed by NoSuchKey is NotFoundError; a second 403 rethrows; no third attempt', resourceCase(async () => {
      const env = await testApp(CONFIG).select(SELECT).use(testStub())
        .function(Env, envWith({}))
        .method(DownloadObjectStore, 'send', control.calls([
          control.throws(forbiddenError('Unknown')),
          control.throws(missingObjectError()),
          control.throws(forbiddenError('AccessDenied')),
          control.throws(forbiddenError('AccessDenied')),
        ]))
        .method(DownloadObjectStore, 'presign', control.never())
        .build();
      const service = await env.get<DownloadService>(DownloadService);
      await expect(service.createDownload('cli', 'v1.2.3', 'kazibee-macos.zip'))
        .rejects.toThrow(NotFoundError);

      await expect(service.createDownload('cli', 'v1.2.3', 'kazibee-macos.zip'))
        .rejects.toMatchObject({ name: 'AccessDenied', $metadata: { httpStatusCode: 403 } });
      expect(control.inspect(env, DownloadObjectStore, 'send').count).toBe(4);
    }));

    it('rejects invalid versions and items before touching S3', resourceCase(async () => {
      const env = await testApp(CONFIG).select(SELECT).use(testStub())
        .function(Env, envWith({}))
        .method(DownloadObjectStore, 'send', sendWith(async () => ({})))
        .method(DownloadObjectStore, 'presign', control.returns(Promise.resolve(SIGNED_URL)))
        .build();
      const service = await env.get<DownloadService>(DownloadService);
      await expect(service.createDownload('cli', '1.2.3', 'ok.zip')).rejects.toThrow(ValidationError);
      await expect(service.createDownload('cli', 'v1.2.3', 'bad/../path')).rejects.toThrow(ValidationError);
      await expect(service.createDownload('cli', 'v1.2.3', 'spaced name.zip')).rejects.toThrow(ValidationError);
      await expect(service.createDownload('cli', 'v1.2.3', 'a'.repeat(201))).rejects.toThrow(ValidationError);
      expect(control.inspect(env, DownloadObjectStore, 'send').count).toBe(0);
      // Pre-release/build metadata versions are accepted.
      await expect(service.createDownload('cli', 'v1.2.3-beta.1', 'ok.zip')).resolves.toMatchObject({
        key: 'cli/v1.2.3-beta.1/ok.zip',
      });
    }));
  });

  describe('readItemText / readPolicyText', () => {
    it('reads the object body verbatim', resourceCase(async () => {
      const env = await testApp(CONFIG).select(SELECT).use(testStub())
        .function(Env, envWith({}))
        .method(DownloadObjectStore, 'send', sendWith(async (command) => {
          expect(command).toBeInstanceOf(GetObjectCommand);
          expect((command as GetObjectCommand).input.Key).toBe('service/v1.0.0/RELEASES');
          return { Body: { transformToString: async () => 'HASH kazibee-full.nupkg 123' } };
        }))
        .build();
      const service = await env.get<DownloadService>(DownloadService);
      await expect(service.readItemText('service', 'v1.0.0', 'RELEASES'))
        .resolves.toBe('HASH kazibee-full.nupkg 123');
    }));

    it('an absent body or a missing object is NotFoundError; other errors rethrow', resourceCase(async () => {
      const env = await testApp(CONFIG).select(SELECT).use(testStub())
        .function(Env, envWith({}))
        .method(DownloadObjectStore, 'send', control.calls([
          control.returns(Promise.resolve({ Body: undefined })),
          control.throws(missingObjectError()),
          control.throws(new Error('throttled')),
        ]))
        .build();
      const service = await env.get<DownloadService>(DownloadService);
      await expect(service.readItemText('cli', 'v1.0.0', 'RELEASES')).rejects.toThrow(NotFoundError);

      await expect(service.readItemText('cli', 'v1.0.0', 'RELEASES')).rejects.toThrow('Download item not found');

      await expect(service.readItemText('cli', 'v1.0.0', 'RELEASES')).rejects.toThrow('throttled');
    }));

    it('readPolicyText reads under the policy/ prefix and maps the same NotFound shapes', resourceCase(async () => {
      const env = await testApp(CONFIG).select(SELECT).use(testStub())
        .function(Env, envWith({}))
        .method(DownloadObjectStore, 'send', control.calls([
          control.returns(Promise.resolve({ Body: { transformToString: async () => 'allow *' } })),
          control.returns(Promise.resolve({ Body: undefined })),
          control.throws(missingObjectError()),
          control.throws(new Error('boom')),
        ]))
        .build();
      const service = await env.get<DownloadService>(DownloadService);
      await expect(service.readPolicyText('app', 'allowlist.txt')).resolves.toBe('allow *');
      const [first] = control.inspect(env, DownloadObjectStore, 'send').calls[0].args;
      expect((first as GetObjectCommand).input.Key).toBe('app/policy/allowlist.txt');

      await expect(service.readPolicyText('app', 'allowlist.txt')).rejects.toThrow('Policy item not found');

      await expect(service.readPolicyText('app', 'allowlist.txt')).rejects.toThrow(NotFoundError);

      await expect(service.readPolicyText('app', 'allowlist.txt')).rejects.toThrow('boom');
    }));
  });

  it('isDownloadKind gates public kinds to cli|app', () => {
    expect(isDownloadKind('cli')).toBe(true);
    expect(isDownloadKind('app')).toBe(true);
    expect(isDownloadKind('service')).toBe(false);
    expect(isDownloadKind(undefined)).toBe(false);
  });
});
