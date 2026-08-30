/**
 * DownloadService against a stubbed AWS SDK boundary.
 *
 * DownloadService owns a hand-constructed S3Client (not IoC-injected), so the
 * AWS boundary is replaced at the SDK seam: S3Client.prototype.send via
 * vi.spyOn (third-party prototype, not a kazibee IoC class) and the
 * module-level getSignedUrl import via vi.mock. No server, no database, no
 * network; env mutations are restored after every test.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import DownloadService, { isDownloadKind } from '../../../src/server/services/download_service';
import { NotFoundError, ValidationError } from '../../../src/server/errors/domain_errors';

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(async () => 'https://s3.example/signed-url'),
}));

type SendHandler = (command: unknown) => Promise<unknown>;

function stubSend(handler: SendHandler) {
  return vi
    .spyOn(S3Client.prototype, 'send')
    .mockImplementation(handler as never);
}

function missingObjectError(): S3ServiceException {
  return new S3ServiceException({
    name: 'NotFound',
    $fault: 'client',
    $metadata: { httpStatusCode: 404 },
  });
}

const savedEnv = { ...process.env };

describe('DownloadService (stubbed AWS SDK boundary)', () => {
  beforeEach(() => {
    delete process.env.KAZIBEE_DOWNLOAD_BUCKET;
    delete process.env.KAZIBEE_DOWNLOAD_EXPIRES_SECONDS;
    delete process.env.KAZIBEE_CLI_PREFIX;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    process.env.KAZIBEE_DOWNLOAD_BUCKET = savedEnv.KAZIBEE_DOWNLOAD_BUCKET;
    process.env.KAZIBEE_DOWNLOAD_EXPIRES_SECONDS = savedEnv.KAZIBEE_DOWNLOAD_EXPIRES_SECONDS;
    process.env.KAZIBEE_CLI_PREFIX = savedEnv.KAZIBEE_CLI_PREFIX;
    for (const key of ['KAZIBEE_DOWNLOAD_BUCKET', 'KAZIBEE_DOWNLOAD_EXPIRES_SECONDS', 'KAZIBEE_CLI_PREFIX']) {
      if (process.env[key] === undefined) delete process.env[key];
    }
  });

  describe('listVersions', () => {
    it('paginates, groups by version, sorts latest first and SHA256SUMS last', async () => {
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
      const send = stubSend(async (command) => {
        expect(command).toBeInstanceOf(ListObjectsV2Command);
        const input = (command as ListObjectsV2Command).input;
        expect(input.Bucket).toBe('kazibee');
        expect(input.Prefix).toBe('cli/');
        return input.ContinuationToken === 'page-2' ? pageTwo : pageOne;
      });

      const service = new DownloadService();
      const result = await service.listVersions('cli');

      expect(send).toHaveBeenCalledTimes(2);
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
    });

    it('honors a custom prefix without a trailing slash and an empty bucket throws', async () => {
      process.env.KAZIBEE_CLI_PREFIX = '/custom-cli';
      stubSend(async (command) => {
        expect((command as ListObjectsV2Command).input.Prefix).toBe('custom-cli/');
        return { Contents: [] };
      });
      const service = new DownloadService();
      await expect(service.listVersions('cli')).resolves.toEqual({ versions: [] });

      process.env.KAZIBEE_DOWNLOAD_BUCKET = '';
      const unconfigured = new DownloadService();
      await expect(unconfigured.listVersions('cli')).rejects.toThrow('Download bucket is not configured');
    });
  });

  describe('createDownload', () => {
    it('checks the object head then presigns a GetObject with attachment disposition', async () => {
      process.env.KAZIBEE_DOWNLOAD_EXPIRES_SECONDS = '120';
      const send = stubSend(async (command) => {
        expect(command).toBeInstanceOf(HeadObjectCommand);
        expect((command as HeadObjectCommand).input.Key).toBe('app/v2.0.0/kazibee.dmg');
        return {};
      });
      const service = new DownloadService();
      const result = await service.createDownload('app', 'v2.0.0', 'kazibee.dmg');

      expect(send).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ key: 'app/v2.0.0/kazibee.dmg', url: 'https://s3.example/signed-url' });
      const signed = vi.mocked(getSignedUrl);
      expect(signed).toHaveBeenCalledTimes(1);
      const [, command, options] = signed.mock.calls[0];
      expect(command).toBeInstanceOf(GetObjectCommand);
      expect((command as GetObjectCommand).input.ResponseContentDisposition)
        .toBe('attachment; filename="kazibee.dmg"');
      expect(options).toEqual({ expiresIn: 120 });
    });

    it('an explicit expiresIn option overrides the env default (and bad env falls back to 600)', async () => {
      process.env.KAZIBEE_DOWNLOAD_EXPIRES_SECONDS = 'not-a-number';
      stubSend(async () => ({}));
      const service = new DownloadService();
      await service.createDownload('cli', 'latest', 'kazibee-macos.zip', { expiresIn: 30 });
      expect(vi.mocked(getSignedUrl).mock.calls.at(-1)?.[2]).toEqual({ expiresIn: 30 });

      await service.createDownload('cli', 'latest', 'kazibee-macos.zip');
      expect(vi.mocked(getSignedUrl).mock.calls.at(-1)?.[2]).toEqual({ expiresIn: 600 });
    });

    it('maps a missing object to NotFoundError and rethrows other S3 failures', async () => {
      stubSend(async () => { throw missingObjectError(); });
      const service = new DownloadService();
      await expect(service.createDownload('cli', 'v1.2.3', 'kazibee-macos.zip'))
        .rejects.toThrow(NotFoundError);

      vi.restoreAllMocks();
      stubSend(async () => { throw new Error('access denied'); });
      await expect(service.createDownload('cli', 'v1.2.3', 'kazibee-macos.zip'))
        .rejects.toThrow('access denied');
    });

    it('rejects invalid versions and items before touching S3', async () => {
      const send = stubSend(async () => ({}));
      const service = new DownloadService();
      await expect(service.createDownload('cli', '1.2.3', 'ok.zip')).rejects.toThrow(ValidationError);
      await expect(service.createDownload('cli', 'v1.2.3', 'bad/../path')).rejects.toThrow(ValidationError);
      await expect(service.createDownload('cli', 'v1.2.3', 'spaced name.zip')).rejects.toThrow(ValidationError);
      await expect(service.createDownload('cli', 'v1.2.3', 'a'.repeat(201))).rejects.toThrow(ValidationError);
      expect(send).not.toHaveBeenCalled();
      // Pre-release/build metadata versions are accepted.
      await expect(service.createDownload('cli', 'v1.2.3-beta.1', 'ok.zip')).resolves.toMatchObject({
        key: 'cli/v1.2.3-beta.1/ok.zip',
      });
    });
  });

  describe('readItemText / readPolicyText', () => {
    it('reads the object body verbatim', async () => {
      stubSend(async (command) => {
        expect(command).toBeInstanceOf(GetObjectCommand);
        expect((command as GetObjectCommand).input.Key).toBe('service/v1.0.0/RELEASES');
        return { Body: { transformToString: async () => 'HASH kazibee-full.nupkg 123' } };
      });
      const service = new DownloadService();
      await expect(service.readItemText('service', 'v1.0.0', 'RELEASES'))
        .resolves.toBe('HASH kazibee-full.nupkg 123');
    });

    it('an absent body or a missing object is NotFoundError; other errors rethrow', async () => {
      stubSend(async () => ({ Body: undefined }));
      const service = new DownloadService();
      await expect(service.readItemText('cli', 'v1.0.0', 'RELEASES')).rejects.toThrow(NotFoundError);

      vi.restoreAllMocks();
      stubSend(async () => { throw missingObjectError(); });
      await expect(service.readItemText('cli', 'v1.0.0', 'RELEASES')).rejects.toThrow('Download item not found');

      vi.restoreAllMocks();
      stubSend(async () => { throw new Error('throttled'); });
      await expect(service.readItemText('cli', 'v1.0.0', 'RELEASES')).rejects.toThrow('throttled');
    });

    it('readPolicyText reads under the policy/ prefix and maps the same NotFound shapes', async () => {
      stubSend(async (command) => {
        expect((command as GetObjectCommand).input.Key).toBe('app/policy/allowlist.txt');
        return { Body: { transformToString: async () => 'allow *' } };
      });
      const service = new DownloadService();
      await expect(service.readPolicyText('app', 'allowlist.txt')).resolves.toBe('allow *');

      vi.restoreAllMocks();
      stubSend(async () => ({ Body: undefined }));
      await expect(service.readPolicyText('app', 'allowlist.txt')).rejects.toThrow('Policy item not found');

      vi.restoreAllMocks();
      stubSend(async () => { throw missingObjectError(); });
      await expect(service.readPolicyText('app', 'allowlist.txt')).rejects.toThrow(NotFoundError);

      vi.restoreAllMocks();
      stubSend(async () => { throw new Error('boom'); });
      await expect(service.readPolicyText('app', 'allowlist.txt')).rejects.toThrow('boom');
    });
  });

  it('isDownloadKind gates public kinds to cli|app', () => {
    expect(isDownloadKind('cli')).toBe(true);
    expect(isDownloadKind('app')).toBe(true);
    expect(isDownloadKind('service')).toBe(false);
    expect(isDownloadKind(undefined)).toBe(false);
  });
});
