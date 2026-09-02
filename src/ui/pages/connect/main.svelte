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

    <div class="mt-14 border-t border-neutral-200 pt-10" data-test-id="connect-connections">
      <h2 class="text-2xl font-black tracking-tight text-ink">MCP connections</h2>
      <p class="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
        Apps connected through OAuth. Edit one to change what it can do — changes apply to its very next call, no reconnect needed.
      </p>

      {#if data.connectionsError}
        <div class="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert" data-test-id="connections-error">
          {data.connectionsError}
        </div>
      {/if}

      {#if data.connections.length === 0}
        <p class="mt-6 text-sm text-ink-faint" data-test-id="connections-empty">No MCP connections yet. Connect an app (like ChatGPT) to see it here.</p>
      {:else}
        <div class="mt-6 grid gap-4 sm:grid-cols-2" data-test-id="connections-list">
          {#each data.connections as connection (connection.connectionId)}
            <article class="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm" data-test-id="connection-card">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <h3 class="truncate text-lg font-bold text-ink" data-test-id="connection-name">{connection.clientName}</h3>
                  <p class="mt-1 truncate font-mono text-xs text-ink-faint">{connection.connectionId}</p>
                </div>
                {#if connection.status === 'active'}
                  <span class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700"><span class="h-2 w-2 rounded-full bg-green-500"></span>Active</span>
                {:else}
                  <span class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700"><span class="h-2 w-2 rounded-full bg-red-500"></span>Revoked</span>
                {/if}
              </div>

              <div class="mt-3 flex flex-wrap gap-1.5" data-test-id="connection-capabilities">
                <span class="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-700">{connection.approvedScope === 'read_write' ? 'Read & write' : 'Read only'}</span>
                {#if connection.allowShell}<span class="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">Shell</span>{/if}
                {#if connection.allowWeb}<span class="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">Web & browser</span>{/if}
              </div>

              <p class="mt-3 text-xs text-ink-faint" data-test-id="connection-machines">
                {#if connection.members.length > 0}
                  Reaches all your linked machines: {connection.members.map((member) => member.displayName).join(', ')}
                {:else}
                  Reaches all your linked machines — none linked yet.
                {/if}
              </p>

              {#if data.editConnectionId === connection.connectionId}
                <form class="mt-5 border-t border-neutral-100 pt-5" onsubmit={(event) => { event.preventDefault(); input.saveConnection(); }} data-test-id="connection-edit-form">
                  <fieldset>
                    <legend class="text-sm font-semibold text-ink">Workspace access</legend>
                    <div class="mt-2 flex gap-2">
                      <label class="flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-bold text-ink">
                        <input type="radio" name={"access-" + connection.connectionId} checked={data.connectionEdit.access === 'read'} onchange={() => input.setConnectionEdit({ access: 'read' })} />
                        Read only
                      </label>
                      <label class="flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-bold text-ink">
                        <input type="radio" name={"access-" + connection.connectionId} checked={data.connectionEdit.access === 'read_write'} onchange={() => input.setConnectionEdit({ access: 'read_write' })} />
                        Read &amp; write
                      </label>
                    </div>
                  </fieldset>
                  <div class="mt-3 flex flex-col gap-2">
                    <label class="flex items-center gap-2 text-sm text-ink">
                      <input type="checkbox" checked={data.connectionEdit.allowShell} onchange={(event) => input.setConnectionEdit({ allowShell: event.currentTarget.checked })} data-test-id="connection-edit-shell" />
                      Allow shell commands
                    </label>
                    <label class="flex items-center gap-2 text-sm text-ink">
                      <input type="checkbox" checked={data.connectionEdit.allowWeb} onchange={(event) => input.setConnectionEdit({ allowWeb: event.currentTarget.checked })} data-test-id="connection-edit-web" />
                      Allow web fetch &amp; browser
                    </label>
                  </div>
                  <div class="mt-4 flex gap-2">
                    <button type="submit" disabled={data.connectionBusyId === connection.connectionId} class="rounded-lg bg-ink px-3 py-2 text-xs font-bold text-white">Save</button>
                    <button type="button" onclick={() => input.cancelConnectionEdit()} class="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-bold text-ink">Cancel</button>
                  </div>
                </form>
              {:else if data.revokeConnectionId === connection.connectionId}
                <div class="mt-5 border-t border-red-100 pt-5" data-test-id="connection-revoke-confirm">
                  <p class="text-sm font-semibold text-red-900">Revoke this connection?</p>
                  <p class="mt-1 text-xs leading-5 text-red-700">The app's tokens stop working immediately. It can reconnect later through OAuth.</p>
                  <div class="mt-3 flex gap-2">
                    <button type="button" onclick={() => input.revokeConnection()} disabled={data.connectionBusyId === connection.connectionId} class="rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white">Revoke connection</button>
                    <button type="button" onclick={() => input.cancelConnectionRevoke()} class="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-bold text-ink">Cancel</button>
                  </div>
                </div>
              {:else if connection.status === 'active'}
                <div class="mt-5 flex gap-2 border-t border-neutral-100 pt-4">
                  <button type="button" onclick={() => input.openConnectionEdit(connection.connectionId)} class="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-bold text-ink transition hover:bg-neutral-50" data-test-id="connection-edit">Edit</button>
                  <button type="button" onclick={() => input.openConnectionRevoke(connection.connectionId)} class="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50" data-test-id="connection-revoke">Revoke</button>
                </div>
              {/if}
            </article>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</section>

