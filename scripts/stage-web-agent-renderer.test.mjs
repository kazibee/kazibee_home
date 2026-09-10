// node --test scripts/stage-web-agent-renderer.test.mjs
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  ARTIFACT_NAME,
  MANIFEST_FILE,
  WOOD_RPC_FILE,
  checksumManifest,
  parseCliArguments,
  stageWebAgentRenderer,
  verifyWebAgentRendererPackage,
} from './stage-web-agent-renderer.mjs';

const SCRIPT = fileURLToPath(new URL('./stage-web-agent-renderer.mjs', import.meta.url));
const VERSION = '0.1.0';
const HEX = (text) => createHash('sha256').update(text).digest('hex');
const ZERO = '0'.repeat(64);
const COMMIT = 'a'.repeat(40);

let sandbox;
beforeEach(() => {
  sandbox = realpathSync(mkdtempSync(path.join(tmpdir(), 'stage-web-agent-')));
});
afterEach(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function record(name, content) {
  const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2) + '\n';
  return { path: name, bytes: Buffer.byteLength(text), sha256: sha256(text), text };
}

/**
 * Build an artifact package directory. `mutateManifest` runs before the
 * checksum is computed (a "wrong but internally consistent" manifest);
 * `tamperManifest` runs after (a tampered manifest).
 */
function buildFixture(options = {}) {
  const root = path.join(sandbox, options.name ?? 'pkg');
  const version = options.version ?? VERSION;
  const mode = options.mode ?? 'release';
  const html = options.html ?? '<!doctype html><html><head><script type="module" crossorigin src="./assets/web_agent-abc123.js"></script><link rel="stylesheet" href="./assets/web_agent-abc123.css"></head><body></body></html>';
  const entries = options.entries ?? [
    { channel: 'assets.read', controller: 'assets', action: 'read', path: ['assets', 'read'], hasInput: true },
    { channel: 'app_update.get_status', controller: 'app_update', action: 'getStatus', path: ['app_update', 'get_status'], hasInput: false },
  ];
  const protocolIdentity = { package: '@kazibee-internal/connect-protocol', version: '0.1.0', parserSpecifier: '@kazibee-internal/connect-protocol/viewer', parserSha256: HEX('parser') };
  const preload = { path: 'src/main/preload.generated.ts', sha256: HEX('preload') };
  const woodRpc = record(WOOD_RPC_FILE, { schemaVersion: 1, source: preload, protocol: protocolIdentity, entries });
  const packageJson = record('package.json', {
    name: ARTIFACT_NAME,
    version,
    license: 'UNLICENSED',
    files: ['renderer', MANIFEST_FILE, WOOD_RPC_FILE],
    publishConfig: { registry: 'https://registry.kazibee.com', access: 'restricted' },
    kazibee: { artifact: 'web-agent-renderer', manifest: MANIFEST_FILE, entry: 'renderer/index.html' },
  });
  const files = [
    { ...record('renderer/index.html', html), sourcePath: 'web_agent.html' },
    { ...record('renderer/assets/web_agent-abc123.js', 'console.log("web agent");\n'), sourcePath: 'assets/web_agent-abc123.js' },
    { ...record('renderer/assets/web_agent-abc123.css', 'body{margin:0}\n'), sourcePath: 'assets/web_agent-abc123.css' },
    woodRpc,
    packageJson,
    ...(options.extraFiles ?? []),
  ];
  const manifest = {
    schemaVersion: 1,
    package: { name: ARTIFACT_NAME, version, registry: 'https://registry.kazibee.com' },
    entry: 'renderer/index.html',
    assetBase: './',
    source: {
      package: 'kazibee',
      version: '0.9.0',
      lockfileSha256: HEX('lock'),
      mode,
      commit: mode === 'release' ? COMMIT : (options.commit ?? COMMIT),
      branch: 'release',
      dirty: mode === 'release' ? false : true,
      dirtyEntries: mode === 'release' ? [] : ['package.json'],
      reproducible: mode === 'release',
      preload,
    },
    dependencies: {
      '@noego/wood': { version: '1.0.0' },
      vite: { version: '6.0.0' },
      svelte: { version: '5.38.0' },
      '@sveltejs/vite-plugin-svelte': { version: '5.0.3' },
      '@kazibee-internal/connect-client': { version: '0.1.0' },
      '@kazibee-internal/connect-protocol': { version: '0.1.0' },
    },
    tools: { node: 'v22.0.0', vite: '6.0.0', wood: '1.0.0', producer: { path: 'scripts/package-web-agent-renderer.mjs', sha256: HEX('producer') } },
    protocol: { ...protocolIdentity, woodRpc: { path: WOOD_RPC_FILE, entryCount: entries.length, sha256: woodRpc.sha256 } },
    files: files.map(({ text: _text, ...rest }) => rest).sort((a, b) => a.path.localeCompare(b.path)),
  };
  options.mutateManifest?.(manifest);
  manifest.checksum = checksumManifest(manifest);
  options.tamperManifest?.(manifest);

  mkdirSync(root, { recursive: true });
  for (const file of files) {
    const target = path.join(root, ...file.path.split('/'));
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, file.text);
  }
  writeFileSync(path.join(root, MANIFEST_FILE), JSON.stringify(manifest, null, 2) + '\n');
  return { root, manifest };
}

function buildWebsite(declaredVersion = VERSION) {
  const root = path.join(sandbox, 'website');
  mkdirSync(path.join(root, 'apps', 'agent'), { recursive: true });
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'kazibee', devDependencies: { [ARTIFACT_NAME]: declaredVersion } }));
  return root;
}

function installFixture(website, fixture) {
  const installed = path.join(website, 'node_modules', ...ARTIFACT_NAME.split('/'));
  mkdirSync(path.dirname(installed), { recursive: true });
  spawnSync('cp', ['-R', fixture.root, installed]);
  return installed;
}

function listTree(root) {
  const out = [];
  const visit = (dir, prefix) => {
    for (const name of readdirSync(dir).sort()) {
      const abs = path.join(dir, name);
      const rel = prefix ? `${prefix}/${name}` : name;
      if (lstatSync(abs).isDirectory()) visit(abs, rel);
      else out.push(rel);
    }
  };
  visit(root, '');
  return out;
}

function rejects(fn, code) {
  assert.throws(fn, (error) => {
    assert.equal(error.code, code, `expected ${code}, got ${error.code}: ${error.message}`);
    return true;
  });
}

describe('stage-web-agent-renderer', () => {
  it('stages a valid release artifact from the installed package (default mode)', () => {
    const website = buildWebsite();
    const fixture = buildFixture();
    installFixture(website, fixture);
    const result = stageWebAgentRenderer({ websiteRoot: website });
    assert.equal(result.outcome, 'staged');
    assert.equal(result.mode, 'release');
    assert.equal(result.files, 3);
    assert.equal(result.destination, path.join(website, 'apps', 'agent', 'renderer'));
    assert.deepEqual(listTree(result.destination), ['assets/web_agent-abc123.css', 'assets/web_agent-abc123.js', 'index.html']);
    assert.equal(readFileSync(path.join(result.destination, 'index.html'), 'utf8'), fixture.manifest.files.find((f) => f.path === 'renderer/index.html') && readFileSync(path.join(fixture.root, 'renderer', 'index.html'), 'utf8'));
    assert.deepEqual(readdirSync(path.join(website, 'apps', 'agent')), ['renderer'], 'no transaction directories left behind');
  });

  it('replaces a previous renderer drop and removes stale files', () => {
    const website = buildWebsite();
    installFixture(website, buildFixture());
    const destination = path.join(website, 'apps', 'agent', 'renderer');
    mkdirSync(path.join(destination, 'assets'), { recursive: true });
    writeFileSync(path.join(destination, 'index.html'), 'old');
    writeFileSync(path.join(destination, 'assets', 'web_agent-old.js'), 'old');
    stageWebAgentRenderer({ websiteRoot: website });
    assert.deepEqual(listTree(destination), ['assets/web_agent-abc123.css', 'assets/web_agent-abc123.js', 'index.html']);
  });

  it('rejects an artifact whose version is not the selected exact version', () => {
    const website = buildWebsite('0.2.0');
    installFixture(website, buildFixture());
    rejects(() => stageWebAgentRenderer({ websiteRoot: website }), 'VERSION_MISMATCH');
  });

  it('rejects a package.json that does not pin an exact version', () => {
    const website = buildWebsite('^0.1.0');
    installFixture(website, buildFixture());
    rejects(() => stageWebAgentRenderer({ websiteRoot: website }), 'VERSION_INVALID');
  });

  it('rejects a missing installed package without any fallback', () => {
    const website = buildWebsite();
    mkdirSync(path.join(website, 'apps', 'agent', 'renderer'), { recursive: true });
    writeFileSync(path.join(website, 'apps', 'agent', 'renderer', 'index.html'), 'old untracked renderer');
    rejects(() => stageWebAgentRenderer({ websiteRoot: website }), 'PACKAGE_MISSING');
    assert.equal(readFileSync(path.join(website, 'apps', 'agent', 'renderer', 'index.html'), 'utf8'), 'old untracked renderer');
  });

  it('rejects a tampered manifest (checksum mismatch)', () => {
    const fixture = buildFixture({ tamperManifest: (m) => { m.files[0].sha256 = ZERO; } });
    rejects(() => verifyWebAgentRendererPackage(fixture.root, { expectedVersion: VERSION }), 'MANIFEST_TAMPERED');
  });

  it('rejects a tampered inventory file', () => {
    const fixture = buildFixture();
    writeFileSync(path.join(fixture.root, 'renderer', 'assets', 'web_agent-abc123.js'), 'alert(1);\n');
    rejects(() => verifyWebAgentRendererPackage(fixture.root, { expectedVersion: VERSION }), 'PACKAGE_TAMPERED');
  });

  it('rejects a tampered artifact package.json', () => {
    const fixture = buildFixture();
    writeFileSync(path.join(fixture.root, 'package.json'), JSON.stringify({ name: ARTIFACT_NAME, version: VERSION, scripts: { postinstall: 'curl evil' } }));
    rejects(() => verifyWebAgentRendererPackage(fixture.root, { expectedVersion: VERSION }), 'PACKAGE_TAMPERED');
  });

  it('rejects undeclared extra files', () => {
    const fixture = buildFixture();
    writeFileSync(path.join(fixture.root, 'renderer', 'extra.js'), 'x');
    rejects(() => verifyWebAgentRendererPackage(fixture.root, { expectedVersion: VERSION }), 'PACKAGE_EXTRA_FILE');
  });

  it('rejects an undeclared LICENSE but accepts a declared one', () => {
    const undeclared = buildFixture({ name: 'undeclared' });
    writeFileSync(path.join(undeclared.root, 'LICENSE'), 'UNLICENSED');
    rejects(() => verifyWebAgentRendererPackage(undeclared.root, { expectedVersion: VERSION }), 'PACKAGE_EXTRA_FILE');
    const declared = buildFixture({ name: 'declared', extraFiles: [record('LICENSE', 'UNLICENSED')] });
    const verified = verifyWebAgentRendererPackage(declared.root, { expectedVersion: VERSION });
    assert.equal(verified.rendererFiles.length, 3, 'LICENSE is never copied to the renderer');
  });

  it('rejects missing inventory files', () => {
    const fixture = buildFixture();
    rmSync(path.join(fixture.root, 'renderer', 'assets', 'web_agent-abc123.css'));
    rejects(() => verifyWebAgentRendererPackage(fixture.root, { expectedVersion: VERSION }), 'PACKAGE_FILE_MISSING');
  });

  it('rejects inventory paths that escape or leave the allowed layout', () => {
    for (const bad of ['renderer/../escape.js', '../escape.js', '/etc/passwd', 'renderer/.hidden', 'renderer/assets/../x.js', 'other/file.js', 'renderer/a.map', 'renderer/node_modules/x.js']) {
      const fixture = buildFixture({ name: `bad-${HEX(bad).slice(0, 8)}`, mutateManifest: (m) => { m.files.push({ path: bad, bytes: 1, sha256: ZERO }); } });
      rejects(() => verifyWebAgentRendererPackage(fixture.root, { expectedVersion: VERSION }), 'MANIFEST_UNSAFE_PATH');
    }
  });

  it('rejects symlinks inside the artifact', () => {
    const fixture = buildFixture();
    rmSync(path.join(fixture.root, 'renderer', 'assets', 'web_agent-abc123.css'));
    symlinkSync(path.join(fixture.root, 'renderer', 'index.html'), path.join(fixture.root, 'renderer', 'assets', 'web_agent-abc123.css'));
    rejects(() => verifyWebAgentRendererPackage(fixture.root, { expectedVersion: VERSION }), 'PACKAGE_SYMLINK');
  });

  it('rejects an installed package that is itself a symlink in default mode', () => {
    const website = buildWebsite();
    const fixture = buildFixture();
    const installed = path.join(website, 'node_modules', ...ARTIFACT_NAME.split('/'));
    mkdirSync(path.dirname(installed), { recursive: true });
    symlinkSync(fixture.root, installed);
    rejects(() => stageWebAgentRenderer({ websiteRoot: website }), 'PACKAGE_SYMLINK');
  });

  it('rejects schema violations: unknown properties, wrong identity constants, missing dependencies', () => {
    const unknown = buildFixture({ name: 'unknown', mutateManifest: (m) => { m.extra = true; } });
    rejects(() => verifyWebAgentRendererPackage(unknown.root, { expectedVersion: VERSION }), 'MANIFEST_INVALID');
    const registry = buildFixture({ name: 'registry', mutateManifest: (m) => { m.package.registry = 'https://registry.npmjs.org'; } });
    rejects(() => verifyWebAgentRendererPackage(registry.root, { expectedVersion: VERSION }), 'MANIFEST_INVALID');
    const parser = buildFixture({ name: 'parser', mutateManifest: (m) => { m.protocol.parserSpecifier = '@evil/parser'; } });
    rejects(() => verifyWebAgentRendererPackage(parser.root, { expectedVersion: VERSION }), 'MANIFEST_INVALID');
    const schema = buildFixture({ name: 'schema', mutateManifest: (m) => { m.schemaVersion = 2; } });
    rejects(() => verifyWebAgentRendererPackage(schema.root, { expectedVersion: VERSION }), 'MANIFEST_INVALID');
    const deps = buildFixture({ name: 'deps', mutateManifest: (m) => { delete m.dependencies['@noego/wood']; } });
    rejects(() => verifyWebAgentRendererPackage(deps.root, { expectedVersion: VERSION }), 'MANIFEST_INVALID');
    const entry = buildFixture({ name: 'entry', mutateManifest: (m) => { m.entry = 'renderer/web_agent.html'; } });
    rejects(() => verifyWebAgentRendererPackage(entry.root, { expectedVersion: VERSION }), 'MANIFEST_INVALID');
    const claimsRelease = buildFixture({ name: 'claims', mutateManifest: (m) => { m.source.dirty = true; } });
    rejects(() => verifyWebAgentRendererPackage(claimsRelease.root, { expectedVersion: VERSION }), 'MANIFEST_INVALID');
  });

  it('rejects Wood RPC metadata whose hash, count or shape disagree with the manifest', () => {
    const count = buildFixture({ name: 'count', mutateManifest: (m) => { m.protocol.woodRpc.entryCount = 5; } });
    rejects(() => verifyWebAgentRendererPackage(count.root, { expectedVersion: VERSION }), 'WOOD_RPC_MISMATCH');
    const hash = buildFixture({ name: 'hash', mutateManifest: (m) => { m.protocol.woodRpc.sha256 = ZERO; } });
    rejects(() => verifyWebAgentRendererPackage(hash.root, { expectedVersion: VERSION }), 'WOOD_RPC_MISMATCH');
    const shape = buildFixture({ name: 'shape', entries: [{ channel: 'x', controller: 'x', action: 'x', path: ['x'], hasInput: 'yes' }] });
    rejects(() => verifyWebAgentRendererPackage(shape.root, { expectedVersion: VERSION }), 'WOOD_RPC_INVALID');
    const duplicate = buildFixture({ name: 'dup', entries: [
      { channel: 'x', controller: 'x', action: 'x', path: ['x'], hasInput: false },
      { channel: 'x', controller: 'x', action: 'x', path: ['x'], hasInput: false },
    ] });
    rejects(() => verifyWebAgentRendererPackage(duplicate.root, { expectedVersion: VERSION }), 'WOOD_RPC_INVALID');
  });

  it('rejects a renderer entry that references undeclared or absolute assets', () => {
    const missing = buildFixture({ name: 'missing', html: '<script src="./assets/other.js"></script>' });
    rejects(() => verifyWebAgentRendererPackage(missing.root, { expectedVersion: VERSION }), 'ENTRY_ASSET_MISSING');
    const absolute = buildFixture({ name: 'absolute', html: '<script src="/assets/web_agent-abc123.js"></script>' });
    rejects(() => verifyWebAgentRendererPackage(absolute.root, { expectedVersion: VERSION }), 'ENTRY_ABSOLUTE_ASSET');
  });

  it('refuses local-development artifacts unless --local is given', () => {
    const website = buildWebsite();
    installFixture(website, buildFixture({ mode: 'local-development' }));
    rejects(() => stageWebAgentRenderer({ websiteRoot: website }), 'ARTIFACT_NOT_RELEASE');
    const result = stageWebAgentRenderer({ websiteRoot: website, local: true });
    assert.equal(result.mode, 'local-development');
    assert.equal(result.dirty, true);
  });

  it('requires --local for the --package-root override', () => {
    const website = buildWebsite();
    const fixture = buildFixture();
    rejects(() => stageWebAgentRenderer({ websiteRoot: website, packageRoot: fixture.root }), 'PACKAGE_ROOT_REQUIRES_LOCAL');
    assert.equal(existsSync(path.join(website, 'apps', 'agent', 'renderer')), false);
    const result = stageWebAgentRenderer({ websiteRoot: website, packageRoot: fixture.root, local: true });
    assert.equal(result.packageRoot, fixture.root);
  });

  it('parses CLI flags strictly', () => {
    assert.deepEqual(parseCliArguments(['--local', '--package-root', '/x', '--destination=/y']), { local: true, packageRoot: '/x', destination: '/y' });
    rejects(() => parseCliArguments(['--bogus', '1']), 'CLI_INVALID');
    rejects(() => parseCliArguments(['positional']), 'CLI_INVALID');
    rejects(() => parseCliArguments(['--package-root']), 'CLI_INVALID');
  });

  it('refuses unsafe destinations', () => {
    const website = buildWebsite();
    const fixture = buildFixture();
    const stage = (destination) => stageWebAgentRenderer({ websiteRoot: website, packageRoot: fixture.root, local: true, destination });
    rejects(() => stage(website), 'DESTINATION_UNSAFE');
    rejects(() => stage(path.parse(website).root), 'DESTINATION_UNSAFE');
    mkdirSync(path.join(website, 'node_modules'));
    rejects(() => stage(path.join(website, 'node_modules', 'renderer')), 'DESTINATION_UNSAFE');
    rejects(() => stage(path.join(fixture.root, 'renderer')), 'DESTINATION_UNSAFE');
    rejects(() => stage(path.join(website, 'apps', 'missing-parent', 'renderer')), 'DESTINATION_PARENT_MISSING');
    const project = path.join(website, 'apps', 'agent', 'project');
    mkdirSync(project);
    writeFileSync(path.join(project, 'package.json'), '{}');
    writeFileSync(path.join(project, 'index.html'), '');
    rejects(() => stage(project), 'DESTINATION_UNSAFE');
    assert.deepEqual(readdirSync(project).sort(), ['index.html', 'package.json'], 'a non-renderer directory is never touched');
    const link = path.join(website, 'apps', 'agent', 'linked');
    symlinkSync(project, link);
    rejects(() => stage(link), 'DESTINATION_UNSAFE');
    const file = path.join(website, 'apps', 'agent', 'file');
    writeFileSync(file, '');
    rejects(() => stage(file), 'DESTINATION_UNSAFE');
  });

  it('rolls back to the previous renderer when the swap fails', () => {
    const website = buildWebsite();
    installFixture(website, buildFixture());
    const destination = path.join(website, 'apps', 'agent', 'renderer');
    mkdirSync(destination, { recursive: true });
    writeFileSync(path.join(destination, 'index.html'), 'previous');
    assert.throws(() => stageWebAgentRenderer({ websiteRoot: website, beforeCommit: () => { throw new Error('simulated failure'); } }), /simulated failure/);
    assert.deepEqual(listTree(destination), ['index.html']);
    assert.equal(readFileSync(path.join(destination, 'index.html'), 'utf8'), 'previous');
    assert.deepEqual(readdirSync(path.join(website, 'apps', 'agent')), ['renderer'], 'no incoming/previous directories remain');
  });

  it('leaves nothing behind when validation fails before the swap', () => {
    const website = buildWebsite();
    const fixture = buildFixture();
    writeFileSync(path.join(fixture.root, 'renderer', 'extra.js'), 'x');
    installFixture(website, fixture);
    rejects(() => stageWebAgentRenderer({ websiteRoot: website }), 'PACKAGE_EXTRA_FILE');
    assert.deepEqual(readdirSync(path.join(website, 'apps', 'agent')), []);
  });

  it('CLI: stages with --local --package-root and refuses the override without --local', () => {
    const website = buildWebsite();
    const fixture = buildFixture({ mode: 'local-development' });
    const refused = spawnSync(process.execPath, [SCRIPT, '--website-root', website, '--package-root', fixture.root], { encoding: 'utf8' });
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /PACKAGE_ROOT_REQUIRES_LOCAL/);
    const ok = spawnSync(process.execPath, [SCRIPT, '--website-root', website, '--local', '--package-root', fixture.root], { encoding: 'utf8' });
    assert.equal(ok.status, 0, ok.stderr);
    const summary = JSON.parse(ok.stdout);
    assert.equal(summary.outcome, 'staged');
    assert.equal(summary.local, true);
    assert.equal(existsSync(path.join(website, 'apps', 'agent', 'renderer', 'index.html')), true);
  });

  it('CLI: default invocation reads node_modules and rejects a local-mode artifact', () => {
    const website = buildWebsite();
    installFixture(website, buildFixture({ mode: 'local-development' }));
    const refused = spawnSync(process.execPath, [SCRIPT, '--website-root', website], { encoding: 'utf8' });
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /ARTIFACT_NOT_RELEASE/);
    assert.equal(existsSync(path.join(website, 'apps', 'agent', 'renderer')), false);
  });

  const realArtifact = process.env.KAZIBEE_WEB_AGENT_RENDERER_ARTIFACT;
  it('verifies a real producer artifact when KAZIBEE_WEB_AGENT_RENDERER_ARTIFACT is set', { skip: !realArtifact || !existsSync(realArtifact ?? '') }, () => {
    const manifest = JSON.parse(readFileSync(path.join(realArtifact, MANIFEST_FILE), 'utf8'));
    const website = buildWebsite(manifest.package.version);
    const result = stageWebAgentRenderer({ websiteRoot: website, packageRoot: realArtifact, local: true });
    assert.equal(result.outcome, 'staged');
    assert.equal(result.files, manifest.files.filter((f) => f.path.startsWith('renderer/')).length);
  });
});
