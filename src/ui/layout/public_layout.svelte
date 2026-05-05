<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    children
  }: {
    children: Snippet;
  } = $props();
</script>

<div class="min-h-screen bg-[#fcfcfc]">
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
        <a href="/downloads/cli" class="text-sm text-ink-muted transition hover:text-ink" data-test-id="nav-downloads">Downloads</a>
        <a
          href="https://github.com"
          class="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ink-light"
          data-test-id="nav-github"
        >
          <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
          GitHub
        </a>
      </div>

      <div class="flex items-center gap-2 sm:hidden" data-test-id="nav-mobile-links">
        <a href="/plugins" class="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-ink" data-test-id="nav-mobile-plugins">
          Plugins
        </a>
        <a href="/technical-details" class="rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium text-white" data-test-id="nav-mobile-technical">
          Details
        </a>
        <a href="/downloads/cli" class="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-ink" data-test-id="nav-mobile-downloads">
          Downloads
        </a>
      </div>
    </div>
  </nav>

  <main>
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
