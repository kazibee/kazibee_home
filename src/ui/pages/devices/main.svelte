<script lang="ts">
  let { data, input } = $props();
</script>

<section class="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
  <div class="flex items-center justify-between">
    <h1 class="text-3xl font-bold tracking-tight text-ink sm:text-4xl" data-test-id="devices-title">
      Paired Devices
    </h1>
    <div class="flex gap-3">
      <button
        onclick={() => input.refresh()}
        disabled={data.isLoading}
        class="rounded-xl border-2 border-neutral-200 px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-neutral-400 disabled:opacity-50"
        data-test-id="devices-refresh"
      >
        {data.isLoading ? 'Loading...' : 'Refresh'}
      </button>
      <a
        href="/pair"
        class="rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
        data-test-id="devices-pair-link"
      >
        Pair New Device
      </a>
    </div>
  </div>

  {#if data.error}
    <div class="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4" data-test-id="devices-error">
      <p class="text-sm text-red-700">{data.error}</p>
    </div>
  {/if}

  {#if data.devices.length === 0 && !data.isLoading}
    <div class="mt-10 text-center" data-test-id="devices-empty">
      <p class="text-lg text-ink-muted">No paired devices yet.</p>
      <a
        href="/pair"
        class="mt-4 inline-block rounded-xl bg-black px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
        data-test-id="devices-empty-pair-link"
      >
        Pair Your First Device
      </a>
    </div>
  {/if}

  {#if data.devices.length > 0}
    <div class="mt-8 space-y-4" data-test-id="devices-list">
      {#each data.devices as device (device.id)}
        <div class="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-300" data-test-id="device-card">
          <div>
            <p class="font-semibold text-ink" data-test-id="device-name">
              {device.name || 'Unnamed Device'}
            </p>
            <p class="mt-1 text-xs text-ink-muted" data-test-id="device-id">
              ID: {device.device_id}
            </p>
            {#if device.last_seen_at}
              <p class="mt-0.5 text-xs text-ink-muted" data-test-id="device-last-seen">
                Last seen: {new Date(device.last_seen_at).toLocaleString()}
              </p>
            {/if}
          </div>
          <button
            onclick={() => input.removeDevice(device.id)}
            class="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
            data-test-id="device-remove"
          >
            Remove
          </button>
        </div>
      {/each}
    </div>
  {/if}
</section>
