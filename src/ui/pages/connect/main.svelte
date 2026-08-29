<script lang="ts">
  let { data, input } = $props();
</script>

<section class="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16" data-test-id="connect-dashboard">
  <header class="flex flex-col gap-5 border-b border-neutral-200 pb-8 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p class="text-sm font-bold uppercase tracking-[0.18em] text-honey-600">Kazibee Connect</p>
      <h1 class="mt-2 text-3xl font-black tracking-tight text-ink sm:text-4xl" data-test-id="connect-title">Your executors</h1>
      <p class="mt-2 max-w-2xl text-sm leading-6 text-ink-muted sm:text-base">
        See availability, rename an executor, or revoke its access. This website only manages connections.
      </p>
    </div>
    <div class="flex gap-3">
      <button
        type="button"
        onclick={() => input.refresh()}
        disabled={data.status === 'loading'}
        class="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-neutral-400 disabled:opacity-50"
        data-test-id="connect-refresh"
      >
        Refresh
      </button>
    </div>
  </header>

  {#if data.status === 'loading'}
    <div class="mt-8 grid gap-4 sm:grid-cols-2" aria-live="polite" data-test-id="connect-loading">
      {#each [1, 2] as item (item)}
        <div class="animate-pulse rounded-2xl border border-neutral-200 bg-white p-6">
          <div class="h-5 w-40 rounded bg-neutral-200"></div>
          <div class="mt-4 h-4 w-24 rounded bg-neutral-100"></div>
        </div>
      {/each}
      <span class="sr-only">Loading executors</span>
    </div>
  {:else if data.status === 'error'}
    <div class="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6" role="alert" data-test-id="connect-error">
      <h2 class="font-bold text-red-900">Executors could not be loaded</h2>
      <p class="mt-1 text-sm text-red-800">{data.error}</p>
      <button type="button" onclick={() => input.refresh()} class="mt-4 rounded-xl bg-red-900 px-4 py-2.5 text-sm font-semibold text-white">Try again</button>
    </div>
  {:else if data.status === 'ready' && data.executors.length === 0}
    <div class="mt-8 rounded-3xl border border-dashed border-neutral-300 bg-white px-6 py-14 text-center" data-test-id="connect-empty">
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-honey-100 text-2xl">⌁</div>
      <h2 class="mt-5 text-xl font-bold text-ink">No executors connected</h2>
      <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
        Run the Connect command in your executor. Then open the claim link it provides to review the connection here.
      </p>
    </div>
  {:else if data.status === 'ready'}
    {#if data.actionError}
      <div class="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert" data-test-id="connect-action-error">
        {data.actionError}
      </div>
    {/if}

    <div class="mt-8 grid gap-4 sm:grid-cols-2" data-test-id="connect-executor-list">
      {#each data.executors as executor (executor.executorId)}
        <article class="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm" data-test-id="connect-executor-card">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <h2 class="truncate text-lg font-bold text-ink" data-test-id="executor-name">{executor.displayName}</h2>
              <p class="mt-1 truncate font-mono text-xs text-ink-faint">{executor.executorId}</p>
            </div>
            {#if executor.statusTone === 'green'}
              <span class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700" data-test-id="executor-status">
                <span class="h-2 w-2 rounded-full bg-green-500"></span>{executor.statusLabel}
              </span>
            {:else if executor.statusTone === 'amber'}
              <span class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700" data-test-id="executor-status">
                <span class="h-2 w-2 rounded-full bg-amber-500"></span>{executor.statusLabel}
              </span>
            {:else if executor.statusTone === 'red'}
              <span class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700" data-test-id="executor-status">
                <span class="h-2 w-2 rounded-full bg-red-500"></span>{executor.statusLabel}
              </span>
            {:else}
              <span class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-600" data-test-id="executor-status">
                <span class="h-2 w-2 rounded-full bg-neutral-400"></span>{executor.statusLabel}
              </span>
            {/if}
          </div>

          {#if data.renameId === executor.executorId}
            <form class="mt-5 border-t border-neutral-100 pt-5" onsubmit={(event) => { event.preventDefault(); input.rename(); }} data-test-id="executor-rename-form">
              <label class="text-sm font-semibold text-ink" for={"rename-" + executor.executorId}>Executor name</label>
              <input
                id={"rename-" + executor.executorId}
                value={data.renameValue}
                maxlength="80"
                required
                oninput={(event) => input.setRenameValue(event.currentTarget.value)}
                class="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
              <div class="mt-3 flex gap-2">
                <button type="submit" disabled={data.busyId === executor.executorId} class="rounded-lg bg-ink px-3 py-2 text-xs font-bold text-white">Save</button>
                <button type="button" onclick={() => input.cancelRename()} class="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-bold text-ink">Cancel</button>
              </div>
            </form>
          {:else if data.revokeId === executor.executorId}
            <div class="mt-5 border-t border-red-100 pt-5" data-test-id="executor-revoke-confirm">
              <p class="text-sm font-semibold text-red-900">Revoke this executor?</p>
              <p class="mt-1 text-xs leading-5 text-red-700">Its credentials will stop working. This cannot be undone here.</p>
              <div class="mt-3 flex gap-2">
                <button type="button" onclick={() => input.revoke()} disabled={data.busyId === executor.executorId} class="rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white">Revoke access</button>
                <button type="button" onclick={() => input.cancelRevoke()} class="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-bold text-ink">Cancel</button>
              </div>
            </div>
          {:else if executor.canManage}
            <div class="mt-5 flex gap-2 border-t border-neutral-100 pt-4">
              <button type="button" onclick={() => input.openRename(executor.executorId)} class="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-bold text-ink transition hover:bg-neutral-50" data-test-id="executor-rename">Rename</button>
              <button type="button" onclick={() => input.openRevoke(executor.executorId)} class="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50" data-test-id="executor-revoke">Revoke</button>
            </div>
          {:else}
            <p class="mt-5 border-t border-neutral-100 pt-4 text-xs text-ink-faint">This executor is no longer manageable.</p>
          {/if}
        </article>
      {/each}
    </div>
  {/if}
</section>

