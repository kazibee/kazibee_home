<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    children
  }: {
    children: Snippet;
  } = $props();

  let mobileMenuOpen = $state(false);
</script>

<div class="flex min-h-screen flex-col bg-[#fcfcfc]">
  <nav class="sticky top-0 z-50 border-b border-neutral-100 bg-white/90 backdrop-blur-md">
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
      <a href="/" class="flex items-center gap-2.5" data-test-id="nav-logo">
        <img src="/images/kazibee-logo.png" alt="Kazibee" class="h-10 w-10" />
        <span class="text-lg font-bold tracking-tight text-ink">Kazibee</span>
      </a>

      <div class="hidden items-center gap-6 sm:flex">
        <a href="/" class="text-sm text-ink-muted transition hover:text-ink" data-test-id="nav-home">Home</a>
        <a href="/developers" class="text-sm text-ink-muted transition hover:text-ink" data-test-id="nav-developers">For Developers</a>
        <a href="/downloads" class="text-sm text-ink-muted transition hover:text-ink" data-test-id="nav-downloads">Downloads</a>
        <a href="/downloads" class="rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-blue-500" data-test-id="nav-download-cta">
          Download
        </a>
      </div>

      <button
        type="button"
        class="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 bg-white text-ink transition hover:border-neutral-300 hover:bg-neutral-50 sm:hidden"
        aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={mobileMenuOpen}
        aria-controls="mobile-navigation"
        data-test-id="nav-mobile-menu-toggle"
        onclick={() => mobileMenuOpen = !mobileMenuOpen}
      >
        {#if mobileMenuOpen}
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        {/if}
      </button>
    </div>

    {#if mobileMenuOpen}
      <div id="mobile-navigation" class="border-t border-neutral-100 bg-white px-5 py-3 sm:hidden" data-test-id="nav-mobile-menu">
        <div class="mx-auto flex max-w-7xl flex-col gap-1">
          <a href="/" class="rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition hover:bg-neutral-50 hover:text-ink" data-test-id="nav-mobile-home" onclick={() => mobileMenuOpen = false}>Home</a>
          <a href="/developers" class="rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition hover:bg-neutral-50 hover:text-ink" data-test-id="nav-mobile-developers" onclick={() => mobileMenuOpen = false}>For Developers</a>
          <a href="/downloads" class="rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition hover:bg-neutral-50 hover:text-ink" data-test-id="nav-mobile-downloads" onclick={() => mobileMenuOpen = false}>Downloads</a>
          <a href="/downloads" class="mt-1 rounded-lg bg-blue-600 px-3 py-2 text-center text-sm font-medium text-white transition hover:bg-blue-500" data-test-id="nav-mobile-download-cta" onclick={() => mobileMenuOpen = false}>Download</a>
        </div>
      </div>
    {/if}
  </nav>

  <main class="flex-1">
    {@render children()}
  </main>

  <footer class="border-t border-neutral-100 py-12 px-5">
    <div class="mx-auto max-w-7xl flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
      <div class="flex items-center gap-2.5">
        <img src="/images/kazibee-logo.png" alt="Kazibee" class="h-8 w-8" />
        <span class="text-sm font-semibold text-ink-muted">Kazibee</span>
      </div>
      <p class="text-xs text-ink-faint">Bounded AI execution. Free and open source.</p>
    </div>
  </footer>
</div>
