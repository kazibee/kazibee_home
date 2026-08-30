/**
 * Relay routes through testDinner (no server, no database).
 *
 * The relay controller is a deliberate kill-switch: every action (session
 * creation, message send, SSE stream) answers 503 "Relay service is
 * currently disabled" without reaching any repo or external boundary.
 * These tests pin that contract at route depth against the real source.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { load as parseYaml } from 'js-yaml';
import { testDinner } from '@noego/dinner/testing';
import RelayController from '../../../src/server/controller/relay.controller';

// Real production source — the same document production stitching includes.
const relaySource = parseYaml(
  readFileSync(path.resolve(__dirname, '../../../src/server/openapi/relay/relay.yaml'), 'utf8')
) as Record<string, unknown>;

const base = () =>
  testDinner(relaySource)
    .select({ module: 'relay' })
    .controllers({ 'relay.controller': RelayController })
    // Legacy {req,res} controllers: compat hooks with default real-IoC
    // construction (per-request child scope, disposed after the request).
    .hooks({});

const DISABLED = { error: true, message: 'Relay service is currently disabled' };

describe('relay routes through testDinner (no server, no database)', () => {
  it('POST /v1/sessions answers 503 disabled', async () => {
    const env = await base().build();
    const response = await env.dinner.request({ method: 'POST', path: '/v1/sessions' });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(DISABLED);
    await env.verify();
    await env.dispose();
  });

  it('POST /v1/messages answers 503 disabled', async () => {
    const env = await base().build();
    const response = await env.dinner.request({ method: 'POST', path: '/v1/messages' });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(DISABLED);
    await env.verify();
    await env.dispose();
  });

  it('GET /v1/events answers 503 disabled instead of opening an SSE stream', async () => {
    const env = await base().build();
    const response = await env.dinner.request({ method: 'GET', path: '/v1/events' });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(DISABLED);
    await env.verify();
    await env.dispose();
  });
});
