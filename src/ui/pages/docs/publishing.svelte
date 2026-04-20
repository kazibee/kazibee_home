<section>
  <div class="space-y-8" data-test-id="docs-publishing">
    <header>
      <h1 class="text-3xl font-black tracking-tight text-ink sm:text-4xl">Publishing</h1>
      <p class="mt-3 text-ink-muted">Share your plugin with others via GitHub.</p>
    </header>

    <div class="space-y-4">
      <div class="flex gap-3 items-start">
        <span class="text-honey-600 font-bold shrink-0">1.</span>
        <p class="text-sm text-ink-muted">Push your plugin to a GitHub repository.</p>
      </div>
      <div class="flex gap-3 items-start">
        <span class="text-honey-600 font-bold shrink-0">2.</span>
        <div>
          <p class="text-sm text-ink-muted">Users install with:</p>
          <div class="mt-2 rounded-lg border border-neutral-800 bg-neutral-900 p-2 font-mono text-xs">
            <span class="text-cyan-400">kazibee</span> <span class="text-green-400">install</span> <span class="text-amber-300">my-plugin</span> <span class="text-purple-300">github:org/my-plugin</span>
          </div>
        </div>
      </div>
      <div class="flex gap-3 items-start">
        <span class="text-honey-600 font-bold shrink-0">3.</span>
        <p class="text-sm text-ink-muted">Kazibee uses SHA pinning for reproducible installs. The exact commit is locked at install time.</p>
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

    <nav class="flex items-center justify-between border-t border-neutral-100 pt-6 mt-10">
      <a href="/docs/dev-workflow" class="text-sm text-ink-muted hover:text-ink transition">&larr; Dev Workflow</a>
      <a href="/docs/cli-reference" class="text-sm font-semibold text-honey-600 hover:text-honey-700 transition">Next: CLI Reference &rarr;</a>
    </nav>
  </div>
</section>
