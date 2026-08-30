/**
 * Coverage sweep for the small delegation shims that fell below the
 * per-file targeting threshold of the main test passes. Each is a thin
 * @Component wrapper; the classes beneath them carry their own suites, so
 * these tests pin exactly what the shim owns: delegation with the right
 * arguments and the returned value passed through unchanged.
 */
import { describe, it, expect } from 'vitest';
import { testIoc, test as control } from '@noego/testing';
import PairingLogic from '../../../src/server/logic/pairing.logic';
import UpdateLogic from '../../../src/server/logic/update.logic';
import ConnectRelayLogic from '../../../src/server/logic/connect_relay.logic';
import ConnectServiceReleaseLogic from '../../../src/server/logic/connect_service_release.logic';
import RawRequest from '../../../src/server/services/raw_request';

describe('small logic shims delegate through real IoC', () => {
  it('PairingLogic forwards all three methods to PairingService', async () => {
    const registered = { deviceId: 'dev_1' };
    const claimed = { ok: true };
    const devices = [{ deviceId: 'dev_1' }];
    const env = await testIoc()
      .methods({
        PairingService: {
          registerDevice: control.once(control.returns(registered)),
          claimPairing: control.once(control.returns(claimed)),
          getDevicesForUser: control.once(control.returns(devices)),
        },
      })
      .build();
    const logic = await env.get<PairingLogic>(PairingLogic);
    expect(await logic.registerDevice('Mac', 'desktop')).toBe(registered);
    expect(await logic.claimPairing('CODE1', 'Mac', 'desktop')).toBe(claimed);
    expect(await logic.getDevicesForUser('usr_1', 'dev_1')).toBe(devices);

    const claim = control.inspect(env, 'PairingService', 'claimPairing');
    expect(claim.calls[0].args).toEqual(['CODE1', 'Mac', 'desktop']);
    await env.verify();
    await env.dispose();
  });

  it('UpdateLogic forwards feed/releases/package-download to UpdateFeedService', async () => {
    const feed = { currentRelease: '1.0.0' };
    const releases = 'RELEASES';
    const download = new Response('bin');
    const env = await testIoc()
      .methods({
        UpdateFeedService: {
          createFeed: control.once(control.returns(feed)),
          createWindowsReleases: control.once(control.returns(releases)),
          createWindowsPackageDownload: control.once(control.returns(download)),
        },
      })
      .build();
    const logic = await env.get<UpdateLogic>(UpdateLogic);
    expect(await logic.createFeed('arm64' as never)).toBe(feed);
    expect(await logic.createWindowsReleases('x64' as never)).toBe(releases);
    expect(await logic.createWindowsPackageDownload('x64' as never, 'app.nupkg')).toBe(download);

    const pkg = control.inspect(env, 'UpdateFeedService', 'createWindowsPackageDownload');
    expect(pkg.calls[0].args).toEqual(['x64', 'app.nupkg']);
    await env.verify();
    await env.dispose();
  });

  it('ConnectRelayLogic forwards receive/open/close to ConnectRelayService', async () => {
    const ack = { kind: 'channel.ack' };
    const env = await testIoc()
      .methods({
        ConnectRelayService: {
          receive: control.once(control.returns(ack)),
          open: control.once(control.returns(undefined)),
          close: control.once(control.returns(undefined)),
        },
      })
      .build();
    const logic = await env.get<ConnectRelayLogic>(ConnectRelayLogic);
    const actor = { role: 'executor_device', executorId: 'exe_1' } as never;
    expect(logic.receive(actor, { kind: 'channel.hello' } as never)).toBe(ack);
    logic.open(actor, { write: () => true, end: () => {} } as never);
    logic.close('exe_1', 'fence_1');

    const close = control.inspect(env, 'ConnectRelayService', 'close');
    expect(close.calls[0].args).toEqual(['exe_1', 'fence_1']);
    await env.verify();
    await env.dispose();
  });

  it('ConnectServiceReleaseLogic resolves through the resolver with no actor gate', async () => {
    const candidate = { version: '2.0.0', url: 'https://cdn/app' };
    const env = await testIoc()
      .methods({
        ConnectServiceReleaseResolver: {
          resolve: control.once(control.returns(candidate)),
        },
      })
      .build();
    const logic = await env.get<ConnectServiceReleaseLogic>(ConnectServiceReleaseLogic);
    const request = { service: 'desktop', platform: 'darwin' } as never;
    expect(await logic.resolve(request)).toBe(candidate);
    await env.verify();
    await env.dispose();
  });

  it('RawRequest holds and clears the per-request Fetch Request', async () => {
    const env = await testIoc().build();
    const scope = env.extend();
    const holder = await scope.get<RawRequest>(RawRequest);
    expect(holder.get()).toBeNull();
    const request = new Request('https://kazibee.test/upgrade');
    holder.set(request);
    expect(holder.get()).toBe(request);
    holder.set(undefined);
    expect(holder.get()).toBeNull();
    await scope.dispose();
    await env.dispose();
  });
});
