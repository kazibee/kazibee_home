<script>
  import SeoHead from '../../component/seo_head.svelte';
</script>

<SeoHead
  title="Kazibee Docs"
  path="/docs"
  description="Read Kazibee documentation for building plugins, defining typed tool interfaces, configuring permissions, and running plugin commands."
/>

<section>
  <div class="space-y-8" data-test-id="docs-overview">
    <header data-test-id="docs-header">
      <h1 class="text-4xl font-black tracking-tight text-ink sm:text-5xl lg:text-6xl" data-test-id="docs-title">
        Plugin Developer Guide
      </h1>
      <p class="mt-5 max-w-3xl text-lg leading-relaxed text-ink-muted">
        Build custom plugins that extend Kazibee with new capabilities. Every integration, tool, and workflow starts here.
      </p>
    </header>

    <!-- Getting Started -->
    <div>
      <h2 class="text-lg font-bold text-ink mb-4">Getting Started</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <a href="/docs/quick-start" class="group rounded-2xl bg-white p-6 border border-neutral-100 transition hover:border-honey-300 hover:shadow-md">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-honey-50 mb-3">
            <svg class="h-5 w-5 text-honey-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p class="text-sm font-bold text-ink group-hover:text-honey-700 transition">Quick Start</p>
          <p class="text-xs text-ink-muted mt-1">The fastest path from zero to a working plugin.</p>
        </a>
        <a href="/docs/plugin-structure" class="group rounded-2xl bg-white p-6 border border-neutral-100 transition hover:border-honey-300 hover:shadow-md">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-honey-50 mb-3">
            <svg class="h-5 w-5 text-honey-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <p class="text-sm font-bold text-ink group-hover:text-honey-700 transition">Plugin Structure</p>
          <p class="text-xs text-ink-muted mt-1">Directory layout and file roles for a complete plugin.</p>
        </a>
      </div>
    </div>

    <!-- Configuration -->
    <div>
      <h2 class="text-lg font-bold text-ink mb-4">Configuration</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <a href="/docs/package-config" class="group rounded-2xl bg-white p-6 border border-neutral-100 transition hover:border-honey-300 hover:shadow-md">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-honey-50 mb-3">
            <svg class="h-5 w-5 text-honey-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p class="text-sm font-bold text-ink group-hover:text-honey-700 transition">Package Configuration</p>
          <p class="text-xs text-ink-muted mt-1">How package.json tells Kazibee to load and run your plugin.</p>
        </a>
        <a href="/docs/entry-point" class="group rounded-2xl bg-white p-6 border border-neutral-100 transition hover:border-honey-300 hover:shadow-md">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-honey-50 mb-3">
            <svg class="h-5 w-5 text-honey-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <p class="text-sm font-bold text-ink group-hover:text-honey-700 transition">Main Entry Point</p>
          <p class="text-xs text-ink-muted mt-1">The index.ts default export that defines your plugin API.</p>
        </a>
        <a href="/docs/cli-commands" class="group rounded-2xl bg-white p-6 border border-neutral-100 transition hover:border-honey-300 hover:shadow-md">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-honey-50 mb-3">
            <svg class="h-5 w-5 text-honey-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p class="text-sm font-bold text-ink group-hover:text-honey-700 transition">CLI Commands</p>
          <p class="text-xs text-ink-muted mt-1">Named exports in command.ts become CLI commands.</p>
        </a>
      </div>
    </div>

    <!-- Auth & Permissions -->
    <div>
      <h2 class="text-lg font-bold text-ink mb-4">Auth &amp; Permissions</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <a href="/docs/authentication" class="group rounded-2xl bg-white p-6 border border-neutral-100 transition hover:border-honey-300 hover:shadow-md">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-honey-50 mb-3">
            <svg class="h-5 w-5 text-honey-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p class="text-sm font-bold text-ink group-hover:text-honey-700 transition">Authentication</p>
          <p class="text-xs text-ink-muted mt-1">API Key and OAuth2 patterns for external services.</p>
        </a>
        <a href="/docs/permissions" class="group rounded-2xl bg-white p-6 border border-neutral-100 transition hover:border-honey-300 hover:shadow-md">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-honey-50 mb-3">
            <svg class="h-5 w-5 text-honey-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <p class="text-sm font-bold text-ink group-hover:text-honey-700 transition">Environment Permissions</p>
          <p class="text-xs text-ink-muted mt-1">Declare env vars with scoped sources and fallbacks.</p>
        </a>
      </div>
    </div>

    <!-- Integration -->
    <div>
      <h2 class="text-lg font-bold text-ink mb-4">Integration</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <a href="/docs/llm-instructions" class="group rounded-2xl bg-white p-6 border border-neutral-100 transition hover:border-honey-300 hover:shadow-md">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-honey-50 mb-3">
            <svg class="h-5 w-5 text-honey-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <p class="text-sm font-bold text-ink group-hover:text-honey-700 transition">LLM Instructions</p>
          <p class="text-xs text-ink-muted mt-1">Write llm.txt so AI agents use your plugin correctly.</p>
        </a>
        <a href="/docs/dev-workflow" class="group rounded-2xl bg-white p-6 border border-neutral-100 transition hover:border-honey-300 hover:shadow-md">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-honey-50 mb-3">
            <svg class="h-5 w-5 text-honey-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <p class="text-sm font-bold text-ink group-hover:text-honey-700 transition">Development Workflow</p>
          <p class="text-xs text-ink-muted mt-1">Step-by-step commands for building and testing locally.</p>
        </a>
        <a href="/docs/publishing" class="group rounded-2xl bg-white p-6 border border-neutral-100 transition hover:border-honey-300 hover:shadow-md">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-honey-50 mb-3">
            <svg class="h-5 w-5 text-honey-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p class="text-sm font-bold text-ink group-hover:text-honey-700 transition">Publishing</p>
          <p class="text-xs text-ink-muted mt-1">Share your plugin with others via GitHub.</p>
        </a>
      </div>
    </div>

    <!-- Reference -->
    <div>
      <h2 class="text-lg font-bold text-ink mb-4">Reference</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <a href="/docs/cli-reference" class="group rounded-2xl bg-white p-6 border border-neutral-100 transition hover:border-honey-300 hover:shadow-md">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-honey-50 mb-3">
            <svg class="h-5 w-5 text-honey-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p class="text-sm font-bold text-ink group-hover:text-honey-700 transition">CLI Reference</p>
          <p class="text-xs text-ink-muted mt-1">Complete reference for all kazibee commands.</p>
        </a>
      </div>
    </div>

    <!-- CTA -->
    <section class="rounded-2xl bg-honey-50 border-2 border-honey-300 p-8" data-test-id="docs-cta">
      <div class="flex items-start gap-4">
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-honey-400">
          <svg class="h-6 w-6 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <div>
          <h2 class="text-xl font-bold text-ink">Ready to build?</h2>
          <p class="mt-2 leading-relaxed text-ink-muted">
            Explore the official plugins for real-world examples, or dive into the runtime details to understand the sandbox.
          </p>
          <div class="mt-6 flex flex-wrap gap-3" data-test-id="docs-cta-actions">
            <a href="/plugins" class="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-light" data-test-id="plugins-link">
              Browse plugins
            </a>
            <a href="/runtime" class="rounded-xl border-2 border-honey-300 bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-honey-100" data-test-id="runtime-link">
              Runtime details
            </a>
          </div>
        </div>
      </div>
    </section>
  </div>
</section>
