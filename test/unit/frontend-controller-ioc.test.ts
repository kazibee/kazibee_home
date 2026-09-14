import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { testApp } from '@noego/app';
import { resourceCase } from '@noego/testing';
import ConnectAuthController from '../../src/ui/controllers/connect_auth.svelte';
import ConnectDashboardController from '../../src/ui/controllers/connect_dashboard.svelte';
import ConnectClaimController from '../../src/ui/controllers/connect_claim.svelte';
import DownloadsController from '../../src/ui/controllers/downloads.svelte';
import OAuthConsentController from '../../src/ui/controllers/oauth_consent.svelte';

describe('frontend controllers under App-owned request scopes', () => {
  for (const Controller of [
    ConnectAuthController, ConnectDashboardController, ConnectClaimController,
    DownloadsController, OAuthConsentController,
  ]) {
    it(`${Controller.name} resolves once per request, not across requests`, resourceCase(async (scope) => {
      const app = await testApp(path.resolve(__dirname, '../../noego.config.yml'))
        .select({ client: {} }).build();
      const root = app.client!.root;
      const first = scope.own(root.extend()), second = scope.own(root.extend());
      try {
        const one = await first.get(Controller);
        expect(one).toBeInstanceOf(Controller);
        expect(await first.get(Controller)).toBe(one);
        expect(await second.get(Controller)).not.toBe(one);
      } finally {
        await first.dispose();
        await second.dispose();
      }
    }));
  }
});
