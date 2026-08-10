<script lang="ts">
  let { data, input } = $props();
</script>

<section class="mx-auto max-w-2xl px-5 py-12 sm:px-8 sm:py-20" data-test-id="connect-claim-page">
  <div class="mb-7">
    <a href="/connect" class="text-sm font-semibold text-blue-600 hover:text-blue-500">← Your executors</a>
  </div>

  {#if data.status === 'loading'}
    <div class="animate-pulse rounded-3xl border border-neutral-200 bg-white p-7 sm:p-9" aria-live="polite" data-test-id="claim-loading">
      <div class="h-6 w-48 rounded bg-neutral-200"></div>
      <div class="mt-6 h-24 rounded-2xl bg-neutral-100"></div>
      <span class="sr-only">Loading connection request</span>
    </div>
  {:else if data.status === 'error'}
    <div class="rounded-3xl border border-red-200 bg-red-50 p-7 sm:p-9" role="alert" data-test-id="claim-error">
      <h1 class="text-xl font-bold text-red-900">Connection request unavailable</h1>
      <p class="mt-2 text-sm text-red-800">{data.error}</p>
      <button type="button" onclick={() => input.refresh()} class="mt-5 rounded-xl bg-red-900 px-4 py-2.5 text-sm font-semibold text-white">Try again</button>
    </div>
  {:else if data.claim}
    <article class="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-xl shadow-neutral-200/30" data-test-id="claim-review">
      <div class="border-b border-neutral-100 bg-gradient-to-br from-honey-50 to-white p-7 sm:p-9">
        <p class="text-sm font-bold uppercase tracking-[0.16em] text-honey-600">Connection request</p>
        <h1 class="mt-3 text-3xl font-black tracking-tight text-ink" data-test-id="claim-name">{data.claim.displayName}</h1>
        <p class="mt-2 text-sm leading-6 text-ink-muted">Confirm that this is the {data.claim.claimKind === 'desktop' ? 'Desktop' : 'executor'} you intended to connect.</p>
      </div>

      <div class="p-7 sm:p-9">
        <dl class="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <div>
            <dt class="text-xs font-bold uppercase tracking-wide text-ink-faint">Platform</dt>
            <dd class="mt-1 text-sm font-semibold capitalize text-ink">{data.claim.platform} · {data.claim.architecture}</dd>
          </div>
          <div>
            <dt class="text-xs font-bold uppercase tracking-wide text-ink-faint">{data.claim.claimKind === 'desktop' ? 'Desktop' : 'Executor'} version</dt>
            <dd class="mt-1 text-sm font-semibold text-ink">{data.claim.clientVersion}</dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-xs font-bold uppercase tracking-wide text-ink-faint">Key fingerprint</dt>
            <dd class="mt-1 break-all font-mono text-xs leading-5 text-ink-muted" data-test-id="claim-fingerprint">{data.fingerprintLabel}</dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-xs font-bold uppercase tracking-wide text-ink-faint">Request expires</dt>
            <dd class="mt-1 text-sm text-ink-muted">{data.expiryLabel}</dd>
          </div>
        </dl>

        {#if data.error}
          <div class="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert" data-test-id="claim-decision-error">{data.error}</div>
        {/if}

        {#if data.claim.status === 'pending'}
          <div class="mt-8 grid gap-3 sm:grid-cols-2" data-test-id="claim-actions">
            <button
              type="button"
              onclick={() => input.decide('accept')}
              disabled={data.decisionStatus === 'submitting'}
              class="rounded-xl bg-ink px-5 py-3.5 text-sm font-bold text-white transition hover:bg-neutral-800 disabled:opacity-50"
              data-test-id="claim-accept"
            >
              {data.decisionStatus === 'submitting' ? 'Saving decision…' : 'Accept connection'}
            </button>
            <button
              type="button"
              onclick={() => input.decide('deny')}
              disabled={data.decisionStatus === 'submitting'}
              class="rounded-xl border border-red-200 px-5 py-3.5 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
              data-test-id="claim-deny"
            >
              Deny
            </button>
          </div>
        {:else if data.claim.status === 'accepted'}
          <div class="mt-8 rounded-2xl border border-green-200 bg-green-50 p-5" role="status" data-test-id="claim-accepted">
            <p class="font-bold text-green-900">Connection accepted</p>
            <p class="mt-1 text-sm text-green-800">The {data.claim.claimKind === 'desktop' ? 'Desktop' : 'executor'} can now connect to your account.</p>
            <a href="/connect" class="mt-4 inline-flex text-sm font-bold text-green-900 underline">View your executors</a>
          </div>
        {:else if data.claim.status === 'denied'}
          <div class="mt-8 rounded-2xl border border-neutral-200 bg-neutral-50 p-5" role="status" data-test-id="claim-denied">
            <p class="font-bold text-ink">Connection denied</p>
            <p class="mt-1 text-sm text-ink-muted">No credentials were issued for this request.</p>
          </div>
        {:else}
          <div class="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5" role="status" data-test-id="claim-expired">
            <p class="font-bold text-amber-900">Request expired</p>
            <p class="mt-1 text-sm text-amber-800">Start a new connection request from your {data.claim.claimKind === 'desktop' ? 'Desktop' : 'executor'}.</p>
          </div>
        {/if}
      </div>
    </article>
  {/if}
</section>
