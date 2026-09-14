/**
 * Relay routes through original-config testApp (no server, no database).
 *
 * The relay controller is a deliberate kill-switch: every action (session
 * creation, message send, SSE stream) answers 503 "Relay service is
 * currently disabled" without reaching any repo or external boundary.
 * These tests pin that contract at route depth against the real source.
 */
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { testApp } from '@noego/app';
import { resourceCase } from '@noego/testing';

const CONFIG = path.resolve(__dirname, '../../../noego.config.yml');

const DISABLED = { error: true, message: 'Relay service is currently disabled' };

describe('relay routes through testDinner (no server, no database)', () => {
  it('POST /v1/sessions answers 503 disabled', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['relay'] } }).build();
    const response = await env.dinner.request({ method: 'POST', path: '/v1/sessions' });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(DISABLED);
    await env.verify();
  }));

  it('POST /v1/messages answers 503 disabled', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['relay'] } }).build();
    const response = await env.dinner.request({ method: 'POST', path: '/v1/messages' });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(DISABLED);
    await env.verify();
  }));

  it('GET /v1/events answers 503 disabled instead of opening an SSE stream', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['relay'] } }).build();
    const response = await env.dinner.request({ method: 'GET', path: '/v1/events' });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(DISABLED);
    await env.verify();
  }));
});
