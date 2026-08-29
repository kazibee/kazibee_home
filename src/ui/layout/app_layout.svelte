<script lang="ts">
  import type { Snippet } from 'svelte';
  import {
    CONNECT_PROTOCOL_VERSION,
    createEnvelopeId,
    defaultConnectDependencies,
    loginTarget,
    requestInit,
  } from '../controllers/connect_shared';

  let {
    children,
    user = null,
  }: {
    children: Snippet;
    user?: { email: string; username: string } | null;
  } = $props();

  const deps = defaultConnectDependencies();

  async function signOut() {
    const sessionId = deps.getSessionId();
    const csrf = deps.getCsrfToken();
    if (sessionId && csrf) {
      try {
        await deps.fetch('/v1/connect/auth/logout', requestInit({
          kind: 'auth.logout.request',
          protocolVersion: CONNECT_PROTOCOL_VERSION,
          sessionId,
          actorRole: 'browser_session',
          idempotencyKey: createEnvelopeId('idem'),
          correlationId: createEnvelopeId('cor'),
        }, csrf));
      } catch {
        // Local sign-out still completes when the network is unavailable.
      }
    }
    deps.clearSessionId();
    deps.navigate(loginTarget('/connect'));
  }
</script>

<div class="flex min-h-screen flex-col bg-[#fcfcfc]">
  <nav class="sticky top-0 z-50 border-b border-neutral-100 bg-white/90 backdrop-blur-md">
    <div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 sm:px-8">
      <div class="flex items-center gap-6">
        <a href="/connect" class="flex items-center gap-2" data-test-id="app-nav-logo">
          <img src="/images/logo_bold_128_transparent.png" alt="" class="h-8 w-8" />
          <span class="text-base font-bold tracking-tight text-ink">Kazibee</span>
          <span class="rounded-md bg-honey-100 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-honey-700">Connect</span>
        </a>
        <div class="hidden items-center gap-4 text-sm font-medium text-ink-muted sm:flex">
          <a href="/connect" class="transition hover:text-ink" data-test-id="app-nav-executors">Executors</a>
          <a href="/docs" class="transition hover:text-ink" data-test-id="app-nav-docs">Docs</a>
        </div>
      </div>
      <div class="flex items-center gap-4">
        {#if user}
          <span class="hidden text-sm text-ink-muted sm:inline" data-test-id="app-nav-account">{user.username || user.email}</span>
          <button
            type="button"
            onclick={signOut}
            class="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-ink-muted transition hover:border-neutral-400 hover:text-ink"
            data-test-id="app-nav-signout"
          >
            Sign out
          </button>
        {:else}
          <a
            href="/connect/login"
            class="rounded-lg bg-ink px-3 py-1.5 text-sm font-bold text-white transition hover:bg-neutral-800"
            data-test-id="app-nav-signin"
          >
            Sign in
          </a>
        {/if}
      </div>
    </div>
  </nav>

  <main class="flex-1">
    {@render children()}
  </main>

  <footer class="border-t border-neutral-100 px-5 py-6">
    <p class="mx-auto max-w-7xl text-xs text-ink-faint">Kazibee Connect — this website only manages connections.</p>
  </footer>
</div>
