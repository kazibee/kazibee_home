#!/usr/bin/env node
// Release guard: refuse to release or deploy to production while any dev
// package is in use. Shared across the noego libraries and websites; keep the
// copies identical.
//
// Blocks when:
//   - package.json (dependencies, devDependencies, optionalDependencies,
//     peerDependencies, overrides) names a prerelease version (1.2.3-dev.0,
//     ^0.5.0-beta.1), a prerelease dist-tag (dev, next, beta, ...), or a local
//     link (file:, link:, workspace:, portal:);
//   - package-lock.json resolves any package to a -dev. version or a link,
//     which catches dev packages pulled in transitively.
//
// The package's own platform packages (`<name>-*`, e.g. @noego/trust-darwin-arm64)
// are skipped: the release pipeline versions them together with the package.
//
// Usage: node scripts/check-release-deps.mjs [package-dir]
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const dir = resolve(process.argv[2] ?? '.');
const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
const own = (name) => typeof pkg.name === 'string' && name.startsWith(`${pkg.name}-`);

const PRERELEASE = /\d+\.\d+\.\d+-[0-9A-Za-z.-]+/;
const DEV_TAGS = new Set(['dev', 'next', 'canary', 'beta', 'alpha', 'rc', 'experimental']);
const LINK = /^(file|link|workspace|portal):/;
const isDevSpec = (spec) =>
  typeof spec === 'string' &&
  !spec.startsWith('$') && // override reference to a direct dependency, checked there
  (PRERELEASE.test(spec) || DEV_TAGS.has(spec.trim()) || LINK.test(spec.trim()));

const problems = [];

for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
  for (const [name, spec] of Object.entries(pkg[field] ?? {})) {
    if (!own(name) && isDevSpec(spec)) problems.push(`package.json ${field}: ${name}@${spec}`);
  }
}

const walkOverrides = (node, path) => {
  if (typeof node === 'string') {
    if (isDevSpec(node)) problems.push(`package.json overrides: ${path.join(' > ')}@${node}`);
    return;
  }
  for (const [key, value] of Object.entries(node ?? {})) {
    walkOverrides(value, key === '.' ? path : [...path, key]);
  }
};
walkOverrides(pkg.overrides, []);

const lockPath = join(dir, 'package-lock.json');
if (existsSync(lockPath)) {
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  for (const [path, entry] of Object.entries(lock.packages ?? {})) {
    if (!path) continue; // the root package itself
    const name = entry.name ?? path.slice(path.lastIndexOf('node_modules/') + 'node_modules/'.length);
    if (own(name)) continue;
    if (entry.link) {
      problems.push(`package-lock.json ${path}: link -> ${entry.resolved}`);
    } else if (typeof entry.version === 'string' && /-dev\b/.test(entry.version)) {
      problems.push(`package-lock.json ${path}: ${entry.version}`);
    }
  }
}

if (problems.length) {
  console.error(`Release blocked: ${pkg.name} uses dev packages.\n  ${problems.join('\n  ')}`);
  console.error('Publish stable versions of these packages and update the dependencies before releasing.');
  process.exit(1);
}
console.log(`OK: no dev packages in ${pkg.name}@${pkg.version}.`);
