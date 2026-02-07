<section class="bg-transparent">
  <!-- Hero -->
  <div class="relative overflow-hidden">
    <div class="absolute inset-0 -z-10">
      <div class="absolute top-0 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-honey-100/60 blur-[100px]"></div>
    </div>

    <div class="mx-auto max-w-7xl px-5 pt-14 pb-16 sm:px-8 sm:pt-20 sm:pb-20">
      <div class="mx-auto max-w-3xl text-center">
        <div class="inline-flex items-center gap-2 rounded-full border border-honey-200 bg-honey-50 px-4 py-1.5" data-test-id="hero-badge">
          <span class="h-1.5 w-1.5 rounded-full bg-honey-500"></span>
          <span class="text-xs font-semibold tracking-wide text-honey-700 uppercase">AI Code Execution Agent</span>
        </div>

        <h1 class="mt-8 text-5xl font-black leading-[1.08] tracking-tight text-ink sm:text-6xl lg:text-7xl" data-test-id="hero-title">
          If an API can be built,
          <span class="gradient-text">Kazibee can act on it.</span>
        </h1>

        <p class="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-muted sm:text-xl" data-test-id="hero-subtitle">
          Create any API, expose functions, and let AI execute real work in real time.
          Only the functions you define are callable. Everything else is blocked by design.
        </p>

        <div class="mt-10 flex flex-wrap items-center justify-center gap-4" data-test-id="hero-actions">
          <a
            href="/plugins"
            class="rounded-xl bg-black px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
            data-test-id="hero-cta-primary"
          >
            Start Executing
          </a>
          <a
            href="/technical-details#how-it-works"
            class="rounded-xl border-2 border-neutral-200 px-6 py-3.5 text-sm font-semibold text-ink transition hover:border-honey-400 hover:bg-honey-50"
            data-test-id="hero-cta-secondary"
          >
            See how it works
          </a>
        </div>
      </div>
    </div>
  </div>

  <!-- Core value prop -->
  <div class="border-y border-neutral-100">
    <div class="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-14">
      <div class="mx-auto max-w-3xl text-center">
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-honey-600" data-test-id="narrative-label">Bounded execution, by design.</p>
        <p class="mt-5 text-xl leading-relaxed text-ink sm:text-2xl" data-test-id="narrative-text">
          Most AI assistants are confined to a chat window or a single terminal folder. Kazibee breaks free &mdash; executing real work across any API you create or access. Safe by default, fully sandboxed.
        </p>
      </div>
    </div>
  </div>

  <!-- How it works -->
  <div class="border-b border-neutral-100">
    <div class="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16 relative">
      <!-- Bee hero image - positioned to the right -->
      <div class="absolute -right-8 -top-20 pointer-events-none hidden xl:block" data-test-id="bee-hero">
        <img
          src="/images/bee-hero.png"
          alt="Kazibee mascot"
          class="w-72 xl:w-80 2xl:w-96"
          loading="lazy"
        />
      </div>
      <p class="mb-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-honey-600" data-test-id="workflow-label">How it works</p>
      <h2 class="mb-4 text-center text-3xl font-bold tracking-tight text-ink sm:text-4xl">From prompt to real operations</h2>
      <p class="mb-8 text-center text-ink-muted max-w-2xl mx-auto">Install pre-built plugins or create your own APIs. Kazibee exposes only what you approve. Everything else is blocked.</p>

      <div class="grid gap-6 sm:grid-cols-3" data-test-id="workflow-section">
        <div class="rounded-2xl border border-neutral-200 bg-white p-7 transition hover:border-honey-300 hover:honey-glow" data-test-id="workflow-step-1">
          <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-honey-400">
            <span class="text-lg font-bold text-ink font-mono">1</span>
          </div>
          <h3 class="text-base font-bold text-ink">Install or create functions</h3>
          <p class="mt-2 text-sm leading-relaxed text-ink-muted">Use pre-built packages or write your own TypeScript functions. Our simple plugin system makes any capability executable in minutes.</p>
        </div>

        <div class="rounded-2xl border border-neutral-200 bg-white p-7 transition hover:border-honey-300 hover:honey-glow" data-test-id="workflow-step-2">
          <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-ink">
            <span class="text-lg font-bold text-honey-400 font-mono">2</span>
          </div>
          <h3 class="text-base font-bold text-ink">Turn code into action</h3>
          <p class="mt-2 text-sm leading-relaxed text-ink-muted">AI calls your functions to get real work done. File operations, data processing, API calls, automation &mdash; anything you define becomes executable.</p>
        </div>

        <div class="rounded-2xl border border-neutral-200 bg-white p-7 transition hover:border-honey-300 hover:honey-glow" data-test-id="workflow-step-3">
          <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-honey-400">
            <span class="text-lg font-bold text-ink font-mono">3</span>
          </div>
          <h3 class="text-base font-bold text-ink">AI runs within bounds</h3>
          <p class="mt-2 text-sm leading-relaxed text-ink-muted">AI executes code against your fixed interface. No arbitrary runtime access, no uncontrolled tool usage. Every capability is intentional and reviewable.</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Feature grid -->
  <div class="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
    <p class="mb-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-ink-faint">Capabilities</p>
    <h2 class="mb-8 text-center text-3xl font-bold tracking-tight text-ink sm:text-4xl">Built for execution, not just conversation</h2>

    <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-test-id="features-grid">
      <div class="rounded-2xl border-2 border-neutral-100 p-6 transition hover:border-honey-300" data-test-id="feature-api">
        <div class="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-honey-100">
          <svg class="h-4.5 w-4.5 text-honey-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.914-3.814a4.5 4.5 0 00-6.364-6.364L4.5 8.738" /></svg>
        </div>
        <h3 class="text-sm font-bold text-ink">Any capability, any function</h3>
        <p class="mt-1.5 text-sm text-ink-muted">File operations, APIs, automation, data processing — anything TypeScript can do.</p>
      </div>

      <div class="rounded-2xl border-2 border-neutral-100 p-6 transition hover:border-honey-300" data-test-id="feature-functions">
        <div class="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-ink">
          <svg class="h-4.5 w-4.5 text-honey-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>
        </div>
        <h3 class="text-sm font-bold text-ink">Allowlisted functions only</h3>
        <p class="mt-1.5 text-sm text-ink-muted">If a function isn't on the approved interface, it isn't callable.</p>
      </div>

      <div class="rounded-2xl border-2 border-neutral-100 p-6 transition hover:border-honey-300" data-test-id="feature-connectors">
        <div class="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-honey-100">
          <svg class="h-4.5 w-4.5 text-honey-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" /></svg>
        </div>
        <h3 class="text-sm font-bold text-ink">Adapts to your workflow</h3>
        <p class="mt-1.5 text-sm text-ink-muted">Fits how you already work. Your tools, your processes, your way.</p>
      </div>

      <div class="rounded-2xl border-2 border-neutral-100 p-6 transition hover:border-honey-300" data-test-id="feature-orchestration">
        <div class="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-ink">
          <svg class="h-4.5 w-4.5 text-honey-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
        </div>
        <h3 class="text-sm font-bold text-ink">Pure work, zero context switching</h3>
        <p class="mt-1.5 text-sm text-ink-muted">Read email, download files, upload to Drive — chained together. One request, real outcomes.</p>
      </div>

      <div class="rounded-2xl border-2 border-neutral-100 p-6 transition hover:border-honey-300" data-test-id="feature-code">
        <div class="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-honey-100">
          <svg class="h-4.5 w-4.5 text-honey-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" /></svg>
        </div>
        <h3 class="text-sm font-bold text-ink">No surprise actions</h3>
        <p class="mt-1.5 text-sm text-ink-muted">No arbitrary imports, no random packages. Every execution path is predefined and reviewable.</p>
      </div>

      <div class="rounded-2xl border-2 border-neutral-100 p-6 transition hover:border-honey-300" data-test-id="feature-runtime">
        <div class="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-ink">
          <svg class="h-4.5 w-4.5 text-honey-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
        </div>
        <h3 class="text-sm font-bold text-ink">Bounded by design</h3>
        <p class="mt-1.5 text-sm text-ink-muted">Closed execution surface. AI operates within your defined boundary, not beyond it.</p>
      </div>
    </div>
  </div>

  <!-- Audience cards -->
  <div class="border-y border-neutral-100">
    <div class="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16 relative">
      <!-- Sunflower top-down - positioned bottom left -->
      <div class="absolute -left-24 -top-12 pointer-events-none hidden xl:block" data-test-id="sunflower-topdown">
        <img
          src="/images/sunflower-topdown.png"
          alt="Bee on sunflower"
          class="w-64 xl:w-72 2xl:w-80"
          loading="lazy"
        />
      </div>

      <p class="mb-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-ink-faint relative z-10">Built for your team</p>
      <h2 class="mb-8 text-center text-3xl font-bold tracking-tight text-ink sm:text-4xl relative z-10">One agent, every department</h2>

      <div class="grid gap-6 md:grid-cols-3 relative z-10" data-test-id="audience-cards">
        <article class="rounded-2xl border border-neutral-200 bg-white p-7 transition hover:border-honey-300 hover:honey-glow" data-test-id="card-operations">
          <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-honey-100">
            <svg class="h-5 w-5 text-honey-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
          </div>
          <h3 class="text-lg font-bold text-ink">For operations leaders</h3>
          <p class="mt-2 text-sm leading-relaxed text-ink-muted">Reduce manual coordination by letting AI execute across the systems your team already uses. A reusable action layer that scales with process complexity.</p>
        </article>

        <article class="rounded-2xl border border-neutral-200 bg-white p-7 transition hover:border-honey-300 hover:honey-glow" data-test-id="card-engineering">
          <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-ink">
            <svg class="h-5 w-5 text-honey-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
          </div>
          <h3 class="text-lg font-bold text-ink">For engineering teams</h3>
          <p class="mt-2 text-sm leading-relaxed text-ink-muted">Define the execution boundary. Expose trusted APIs as callable functions &mdash; if it's not on the approved interface, it's not callable. Full control stays with your team.</p>
        </article>

        <article class="rounded-2xl border border-neutral-200 bg-white p-7 transition hover:border-honey-300 hover:honey-glow" data-test-id="card-founders">
          <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-honey-100">
            <svg class="h-5 w-5 text-honey-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <h3 class="text-lg font-bold text-ink">For founders &amp; product</h3>
          <p class="mt-2 text-sm leading-relaxed text-ink-muted">Turn existing integrations into executable capabilities. A force multiplier: one runtime that unlocks broad operational leverage without rebuilding your stack.</p>
        </article>
      </div>
    </div>
  </div>

  <!-- Use cases -->
  <div class="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
    <p class="mb-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-ink-faint">Use cases</p>
    <h2 class="mb-8 text-center text-3xl font-bold tracking-tight text-ink sm:text-4xl">Infinite integrations, real outcomes</h2>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-test-id="use-cases">
      <div class="rounded-xl border border-neutral-200 bg-white px-5 py-4 flex items-start gap-3" data-test-id="usecase-inbox">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-honey-400 text-xs font-bold text-ink font-mono">&#8594;</span>
        <p class="text-sm text-ink-muted"><strong class="text-ink">Inbox triage</strong> to follow-up execution across email, docs, and sheets.</p>
      </div>
      <div class="rounded-xl border border-neutral-200 bg-white px-5 py-4 flex items-start gap-3" data-test-id="usecase-cloud">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-honey-400 text-xs font-bold text-ink font-mono">&#8594;</span>
        <p class="text-sm text-ink-muted"><strong class="text-ink">Cloud operations</strong> workflows driven through programmable API calls.</p>
      </div>
      <div class="rounded-xl border border-neutral-200 bg-white px-5 py-4 flex items-start gap-3" data-test-id="usecase-internal">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-ink text-xs font-bold text-honey-400 font-mono">&#8594;</span>
        <p class="text-sm text-ink-muted"><strong class="text-ink">Internal systems</strong> updates coordinated across multiple services.</p>
      </div>
      <div class="rounded-xl border border-neutral-200 bg-white px-5 py-4 flex items-start gap-3" data-test-id="usecase-reporting">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-ink text-xs font-bold text-honey-400 font-mono">&#8594;</span>
        <p class="text-sm text-ink-muted"><strong class="text-ink">Reporting pipelines</strong> that gather, transform, and publish across tools.</p>
      </div>
      <div class="rounded-xl border border-neutral-200 bg-white px-5 py-4 flex items-start gap-3" data-test-id="usecase-backoffice">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-honey-400 text-xs font-bold text-ink font-mono">&#8594;</span>
        <p class="text-sm text-ink-muted"><strong class="text-ink">Back-office tasks</strong> executed end to end from one agentic layer.</p>
      </div>
      <div class="rounded-xl border border-neutral-200 bg-white px-5 py-4 flex items-start gap-3" data-test-id="usecase-custom">
        <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-honey-400 text-xs font-bold text-ink font-mono">&#8594;</span>
        <p class="text-sm text-ink-muted"><strong class="text-ink">Plugin anything</strong> with custom connectors. Install from the community or build your own in minutes.</p>
      </div>
    </div>
  </div>

  <!-- Terminal CTA -->
  <div class="border-t border-neutral-100 bg-ink">
    <div class="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
      <div class="mx-auto max-w-2xl text-center">
        <h2 class="text-3xl font-bold tracking-tight text-white sm:text-4xl">Turn functions into outcomes.</h2>
        <p class="mt-4 text-neutral-400">Build a connector once, use it everywhere. Bounded execution from day one.</p>

        <div class="mx-auto mt-8 max-w-lg rounded-xl border border-neutral-700 bg-ink-light p-5" data-test-id="install-block">
          <div class="flex items-center gap-2 mb-3">
            <span class="h-3 w-3 rounded-full bg-red-400/70"></span>
            <span class="h-3 w-3 rounded-full bg-honey-400/70"></span>
            <span class="h-3 w-3 rounded-full bg-green-400/70"></span>
            <span class="ml-2 text-xs text-neutral-500 font-mono">terminal</span>
          </div>
          <code class="block text-left text-sm font-mono">
            <span class="text-neutral-500">$</span> <span class="text-honey-400">npx kazibee init my-project</span>
          </code>
        </div>

        <div class="mt-8 flex flex-wrap items-center justify-center gap-4" data-test-id="cta-actions">
          <a href="/technical-details" class="rounded-xl bg-honey-400 px-6 py-3 text-sm font-semibold text-ink transition hover:bg-honey-300" data-test-id="cta-connect">
            Connect Your APIs
          </a>
          <a href="/technical-details#how-it-works" class="rounded-xl border border-neutral-600 px-6 py-3 text-sm font-semibold text-neutral-300 transition hover:border-neutral-400 hover:text-white" data-test-id="cta-learn">
            Learn more
          </a>
        </div>
      </div>
    </div>
  </div>
</section>
