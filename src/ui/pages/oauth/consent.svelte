<script lang="ts">
  import type {
    OAuthConsentData,
    OAuthConsentInput,
  } from '../../controllers/oauth_consent.svelte.ts';

  let {
    data,
    input,
  }: {
    data: OAuthConsentData;
    input: OAuthConsentInput;
  } = $props();

  const selectedCount = $derived(data.selectedExecutorIds.length);

  function chooseExecutor(event: Event) {
    input.toggleExecutor((event.currentTarget as HTMLInputElement).value);
  }
</script>

<svelte:head>
  <title>Authorize access — Kazibee</title>
</svelte:head>

<section class="flex min-h-screen items-center justify-center bg-[#fcfcfc] px-5 py-12" data-test-id="oauth-consent">
  <div class="w-full max-w-xl overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-xl shadow-neutral-200/50">
    <header class="border-b border-neutral-200 px-7 py-6 sm:px-9">
      <a href="/" class="flex items-center gap-2.5">
        <img src="/images/logo_bold_128_transparent.png" alt="" class="h-9 w-9" />
        <span class="text-lg font-bold tracking-tight text-ink">Kazibee</span>
        <span class="rounded-md bg-honey-100 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-honey-700">Connect</span>
      </a>
    </header>

    <div class="px-7 py-7 sm:px-9 sm:py-9">
      {#if data.status === 'loading'}
        <div class="py-12 text-center" data-test-id="oauth-consent-loading">
          <div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-blue-600"></div>
          <p class="mt-4 text-sm text-ink-muted">Loading authorization details…</p>
        </div>
      {:else if data.status === 'signed_out'}
        <h1 class="text-2xl font-bold tracking-tight text-ink">Sign in to continue</h1>
        <p class="mt-3 text-sm leading-6 text-ink-muted">
          Sign in to your Kazibee account to choose which machines this application may reach.
        </p>
        <a
          href={data.loginHref}
          class="mt-6 inline-block rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
          data-test-id="oauth-consent-signin"
        >
          Sign in
        </a>
        {#if data.error}
          <p class="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert">
            {data.error}
          </p>
        {/if}
      {:else if data.status === 'error'}
        <h1 class="text-2xl font-bold tracking-tight text-ink">Authorization failed</h1>
        <p class="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert" data-test-id="oauth-consent-error">
          {data.error ?? 'Could not load authorization details.'}
        </p>
      {:else}
        <h1 class="text-2xl font-bold tracking-tight text-ink" data-test-id="oauth-consent-title">
          Allow {data.client?.name} to use your machines?
        </h1>
        <p class="mt-3 text-sm leading-6 text-ink-muted">
          It will be able to run
          {data.requestedAccess === 'read_write' ? 'read and write' : 'read-only'}
          workspace tools on the machines you pick. You can add or remove machines
          any time from your Connect page.
        </p>

        <fieldset class="mt-6">
          <legend class="text-sm font-semibold text-ink">Your machines</legend>
          {#if data.executors.length === 0}
            <p class="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-ink-muted" data-test-id="oauth-consent-empty">
              No machines are linked to your account yet. Run the Kazibee tool
              service on a machine and accept its claim first.
            </p>
          {/if}
          <div class="mt-3 flex flex-col gap-3">
            {#each data.executors as executor (executor.executor_id)}
              <label class="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 transition has-checked:border-blue-400 has-checked:bg-blue-50/40">
                <span class="flex items-center gap-3">
                  <input
                    type="checkbox"
                    value={executor.executor_id}
                    checked={data.selectedExecutorIds.includes(executor.executor_id)}
                    onchange={chooseExecutor}
                    class="h-4 w-4 rounded border-neutral-300"
                    data-test-id={`oauth-consent-machine-${executor.executor_id}`}
                  />
                  <span class="font-semibold text-ink">{executor.display_name}</span>
                  <span class={`ml-auto inline-flex items-center gap-1.5 text-xs font-semibold ${executor.presence === 'online' ? 'text-emerald-600' : 'text-ink-faint'}`}>
                    <span class={`h-1.5 w-1.5 rounded-full ${executor.presence === 'online' ? 'bg-emerald-500' : 'bg-neutral-300'}`}></span>
                    {executor.presence}
                  </span>
                </span>
                {#if data.selectedExecutorIds.includes(executor.executor_id)}
                  <span class="flex flex-col gap-2 pl-7 sm:flex-row sm:items-center sm:gap-4">
                    <select
                      value={data.workspaceChoices[executor.executor_id] ?? ''}
                      onchange={(event) => input.setWorkspace(executor.executor_id, (event.currentTarget as HTMLSelectElement).value)}
                      class="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-ink"
                      data-test-id={`oauth-consent-workspace-${executor.executor_id}`}
                    >
                      <option value="*">All workspaces</option>
                      {#each executor.workspaces as workspace (workspace.workspace_id)}
                        <option value={workspace.workspace_id}>{workspace.display_name}</option>
                      {/each}
                    </select>
                    {#if data.requestedAccess === 'read_write'}
                      <span class="flex items-center gap-3 text-sm text-ink-muted">
                        <label class="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name={`scope-${executor.executor_id}`}
                            checked={(data.executorScopes[executor.executor_id] ?? 'read_write') === 'read_write'}
                            onchange={() => input.setExecutorScope(executor.executor_id, 'read_write')}
                          />
                          Read &amp; write
                        </label>
                        <label class="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name={`scope-${executor.executor_id}`}
                            checked={data.executorScopes[executor.executor_id] === 'read'}
                            onchange={() => input.setExecutorScope(executor.executor_id, 'read')}
                          />
                          Read only
                        </label>
                      </span>
                    {/if}
                  </span>
                {/if}
              </label>
            {/each}
          </div>
        </fieldset>

        {#if data.requestedShell || data.requestedWeb}
          <fieldset class="mt-6">
            <legend class="text-sm font-semibold text-ink">Additional access</legend>
            <div class="mt-3 flex flex-col gap-3">
              {#if data.requestedShell}
                <label class="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-4 transition has-checked:border-blue-400 has-checked:bg-blue-50/40">
                  <input
                    type="checkbox"
                    checked={data.allowShell}
                    onchange={(event) => input.setFamily('shell', (event.currentTarget as HTMLInputElement).checked)}
                    class="mt-0.5 h-4 w-4 rounded border-neutral-300"
                    data-test-id="oauth-consent-shell"
                  />
                  <span class="flex flex-col gap-0.5">
                    <span class="font-semibold text-ink">Run shell commands</span>
                    <span class="text-xs leading-5 text-ink-muted">
                      Lets {data.client?.name} run commands as your user on the machines you pick.
                      This is full command execution on the machine, not limited to a single folder.
                    </span>
                  </span>
                </label>
              {/if}
              {#if data.requestedWeb}
                <label class="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-4 transition has-checked:border-blue-400 has-checked:bg-blue-50/40">
                  <input
                    type="checkbox"
                    checked={data.allowWeb}
                    onchange={(event) => input.setFamily('web', (event.currentTarget as HTMLInputElement).checked)}
                    class="mt-0.5 h-4 w-4 rounded border-neutral-300"
                    data-test-id="oauth-consent-web"
                  />
                  <span class="flex flex-col gap-0.5">
                    <span class="font-semibold text-ink">Fetch public web pages</span>
                    <span class="text-xs leading-5 text-ink-muted">
                      Lets {data.client?.name} fetch public http(s) URLs from the machine. Private and
                      loopback addresses are always blocked.
                    </span>
                  </span>
                </label>
              {/if}
            </div>
          </fieldset>
        {/if}

        {#if data.error}
          <p class="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert" data-test-id="oauth-consent-form-error">
            {data.error}
          </p>
        {/if}

        <div class="mt-7 flex items-center justify-end gap-3">
          <button
            type="button"
            onclick={() => input.deny()}
            disabled={data.status === 'submitting'}
            class="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-neutral-400 disabled:opacity-50"
            data-test-id="oauth-consent-deny"
          >
            Deny
          </button>
          <button
            type="button"
            onclick={() => input.approve()}
            disabled={data.status === 'submitting' || selectedCount === 0}
            class="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
            data-test-id="oauth-consent-approve"
          >
            {data.status === 'submitting' ? 'Working…' : `Allow access (${selectedCount})`}
          </button>
        </div>
      {/if}
    </div>
  </div>
</section>
