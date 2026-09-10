#!/usr/bin/env node
// Stages the Desktop-produced @kazibee-internal/web-agent-renderer artifact into
// apps/agent/renderer for the Cloudflare Web Agent worker.
//
// Fail-closed consumer of the artifact contract owned by the Desktop repo
// (scripts/web-agent-renderer-artifact.schema.json, schemaVersion 1):
//   - manifest present, well-formed, identity constants intact, checksum equal to
//     sha256(canonical JSON without `checksum`)
//   - exact version equal to the pinned devDependency in package.json
//   - complete inventory: every declared file present with exact bytes + sha256,
//     no undeclared files (besides the manifest), safe relative paths, no symlinks
//   - generated Wood RPC metadata hash, shape and entry count match the manifest
//   - renderer entry present and every relative asset it references is declared
//   - protocol dimensions limited to the known parser/package
//   - release (default) refuses `local-development`, dirty or unreproducible
//     artifacts; `--local` allows them for developer machines only
// Only the declared `renderer/**` files are copied, transactionally: the new tree
// is built beside the destination and swapped in; on any failure the previous
// tree is restored and nothing else is touched. No package scripts are executed,
// and there is no fallback to a Desktop checkout or a previously staged tree.

import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
} from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const ARTIFACT_NAME = '@kazibee-internal/web-agent-renderer';
export const ARTIFACT_REGISTRY = 'https://registry.kazibee.com';
export const MANIFEST_SCHEMA_VERSION = 1;
export const MANIFEST_FILE = 'web-agent-renderer.manifest.json';
export const WOOD_RPC_FILE = 'wood-rpc-manifest.json';
export const RENDERER_DIR = 'renderer';
export const ARTIFACT_ENTRY = `${RENDERER_DIR}/index.html`;
export const ASSET_BASE = './';
export const PROTOCOL_PACKAGE = '@kazibee-internal/connect-protocol';
export const PROTOCOL_PARSER_SPECIFIER = `${PROTOCOL_PACKAGE}/viewer`;
export const PRODUCER_PATH = 'scripts/package-web-agent-renderer.mjs';
export const MODES = Object.freeze(['release', 'local-development']);
export const DEFAULT_DESTINATION = path.join('apps', 'agent', RENDERER_DIR);

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const DEFAULT_WEBSITE_ROOT = path.resolve(path.dirname(SCRIPT_PATH), '..');
const REQUIRED_DEPENDENCIES = Object.freeze([
  '@noego/wood',
  'vite',
  'svelte',
  '@sveltejs/vite-plugin-svelte',
  '@kazibee-internal/connect-client',
  PROTOCOL_PACKAGE,
]);
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const SHA256 = /^[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const INVENTORY_PATH = /^(renderer\/.+|wood-rpc-manifest\.json|package\.json|LICENSE)$/;
const PRIVATE_FILE = /(?:\.map|\.pem|\.key|\.p12|\.pfx)$/i;
const MANIFEST_KEYS = Object.freeze(['schemaVersion', 'package', 'entry', 'assetBase', 'source', 'dependencies', 'tools', 'protocol', 'files', 'checksum']);
const SOURCE_KEYS = Object.freeze(['package', 'version', 'lockfileSha256', 'mode', 'commit', 'branch', 'dirty', 'dirtyEntries', 'reproducible', 'preload']);
const TOOLS_KEYS = Object.freeze(['node', 'vite', 'wood', 'producer']);
const PROTOCOL_KEYS = Object.freeze(['package', 'version', 'parserSpecifier', 'parserSha256', 'woodRpc']);
const WOOD_RPC_KEYS = Object.freeze(['path', 'entryCount', 'sha256']);
const WOOD_RPC_FILE_KEYS = Object.freeze(['schemaVersion', 'source', 'protocol', 'entries']);
const WOOD_RPC_ENTRY_KEYS = Object.freeze(['channel', 'controller', 'action', 'path', 'hasInput']);
const FILE_KEYS = Object.freeze(['path', 'sourcePath', 'bytes', 'sha256']);
const MARKER_FILES = Object.freeze(['package.json', '.git', 'node_modules', '.npmrc', '.env']);

export class StagingError extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.name = 'StagingError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new StagingError(code, message);
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function checksumManifest(manifest) {
  const { checksum: _ignored, ...rest } = manifest;
  return sha256(canonicalJson(rest));
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isSymlinkOrMissing(candidate) {
  try {
    return lstatSync(candidate).isSymbolicLink();
  } catch {
    return false;
  }
}

function readJsonFile(filePath, code, label) {
  if (!existsSync(filePath)) fail(code, `${label} is missing: ${filePath}`);
  if (lstatSync(filePath).isSymbolicLink()) fail(code, `${label} must not be a symlink: ${filePath}`);
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    fail(code, `${label} is not valid JSON: ${filePath}`);
  }
  if (!isPlainObject(parsed)) fail(code, `${label} is not a JSON object: ${filePath}`);
  return parsed;
}

// ---------------------------------------------------------------------------
// Manifest schema (mirrors web-agent-renderer-artifact.schema.json, v1)
// ---------------------------------------------------------------------------

function expectObject(value, allowedKeys, requiredKeys, label) {
  if (!isPlainObject(value)) fail('MANIFEST_INVALID', `${label} must be an object`);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.includes(key)) fail('MANIFEST_INVALID', `${label} has unexpected property ${JSON.stringify(key)}`);
  }
  for (const key of requiredKeys) {
    if (!(key in value)) fail('MANIFEST_INVALID', `${label} is missing ${JSON.stringify(key)}`);
  }
}

function expectString(value, label) {
  if (typeof value !== 'string') fail('MANIFEST_INVALID', `${label} must be a string`);
}

function expectSha256(value, label) {
  if (typeof value !== 'string' || !SHA256.test(value)) fail('MANIFEST_INVALID', `${label} must be a sha256 hex digest`);
}

function expectConst(value, expected, label) {
  if (value !== expected) fail('MANIFEST_INVALID', `${label} must be ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`);
}

function validateInventoryPath(entryPath, seen) {
  expectString(entryPath, 'files[].path');
  if (!INVENTORY_PATH.test(entryPath)) fail('MANIFEST_UNSAFE_PATH', `inventory path is outside the allowed layout: ${entryPath}`);
  if (entryPath.includes('\\') || entryPath.includes('\0') || entryPath.startsWith('/') || entryPath.endsWith('/')) {
    fail('MANIFEST_UNSAFE_PATH', `inventory path is not a safe relative posix path: ${entryPath}`);
  }
  const segments = entryPath.split('/');
  for (const segment of segments) {
    if (segment === '' || segment === '.' || segment === '..') fail('MANIFEST_UNSAFE_PATH', `inventory path escapes or repeats the tree: ${entryPath}`);
    if (segment.startsWith('.')) fail('MANIFEST_UNSAFE_PATH', `hidden entries are not allowed in the artifact: ${entryPath}`);
    if (segment === 'node_modules') fail('MANIFEST_UNSAFE_PATH', `node_modules is not allowed in the artifact: ${entryPath}`);
    if (/[<>:"|?*]/.test(segment) || /[\x00-\x1f]/.test(segment)) fail('MANIFEST_UNSAFE_PATH', `inventory path contains an unsafe character: ${entryPath}`);
  }
  if (PRIVATE_FILE.test(entryPath)) fail('MANIFEST_UNSAFE_PATH', `private file or source map is not allowed: ${entryPath}`);
  const folded = entryPath.toLowerCase();
  if (seen.has(folded)) fail('MANIFEST_INVALID', `inventory path is declared twice: ${entryPath}`);
  seen.add(folded);
}

export function validateManifestShape(manifest) {
  expectObject(manifest, MANIFEST_KEYS, MANIFEST_KEYS, 'manifest');
  expectConst(manifest.schemaVersion, MANIFEST_SCHEMA_VERSION, 'manifest.schemaVersion');

  expectObject(manifest.package, ['name', 'version', 'registry'], ['name', 'version', 'registry'], 'manifest.package');
  expectConst(manifest.package.name, ARTIFACT_NAME, 'manifest.package.name');
  expectConst(manifest.package.registry, ARTIFACT_REGISTRY, 'manifest.package.registry');
  if (typeof manifest.package.version !== 'string' || !SEMVER.test(manifest.package.version)) {
    fail('MANIFEST_INVALID', `manifest.package.version must be an exact semver, got ${JSON.stringify(manifest.package.version)}`);
  }
  expectConst(manifest.entry, ARTIFACT_ENTRY, 'manifest.entry');
  expectConst(manifest.assetBase, ASSET_BASE, 'manifest.assetBase');

  const source = manifest.source;
  expectObject(source, SOURCE_KEYS, SOURCE_KEYS, 'manifest.source');
  expectString(source.package, 'manifest.source.package');
  expectString(source.version, 'manifest.source.version');
  expectSha256(source.lockfileSha256, 'manifest.source.lockfileSha256');
  if (!MODES.includes(source.mode)) fail('MANIFEST_INVALID', `manifest.source.mode must be one of ${MODES.join(', ')}`);
  if (source.commit !== null && (typeof source.commit !== 'string' || !COMMIT.test(source.commit))) {
    fail('MANIFEST_INVALID', 'manifest.source.commit must be a 40-hex commit or null');
  }
  if (source.branch !== null && typeof source.branch !== 'string') fail('MANIFEST_INVALID', 'manifest.source.branch must be a string or null');
  if (typeof source.dirty !== 'boolean') fail('MANIFEST_INVALID', 'manifest.source.dirty must be a boolean');
  if (!Array.isArray(source.dirtyEntries) || source.dirtyEntries.some((entry) => typeof entry !== 'string')) {
    fail('MANIFEST_INVALID', 'manifest.source.dirtyEntries must be an array of strings');
  }
  if (typeof source.reproducible !== 'boolean') fail('MANIFEST_INVALID', 'manifest.source.reproducible must be a boolean');
  expectObject(source.preload, ['path', 'sha256'], ['path', 'sha256'], 'manifest.source.preload');
  expectString(source.preload.path, 'manifest.source.preload.path');
  expectSha256(source.preload.sha256, 'manifest.source.preload.sha256');
  if (source.mode === 'release') {
    if (source.dirty !== false) fail('MANIFEST_INVALID', 'release manifest must record dirty=false');
    if (source.reproducible !== true) fail('MANIFEST_INVALID', 'release manifest must record reproducible=true');
    if (typeof source.commit !== 'string') fail('MANIFEST_INVALID', 'release manifest must record a commit');
  }

  if (!isPlainObject(manifest.dependencies)) fail('MANIFEST_INVALID', 'manifest.dependencies must be an object');
  for (const name of REQUIRED_DEPENDENCIES) {
    if (!(name in manifest.dependencies)) fail('MANIFEST_INVALID', `manifest.dependencies is missing ${name}`);
  }
  for (const [name, dependency] of Object.entries(manifest.dependencies)) {
    expectObject(dependency, ['version'], ['version'], `manifest.dependencies[${JSON.stringify(name)}]`);
    expectString(dependency.version, `manifest.dependencies[${JSON.stringify(name)}].version`);
  }

  expectObject(manifest.tools, TOOLS_KEYS, TOOLS_KEYS, 'manifest.tools');
  expectString(manifest.tools.node, 'manifest.tools.node');
  expectString(manifest.tools.vite, 'manifest.tools.vite');
  expectString(manifest.tools.wood, 'manifest.tools.wood');
  expectObject(manifest.tools.producer, ['path', 'sha256'], ['path', 'sha256'], 'manifest.tools.producer');
  expectConst(manifest.tools.producer.path, PRODUCER_PATH, 'manifest.tools.producer.path');
  expectSha256(manifest.tools.producer.sha256, 'manifest.tools.producer.sha256');

  const protocol = manifest.protocol;
  expectObject(protocol, PROTOCOL_KEYS, PROTOCOL_KEYS, 'manifest.protocol');
  expectConst(protocol.package, PROTOCOL_PACKAGE, 'manifest.protocol.package');
  expectString(protocol.version, 'manifest.protocol.version');
  expectConst(protocol.parserSpecifier, PROTOCOL_PARSER_SPECIFIER, 'manifest.protocol.parserSpecifier');
  expectSha256(protocol.parserSha256, 'manifest.protocol.parserSha256');
  expectObject(protocol.woodRpc, WOOD_RPC_KEYS, WOOD_RPC_KEYS, 'manifest.protocol.woodRpc');
  expectConst(protocol.woodRpc.path, WOOD_RPC_FILE, 'manifest.protocol.woodRpc.path');
  if (!Number.isInteger(protocol.woodRpc.entryCount) || protocol.woodRpc.entryCount < 1) {
    fail('MANIFEST_INVALID', 'manifest.protocol.woodRpc.entryCount must be a positive integer');
  }
  expectSha256(protocol.woodRpc.sha256, 'manifest.protocol.woodRpc.sha256');

  if (!Array.isArray(manifest.files) || manifest.files.length < 3) fail('MANIFEST_INVALID', 'manifest.files must list at least 3 entries');
  const seen = new Set();
  for (const file of manifest.files) {
    expectObject(file, FILE_KEYS, ['path', 'bytes', 'sha256'], 'manifest.files[]');
    validateInventoryPath(file.path, seen);
    if ('sourcePath' in file) expectString(file.sourcePath, `manifest.files[${file.path}].sourcePath`);
    if (!Number.isInteger(file.bytes) || file.bytes < 0) fail('MANIFEST_INVALID', `manifest.files[${file.path}].bytes must be a non-negative integer`);
    expectSha256(file.sha256, `manifest.files[${file.path}].sha256`);
  }
  expectSha256(manifest.checksum, 'manifest.checksum');
  if (manifest.checksum !== checksumManifest(manifest)) fail('MANIFEST_TAMPERED', 'manifest checksum does not match its contents');
  return manifest;
}

// ---------------------------------------------------------------------------
// Package root
// ---------------------------------------------------------------------------

function walkPackage(root) {
  const files = new Map();
  const visit = (directory) => {
    for (const name of readdirSync(directory).sort()) {
      const absolute = path.join(directory, name);
      const relative = toPosix(path.relative(root, absolute));
      const stats = lstatSync(absolute);
      if (stats.isSymbolicLink()) fail('PACKAGE_SYMLINK', `symlink in artifact: ${relative}`);
      if (stats.isDirectory()) {
        visit(absolute);
        continue;
      }
      if (!stats.isFile()) fail('PACKAGE_NOT_REGULAR', `not a regular file: ${relative}`);
      files.set(relative, { absolute, bytes: stats.size });
    }
  };
  visit(root);
  return files;
}

function referencedAssets(html) {
  const references = new Set();
  const attribute = /\b(?:src|href)\s*=\s*["']([^"']+)["']/g;
  let match;
  while ((match = attribute.exec(html)) !== null) {
    const value = match[1];
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#|data:)/i.test(value)) continue;
    if (value.startsWith('/')) fail('ENTRY_ABSOLUTE_ASSET', `renderer entry references an absolute asset path: ${value}`);
    const cleaned = value.replace(/^\.\//, '').split(/[?#]/)[0];
    if (cleaned === '' || cleaned.split('/').some((segment) => segment === '..' || segment === '')) {
      fail('ENTRY_ABSOLUTE_ASSET', `renderer entry references a non-relative asset path: ${value}`);
    }
    references.add(cleaned);
  }
  return references;
}

function verifyWoodRpc(manifest, packageRoot, inventory) {
  const record = inventory.get(WOOD_RPC_FILE);
  if (!record) fail('MANIFEST_INVALID', `${WOOD_RPC_FILE} is not in the inventory`);
  if (record.sha256 !== manifest.protocol.woodRpc.sha256) {
    fail('WOOD_RPC_MISMATCH', `${WOOD_RPC_FILE} inventory hash differs from manifest.protocol.woodRpc.sha256`);
  }
  const text = readFileSync(path.join(packageRoot, WOOD_RPC_FILE), 'utf8');
  if (sha256(text) !== manifest.protocol.woodRpc.sha256) fail('WOOD_RPC_MISMATCH', `${WOOD_RPC_FILE} does not match manifest.protocol.woodRpc.sha256`);
  let rpc;
  try {
    rpc = JSON.parse(text);
  } catch {
    fail('WOOD_RPC_INVALID', `${WOOD_RPC_FILE} is not valid JSON`);
  }
  const label = WOOD_RPC_FILE;
  if (!isPlainObject(rpc)) fail('WOOD_RPC_INVALID', `${label} must be an object`);
  for (const key of Object.keys(rpc)) {
    if (!WOOD_RPC_FILE_KEYS.includes(key)) fail('WOOD_RPC_INVALID', `${label} has unexpected property ${JSON.stringify(key)}`);
  }
  for (const key of WOOD_RPC_FILE_KEYS) {
    if (!(key in rpc)) fail('WOOD_RPC_INVALID', `${label} is missing ${JSON.stringify(key)}`);
  }
  if (rpc.schemaVersion !== MANIFEST_SCHEMA_VERSION) fail('WOOD_RPC_INVALID', `${label} has unsupported schemaVersion`);
  if (!isPlainObject(rpc.source) || rpc.source.path !== manifest.source.preload.path || rpc.source.sha256 !== manifest.source.preload.sha256) {
    fail('WOOD_RPC_MISMATCH', `${label} source does not match manifest.source.preload`);
  }
  const expectedProtocol = {
    package: manifest.protocol.package,
    version: manifest.protocol.version,
    parserSpecifier: manifest.protocol.parserSpecifier,
    parserSha256: manifest.protocol.parserSha256,
  };
  if (!isPlainObject(rpc.protocol) || canonicalJson(rpc.protocol) !== canonicalJson(expectedProtocol)) {
    fail('WOOD_RPC_MISMATCH', `${label} protocol identity does not match manifest.protocol`);
  }
  if (!Array.isArray(rpc.entries)) fail('WOOD_RPC_INVALID', `${label} entries must be an array`);
  if (rpc.entries.length !== manifest.protocol.woodRpc.entryCount) {
    fail('WOOD_RPC_MISMATCH', `${label} has ${rpc.entries.length} entries, manifest declares ${manifest.protocol.woodRpc.entryCount}`);
  }
  const channels = new Set();
  rpc.entries.forEach((entry, index) => {
    const entryLabel = `${label} entries[${index}]`;
    if (!isPlainObject(entry)) fail('WOOD_RPC_INVALID', `${entryLabel} must be an object`);
    for (const key of Object.keys(entry)) {
      if (!WOOD_RPC_ENTRY_KEYS.includes(key)) fail('WOOD_RPC_INVALID', `${entryLabel} has unexpected property ${JSON.stringify(key)}`);
    }
    for (const key of WOOD_RPC_ENTRY_KEYS) {
      if (!(key in entry)) fail('WOOD_RPC_INVALID', `${entryLabel} is missing ${JSON.stringify(key)}`);
    }
    if (typeof entry.channel !== 'string' || entry.channel === '') fail('WOOD_RPC_INVALID', `${entryLabel}.channel must be a non-empty string`);
    if (typeof entry.controller !== 'string' || typeof entry.action !== 'string') fail('WOOD_RPC_INVALID', `${entryLabel} controller/action must be strings`);
    if (!Array.isArray(entry.path) || entry.path.length === 0 || entry.path.some((segment) => typeof segment !== 'string')) {
      fail('WOOD_RPC_INVALID', `${entryLabel}.path must be a non-empty array of strings`);
    }
    if (typeof entry.hasInput !== 'boolean') fail('WOOD_RPC_INVALID', `${entryLabel}.hasInput must be a boolean`);
    if (channels.has(entry.channel)) fail('WOOD_RPC_INVALID', `${label} declares channel ${entry.channel} twice`);
    channels.add(entry.channel);
  });
  return rpc;
}

function verifyPackageIdentity(manifest, packageRoot) {
  const packageJson = readJsonFile(path.join(packageRoot, 'package.json'), 'PACKAGE_INVALID', 'artifact package.json');
  if (packageJson.name !== ARTIFACT_NAME) fail('PACKAGE_INVALID', `artifact package.json name is ${JSON.stringify(packageJson.name)}, expected ${ARTIFACT_NAME}`);
  if (packageJson.version !== manifest.package.version) {
    fail('PACKAGE_INVALID', `artifact package.json version ${JSON.stringify(packageJson.version)} differs from manifest ${manifest.package.version}`);
  }
  if (packageJson.scripts !== undefined && (!isPlainObject(packageJson.scripts) || Object.keys(packageJson.scripts).length > 0)) {
    fail('PACKAGE_INVALID', 'artifact package.json must not declare scripts');
  }
  return packageJson;
}

/**
 * Fail-closed validation of an artifact directory (installed package or a
 * producer stage). Returns { manifest, packageRoot, rendererFiles } where
 * rendererFiles are the declared `renderer/**` records with absolute paths.
 */
export function verifyWebAgentRendererPackage(packageRootInput, { expectedVersion, local = false } = {}) {
  if (typeof packageRootInput !== 'string' || packageRootInput.trim() === '') fail('PACKAGE_ROOT_REQUIRED', 'an artifact package root is required');
  const requested = path.resolve(packageRootInput);
  if (!existsSync(requested)) fail('PACKAGE_MISSING', `artifact package is not installed: ${requested}`);
  if (lstatSync(requested).isSymbolicLink() && !local) fail('PACKAGE_SYMLINK', `installed artifact must not be a symlink: ${requested}`);
  const packageRoot = realpathSync(requested);
  if (!statSync(packageRoot).isDirectory()) fail('PACKAGE_MISSING', `artifact package root is not a directory: ${packageRoot}`);
  if (typeof expectedVersion !== 'string' || !SEMVER.test(expectedVersion)) {
    fail('VERSION_INVALID', `an exact semver expected version is required, got ${JSON.stringify(expectedVersion)}`);
  }

  const manifest = readJsonFile(path.join(packageRoot, MANIFEST_FILE), 'MANIFEST_MISSING', 'artifact manifest');
  validateManifestShape(manifest);
  if (manifest.package.version !== expectedVersion) {
    fail('VERSION_MISMATCH', `artifact version ${manifest.package.version} is not the selected version ${expectedVersion}`);
  }
  if (!local) {
    if (manifest.source.mode !== 'release') fail('ARTIFACT_NOT_RELEASE', `artifact was produced in ${manifest.source.mode} mode; pass --local to stage it on a developer machine`);
    if (manifest.source.dirty || !manifest.source.reproducible || typeof manifest.source.commit !== 'string') {
      fail('ARTIFACT_NOT_RELEASE', 'artifact source is dirty or unreproducible');
    }
  }

  const inventory = new Map(manifest.files.map((file) => [file.path, file]));
  if (!inventory.has(ARTIFACT_ENTRY)) fail('MANIFEST_INVALID', `entry ${ARTIFACT_ENTRY} is not in the inventory`);
  if (!inventory.has('package.json')) fail('MANIFEST_INVALID', 'package.json is not in the inventory');
  if (!inventory.has(WOOD_RPC_FILE)) fail('MANIFEST_INVALID', `${WOOD_RPC_FILE} is not in the inventory`);
  if (![...inventory.keys()].some((file) => file.startsWith(`${RENDERER_DIR}/assets/`) && file.endsWith('.js'))) {
    fail('MANIFEST_INVALID', `inventory has no ${RENDERER_DIR}/assets/*.js`);
  }

  const present = walkPackage(packageRoot);
  for (const [relative, info] of present) {
    if (relative === MANIFEST_FILE) continue;
    const record = inventory.get(relative);
    if (!record) fail('PACKAGE_EXTRA_FILE', `file is not in the manifest inventory: ${relative}`);
    if (info.bytes !== record.bytes) fail('PACKAGE_TAMPERED', `file size does not match manifest: ${relative}`);
    if (sha256(readFileSync(info.absolute)) !== record.sha256) fail('PACKAGE_TAMPERED', `file does not match manifest: ${relative}`);
  }
  for (const relative of inventory.keys()) {
    if (!present.has(relative)) fail('PACKAGE_FILE_MISSING', `manifest inventory file is missing: ${relative}`);
  }

  verifyPackageIdentity(manifest, packageRoot);
  verifyWoodRpc(manifest, packageRoot, inventory);

  const html = readFileSync(path.join(packageRoot, ...ARTIFACT_ENTRY.split('/')), 'utf8');
  for (const reference of referencedAssets(html)) {
    if (!inventory.has(`${RENDERER_DIR}/${reference}`)) fail('ENTRY_ASSET_MISSING', `renderer entry references an undeclared asset: ${reference}`);
  }

  const rendererFiles = manifest.files
    .filter((file) => file.path.startsWith(`${RENDERER_DIR}/`))
    .map((file) => ({ ...file, relative: file.path.slice(RENDERER_DIR.length + 1), absolute: present.get(file.path).absolute }));
  return { manifest, packageRoot, rendererFiles };
}

// ---------------------------------------------------------------------------
// Destination
// ---------------------------------------------------------------------------

function looksLikeRendererDrop(destination) {
  const entries = readdirSync(destination);
  if (entries.length === 0) return true;
  if (!entries.includes('index.html')) return false;
  return !entries.some((entry) => MARKER_FILES.includes(entry));
}

export function resolveDestination(destinationInput, { websiteRoot, packageRoot }) {
  if (typeof destinationInput !== 'string' || destinationInput.trim() === '') fail('DESTINATION_REQUIRED', 'a destination directory is required');
  const requested = path.resolve(websiteRoot, destinationInput);
  if (isSymlinkOrMissing(requested)) fail('DESTINATION_UNSAFE', `destination must not be a symlink: ${requested}`);
  const parent = path.dirname(requested);
  if (!existsSync(parent) || !statSync(parent).isDirectory()) fail('DESTINATION_PARENT_MISSING', `destination parent must be an existing directory: ${parent}`);
  const destination = path.join(realpathSync(parent), path.basename(requested));
  const protectedPaths = [path.parse(destination).root, homedir(), realpathSync(websiteRoot), packageRoot];
  for (const candidate of protectedPaths) {
    if (destination === candidate || isInside(destination, candidate)) fail('DESTINATION_UNSAFE', `destination would contain or equal a protected path: ${destination}`);
  }
  if (isInside(packageRoot, destination)) fail('DESTINATION_UNSAFE', `destination must not live inside the artifact package: ${destination}`);
  if (destination.split(path.sep).includes('node_modules')) fail('DESTINATION_UNSAFE', `destination must not live under node_modules: ${destination}`);
  if (existsSync(destination)) {
    if (!statSync(destination).isDirectory()) fail('DESTINATION_UNSAFE', `destination exists and is not a directory: ${destination}`);
    if (!looksLikeRendererDrop(destination)) fail('DESTINATION_UNSAFE', `destination is not empty and does not look like a previous renderer drop: ${destination}`);
  }
  return destination;
}

function copyRenderer(rendererFiles, target) {
  mkdirSync(target);
  for (const file of rendererFiles) {
    const output = path.join(target, ...file.relative.split('/'));
    mkdirSync(path.dirname(output), { recursive: true });
    copyFileSync(file.absolute, output);
    const written = readFileSync(output);
    if (written.length !== file.bytes || sha256(written) !== file.sha256) fail('COPY_TAMPERED', `copied file does not match manifest: ${file.path}`);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function readExpectedVersion(websiteRoot) {
  const packageJson = readJsonFile(path.join(websiteRoot, 'package.json'), 'WEBSITE_PACKAGE_MISSING', 'website package.json');
  const declared = packageJson.devDependencies?.[ARTIFACT_NAME] ?? packageJson.dependencies?.[ARTIFACT_NAME];
  if (typeof declared !== 'string' || !SEMVER.test(declared)) {
    fail('VERSION_INVALID', `${ARTIFACT_NAME} must be pinned to an exact version in package.json, got ${JSON.stringify(declared)}`);
  }
  return declared;
}

/**
 * Validate the artifact and stage its renderer tree into the destination.
 * Transactional: builds the new tree beside the destination, swaps it in, and
 * on any failure restores the previous tree and removes what it created.
 */
export function stageWebAgentRenderer(options = {}) {
  const websiteRoot = path.resolve(options.websiteRoot ?? DEFAULT_WEBSITE_ROOT);
  const local = options.local === true;
  if (options.packageRoot !== undefined && !local) {
    fail('PACKAGE_ROOT_REQUIRES_LOCAL', '--package-root is a local-development override and requires --local');
  }
  const packageRootInput = options.packageRoot ?? path.join(websiteRoot, 'node_modules', ...ARTIFACT_NAME.split('/'));
  const expectedVersion = options.expectedVersion ?? readExpectedVersion(websiteRoot);
  const verified = verifyWebAgentRendererPackage(packageRootInput, { expectedVersion, local });
  const destination = resolveDestination(options.destination ?? DEFAULT_DESTINATION, { websiteRoot, packageRoot: verified.packageRoot });

  const token = `${process.pid}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const incoming = path.join(path.dirname(destination), `.${path.basename(destination)}.incoming-${token}`);
  const previous = path.join(path.dirname(destination), `.${path.basename(destination)}.previous-${token}`);
  if (existsSync(incoming) || existsSync(previous)) fail('DESTINATION_UNSAFE', 'transaction directories already exist');

  let moved = false;
  try {
    copyRenderer(verified.rendererFiles, incoming);
    if (typeof options.beforeCommit === 'function') options.beforeCommit({ incoming, destination });
    if (existsSync(destination)) {
      renameSync(destination, previous);
      moved = true;
    }
    renameSync(incoming, destination);
  } catch (error) {
    rmSync(incoming, { recursive: true, force: true });
    if (moved && !existsSync(destination) && existsSync(previous)) renameSync(previous, destination);
    throw error;
  }
  rmSync(previous, { recursive: true, force: true });

  return {
    outcome: 'staged',
    package: verified.manifest.package,
    mode: verified.manifest.source.mode,
    commit: verified.manifest.source.commit,
    dirty: verified.manifest.source.dirty,
    local,
    packageRoot: verified.packageRoot,
    destination,
    files: verified.rendererFiles.length,
    checksum: verified.manifest.checksum,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const VALUE_FLAGS = Object.freeze({ 'package-root': 'packageRoot', destination: 'destination', 'expected-version': 'expectedVersion', 'website-root': 'websiteRoot' });

export function parseCliArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith('--')) fail('CLI_INVALID', `unexpected argument ${argument}`);
    const [flag, inlineValue] = argument.slice(2).split(/=(.*)/s);
    if (flag === 'local') {
      if (inlineValue !== undefined) fail('CLI_INVALID', '--local takes no value');
      options.local = true;
      continue;
    }
    const key = VALUE_FLAGS[flag];
    if (!key) fail('CLI_INVALID', `unknown flag --${flag}`);
    const value = inlineValue ?? argv[++index];
    if (value === undefined) fail('CLI_INVALID', `--${flag} requires a value`);
    options[key] = value;
  }
  return options;
}

function main() {
  const options = parseCliArguments(process.argv.slice(2));
  const result = stageWebAgentRenderer(options);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
