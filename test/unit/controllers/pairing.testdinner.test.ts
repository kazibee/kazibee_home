/**
 * Pairing routes through testDinner (no server, no database).
 *
 * The pairing controller is a deliberate kill-switch: every action answers
 * 503 "Pairing service is currently disabled" without touching any repo or
 * external boundary. These tests pin that contract at route depth for both
 * modules the real source declares (pairing and devices).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { load as parseYaml } from 'js-yaml';
import { testDinner } from '@noego/dinner/testing';
import PairingController from '../../../src/server/controller/pairing.controller';

// Real production source — the same document production stitching includes.
const pairingSource = parseYaml(
  readFileSync(path.resolve(__dirname, '../../../src/server/openapi/pairing/pairing.yaml'), 'utf8')
) as Record<string, unknown>;

const base = (module: 'pairing' | 'devices') =>
  testDinner(pairingSource)
    .select({ module })
    .controllers({ 'pairing.controller': PairingController })
    // Legacy {req,res} controllers: compat hooks with default real-IoC
    // construction (per-request child scope, disposed after the request).
    .hooks({});

const DISABLED = { error: true, message: 'Pairing service is currently disabled' };

describe('pairing routes through testDinner (no server, no database)', () => {
  it('POST /v1/pair/register answers 503 disabled', async () => {
    const env = await base('pairing').build();
    const response = await env.dinner.request({ method: 'POST', path: '/v1/pair/register' });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(DISABLED);
    await env.verify();
    await env.dispose();
  });

  it('POST /v1/pair/claim answers 503 disabled', async () => {
    const env = await base('pairing').build();
    const response = await env.dinner.request({ method: 'POST', path: '/v1/pair/claim' });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(DISABLED);
    await env.verify();
    await env.dispose();
  });

  it('GET /v1/devices answers 503 disabled', async () => {
    const env = await base('devices').build();
    const response = await env.dinner.request({ method: 'GET', path: '/v1/devices' });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(DISABLED);
    await env.verify();
    await env.dispose();
  });
});
