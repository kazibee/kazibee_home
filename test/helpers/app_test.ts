/**
 * Project-level testApp factory (spec 04 §12 ergonomics).
 *
 * The caller-owned importer is supplied ONCE here: it keeps testApp's
 * auto-imported production graph in vitest's module registry, so the exact
 * class tokens tests compose (.classes/.methods/...) are the same objects
 * the graph injects. Without it testApp refuses to build under vitest, and
 * a detached stub trips TokenIdentitySplitError at verify().
 */
import path from 'node:path';
import { createAppTest } from '@noego/app/testing';

export const appTest = createAppTest({
  importer: (p) => import(/* @vite-ignore */ p),
  configPath: path.resolve(__dirname, '../../noego.config.yml'),
});
