<script lang="ts">
  let { data, input } = $props();
</script>

<section class="mx-auto max-w-xl px-5 py-14 sm:px-8 sm:py-20">
  <h1 class="text-3xl font-bold tracking-tight text-ink sm:text-4xl" data-test-id="pair-title">
    Pair a Device
  </h1>
  <p class="mt-3 text-ink-muted" data-test-id="pair-description">
    Connect your mobile device to control your desktop assistant remotely.
  </p>

  {#if data.status === 'idle'}
    <div class="mt-8" data-test-id="pair-start">
      <button
        onclick={() => input.startPairing()}
        class="rounded-xl bg-black px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
        data-test-id="pair-start-button"
      >
        Start Pairing
      </button>
    </div>
  {/if}

  {#if data.status === 'registering'}
    <div class="mt-8 text-ink-muted" data-test-id="pair-registering">
      <p>Registering device...</p>
    </div>
  {/if}

  {#if data.status === 'polling'}
    <div class="mt-8 space-y-6" data-test-id="pair-polling">
      <div class="rounded-2xl border border-neutral-200 bg-white p-6">
        <p class="mb-4 text-sm font-semibold text-ink">Scan this code or enter it manually:</p>

        {#if data.qrValue}
          <div class="mb-4 flex justify-center" data-test-id="pair-qr">
            <div class="rounded-xl border-2 border-neutral-100 bg-neutral-50 p-6 text-center">
              <p class="font-mono text-2xl font-bold tracking-widest text-ink" data-test-id="pair-code">
                {data.pairingCode}
              </p>
            </div>
          </div>
        {/if}

        <p class="text-center text-sm text-ink-muted" data-test-id="pair-waiting">
          Waiting for mobile to claim this code...
        </p>
      </div>

      <button
        onclick={() => input.stopPolling()}
        class="rounded-xl border-2 border-neutral-200 px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-neutral-400"
        data-test-id="pair-stop-button"
      >
        Cancel
      </button>
    </div>
  {/if}

  {#if data.status === 'paired'}
    <div class="mt-8 rounded-2xl border border-green-200 bg-green-50 p-6" data-test-id="pair-success">
      <p class="text-lg font-semibold text-green-800">Device paired successfully</p>
      <p class="mt-2 text-sm text-green-700">
        Your mobile device is now connected. You can start sending messages.
      </p>
      <a
        href="/devices"
        class="mt-4 inline-block rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
        data-test-id="pair-view-devices"
      >
        View Devices
      </a>
    </div>
  {/if}

  {#if data.status === 'error'}
    <div class="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6" data-test-id="pair-error">
      <p class="text-lg font-semibold text-red-800">Pairing failed</p>
      <p class="mt-2 text-sm text-red-700">{data.error}</p>
      <button
        onclick={() => input.startPairing()}
        class="mt-4 rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
        data-test-id="pair-retry-button"
      >
        Try Again
      </button>
    </div>
  {/if}
</section>
