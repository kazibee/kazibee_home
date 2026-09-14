/**
 * Pairing routes through original-config testApp (no server, no database).
 *
 * The pairing controller is a deliberate kill-switch: every action answers
 * 503 "Pairing service is currently disabled" without touching any repo or
 * external boundary. These tests pin that contract at route depth for both
 * modules the real source declares (pairing and devices).
 */
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { testApp } from '@noego/app';
import { resourceCase } from '@noego/testing';

const CONFIG = path.resolve(__dirname, '../../../noego.config.yml');

const DISABLED = { error: true, message: 'Pairing service is currently disabled' };

describe('pairing routes through testDinner (no server, no database)', () => {
  it('POST /v1/pair/register answers 503 disabled', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['pairing'] } }).build();
    const response = await env.dinner.request({ method: 'POST', path: '/v1/pair/register' });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(DISABLED);
    await env.verify();
  }));

  it('POST /v1/pair/claim answers 503 disabled', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['pairing'] } }).build();
    const response = await env.dinner.request({ method: 'POST', path: '/v1/pair/claim' });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(DISABLED);
    await env.verify();
  }));

  it('GET /v1/devices answers 503 disabled', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['devices'] } }).build();
    const response = await env.dinner.request({ method: 'GET', path: '/v1/devices' });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(DISABLED);
    await env.verify();
  }));
});
