<script>
  let activeVisualPreview = 'diagram';
</script>

<section>

  <!-- ─── HERO ─── -->
  <div class="bg-navy-900 px-5 pt-24 pb-20 text-center sm:px-8">
    <div class="mx-auto max-w-3xl">
      <div class="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-600/30 bg-blue-600/10 px-4 py-1.5">
        <span class="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
        <span class="text-xs font-semibold tracking-widest text-blue-300 uppercase">Visual AI workspace</span>
      </div>

      <h1 class="mt-2 text-5xl font-black leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-7xl">
        AI that can show,<br>
        <span class="italic text-blue-400">not just tell.</span>
      </h1>

      <p class="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-navy-400 sm:text-xl">
        Kazibee helps you understand work through the format that fits: diagrams, charts,
        interface previews, files, and written explanations. Review ideas visually, then act
        when you're ready.
      </p>

      <div class="mt-10 flex flex-wrap items-center justify-center gap-4">
        <a href="/downloads" class="rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-blue-500">
          Download free →
        </a>
        <a href="#examples" class="rounded-xl border border-navy-700 bg-navy-800 px-6 py-3.5 text-sm font-semibold text-navy-200 transition hover:border-navy-600">
          See examples
        </a>
      </div>

      <p class="mt-10 text-xs text-navy-400">Reuse Claude and Codex · Bring your own API keys · Mac, Windows, Linux</p>
    </div>
  </div>

  <!-- ─── VISUAL FEEDBACK ─── -->
  <div id="examples" class="bg-white px-5 py-20 sm:px-8">
    <div class="mx-auto max-w-6xl">
      <div class="mx-auto mb-12 max-w-3xl text-center">
        <p class="mb-4 text-xs font-bold uppercase tracking-widest text-blue-600">Before AI edits</p>
        <h2 class="text-4xl font-black tracking-tight text-ink sm:text-5xl">
          Get visual feedback<br>
          <span class="text-blue-600">without touching your workspace.</span>
        </h2>
        <p class="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-ink-muted">
          Type what you want to explore, review the idea visually, then ask Kazibee to
          implement it when you're ready.
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
            <p class="text-sm font-bold text-ink">The point is review.</p>
            <p class="mt-2 text-sm leading-relaxed text-ink-muted">
              The artifact gives you something concrete to critique before AI touches real files.
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

  <!-- ─── PLAN · PREVIEW · COMMIT ─── -->
  <div class="bg-navy-900 px-5 py-20 sm:px-8">
    <div class="mx-auto max-w-5xl">
      <div class="mb-14 text-center">
        <div class="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-600/30 bg-blue-600/10 px-4 py-1.5">
          <span class="text-xs font-semibold tracking-widest text-blue-300 uppercase">How Kazibee works</span>
        </div>
        <h2 class="text-4xl font-black tracking-tight text-white sm:text-5xl">
          Plan. Preview. <span class="text-blue-400">Then commit.</span>
        </h2>
        <p class="mx-auto mt-4 max-w-xl text-lg text-navy-400">
          Kazibee keeps your project context persistent and lets AI show you results before it touches anything.
          Discuss first, change only when you're ready.
        </p>
      </div>

      <div class="mb-6 grid gap-5 sm:grid-cols-2">
        <!-- Feature: persistent context -->
        <div class="rounded-2xl border border-navy-700 bg-navy-800 p-7 transition hover:border-blue-600/50 hover:blue-glow">
          <div class="mb-4 flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-600/30 bg-navy-900 text-xl">🗂️</div>
            <div>
              <h3 class="text-base font-bold text-white">Persistent project context</h3>
              <span class="text-xs font-bold uppercase tracking-wide text-blue-400">No more copy-pasting</span>
            </div>
          </div>
          <p class="text-sm leading-relaxed text-navy-400">
            Your project files, threads, and history live in Kazibee. Every model you use already knows
            your codebase. Start any conversation in context — no setup, no pasting, no re-explaining from scratch.
          </p>
        </div>

        <!-- Feature: preview without touching code -->
        <div class="rounded-2xl border border-navy-700 bg-navy-800 p-7 transition hover:border-blue-600/50 hover:blue-glow">
          <div class="mb-4 flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-600/30 bg-navy-900 text-xl">👁️</div>
            <div>
              <h3 class="text-base font-bold text-white">Preview without touching code</h3>
              <span class="text-xs font-bold uppercase tracking-wide text-blue-400">Your codebase stays clean</span>
            </div>
          </div>
          <p class="text-sm leading-relaxed text-navy-400">
            Ask AI to show you a new design, layout, or feature. Kazibee renders a live preview in the chat —
            you see exactly what it would look like. Discuss and refine before a single line of code changes.
          </p>
        </div>
      </div>

      <!-- Preview demo mockup — styled like the real Kazibee app -->
      <div class="overflow-hidden rounded-2xl border border-[#1c2434]" style="background: #0d1117;">
        <!-- macOS title bar -->
        <div class="flex items-center border-b border-[#1c2434] px-4 py-2.5" style="background: #0b0f19;">
          <div class="flex items-center gap-1.5">
            <span class="h-3 w-3 rounded-full bg-[#ff5f57]"></span>
            <span class="h-3 w-3 rounded-full bg-[#febc2e]"></span>
            <span class="h-3 w-3 rounded-full bg-[#28c840]"></span>
          </div>
          <span class="mx-auto text-xs text-[#4b5563]">landing page redesign</span>
          <span class="rounded bg-[#1c2434] px-2 py-0.5 text-[10px] font-bold text-blue-400">0 files changed</span>
        </div>
        <div class="flex" style="min-height: 280px;">
          <!-- Sidebar -->
          <div class="hidden w-56 shrink-0 border-r border-[#1c2434] p-3 sm:block" style="background: #0b0f19;">
            <div class="rounded-xl p-2.5" style="background: #131a2c; border: 1px solid #1c2434;">
              <div class="mb-2 flex items-center justify-between px-1.5">
                <div class="flex items-center gap-1.5">
                  <span class="text-[#9ca3af]">📁</span>
                  <span class="text-xs font-bold text-[#e5e7eb]">websites/kazibee</span>
                </div>
                <span class="text-[#6b7280]">+</span>
              </div>
              <div class="space-y-0.5">
                <div class="flex items-center justify-between rounded-lg px-2 py-1.5" style="background: #1a2338;">
                  <span class="text-xs font-medium text-[#e5e7eb]">landing redesign</span>
                  <span class="text-[10px] text-[#6b7280]">3m</span>
                </div>
                <div class="flex items-center justify-between px-2 py-1.5">
                  <span class="text-xs text-[#9ca3af]">hero copy</span>
                  <span class="text-[10px] text-[#4b5563]">1h</span>
                </div>
                <div class="flex items-center justify-between px-2 py-1.5">
                  <span class="text-xs text-[#9ca3af]">CTA test</span>
                  <span class="text-[10px] text-[#4b5563]">2h</span>
                </div>
              </div>
            </div>
          </div>
          <!-- Chat -->
          <div class="flex flex-1 flex-col gap-4 p-5">
            <div class="flex justify-end">
              <div class="max-w-sm rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-[#e5e7eb]" style="background: #1c2434;">
                Show me what the hero looks like with a blue gradient — don't change anything yet
              </div>
            </div>
            <div class="space-y-3">
              <p class="max-w-lg text-sm leading-relaxed text-[#9ca3af]">
                Here's the gradient hero — layout identical, just swapped the background.
                Let me know if you want to push it further before I touch any files.
              </p>
              <div class="max-w-xs overflow-hidden rounded-xl border border-blue-600/30 bg-gradient-to-br from-[#1e3a5f] to-blue-600 p-5">
                <p class="text-lg font-black leading-tight text-white">Every model. <span class="italic text-blue-200">One workspace.</span></p>
                <p class="mt-2 text-xs leading-relaxed text-blue-200">Claude, Codex, Gemini and every model you use — in one place.</p>
                <div class="mt-3">
                  <span class="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-blue-600">Download free →</span>
                </div>
              </div>
              <p class="text-[10px] font-bold uppercase tracking-wide text-[#4b5563]">Preview only · 0 files changed</p>
            </div>
            <div class="mt-auto flex justify-end">
              <div class="rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm font-semibold text-[#e5e7eb]" style="background: #1c2434;">
                Love it. Now apply it.
              </div>
            </div>
          </div>
        </div>
        <!-- Composer input -->
        <div class="border-t border-[#1c2434] p-3" style="background: #0b0f19;">
          <div class="rounded-2xl p-3" style="background: #0f1626; border: 1px solid #1c2434;">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-sm text-[#6b7280]">Send a message to start the conversation</p>
                <p class="mt-1 text-[10px] text-[#4b5563]">Shift + Enter for newline</p>
              </div>
              <button class="rounded-lg px-4 py-1.5 text-xs font-semibold text-[#9ca3af]" style="background: #1c2434;">Send</button>
            </div>
            <div class="mt-3 flex items-center gap-3 border-t border-[#1c2434] pt-3">
              <span class="text-xs font-bold text-[#60a5fa]">✦ Claude Opus 4.7 ⌄</span>
              <span class="text-[#1c2434]">|</span>
              <span class="text-xs text-[#9ca3af]">≋ Low ⌄</span>
              <span class="text-[#1c2434]">|</span>
              <span class="flex items-center gap-1.5 text-xs text-[#9ca3af]">🛡 Supervisor <span class="inline-block h-3 w-6 rounded-full" style="background:#1c2434;"></span></span>
              <span class="ml-auto flex items-center gap-2">
                <span class="flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold text-white" style="background: linear-gradient(135deg,#f59e0b,#ea580c);">94<span class="text-[6px]">%</span></span>
                <span class="text-[#1c2434]">|</span>
                <span class="text-xs text-[#9ca3af]">🔒 Standard</span>
                <span class="text-[#3b82f6]">✓</span>
              </span>
            </div>
            <div class="mt-2 flex items-center justify-between border-t border-[#1c2434] pt-2">
              <span class="font-mono text-[10px] text-[#6b7280]">📁 ~/dev/noego_manager/websites/kazibee</span>
              <span class="flex items-center gap-2 text-[10px] text-[#6b7280]"><span>🌐</span><span>↳ main ⌄</span></span>
            </div>
          </div>
        </div>
      </div>
      <p class="mt-4 text-center text-sm text-navy-600">Discuss the idea. See the result. Apply only when you're sure.</p>
    </div>
  </div>

  <!-- ─── RIGHT MODEL · RIGHT JOB ─── -->
  <div class="bg-white px-5 py-20 sm:px-8">
    <div class="mx-auto max-w-5xl">
      <div class="mb-12 text-center">
        <p class="mb-4 text-xs font-bold uppercase tracking-widest text-blue-600">Multi-model</p>
        <h2 class="text-4xl font-black tracking-tight text-ink sm:text-5xl">
          No single model<br>
          <span class="text-blue-600">is best at everything.</span>
        </h2>
        <p class="mx-auto mt-4 max-w-lg text-lg text-ink-muted">
          The best model for a long brainstorm is not the best model for debugging.
          Switch to the right one without losing your place — your context comes with you.
        </p>
      </div>

      <div class="overflow-hidden rounded-2xl border border-navy-200">
        <div class="grid grid-cols-[1.6fr_1fr_1.8fr] border-b border-navy-100 bg-navy-50 px-5 py-3">
          <span class="text-xs font-bold uppercase tracking-wider text-ink-muted">You're doing</span>
          <span class="text-xs font-bold uppercase tracking-wider text-ink-muted">Reach for</span>
          <span class="text-xs font-bold uppercase tracking-wider text-ink-muted">Why</span>
        </div>
        {#each [
          { task: 'Debugging a hard bug', sub: 'Something just isn\'t working', model: 'Claude Opus', color: 'bg-blue-50 text-blue-600', why: 'Thinks step by step. Holds the full context of the problem.' },
          { task: 'Implementing a feature', sub: 'Write, run, and ship the code', model: 'Codex', color: 'bg-green-50 text-green-700', why: 'Agentic. Executes, iterates, and fixes without hand-holding.' },
          { task: 'Long brainstorm or planning', sub: 'Thinking through a big decision', model: 'Gemini 2.5 Pro', color: 'bg-purple-50 text-purple-700', why: 'Massive context window. Stays coherent across very long threads.' },
          { task: 'Quick back-and-forth', sub: 'Drafts, ideas, thinking out loud', model: 'Gemini Flash', color: 'bg-amber-50 text-amber-700', why: 'Sub-second responses. Feels like a conversation, not a query.' },
          { task: 'Sensitive or private work', sub: 'Nothing leaves your machine', model: 'Qwen · Llama', color: 'bg-navy-50 text-ink-muted border border-navy-200', why: 'Local inference. Air-gapped. Free to run.' },
        ] as row, i (row.task)}
          <div class="grid grid-cols-[1.6fr_1fr_1.8fr] items-center px-5 py-4 {i < 4 ? 'border-b border-navy-100' : ''}">
            <div>
              <p class="text-sm font-semibold text-ink">{row.task}</p>
              <p class="text-xs text-ink-muted">{row.sub}</p>
            </div>
            <span class="inline-block w-fit rounded-full px-3 py-1 text-xs font-bold {row.color}">{row.model}</span>
            <p class="text-sm text-ink-muted">{row.why}</p>
          </div>
        {/each}
      </div>
      <p class="mt-4 text-center text-sm text-ink-muted">Switch in the same thread. Your context comes with you.</p>
    </div>
  </div>

  <!-- ─── COMPARISON ─── -->
  <div class="bg-navy-50 px-5 py-20 sm:px-8">
    <div class="mx-auto max-w-3xl">
      <div class="mb-10 text-center">
        <h2 class="text-4xl font-black tracking-tight text-ink">The old way vs Kazibee.</h2>
        <p class="mt-3 text-lg text-ink-muted">Stop managing AI. Start working with it.</p>
      </div>
      <div class="grid gap-5 sm:grid-cols-2">
        <div class="rounded-2xl border border-red-200 bg-white p-7">
          <h3 class="mb-5 text-sm font-bold text-red-700">The fragmented AI workflow</h3>
          <ul class="space-y-3">
            {#each [
              'Paste files into every new chat',
              'Re-explain your project each session',
              'AI edits code before you approve it',
              '8 tabs, 8 logins, context lost on every switch',
              'Stay with the wrong model because switching hurts',
            ] as item (item)}
              <li class="flex items-start gap-2.5 text-sm text-ink-muted">
                <span class="mt-0.5 shrink-0 font-bold text-red-400">✗</span>
                {item}
              </li>
            {/each}
          </ul>
        </div>
        <div class="rounded-2xl border border-blue-200 bg-blue-50 p-7">
          <h3 class="mb-5 text-sm font-bold text-blue-700">Kazibee</h3>
          <ul class="space-y-3">
            {#each [
              'Project context is always there',
              'Pick up any thread where you left off',
              'Preview ideas before touching your codebase',
              'Every model in one window, context carries over',
              'Use the right model for the moment, frictionlessly',
            ] as item (item)}
              <li class="flex items-start gap-2.5 text-sm text-ink-muted">
                <span class="mt-0.5 shrink-0 font-bold text-blue-500">✓</span>
                {item}
              </li>
            {/each}
          </ul>
        </div>
      </div>
    </div>
  </div>

  <!-- ─── FINAL CTA ─── -->
  <div class="bg-navy-900 px-5 py-24 text-center sm:px-8">
    <div class="mx-auto max-w-2xl">
      <h2 class="text-5xl font-black tracking-tight text-white sm:text-6xl">
        Every model.<br>
        <span class="italic text-blue-400">One workspace.</span>
      </h2>
      <p class="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-navy-400">
        Persistent context. Live previews. Every model you use — all in one place,
        with your own keys, for free.
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
