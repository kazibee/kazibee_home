import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import loadAuth from '../../src/ui/pages/connect/auth.load.ts';
import loadClaim from '../../src/ui/pages/connect/claim.load.ts';

const connectRoutes = readFileSync('src/ui/openapi/connect/connect.yaml', 'utf8');
const uiRouteSources = [
  readFileSync('src/ui/openapi/base.yaml', 'utf8'),
  connectRoutes,
];

describe('Connect UI Forge contract', () => {
  it('declares the complete management route surface with controllers and views', () => {
    for (const route of ['/connect:', '/connect/login:', '/connect/signup:', '/connect/claim/:claimId:']) {
      expect(connectRoutes).toContain(route);
    }
    expect(connectRoutes.match(/x-controller:/g)).toHaveLength(4);
    expect(connectRoutes).toContain("pattern: '^(?:clm_");
  });

  it('does not expose legacy mobile pairing routes', () => {
    const routes = uiRouteSources.join('\n');
    expect(routes).not.toMatch(/^\s*\/(?:devices|pair):/m);
  });

  it('keeps Website routes management-only', () => {
    expect(connectRoutes).not.toMatch(/chat|command relay|execution UI/i);
    expect(connectRoutes).toContain('Manage executors');
    expect(connectRoutes).toContain('Accept or deny');
  });

  it('loads auth mode/return target and dynamic claim params for Forge controllers', async () => {
    await expect(loadAuth({
      request: { url: 'https://kazibee.test/connect/signup?returnTo=%2Fconnect%2Fclaim%2Fclm_12345678' },
    })).resolves.toEqual({
      mode: 'signup',
      returnTo: '/connect/claim/clm_12345678',
      googleClientId: '',
    });
    await expect(loadClaim({
      params: { claimId: 'clm_12345678' },
      request: { url: 'https://kazibee.test/connect/claim/clm_other123' },
    })).resolves.toEqual({ claimId: 'clm_12345678' });
  });
});
