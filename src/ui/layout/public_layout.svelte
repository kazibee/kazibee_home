<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    children
  }: {
    children: Snippet;
  } = $props();
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
        <a href="/plugins" class="text-sm text-ink-muted transition hover:text-ink" data-test-id="nav-plugins">Plugins</a>
        <a href="/technical-details" class="text-sm text-ink-muted transition hover:text-ink" data-test-id="nav-technical">How it works</a>
        <a href="/downloads" class="text-sm text-ink-muted transition hover:text-ink" data-test-id="nav-downloads">Downloads</a>
      </div>

      <div class="flex items-center gap-2 sm:hidden" data-test-id="nav-mobile-links">
        <a href="/plugins" class="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-ink" data-test-id="nav-mobile-plugins">
          Plugins
        </a>
        <a href="/technical-details" class="rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium text-white" data-test-id="nav-mobile-technical">
          Details
        </a>
        <a href="/downloads" class="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-ink" data-test-id="nav-mobile-downloads">
          Downloads
        </a>
      </div>
    </div>
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
