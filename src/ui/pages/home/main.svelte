<script>
  import OdometerWordReel from '../../component/odometer_word_reel.svelte';
  import SeoHead from '../../component/seo_head.svelte';

  let activeVisualPreview = 'diagram';

  const heroReelPhrases = [
    'work on UI',
    'debug code',
    'ship features',
    'run agents',
    'switch models',
    'branch work',
    'build tools',
  ];
</script>

<SeoHead
  title="Kazibee"
  path="/"
  description="Kazibee is a desktop AI workspace for switching models, managing threads, running parallel work, and using plugins with your own API keys."
/>

<section>

  <!-- ─── HERO ─── -->
  <div class="bg-navy-900 px-5 pt-24 pb-20 text-center sm:px-8">
    <div class="mx-auto max-w-3xl">
      <h1 class="mt-2 text-5xl font-black leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-7xl">
        Managing multiple AI sessions is hard.<br>
        <span class="block pt-3 text-3xl italic text-blue-400 sm:text-4xl lg:text-5xl">It doesn't have to feel that way.</span>
      </h1>

      <div class="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-navy-400 sm:text-xl">
        <p class="flex flex-wrap items-center justify-center gap-x-3 gap-y-3 text-center text-navy-200">
          <span class="basis-full sm:basis-auto">Kazibee is the #1 place to</span>
          <span class="flex basis-full justify-center sm:basis-auto">
            <OdometerWordReel phrases={heroReelPhrases} />
          </span>
          <span class="basis-full sm:basis-auto">with AI agents.</span>
        </p>
        <p class="mt-5">
          Swap models without leaving the thread, dial reasoning to the task, fan out to parallel
          threads, jump to any chat in a keystroke, and get answers as charts and diagrams — not
          walls of text.
        </p>
      </div>

      <div class="mt-10 flex flex-wrap items-center justify-center gap-4">
        <a href="/downloads" class="rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-blue-500">
          Download free →
        </a>
        <a href="#one-place" class="rounded-xl border border-navy-700 bg-navy-800 px-6 py-3.5 text-sm font-semibold text-navy-200 transition hover:border-navy-600">
          See how it's faster
        </a>
      </div>

      <p class="mt-10 text-xs text-navy-400">Bring your own API keys · Mac, Windows, Linux</p>
    </div>
  </div>

  <!-- ─── ONE PLACE ─── -->
  <div id="one-place" class="bg-white px-5 py-20 sm:px-8">
    <div class="mx-auto max-w-5xl">
      <div class="mx-auto mb-12 max-w-3xl text-center">
        <p class="mb-4 text-xs font-bold uppercase tracking-widest text-blue-600">Lever 1 · No context switching</p>
        <h2 class="text-4xl font-black tracking-tight text-ink sm:text-5xl">
          Stay in the thread.<br>
          <span class="text-blue-600">Swap the model.</span>
        </h2>
        <p class="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-ink-muted">
          Going from Claude to Codex shouldn't mean a new app, a new window, or pasting your context again.
          Switch models with a keystroke and keep going in the same conversation.
        </p>
      </div>

      <div class="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 p-6 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wide text-ink-muted">Same thread</span>
          <span class="rounded-md border border-neutral-200 bg-white px-2.5 py-1 font-mono text-[11px] text-ink-muted">⌘ \</span>
        </div>
        <div class="space-y-3">
          <div class="rounded-xl bg-white p-4 ring-1 ring-neutral-200">
            <div class="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-blue-700">
              <span class="h-2 w-2 rounded-full bg-blue-500"></span> Claude Opus
            </div>
            <p class="text-sm text-ink">Walk me through how this controller resolves the route.</p>
          </div>
          <div class="rounded-xl bg-white p-4 ring-1 ring-neutral-200">
            <div class="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
              <span class="h-2 w-2 rounded-full bg-emerald-500"></span> Codex
            </div>
            <p class="text-sm text-ink">Now apply the fix and run the tests.</p>
          </div>
          <div class="rounded-xl bg-white p-4 ring-1 ring-neutral-200">
            <div class="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-violet-700">
              <span class="h-2 w-2 rounded-full bg-violet-500"></span> Gemini Flash
            </div>
            <p class="text-sm text-ink">Quick — rephrase the commit message.</p>
          </div>
        </div>
        <p class="mt-4 text-xs text-ink-muted">Each model picks up the same conversation. No re-pasting, no re-explaining.</p>
      </div>
    </div>
  </div>

  <!-- ─── RIGHT-SIZE THE REASONING ─── -->
  <div class="bg-navy-900 px-5 py-20 sm:px-8">
    <div class="mx-auto max-w-5xl">
      <div class="mx-auto mb-12 max-w-3xl text-center">
        <p class="mb-4 text-xs font-bold uppercase tracking-widest text-blue-300">Lever 2 · Right-size reasoning</p>
        <h2 class="text-4xl font-black tracking-tight text-white sm:text-5xl">
          Don't pay for thinking<br>
          <span class="text-blue-400">you don't need.</span>
        </h2>
        <p class="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-navy-400">
          High reasoning is slow. Reading code doesn't need it. Designing a fix might.
          Dial it per turn so latency matches the task.
        </p>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <div class="rounded-2xl border border-navy-700 bg-navy-800 p-6">
          <div class="mb-3 flex items-center">
            <span class="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">Low</span>
          </div>
          <p class="text-sm font-bold text-white">Just read.</p>
          <p class="mt-2 text-sm leading-relaxed italic text-white">"What does this file do?" The model doesn't need to think — it needs to look.</p>
        </div>
        <div class="rounded-2xl border border-navy-700 bg-navy-800 p-6">
          <div class="mb-3 flex items-center">
            <span class="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400">Medium</span>
          </div>
          <p class="text-sm font-bold text-white">Plan a change.</p>
          <p class="mt-2 text-sm leading-relaxed italic text-white">"Where should this live and what breaks?" Some thinking, not a deep dive.</p>
        </div>
        <div class="rounded-2xl border border-navy-700 bg-navy-800 p-6">
          <div class="mb-3 flex items-center">
            <span class="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-400">High</span>
          </div>
          <p class="text-sm font-bold text-white">Solve the hard one.</p>
          <p class="mt-2 text-sm leading-relaxed italic text-white">"Why is this race condition happening?" Worth the latency. Pay it on purpose.</p>
        </div>
      </div>
      <p class="mt-6 text-center text-sm italic text-white">The default isn't always thinking.</p>
    </div>
  </div>

  <!-- ─── PARALLEL THREADS ─── -->
  <div class="bg-white px-5 py-20 sm:px-8">
    <div class="mx-auto max-w-6xl">
      <div class="mx-auto mb-12 max-w-3xl text-center">
        <p class="mb-4 text-xs font-bold uppercase tracking-widest text-blue-600">Lever 3 · Parallelism</p>
        <h2 class="text-4xl font-black tracking-tight text-ink sm:text-5xl">
          Fan out instead<br>
          <span class="text-blue-600">of waiting on one model.</span>
        </h2>
        <p class="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-ink-muted">
          Models are slow. So run several at once. New threads, forks, and worktrees are a keystroke away —
          and folders + quick rename keep them organized when you have ten in flight.
        </p>
      </div>

      <div class="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <!-- Mock sidebar showing organized threads -->
        <div class="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950 p-4">
          <div class="mb-3 flex items-center justify-between px-1">
            <span class="text-xs font-bold text-neutral-200">Threads</span>
            <span class="font-mono text-[11px] text-neutral-500">⌘ N · new</span>
          </div>
          <div class="space-y-3 text-sm">
            <div>
              <div class="mb-1 flex items-center gap-2 px-2 text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                <span>📁</span><span>Auth refactor</span>
              </div>
              <div class="space-y-0.5">
                <div class="flex items-center justify-between rounded-lg bg-neutral-800 px-2.5 py-1.5">
                  <span class="text-neutral-100">session token migration</span>
                  <span class="font-mono text-[10px] text-blue-400">worktree</span>
                </div>
                <div class="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-neutral-400">
                  <span>oauth callback bug</span>
                  <span class="font-mono text-[10px] text-neutral-500">⌘ R · rename</span>
                </div>
                <div class="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-neutral-400">
                  <span>oauth callback bug — fork A</span>
                  <span class="font-mono text-[10px] text-violet-400">fork</span>
                </div>
              </div>
            </div>
            <div>
              <div class="mb-1 flex items-center gap-2 px-2 text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                <span>📁</span><span>Landing redesign</span>
              </div>
              <div class="space-y-0.5">
                <div class="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-neutral-400">
                  <span>hero copy variants</span>
                </div>
                <div class="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-neutral-400">
                  <span>CTA test</span>
                </div>
              </div>
            </div>
          </div>
          <p class="mt-4 px-2 text-[11px] text-neutral-500">CLI tabs break down past 4 windows. Folders + rename scale to 40.</p>
        </div>

        <!-- Three primitives -->
        <div class="grid gap-4">
          <div class="rounded-2xl border border-neutral-200 bg-white p-5">
            <div class="mb-2 flex items-center justify-between">
              <span class="text-sm font-bold text-ink">New thread</span>
              <span class="font-mono text-[11px] text-ink-muted">⌘ N</span>
            </div>
            <p class="text-sm leading-relaxed text-ink-muted">Start a fresh task without losing the one you're on.</p>
          </div>
          <div class="rounded-2xl border border-neutral-200 bg-white p-5">
            <div class="mb-2 flex items-center justify-between">
              <span class="text-sm font-bold text-ink">Fork thread</span>
              <span class="font-mono text-[11px] text-ink-muted">⌘ ⇧ F</span>
            </div>
            <p class="text-sm leading-relaxed text-ink-muted">Branch from any message to try a second direction without rewinding.</p>
          </div>
          <div class="rounded-2xl border border-neutral-200 bg-white p-5">
            <div class="mb-2 flex items-center justify-between">
              <span class="text-sm font-bold text-ink">Worktree</span>
              <span class="font-mono text-[11px] text-ink-muted">⌘ ⇧ W</span>
            </div>
            <p class="text-sm leading-relaxed text-ink-muted">Isolate work on its own branch and filesystem so two threads don't collide.</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ─── FEEDING CONTEXT ─── -->
  <div class="bg-navy-900 px-5 py-20 sm:px-8">
    <div class="mx-auto max-w-5xl">
      <div class="mx-auto mb-12 max-w-3xl text-center">
        <p class="mb-4 text-xs font-bold uppercase tracking-widest text-blue-300">Lever 4 · Context</p>
        <h2 class="text-4xl font-black tracking-tight text-white sm:text-5xl">
          Hand the model<br>
          <span class="text-blue-400">exactly what it needs.</span>
        </h2>
        <p class="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-navy-400">
          Better context = better answers, fewer turns. A fast local index lets you attach the right files
          to the chat in a keystroke — so the model is grounded in your code instead of guessing.
        </p>
      </div>

      <div class="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-navy-700 bg-navy-800 shadow-2xl">
        <div class="flex items-center justify-between border-b border-navy-700 px-5 py-3">
          <span class="text-xs font-bold uppercase tracking-wide text-navy-400">Attach files as context</span>
          <span class="font-mono text-[11px] text-white">⌘ /</span>
        </div>
        <div class="px-5 py-4">
          <div class="flex items-center gap-3 rounded-lg bg-navy-900 px-4 py-3 ring-1 ring-navy-700">
            <span class="text-navy-400">@</span>
            <span class="font-mono text-sm text-white">setres<span class="bg-blue-500/30 text-blue-300">|</span></span>
          </div>
          <div class="mt-3 space-y-1">
            <div class="flex items-center justify-between rounded-lg bg-blue-600/10 px-3 py-2 ring-1 ring-blue-500/40">
              <div class="flex items-center gap-2">
                <span class="text-blue-400">+</span>
                <span class="font-mono text-sm text-white">server/services/<span class="font-bold">setres</span>olver/index.ts</span>
              </div>
              <span class="font-mono text-[10px] text-navy-300">attach</span>
            </div>
            <div class="flex items-center justify-between rounded-lg px-3 py-2 text-white">
              <span class="font-mono text-sm">server/services/<span class="font-bold text-white">setres</span>olver/cache.ts</span>
            </div>
            <div class="flex items-center justify-between rounded-lg px-3 py-2 text-white">
              <span class="font-mono text-sm">test/<span class="font-bold text-white">setres</span>olver.spec.ts</span>
            </div>
            <div class="flex items-center justify-between rounded-lg px-3 py-2 text-white">
              <span class="font-mono text-sm">ui/lib/<span class="font-bold text-white">set-res</span>ize-handler.ts</span>
            </div>
          </div>
          <div class="mt-4 flex flex-wrap items-center gap-2 border-t border-navy-700 pt-4">
            <span class="text-[11px] font-bold uppercase tracking-wide text-white">Now in context:</span>
            <span class="rounded-md bg-blue-600/15 px-2 py-1 font-mono text-[11px] text-blue-200 ring-1 ring-blue-500/30">resolver/index.ts</span>
            <span class="rounded-md bg-blue-600/15 px-2 py-1 font-mono text-[11px] text-blue-200 ring-1 ring-blue-500/30">resolver/cache.ts</span>
            <span class="rounded-md bg-blue-600/15 px-2 py-1 font-mono text-[11px] text-blue-200 ring-1 ring-blue-500/30">resolver.spec.ts</span>
          </div>
        </div>
        <div class="border-t border-navy-700 bg-navy-900/50 px-5 py-2.5 text-[11px] text-navy-300">
          Indexed locally · ranked by recency, proximity, and edit history
        </div>
      </div>
      <p class="mt-6 text-center text-sm italic text-white">Less guessing means fewer turns. Fewer turns means done sooner.</p>
    </div>
  </div>

  <!-- ─── VISUAL ANSWERS ─── -->
  <div id="examples" class="bg-white px-5 py-20 sm:px-8">
    <div class="mx-auto max-w-6xl">
      <div class="mx-auto mb-12 max-w-3xl text-center">
        <p class="mb-4 text-xs font-bold uppercase tracking-widest text-blue-600">Lever 5 · See instead of read</p>
        <h2 class="text-4xl font-black tracking-tight text-ink sm:text-5xl">
          Some answers are faster<br>
          <span class="text-blue-600">as a picture.</span>
        </h2>
        <p class="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-ink-muted">
          A diagram, chart, mock, or table can land in a glance — where a paragraph takes a minute.
          Kazibee renders them inline, on the fly, in the same conversation.
        </p>
      </div>

      <div class="grid gap-8 md:min-h-[600px] lg:grid-cols-[0.82fr_1.18fr] lg:items-stretch">
        <div class="flex flex-col gap-3">
          <button
            type="button"
            class="rounded-xl border p-5 text-left shadow-sm transition {activeVisualPreview === 'diagram'
              ? 'border-2 border-blue-500 bg-blue-50'
              : 'border-neutral-200 bg-white hover:border-blue-200 hover:bg-blue-50/40'}"
            aria-pressed={activeVisualPreview === 'diagram'}
            on:click={() => activeVisualPreview = 'diagram'}
          >
            <div>
              <p class="text-xs font-bold uppercase tracking-wide text-blue-700">Diagram</p>
              <p class="mt-2 font-mono text-sm leading-relaxed text-ink">
                show the message flow as a sequence diagram
              </p>
            </div>
          </button>

          <button
            type="button"
            class="rounded-xl border p-5 text-left shadow-sm transition {activeVisualPreview === 'chart'
              ? 'border-2 border-emerald-500 bg-emerald-50'
              : 'border-neutral-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40'}"
            aria-pressed={activeVisualPreview === 'chart'}
            on:click={() => activeVisualPreview = 'chart'}
          >
            <div>
              <p class="text-xs font-bold uppercase tracking-wide text-emerald-700">Chart</p>
              <p class="mt-2 font-mono text-sm leading-relaxed text-ink">chart every file by line count</p>
            </div>
          </button>

          <button
            type="button"
            class="rounded-xl border p-5 text-left shadow-sm transition {activeVisualPreview === 'interface'
              ? 'border-2 border-violet-500 bg-violet-50'
              : 'border-neutral-200 bg-white hover:border-violet-200 hover:bg-violet-50/40'}"
            aria-pressed={activeVisualPreview === 'interface'}
            on:click={() => activeVisualPreview = 'interface'}
          >
            <div>
              <p class="text-xs font-bold uppercase tracking-wide text-violet-700">Interface</p>
              <p class="mt-2 font-mono text-sm leading-relaxed text-ink">
                mock up the settings panel before implementing it
              </p>
            </div>
          </button>

          <button
            type="button"
            class="rounded-xl border p-5 text-left shadow-sm transition {activeVisualPreview === 'table'
              ? 'border-2 border-amber-500 bg-amber-50'
              : 'border-neutral-200 bg-white hover:border-amber-200 hover:bg-amber-50/40'}"
            aria-pressed={activeVisualPreview === 'table'}
            on:click={() => activeVisualPreview = 'table'}
          >
            <div>
              <p class="text-xs font-bold uppercase tracking-wide text-amber-700">Table</p>
              <p class="mt-2 font-mono text-sm leading-relaxed text-ink">
                summarize last week's invoices as a table
              </p>
            </div>
          </button>

          <div class="mt-auto rounded-xl border border-neutral-200 bg-neutral-50 p-5">
            <p class="text-sm font-bold text-ink">Faster to grok.</p>
            <p class="mt-2 text-sm leading-relaxed text-ink-muted">
              Glance, decide, move on — instead of parsing prose.
            </p>
          </div>
        </div>

        <div class="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 shadow-sm">
          <div class="mb-4 flex items-center justify-between gap-4">
            <div>
              {#if activeVisualPreview === 'diagram'}
                <p class="text-sm font-bold text-ink">Sequence diagram preview</p>
                <p class="mt-1 text-sm text-ink-muted">Rendered from workspace context, shown inside the conversation.</p>
              {:else if activeVisualPreview === 'chart'}
                <p class="text-sm font-bold text-ink">Line-count chart preview</p>
                <p class="mt-1 text-sm text-ink-muted">A quick graph from local file inspection, without editing anything.</p>
              {:else if activeVisualPreview === 'interface'}
                <p class="text-sm font-bold text-ink">Interface preview</p>
                <p class="mt-1 text-sm text-ink-muted">A visual mockup you can review before asking AI to implement it.</p>
              {:else}
                <p class="text-sm font-bold text-ink">Table preview</p>
                <p class="mt-1 text-sm text-ink-muted">Structured rows from your files or data, ready to scan and verify.</p>
              {/if}
            </div>
            <span class="shrink-0 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-bold text-emerald-700">No files changed</span>
          </div>

          <div class="rounded-xl bg-white p-6 ring-1 ring-neutral-200">
            {#if activeVisualPreview === 'diagram'}
              <div class="mb-5 grid grid-cols-4 text-center text-xs font-bold text-neutral-500">
                <span>User</span><span>UI</span><span>Agent</span><span>Workspace</span>
              </div>
              <div class="relative h-64 overflow-hidden rounded-lg bg-white">
                <div class="absolute left-[12.5%] top-0 h-full border-l border-dashed border-neutral-200"></div>
                <div class="absolute left-[37.5%] top-0 h-full border-l border-dashed border-neutral-200"></div>
                <div class="absolute left-[62.5%] top-0 h-full border-l border-dashed border-neutral-200"></div>
                <div class="absolute left-[87.5%] top-0 h-full border-l border-dashed border-neutral-200"></div>

                <div class="absolute left-[14%] right-[38%] top-8 border-t-2 border-blue-500"></div>
                <p class="absolute left-[28%] top-3 rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">ask for diagram</p>

                <div class="absolute left-[39%] right-[13%] top-20 border-t-2 border-violet-500"></div>
                <p class="absolute left-[53%] top-[4.1rem] rounded-full bg-violet-50 px-2 py-1 text-[11px] font-bold text-violet-700">inspect files</p>

                <div class="absolute left-[39%] right-[38%] top-32 border-t-2 border-emerald-500"></div>
                <p class="absolute left-[45%] top-[7.2rem] rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">render visual</p>

                <div class="absolute left-[14%] right-[38%] top-44 border-t-2 border-neutral-800"></div>
                <p class="absolute left-[30%] top-[10.2rem] rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-bold text-neutral-700">review result</p>

                <div class="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-neutral-950 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm">Then decide what should change</div>
              </div>
            {:else if activeVisualPreview === 'chart'}
              <div class="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p class="text-xs font-bold uppercase tracking-wide text-emerald-700">Files by line count</p>
                  <p class="mt-1 text-sm text-ink-muted">AI can inspect, count, and visualize shape-of-code questions.</p>
                </div>
                <span class="rounded-md bg-neutral-100 px-2 py-1 font-mono text-[11px] text-ink-muted">src/ui/pages</span>
              </div>
              <div class="flex h-64 items-end gap-4 rounded-lg border border-neutral-200 bg-neutral-50 px-5 py-4">
                <div class="flex flex-1 flex-col items-center gap-2">
                  <div class="w-full rounded-t bg-emerald-500" style="height: 168px;"></div>
                  <span class="text-[11px] font-semibold text-neutral-500">home</span>
                </div>
                <div class="flex flex-1 flex-col items-center gap-2">
                  <div class="w-full rounded-t bg-blue-500" style="height: 126px;"></div>
                  <span class="text-[11px] font-semibold text-neutral-500">docs</span>
                </div>
                <div class="flex flex-1 flex-col items-center gap-2">
                  <div class="w-full rounded-t bg-violet-500" style="height: 196px;"></div>
                  <span class="text-[11px] font-semibold text-neutral-500">dev</span>
                </div>
                <div class="flex flex-1 flex-col items-center gap-2">
                  <div class="w-full rounded-t bg-amber-500" style="height: 84px;"></div>
                  <span class="text-[11px] font-semibold text-neutral-500">downloads</span>
                </div>
                <div class="flex flex-1 flex-col items-center gap-2">
                  <div class="w-full rounded-t bg-rose-500" style="height: 112px;"></div>
                  <span class="text-[11px] font-semibold text-neutral-500">pricing</span>
                </div>
              </div>
            {:else if activeVisualPreview === 'interface'}
              <div class="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p class="text-xs font-bold uppercase tracking-wide text-violet-700">Settings panel concept</p>
                  <p class="mt-1 text-sm text-ink-muted">A reviewable UI direction before component files change.</p>
                </div>
                <span class="rounded-md bg-neutral-100 px-2 py-1 font-mono text-[11px] text-ink-muted">preview render</span>
              </div>
              <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <div class="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                  <div class="mb-5 flex items-center justify-between">
                    <div>
                      <div class="h-4 w-32 rounded bg-neutral-900"></div>
                      <div class="mt-2 h-2.5 w-52 rounded bg-neutral-200"></div>
                    </div>
                    <div class="h-9 w-20 rounded-lg bg-violet-600"></div>
                  </div>
                  <div class="grid gap-3">
                    <div class="rounded-lg border border-neutral-200 bg-white p-3">
                      <div class="h-3 w-36 rounded bg-neutral-700"></div>
                      <div class="mt-3 h-2.5 w-full rounded bg-neutral-200"></div>
                    </div>
                    <div class="rounded-lg border border-neutral-200 bg-white p-3">
                      <div class="h-3 w-28 rounded bg-neutral-700"></div>
                      <div class="mt-3 h-2.5 w-2/3 rounded bg-neutral-200"></div>
                    </div>
                    <div class="rounded-lg border border-neutral-200 bg-white p-3">
                      <div class="h-3 w-40 rounded bg-neutral-700"></div>
                      <div class="mt-3 h-2.5 w-5/6 rounded bg-neutral-200"></div>
                    </div>
                  </div>
                </div>
              </div>
            {:else}
              <div class="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p class="text-xs font-bold uppercase tracking-wide text-amber-700">Last week's invoices</p>
                  <p class="mt-1 text-sm text-ink-muted">Pulled from your files into a structured view you can scan and verify.</p>
                </div>
                <span class="rounded-md bg-neutral-100 px-2 py-1 font-mono text-[11px] text-ink-muted">4 rows</span>
              </div>
              <div class="overflow-hidden rounded-lg border border-neutral-200">
                <table class="w-full text-left text-sm">
                  <thead class="bg-neutral-50 text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th class="px-4 py-2.5">Invoice</th>
                      <th class="px-4 py-2.5">Client</th>
                      <th class="px-4 py-2.5">Amount</th>
                      <th class="px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-neutral-200 text-ink">
                    <tr>
                      <td class="px-4 py-2.5 font-mono text-xs text-ink-muted">INV-1042</td>
                      <td class="px-4 py-2.5">Northwind</td>
                      <td class="px-4 py-2.5 font-semibold">$4,200</td>
                      <td class="px-4 py-2.5"><span class="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Paid</span></td>
                    </tr>
                    <tr>
                      <td class="px-4 py-2.5 font-mono text-xs text-ink-muted">INV-1043</td>
                      <td class="px-4 py-2.5">Acme Co.</td>
                      <td class="px-4 py-2.5 font-semibold">$1,850</td>
                      <td class="px-4 py-2.5"><span class="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">Pending</span></td>
                    </tr>
                    <tr>
                      <td class="px-4 py-2.5 font-mono text-xs text-ink-muted">INV-1044</td>
                      <td class="px-4 py-2.5">Globex</td>
                      <td class="px-4 py-2.5 font-semibold">$3,600</td>
                      <td class="px-4 py-2.5"><span class="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Paid</span></td>
                    </tr>
                    <tr>
                      <td class="px-4 py-2.5 font-mono text-xs text-ink-muted">INV-1045</td>
                      <td class="px-4 py-2.5">Initech</td>
                      <td class="px-4 py-2.5 font-semibold">$920</td>
                      <td class="px-4 py-2.5"><span class="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">Overdue</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ─── FINAL CTA ─── -->
  <div class="bg-navy-900 px-5 py-24 text-center sm:px-8">
    <div class="mx-auto max-w-2xl">
      <h2 class="text-5xl font-black tracking-tight text-white sm:text-6xl">
        Stop waiting<br>
        <span class="italic text-blue-400">on the model.</span>
      </h2>
      <p class="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-navy-400">
        Keyboard-driven. Right-sized reasoning. Parallel threads. Instant thread jumps. Visual answers.
        Free desktop app, your own keys.
      </p>
      <div class="mt-10 flex flex-wrap items-center justify-center gap-4">
        <a href="/downloads" class="rounded-xl bg-blue-600 px-8 py-4 text-sm font-bold text-white transition hover:bg-blue-500">
          Download free →
        </a>
        <a href="/downloads#beta" class="rounded-xl border border-navy-700 px-8 py-4 text-sm font-semibold text-navy-400 transition hover:border-navy-600 hover:text-navy-300">
          Join beta
        </a>
      </div>
      <p class="mt-6 text-xs text-navy-700">Free desktop app · Bring your own keys · Mac, Windows, Linux</p>
    </div>
  </div>

</section>
