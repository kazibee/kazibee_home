<script>
  import SeoHead from '../../component/seo_head.svelte';
</script>

<SeoHead
  title="Kazibee for Developers"
  path="/developers"
  description="Build deterministic TypeScript plugins for Kazibee so AI models can call your tools, APIs, and workflows through bounded interfaces."
/>

<section>

  <!-- HERO -->
  <div class="bg-navy-950 px-5 pt-24 pb-20 sm:px-8" data-test-id="dev-hero">
    <div class="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-center">
      <div>
        <div class="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-600/30 bg-blue-600/10 px-4 py-1.5">
          <span class="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
          <span class="text-xs font-semibold tracking-widest text-blue-300 uppercase">For Developers</span>
        </div>
        <h1 class="text-5xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-[4rem]">
          Trust developers to make AI useful.
        </h1>
        <p class="mt-6 max-w-2xl text-lg leading-relaxed text-navy-300 sm:text-xl">
          Kazibee lets developers add deterministic TypeScript tool calls to the models teams already use. AI adapts to intent, timing, and context. Your code defines exactly what happens.
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          <a href="/docs/quick-start" class="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-500">
            Build a plugin
          </a>
          <a href="/technical-details" class="rounded-xl border border-navy-700 px-6 py-3 text-sm font-semibold text-navy-300 transition hover:border-navy-600 hover:text-white">
            See the boundary
          </a>
        </div>
      </div>

      <div class="overflow-hidden rounded-xl border border-[#1c2434]" style="background: #0d1117;" data-test-id="dev-hero-code">
        <div class="flex items-center justify-between border-b border-[#1c2434] px-4 py-2.5" style="background: #0b0f19;">
          <span class="font-mono text-xs text-[#6b7280]">aws-logs/src/index.ts</span>
          <span class="rounded bg-[#10243d] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#60a5fa]">Typed tool</span>
        </div>
        <div class="space-y-1 p-5 font-mono text-xs leading-relaxed">
          <p><span class="text-purple-400">export default function</span> <span class="text-blue-300">main</span><span class="text-neutral-400">() &#123;</span></p>
          <p class="pl-4"><span class="text-purple-400">return</span> <span class="text-neutral-400">&#123;</span></p>
          <p class="pl-8"><span class="text-blue-300">countErrorsByMinute</span><span class="text-neutral-400">(</span><span class="text-blue-300">input</span><span class="text-neutral-400">: &#123;</span></p>
          <p class="pl-12"><span class="text-blue-300">service</span><span class="text-neutral-400">:</span> <span class="text-green-300">'checkout' | 'billing' | 'api'</span><span class="text-neutral-400">;</span></p>
          <p class="pl-12"><span class="text-blue-300">windowMinutes</span><span class="text-neutral-400">:</span> <span class="text-green-300">15 | 30 | 60</span><span class="text-neutral-400">;</span></p>
          <p class="pl-12"><span class="text-blue-300">bucketMinutes</span><span class="text-neutral-400">:</span> <span class="text-green-300">1 | 5</span><span class="text-neutral-400">;</span></p>
          <p class="pl-8"><span class="text-neutral-400">&#125;) &#123;</span></p>
          <p class="pl-12"><span class="text-neutral-500">// Fixed log groups, redaction, and time limits.</span></p>
          <p class="pl-12"><span class="text-purple-400">return</span> <span class="text-blue-300">cloudWatch</span><span class="text-neutral-400">.</span><span class="text-blue-300">countErrors</span><span class="text-neutral-400">(</span><span class="text-blue-300">input</span><span class="text-neutral-400">);</span></p>
          <p class="pl-8"><span class="text-neutral-400">&#125;</span></p>
          <p class="pl-4"><span class="text-neutral-400">&#125;;</span></p>
          <p><span class="text-neutral-400">&#125;</span></p>
        </div>
        <div class="border-t border-[#1c2434] p-4" style="background: #0b0f19;">
          <p class="text-xs font-semibold text-[#e5e7eb]">The model can call <span class="font-mono text-[#60a5fa]">countErrorsByMinute</span>.</p>
          <p class="mt-1 text-xs leading-relaxed text-[#6b7280]">It gets structured counts for a chart, not open-ended AWS access.</p>
        </div>
      </div>
    </div>
  </div>

  <!-- PRINCIPLE -->
  <div class="bg-white px-5 py-20 sm:px-8" data-test-id="dev-principle">
    <div class="mx-auto max-w-5xl">
      <div class="max-w-3xl">
        <p class="mb-4 text-xs font-bold uppercase tracking-widest text-blue-600">The platform bet</p>
        <h2 class="text-4xl font-black tracking-tight text-ink sm:text-5xl">
          Useful platforms are improved by the developers solving real problems.
        </h2>
        <p class="mt-5 text-lg leading-relaxed text-ink-muted">
          A platform cannot predict every workflow, internal API, data source, or edge case. Developers can. Kazibee is extensible because the best AI capabilities will come from people building against their own constraints.
        </p>
      </div>

      <div class="mt-10 grid gap-4 sm:grid-cols-3">
        <div class="rounded-xl border border-neutral-200 bg-neutral-50 p-6">
          <p class="text-sm font-black uppercase tracking-wide text-ink">Real systems</p>
          <p class="mt-3 text-sm leading-relaxed text-ink-muted">Connect models to the APIs, databases, queues, files, and services your work already depends on.</p>
        </div>
        <div class="rounded-xl border border-neutral-200 bg-neutral-50 p-6">
          <p class="text-sm font-black uppercase tracking-wide text-ink">Real constraints</p>
          <p class="mt-3 text-sm leading-relaxed text-ink-muted">Keep validation, permissions, formatting, and business rules in code you can review and test.</p>
        </div>
        <div class="rounded-xl border border-neutral-200 bg-neutral-50 p-6">
          <p class="text-sm font-black uppercase tracking-wide text-ink">Real leverage</p>
          <p class="mt-3 text-sm leading-relaxed text-ink-muted">Add capabilities to the models your team already uses instead of rebuilding the whole AI stack.</p>
        </div>
      </div>
    </div>
  </div>

  <!-- ADAPTIVE + DETERMINISTIC -->
  <div class="bg-navy-50 px-5 py-20 sm:px-8" data-test-id="dev-adaptive-deterministic">
    <div class="mx-auto max-w-5xl">
      <div class="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div>
          <p class="mb-4 text-xs font-bold uppercase tracking-widest text-blue-600">AI adapts. Code guarantees.</p>
          <h2 class="text-4xl font-black tracking-tight text-ink sm:text-5xl">
            Let the model choose the moment. Let TypeScript do the work.
          </h2>
          <p class="mt-5 text-lg leading-relaxed text-ink-muted">
            AI is valuable because it can understand intent, gather the right data, and decide when a tool is useful. Deterministic code is valuable because it runs the same way every time. Kazibee connects those strengths through typed contracts.
          </p>
        </div>

        <div class="overflow-hidden rounded-xl border border-[#1c2434]" style="background: #0d1117;" data-test-id="dev-logs-flow">
          <div class="border-b border-[#1c2434] px-4 py-2.5" style="background: #0b0f19;">
            <span class="text-xs font-bold uppercase tracking-wide text-[#60a5fa]">Example flow</span>
          </div>
          <div class="space-y-4 p-5">
            <div class="rounded-lg border border-[#24304a] bg-[#101827] p-4">
              <p class="text-xs font-bold uppercase tracking-wide text-[#6b7280]">User asks</p>
              <p class="mt-2 text-sm leading-relaxed text-[#e5e7eb]">Checkout started failing for some users. Look at the last hour of production logs and tell me what changed.</p>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="rounded-lg border border-[#24304a] bg-[#101827] p-4">
                <p class="text-xs font-bold uppercase tracking-wide text-[#60a5fa]">AI adapts</p>
                <p class="mt-2 text-sm leading-relaxed text-[#9ca3af]">Maps checkout to the right service, chooses a safe time window, then asks for error counts by minute.</p>
              </div>
              <div class="rounded-lg border border-[#24304a] bg-[#101827] p-4">
                <p class="text-xs font-bold uppercase tracking-wide text-[#22c55e]">Code guarantees</p>
                <p class="mt-2 text-sm leading-relaxed text-[#9ca3af]">The AWS plugin controls log access. The chart tool turns the returned counts into a repeatable interface.</p>
              </div>
            </div>
            <div class="rounded-lg border border-[#24304a] bg-[#0b0f19] p-4 font-mono text-xs">
              <p><span class="text-purple-400">const</span> <span class="text-blue-300">series</span> <span class="text-pink-400">=</span> <span class="text-purple-400">await</span> <span class="text-blue-300">tools</span><span class="text-neutral-400">[</span><span class="text-green-300">"aws-logs"</span><span class="text-neutral-400">].</span><span class="text-blue-300">countErrorsByMinute</span><span class="text-neutral-400">(&#123;</span></p>
              <p class="pl-4"><span class="text-blue-300">service</span><span class="text-neutral-400">:</span> <span class="text-green-300">"checkout"</span><span class="text-neutral-400">,</span></p>
              <p class="pl-4"><span class="text-blue-300">windowMinutes</span><span class="text-neutral-400">:</span> <span class="text-amber-300">60</span><span class="text-neutral-400">,</span> <span class="text-blue-300">bucketMinutes</span><span class="text-neutral-400">:</span> <span class="text-amber-300">5</span></p>
              <p><span class="text-neutral-400">&#125;);</span></p>
              <p class="mt-2"><span class="text-purple-400">return await</span> <span class="text-blue-300">tools</span><span class="text-neutral-400">[</span><span class="text-green-300">"chartjs"</span><span class="text-neutral-400">].</span><span class="text-blue-300">lineChart</span><span class="text-neutral-400">(&#123;</span></p>
              <p class="pl-4"><span class="text-blue-300">title</span><span class="text-neutral-400">:</span> <span class="text-green-300">"Checkout errors, last hour"</span><span class="text-neutral-400">,</span></p>
              <p class="pl-4"><span class="text-blue-300">labels</span><span class="text-neutral-400">:</span> <span class="text-blue-300">series</span><span class="text-neutral-400">.</span><span class="text-blue-300">labels</span><span class="text-neutral-400">,</span> <span class="text-blue-300">values</span><span class="text-neutral-400">:</span> <span class="text-blue-300">series</span><span class="text-neutral-400">.</span><span class="text-blue-300">counts</span></p>
              <p><span class="text-neutral-400">&#125;);</span></p>
            </div>
            <div class="rounded-lg border border-[#24304a] bg-[#101827] p-4">
              <div class="mb-3 flex items-center justify-between">
                <p class="text-xs font-bold uppercase tracking-wide text-[#60a5fa]">Chart.js output</p>
                <span class="text-[10px] text-[#6b7280]">errors / 5 min</span>
              </div>
              <svg viewBox="0 0 360 150" class="h-40 w-full" role="img" aria-label="Checkout error count line chart">
                <line x1="24" y1="128" x2="340" y2="128" stroke="#24304a" stroke-width="1" />
                <line x1="24" y1="20" x2="24" y2="128" stroke="#24304a" stroke-width="1" />
                <polyline points="24,116 54,111 84,104 114,96 144,84 174,40 204,54 234,76 264,92 294,101 324,108" fill="none" stroke="#60a5fa" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M24 116 L54 111 L84 104 L114 96 L144 84 L174 40 L204 54 L234 76 L264 92 L294 101 L324 108 L324 128 L24 128 Z" fill="#60a5fa" opacity="0.16" />
                {#each [
                  [24, 116],
                  [54, 111],
                  [84, 104],
                  [114, 96],
                  [144, 84],
                  [174, 40],
                  [204, 54],
                  [234, 76],
                  [264, 92],
                  [294, 101],
                  [324, 108],
                ] as point (point[0])}
                  <circle cx={point[0]} cy={point[1]} r="4" fill="#0d1117" stroke="#60a5fa" stroke-width="3" />
                {/each}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- CONTRACTS -->
  <div class="bg-white px-5 py-20 sm:px-8" data-test-id="dev-contracts">
    <div class="mx-auto max-w-5xl">
      <div class="mb-12 max-w-3xl">
        <p class="mb-4 text-xs font-bold uppercase tracking-widest text-blue-600">Bounded by design</p>
        <h2 class="text-4xl font-black tracking-tight text-ink sm:text-5xl">
          Extensible does not mean uncontrolled.
        </h2>
        <p class="mt-5 text-lg leading-relaxed text-ink-muted">
          Plugins are locked to the contracts developers provide. The model sees callable methods with declared inputs and outputs, not arbitrary access to the machine.
        </p>
      </div>

      <div class="grid gap-5 lg:grid-cols-3">
        <article class="rounded-xl border border-neutral-200 bg-neutral-50 p-6" data-test-id="contract-typed">
          <p class="text-sm font-black uppercase tracking-wide text-ink">Typed interface</p>
          <p class="mt-3 text-sm leading-relaxed text-ink-muted">Each tool exposes named methods. The shape is inspectable before the model calls it.</p>
        </article>
        <article class="rounded-xl border border-neutral-200 bg-neutral-50 p-6" data-test-id="contract-bounded">
          <p class="text-sm font-black uppercase tracking-wide text-ink">Bounded access</p>
          <p class="mt-3 text-sm leading-relaxed text-ink-muted">If a capability is not on the approved interface, it is not available to the model.</p>
        </article>
        <article class="rounded-xl border border-neutral-200 bg-neutral-50 p-6" data-test-id="contract-reviewable">
          <p class="text-sm font-black uppercase tracking-wide text-ink">Reviewable behavior</p>
          <p class="mt-3 text-sm leading-relaxed text-ink-muted">The risky parts stay in normal TypeScript: versioned, tested, reviewed, and owned by developers.</p>
        </article>
      </div>
    </div>
  </div>

  <!-- CLI LOOP -->
  <div class="bg-navy-50 px-5 py-20 sm:px-8" data-test-id="dev-cli-loop">
    <div class="mx-auto max-w-5xl">
      <div class="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div>
          <p class="mb-4 text-xs font-bold uppercase tracking-widest text-blue-600">The developer loop</p>
          <h2 class="text-4xl font-black tracking-tight text-ink sm:text-5xl">
            The contract is visible before anything runs.
          </h2>
          <p class="mt-5 text-lg leading-relaxed text-ink-muted">
            Kazibee's CLI is built around understanding first. Link or install a plugin, inspect its TypeScript interface, read its usage notes, then execute only against the tools that were exposed.
          </p>
        </div>

        <div class="overflow-hidden rounded-xl border border-[#1c2434]" style="background: #0d1117;" data-test-id="dev-cli-commands">
          <div class="border-b border-[#1c2434] px-4 py-2.5" style="background: #0b0f19;">
            <span class="font-mono text-xs text-[#6b7280]">terminal</span>
          </div>
          <div class="space-y-5 p-5 font-mono text-xs leading-relaxed">
            <div>
              <p class="text-[#6b7280]"># 1. Add a local TypeScript plugin during development</p>
              <p><span class="text-cyan-400">kazibee</span> <span class="text-green-400">link</span> <span class="text-amber-300">aws-logs</span> <span class="text-purple-300">./aws-logs</span></p>
            </div>
            <div>
              <p class="text-[#6b7280]"># 2. Inspect the exact interface the model can call</p>
              <p><span class="text-cyan-400">kazibee</span> <span class="text-green-400">show</span> <span class="text-amber-300">aws-logs</span></p>
            </div>
            <div>
              <p class="text-[#6b7280]"># 3. Read tool-specific instructions before using it</p>
              <p><span class="text-cyan-400">kazibee</span> <span class="text-green-400">llm</span> <span class="text-amber-300">aws-logs</span></p>
            </div>
            <div>
              <p class="text-[#6b7280]"># 4. Execute against the approved tool surface</p>
              <p><span class="text-white">echo</span> <span class="text-green-300">'return await tools["aws-logs"].countErrorsByMinute(input)'</span> <span class="text-neutral-500">|</span> <span class="text-cyan-400">kazibee</span> <span class="text-green-400">exec</span></p>
            </div>
          </div>
          <div class="border-t border-[#1c2434] p-4" style="background: #0b0f19;">
            <p class="text-xs leading-relaxed text-[#9ca3af]">
              Plugins can also expose their own setup commands, like <span class="font-mono text-[#60a5fa]">kazibee gmail login</span>, while model-facing calls stay inside <span class="font-mono text-[#60a5fa]">tools["plugin"].method(...)</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- SECOND EXAMPLE -->
  <div class="bg-white px-5 py-20 sm:px-8" data-test-id="dev-issue-graph">
    <div class="mx-auto max-w-5xl">
      <div class="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <p class="mb-4 text-xs font-bold uppercase tracking-widest text-blue-600">From question to interface</p>
          <h2 class="text-4xl font-black tracking-tight text-ink sm:text-5xl">
            Ask for a trend. Get a real chart.
          </h2>
          <p class="mt-5 text-lg leading-relaxed text-ink-muted">
            A model can turn “are production bugs getting worse?” into the right query. The issue plugin returns counts. The Chart.js plugin renders the result as an interface people can read.
          </p>
          <div class="mt-8 space-y-4">
            <div class="flex gap-4">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 font-mono text-xs font-black text-white">1</div>
              <div>
                <p class="font-bold text-ink">AI chooses the query</p>
                <p class="mt-1 text-sm leading-relaxed text-ink-muted">It maps “production bugs” to the tracker label, date range, and weekly grouping.</p>
              </div>
            </div>
            <div class="flex gap-4">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 font-mono text-xs font-black text-white">2</div>
              <div>
                <p class="font-bold text-ink">TypeScript returns counts</p>
                <p class="mt-1 text-sm leading-relaxed text-ink-muted">The plugin controls which tracker, fields, labels, and date windows can be queried.</p>
              </div>
            </div>
            <div class="flex gap-4">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 font-mono text-xs font-black text-white">3</div>
              <div>
                <p class="font-bold text-ink">Chart.js renders the answer</p>
                <p class="mt-1 text-sm leading-relaxed text-ink-muted">The chart is deterministic output from structured data, not a generated drawing.</p>
              </div>
            </div>
          </div>
        </div>

        <div class="overflow-hidden rounded-xl border border-[#1c2434]" style="background: #0d1117;">
          <div class="border-b border-[#1c2434] px-4 py-2.5" style="background: #0b0f19;">
            <span class="text-xs font-bold uppercase tracking-wide text-[#60a5fa]">Production bugs by week</span>
          </div>
          <div class="space-y-4 p-5">
            <div class="rounded-lg border border-[#24304a] bg-[#101827] p-4">
              <p class="text-xs font-bold uppercase tracking-wide text-[#6b7280]">User asks</p>
              <p class="mt-2 text-sm leading-relaxed text-[#e5e7eb]">Are production bugs getting better or worse this quarter?</p>
            </div>
            <div class="rounded-lg border border-[#24304a] bg-[#0b0f19] p-4 font-mono text-xs">
              <p><span class="text-purple-400">const</span> <span class="text-blue-300">issues</span> <span class="text-pink-400">=</span> <span class="text-purple-400">await</span> <span class="text-blue-300">tools</span><span class="text-neutral-400">[</span><span class="text-green-300">"issue-metrics"</span><span class="text-neutral-400">].</span><span class="text-blue-300">countIssues</span><span class="text-neutral-400">(&#123;</span></p>
              <p class="pl-4"><span class="text-blue-300">label</span><span class="text-neutral-400">:</span> <span class="text-green-300">"production"</span><span class="text-neutral-400">,</span></p>
              <p class="pl-4"><span class="text-blue-300">groupBy</span><span class="text-neutral-400">:</span> <span class="text-green-300">"week"</span><span class="text-neutral-400">,</span> <span class="text-blue-300">range</span><span class="text-neutral-400">:</span> <span class="text-green-300">"quarter"</span></p>
              <p><span class="text-neutral-400">&#125;);</span></p>
              <p class="mt-2"><span class="text-purple-400">return await</span> <span class="text-blue-300">tools</span><span class="text-neutral-400">[</span><span class="text-green-300">"chartjs"</span><span class="text-neutral-400">].</span><span class="text-blue-300">barChart</span><span class="text-neutral-400">(</span><span class="text-blue-300">issues</span><span class="text-neutral-400">);</span></p>
            </div>
            <div class="rounded-lg border border-[#24304a] bg-[#101827] p-5">
              <div class="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p class="text-sm font-bold text-[#e5e7eb]">Production bugs opened</p>
                  <p class="mt-1 text-xs text-[#6b7280]">Grouped weekly from issue tracker results</p>
                </div>
                <span class="rounded bg-[#10243d] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#60a5fa]">Chart.js</span>
              </div>
              <div class="grid h-44 grid-cols-8 items-end gap-3 border-b border-l border-[#24304a] px-3 pt-4">
                {#each [
                  { label: 'W1', value: 18, height: 56 },
                  { label: 'W2', value: 27, height: 84 },
                  { label: 'W3', value: 22, height: 68 },
                  { label: 'W4', value: 36, height: 112 },
                  { label: 'W5', value: 31, height: 96 },
                  { label: 'W6', value: 21, height: 65 },
                  { label: 'W7', value: 16, height: 50 },
                  { label: 'W8', value: 24, height: 74 },
                ] as bar (bar.label)}
                  <div class="flex min-w-0 flex-col items-center justify-end gap-2">
                    <span class="text-[10px] font-bold text-[#cbd5e1]">{bar.value}</span>
                    <div class="w-full rounded-t bg-[#60a5fa]" style="height: {bar.height}px; min-width: 18px;"></div>
                  </div>
                {/each}
              </div>
              <div class="grid grid-cols-8 gap-3 px-3 pt-2">
                {#each ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'] as week (week)}
                  <span class="text-center text-[10px] text-[#6b7280]">{week}</span>
                {/each}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- HOW IT WORKS -->
  <div class="bg-navy-900 px-5 py-20 sm:px-8" data-test-id="dev-how-it-works">
    <div class="mx-auto max-w-5xl">
      <div class="mb-12 text-center">
        <p class="mb-4 text-xs font-bold uppercase tracking-widest text-blue-300">How it works</p>
        <h2 class="text-4xl font-black tracking-tight text-white sm:text-5xl">A small TypeScript surface. A big capability jump.</h2>
      </div>

      <div class="grid gap-5 lg:grid-cols-3">
        {#each [
          {
            step: '1',
            title: 'Write the tool',
            body: 'Use TypeScript to implement the deterministic behavior: query a system, render a chart, validate data, update a record, or run a workflow.'
          },
          {
            step: '2',
            title: 'Expose the contract',
            body: 'Kazibee discovers the methods and gives the model the interface you approved. The contract is the boundary.'
          },
          {
            step: '3',
            title: 'Let AI route the work',
            body: 'The model reads the request, decides when the tool is useful, passes structured input, and uses the result in the conversation.'
          }
        ] as item (item.step)}
          <article class="rounded-xl border border-navy-700 bg-navy-800 p-6">
            <div class="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 font-mono text-sm font-black text-white">{item.step}</div>
            <h3 class="text-xl font-black text-white">{item.title}</h3>
            <p class="mt-3 text-sm leading-relaxed text-navy-300">{item.body}</p>
          </article>
        {/each}
      </div>
    </div>
  </div>

  <!-- WORKSPACE CONTEXT -->
  <div class="bg-white px-5 py-20 sm:px-8" data-test-id="dev-workspace-context">
    <div class="mx-auto max-w-5xl">
      <div class="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p class="mb-4 text-xs font-bold uppercase tracking-widest text-blue-600">Built into the workspace</p>
          <h2 class="text-4xl font-black tracking-tight text-ink sm:text-5xl">
            Extensions meet the models you already use every day.
          </h2>
          <p class="mt-5 text-lg leading-relaxed text-ink-muted">
            Kazibee still gives developers the workspace basics: named threads, worktrees, project context, and model switching. Plugins add the missing piece: your own capabilities inside those same conversations.
          </p>
        </div>

        <div class="grid gap-4 sm:grid-cols-3">
          <div class="rounded-xl border border-neutral-200 bg-neutral-50 p-5">
            <p class="text-lg font-black text-ink">Threads</p>
            <p class="mt-2 text-sm leading-relaxed text-ink-muted">Keep context organized around real work.</p>
          </div>
          <div class="rounded-xl border border-neutral-200 bg-neutral-50 p-5">
            <p class="text-lg font-black text-ink">Worktrees</p>
            <p class="mt-2 text-sm leading-relaxed text-ink-muted">Bind AI context to the branch you are editing.</p>
          </div>
          <div class="rounded-xl border border-neutral-200 bg-neutral-50 p-5">
            <p class="text-lg font-black text-ink">Models</p>
            <p class="mt-2 text-sm leading-relaxed text-ink-muted">Use Claude, Codex, Gemini, and more against the same tools.</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- CTA -->
  <div class="bg-navy-950 px-5 py-24 text-center sm:px-8" data-test-id="dev-cta">
    <div class="mx-auto max-w-2xl">
      <h2 class="text-5xl font-black tracking-tight text-white">
        Give AI reliable capabilities.
      </h2>
      <p class="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-navy-300">
        Build deterministic TypeScript tools, expose only the contract you trust, and let adaptive models call them at the right moment.
      </p>
      <div class="mt-10 flex flex-wrap items-center justify-center gap-4">
        <a href="/docs/quick-start" class="rounded-xl bg-blue-600 px-8 py-4 text-sm font-bold text-white transition hover:bg-blue-500">
          Start with TypeScript
        </a>
        <a href="/downloads" class="rounded-xl border border-navy-700 px-8 py-4 text-sm font-semibold text-navy-300 transition hover:border-navy-600 hover:text-white">
          Download Kazibee
        </a>
      </div>
      <p class="mt-6 text-xs text-navy-700">Free desktop app. Bring your own keys. Plugins are bounded by the interfaces you define.</p>
    </div>
  </div>

</section>
