import { describe, expect, it } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

async function sourceFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && ['dist', 'build', 'node_modules', 'coverage', '.git'].includes(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (/\.(?:ts|tsx|js|mjs|svelte)$/.test(entry.name)) out.push(full);
    }
  }
  await walk(root);
  return out;
}

describe('testing/runtime architecture policy', () => {
  it('does not use numbered MigrationBoundary identities or first-party vi.mock seams', async () => {
    const violations: string[] = [];
    for (const file of await sourceFiles('test')) {
      const text = await readFile(file, 'utf8');
      if (/\b(?:MigrationBoundary|migrationBoundary)\d+\b/.test(text)) {
        violations.push(`${relative(process.cwd(), file)}: numbered MigrationBoundary`);
      }
      const mockPattern = /\bvi\.mock\s*\(\s*['"]([^'"]+)['"]/g;
      for (const match of text.matchAll(mockPattern)) {
        const specifier = match[1];
        if (specifier.startsWith('.') || specifier.startsWith('@noego/') || specifier.startsWith('sqlstack')) {
          violations.push(`${relative(process.cwd(), file)}: first-party vi.mock(${specifier})`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('does not reach for the deprecated App process-global container', async () => {
    const violations: string[] = [];
    for (const root of ['src', 'apps']) {
      for (const file of await sourceFiles(root)) {
        const text = await readFile(file, 'utf8');
        if (text.includes('@noego/app/container') || /\bgetContainer\s*\(/.test(text)) {
          violations.push(relative(process.cwd(), file));
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
