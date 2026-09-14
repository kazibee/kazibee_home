import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import protocolSchema from '@kazibee-internal/connect-protocol/canonical/schemas/kazi-connect-v1.schema.json' with { type: 'json' };
import manifest from '@kazibee-internal/connect-protocol/canonical/manifest.json' with { type: 'json' };

/**
 * Duplicate-authority and schema-parity guard: the canonical Kazi Connect V1 artifacts are owned
 * by the installed `@kazibee-internal/connect-protocol` package only. The former Website-owned
 * `packages/kazi-connect-protocol` copy must stay deleted and no source may import it or reach
 * into a sibling producer checkout.
 */
const CANONICAL_PACKAGE = '@kazibee-internal/connect-protocol';
const SCHEMA_SUBPATH = 'canonical/schemas/kazi-connect-v1.schema.json';
const SCHEMA_1_0_8_SHA256 = '79b7a8be1338855681a3b5b5ce66e0c135eddf7c2a07bdaab96ca9552a3112ec';
const SOURCE_MANIFEST_1_0_8_SHA256 = '480fda83a7b713968a3125cfc6a32c59374fe9ccdc4e4c889218a4bd14cea9c1';

const websiteRoot = resolve(dirname(new URL(import.meta.url).pathname), '../../..');
const packageRoot = dirname(createRequire(import.meta.url).resolve(`${CANONICAL_PACKAGE}/package.json`));
const canonicalRoot = join(packageRoot, 'canonical');
const retiredCopy = join(websiteRoot, 'packages/kazi-connect-protocol');
const schemaConsumers = [
  'src/server/services/connect_relay_request_parser.ts',
  'src/server/services/connect_client_relay_request_parser.ts',
];

const listFiles = (directory: string): string[] =>
  existsSync(directory)
    ? readdirSync(directory, { withFileTypes: true })
      .flatMap((entry) => {
        const path = join(directory, entry.name);
        return entry.isDirectory() ? listFiles(path) : [path];
      })
      .sort()
    : [];

const sourceFiles = (directory: string): string[] =>
  listFiles(directory).filter((path) => /\.(?:ts|tsx|js|mjs|svelte)$/.test(path));

describe('canonical protocol authority', () => {
  it('keeps the retired Website-owned package copy deleted', () => {
    expect(listFiles(retiredCopy)).toEqual([]);
  });

  it('imports the wire schema only from the installed package subpath', () => {
    // Workers forbid runtime Ajv compilation, so the parsers consume the pre-generated
    // validator; the generator is the single place that reads the canonical schema.
    const generator = readFileSync(join(websiteRoot, 'scripts/generate-connect-validator.mjs'), 'utf8');
    expect(generator).toContain(`"${CANONICAL_PACKAGE}/${SCHEMA_SUBPATH}"`);
    expect(generator).not.toContain('packages/kazi-connect-protocol');
    for (const file of schemaConsumers) {
      const text = readFileSync(join(websiteRoot, file), 'utf8');
      expect(text, file).toContain('from "./generated/connect_protocol_validator.js"');
      expect(text, file).not.toContain('packages/kazi-connect-protocol');
    }
  });

  it('has no source or test path to the retired copy or a sibling producer checkout', () => {
    const files = [...sourceFiles(join(websiteRoot, 'src')), ...sourceFiles(join(websiteRoot, 'test'))];
    expect(files.length).toBeGreaterThan(0);
    const offenders: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      const at = relative(websiteRoot, file);
      if (/from\s+['"][^'"]*packages\/kazi-connect-protocol\//.test(text)) offenders.push(`${at}: retired copy import`);
      if (/['"][^'"]*libraries\/connect-protocol\//.test(text)) offenders.push(`${at}: sibling producer path`);
    }
    expect(offenders).toEqual([]);
  });

  it('keeps the imported schema in parity with the installed package bytes and the 1.0.8 pin', () => {
    const bytes = readFileSync(join(canonicalRoot, 'schemas/kazi-connect-v1.schema.json'));
    const digest = createHash('sha256').update(bytes).digest('hex');
    expect(digest).toBe(SCHEMA_1_0_8_SHA256);
    expect(JSON.parse(bytes.toString('utf8'))).toEqual(protocolSchema);
    expect(manifest.files.find(({ path }) => path === 'schemas/kazi-connect-v1.schema.json')?.sha256).toBe(digest);
    expect(JSON.parse(readFileSync(join(canonicalRoot, 'manifest.json'), 'utf8'))).toEqual(manifest);
  });

  it('preserves the protocol dimensions and provenance pins through the package', () => {
    expect(manifest.package).toBe(CANONICAL_PACKAGE);
    expect(manifest.protocolVersion).toBe('1.0');
    expect(manifest.files).toHaveLength(18);
    expect(manifest.canonicalSource.package).toBe('@kazibee/connect-protocol');
    expect(manifest.canonicalSource.packageVersion).toBe('1.0.8');
    expect(manifest.canonicalSource.manifestSha256).toBe(SOURCE_MANIFEST_1_0_8_SHA256);
    expect((protocolSchema.$defs as Record<string, { enum?: string[] }>).operation.enum).toHaveLength(9);
    expect(manifest.authContracts.desktopRelay.headers.protocolVersion).toEqual({
      name: 'X-Kazi-Protocol-Version',
      literal: '1.0',
      singleValue: true,
    });
  });
});
