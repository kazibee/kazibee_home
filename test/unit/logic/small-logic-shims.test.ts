/**
 * Coverage sweep for the small delegation shims that fell below the
 * per-file targeting threshold of the main test passes. Each is a thin
 * @Component wrapper; the classes beneath them carry their own suites, so
 * these tests pin exactly what the shim owns: delegation with the right
 * arguments and the returned value passed through unchanged.
 */
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { testApp } from '@noego/app';
import { resourceCase, registerTestResource, test as control } from '@noego/testing';
import UpdateLogic from '../../../src/server/logic/update.logic';
import ConnectRelayLogic from '../../../src/server/logic/connect_relay.logic';
import ConnectServiceReleaseLogic from '../../../src/server/logic/connect_service_release.logic';
import RawRequest from '../../../src/server/services/raw_request';
import UpdateFeedService from '../../../src/server/services/update_feed_service';
import ConnectRelayService from '../../../src/server/services/connect_relay_service';
import ConnectServiceReleaseResolver from '../../../src/server/services/connect_service_release_resolver';

const CONFIG = path.resolve(__dirname, '../../../noego.config.yml');

describe('small logic shims delegate through real IoC', () => {
  it('UpdateLogic forwards feed/releases/package-download to UpdateFeedService', resourceCase(async () => {
    const feed = { currentRelease: '1.0.0' };
    const releases = 'RELEASES';
    const download = new Response('bin');
    const env = await testApp(CONFIG).select({ server: { module: ['updates'] } })
      .method(UpdateFeedService, 'createFeed', control.once(control.returns(feed)))
      .method(UpdateFeedService, 'createWindowsReleases', control.once(control.returns(releases)))
      .method(UpdateFeedService, 'createWindowsPackageDownload', control.once(control.returns(download)))
      .build();
    const logic = await env.get<UpdateLogic>(UpdateLogic);
    expect(await logic.createFeed('arm64' as never)).toBe(feed);
    expect(await logic.createWindowsReleases('x64' as never)).toBe(releases);
    expect(await logic.createWindowsPackageDownload('x64' as never, 'app.nupkg')).toBe(download);
    await download.body?.cancel();

    const pkg = control.inspect(env, 'UpdateFeedService', 'createWindowsPackageDownload');
    expect(pkg.calls[0].args).toEqual(['x64', 'app.nupkg']);
    await env.verify();
  }));

  it('ConnectRelayLogic forwards receive/open/close to ConnectRelayService', resourceCase(async () => {
    const ack = { kind: 'channel.ack' };
    const env = await testApp(CONFIG).select({ server: { module: ['connectRelay'] } })
      .method(ConnectRelayService, 'receive', control.once(control.returns(ack)))
      .method(ConnectRelayService, 'open', control.once(control.returns(undefined)))
      .method(ConnectRelayService, 'close', control.once(control.returns(undefined)))
      .build();
    const logic = await env.get<ConnectRelayLogic>(ConnectRelayLogic);
    const actor = { role: 'executor_device', executorId: 'exe_1' } as never;
    expect(logic.receive(actor, { kind: 'channel.hello' } as never)).toBe(ack);
    logic.open(actor, { write: () => true, end: () => {} } as never);
    logic.close('exe_1', 'fence_1');

    const close = control.inspect(env, 'ConnectRelayService', 'close');
    expect(close.calls[0].args).toEqual(['exe_1', 'fence_1']);
    await env.verify();
  }));

  it('ConnectServiceReleaseLogic resolves through the resolver with no actor gate', resourceCase(async () => {
    const candidate = { version: '2.0.0', url: 'https://cdn/app' };
    const env = await testApp(CONFIG).select({ server: { module: ['connectServiceReleases'] } })
      .method(ConnectServiceReleaseResolver, 'resolve', control.once(control.returns(candidate)))
      .build();
    const logic = await env.get<ConnectServiceReleaseLogic>(ConnectServiceReleaseLogic);
    const request = { service: 'desktop', platform: 'darwin' } as never;
    expect(await logic.resolve(request)).toBe(candidate);
    await env.verify();
  }));

  it('RawRequest holds and clears the per-request Fetch Request', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } }).build();
    const scope = await registerTestResource(env.root.extend(), 'raw-request-scope');
    const holder = await scope.get<RawRequest>(RawRequest);
    expect(holder.get()).toBeNull();
    const request = new Request('https://kazibee.test/upgrade');
    holder.set(request);
    expect(holder.get()).toBe(request);
    holder.set(undefined);
    expect(holder.get()).toBeNull();
  }));
});
