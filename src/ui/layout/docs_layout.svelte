<script lang="ts">
  import type { Snippet } from 'svelte';
  import PublicLayout from './public_layout.svelte';

  let {
    children
  }: {
    children: Snippet;
  } = $props();

  type NavItem = { label: string; href: string };
  type NavSection = { title: string; items: NavItem[] };

  const sections: NavSection[] = [
    {
      title: 'Getting Started',
      items: [
        { label: 'Overview', href: '/docs' },
        { label: 'Quick Start', href: '/docs/quick-start' },
        { label: 'Plugin Structure', href: '/docs/plugin-structure' }
      ]
    },
    {
      title: 'Configuration',
      items: [
        { label: 'Package Config', href: '/docs/package-config' },
        { label: 'Entry Point', href: '/docs/entry-point' },
        { label: 'CLI Commands', href: '/docs/cli-commands' }
      ]
    },
    {
      title: 'Auth & Permissions',
      items: [
        { label: 'Authentication', href: '/docs/authentication' },
        { label: 'Permissions', href: '/docs/permissions' }
      ]
    },
    {
      title: 'Integration',
      items: [
        { label: 'LLM Instructions', href: '/docs/llm-instructions' },
        { label: 'Dev Workflow', href: '/docs/dev-workflow' },
        { label: 'Publishing', href: '/docs/publishing' }
      ]
    },
    {
      title: 'Reference',
      items: [
        { label: 'CLI Reference', href: '/docs/cli-reference' }
      ]
    }
  ];

  const allItems: NavItem[] = sections.flatMap((s) => s.items);

  let searchQuery = $state('');
  let mobileOpen = $state(false);
  let currentPath = $state('');

  $effect(() => {
    currentPath = window.location.pathname;
  });

  function fuzzyMatch(query: string, text: string): boolean {
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    let qi = 0;
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
      if (t[ti] === q[qi]) qi++;
    }
    return qi === q.length;
  }

  let filteredItems = $derived(
    searchQuery.trim()
      ? allItems.filter((item) => fuzzyMatch(searchQuery.trim(), item.label))
      : null
  );

  function isActive(href: string): boolean {
    if (href === '/docs') return currentPath === '/docs';
    return currentPath === href;
  }

  function closeMobile() {
    mobileOpen = false;
  }
</script>

<PublicLayout>
  <div class="relative mx-auto max-w-7xl lg:flex">
    <!-- Mobile toggle button -->
    <div class="sticky top-16 z-30 flex items-center justify-between border-b border-neutral-100 bg-white/90 px-5 py-3 backdrop-blur-md lg:hidden">
      <span class="text-sm font-bold text-ink" data-test-id="docs-mobile-title">Plugin Developer Guide</span>
      <button
        onclick={() => (mobileOpen = !mobileOpen)}
        class="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-ink transition hover:bg-neutral-50"
        data-test-id="docs-mobile-toggle"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          {#if mobileOpen}
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          {:else}
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          {/if}
        </svg>
        Menu
      </button>
    </div>

    <!-- Mobile backdrop -->
    {#if mobileOpen}
      <button
        class="fixed inset-0 z-30 bg-black/30 lg:hidden"
        onclick={closeMobile}
        aria-label="Close menu"
      ></button>
    {/if}

    <!-- Sidebar -->
    <aside
      class="fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] w-[260px] shrink-0 overflow-y-auto border-r border-neutral-100 bg-white transition-transform duration-200 {mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:sticky lg:z-10 lg:translate-x-0"
      data-test-id="docs-sidebar"
    >
      <div class="px-4 pt-5 pb-1">
        <a href="/docs" class="block mb-3" data-test-id="docs-guide-title">
          <p class="text-xs font-bold uppercase tracking-[0.12em] text-honey-500">Kazibee</p>
          <p class="text-base font-bold text-ink">Plugin Developer Guide</p>
        </a>
      </div>
      <div class="px-4 pb-3">
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search docs..."
          class="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-ink placeholder:text-ink-faint outline-none transition focus:border-honey-400 focus:ring-1 focus:ring-honey-400"
          data-test-id="docs-search"
        />
      </div>

      <nav class="px-3 pb-8" data-test-id="docs-nav">
        {#if filteredItems}
          <!-- Flat filtered results -->
          <div class="space-y-0.5">
            {#each filteredItems as item}
              <a
                href={item.href}
                onclick={closeMobile}
                class="block rounded-lg px-3 py-2 text-sm transition {isActive(item.href)
                  ? 'bg-honey-100 font-semibold text-ink'
                  : 'text-ink-muted hover:bg-neutral-50 hover:text-ink'}"
              >
                {item.label}
              </a>
            {/each}
            {#if filteredItems.length === 0}
              <p class="px-3 py-4 text-sm text-ink-faint">No results found.</p>
            {/if}
          </div>
        {:else}
          <!-- Grouped sections -->
          {#each sections as section, i}
            <div class="{i > 0 ? 'mt-5' : ''}">
              <p class="mb-1.5 px-3 text-xs font-bold uppercase tracking-[0.12em] text-ink-faint">
                {section.title}
              </p>
              <div class="space-y-0.5">
                {#each section.items as item}
                  <a
                    href={item.href}
                    onclick={closeMobile}
                    class="block rounded-lg px-3 py-2 text-sm transition {isActive(item.href)
                      ? 'bg-honey-100 font-semibold text-ink'
                      : 'text-ink-muted hover:bg-neutral-50 hover:text-ink'}"
                  >
                    {item.label}
                  </a>
                {/each}
              </div>
            </div>
          {/each}
        {/if}
      </nav>
    </aside>

    <!-- Content area -->
    <div class="min-w-0 flex-1" data-test-id="docs-content">
      <div class="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        {@render children()}
      </div>
    </div>
  </div>
</PublicLayout>
