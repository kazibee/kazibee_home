import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import type { TestResourceScope } from '@noego/testing';

/**
 * Per-case output directory only; this helper never constructs an application.
 *
 * The directory lives under the project's gitignored `test/output/` rather than the OS
 * tmpdir: `@noego/app` bundles the backend with bare package specifiers left external,
 * so the bundle must sit below the project root for `@noego/*` and friends to resolve
 * from the project's `node_modules` at import time.
 */
const ARTIFACT_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../output/native-artifacts');

export async function nativeArtifactDirectory(scope: TestResourceScope): Promise<string> {
  await mkdir(ARTIFACT_ROOT, { recursive: true });
  const directory = await mkdtemp(path.join(ARTIFACT_ROOT, 'case-'));
  scope.own({ dispose: () => rm(directory, { recursive: true, force: true }) }, 'native-artifacts');
  return directory;
}
