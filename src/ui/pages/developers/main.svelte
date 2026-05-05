<section>

  <!-- ─── HERO ─── -->
  <div class="bg-navy-900 px-5 pt-24 pb-20 text-center sm:px-8" data-test-id="dev-hero">
    <div class="mx-auto max-w-3xl">
      <div class="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-600/30 bg-blue-600/10 px-4 py-1.5">
        <span class="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
        <span class="text-xs font-semibold tracking-widest text-blue-300 uppercase">For Developers</span>
      </div>
      <h1 class="mt-2 text-5xl font-black leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-[3.75rem]">
        You had 16 tabs open.<br>
        <span class="italic text-blue-400">You had no idea what was in any of them.</span>
      </h1>
      <p class="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-navy-400 sm:text-xl">
        Every terminal tab was a separate AI session. Scrolling up to find context.
        Forgetting which tab had the auth bug and which had the schema work.
        Copy-pasting the same project setup into every new conversation.
      </p>
      <p class="mx-auto mt-4 max-w-2xl text-lg font-semibold leading-relaxed text-navy-200 sm:text-xl">
        Kazibee is what Vim did for text editing — one fast, keyboard-first workspace that keeps everything in context.
      </p>
    </div>
  </div>

  <!-- ─── THE CONTRAST: BEFORE / AFTER ─── -->
  <div class="bg-navy-950 px-5 pb-20 sm:px-8" data-test-id="dev-contrast">
    <div class="mx-auto max-w-4xl">

      <!-- Terminal chaos -->
      <div class="mb-5 overflow-hidden rounded-xl border border-navy-800 bg-navy-900" data-test-id="chaos-mockup">
        <div class="flex items-center gap-1 overflow-hidden border-b border-navy-800 bg-navy-800 px-4 py-2">
          {#each ['auth bug','schema','api routes','deploy','env fix','migration','tests?','cache','types','docs','refactor','perf','review','???','help','claude'] as tab, i}
            <span class="shrink-0 max-w-[58px] overflow-hidden text-ellipsis whitespace-nowrap rounded-t px-2 py-1 text-[10px] {i === 2 ? 'bg-navy-900 text-navy-200' : 'bg-navy-700 text-navy-500'}">{tab}</span>
          {/each}
        </div>
        <div class="p-5 font-mono text-xs">
          <p class="mb-1 text-navy-600"># api routes — context: ???</p>
          <p class="text-navy-200">$ <span class="text-white">what was I doing here again?</span></p>
          <p class="mt-3 text-navy-600 italic">↑↑↑ scrolling up to find context... ↑↑↑</p>
          <p class="mt-1 text-navy-700">... 3 days ago you said: "here's my schema" [paste 200 lines] ...</p>
          <p class="text-navy-700">... then something about auth middleware ...</p>
          <p class="mt-3 text-red-400">You: wait was this the auth tab or the api tab</p>
        </div>
      </div>

      <!-- Divider -->
      <div class="my-5 flex items-center gap-4">
        <div class="h-px flex-1 bg-navy-800"></div>
        <span class="text-xs font-bold tracking-widest text-navy-600 uppercase">Kazibee</span>
        <div class="h-px flex-1 bg-navy-800"></div>
      </div>

      <!-- Kazibee clean — real app UI -->
      <div class="overflow-hidden rounded-xl border border-[#1c2434]" style="background: #0d1117;" data-test-id="kazibee-mockup">
        <div class="flex items-center border-b border-[#1c2434] px-4 py-2.5" style="background: #0b0f19;">
          <div class="flex items-center gap-1.5">
            <span class="h-3 w-3 rounded-full bg-[#ff5f57]"></span>
            <span class="h-3 w-3 rounded-full bg-[#febc2e]"></span>
            <span class="h-3 w-3 rounded-full bg-[#28c840]"></span>
          </div>
          <span class="mx-auto text-xs text-[#4b5563]">Kazibee</span>
        </div>
        <div class="flex" style="min-height: 210px;">
          <div class="hidden w-56 shrink-0 border-r border-[#1c2434] p-3 sm:block" style="background: #0b0f19;">
            <div class="rounded-xl p-2.5" style="background: #131a2c; border: 1px solid #1c2434;">
              <div class="mb-2 flex items-center justify-between px-1.5">
                <div class="flex items-center gap-1.5">
                  <span class="text-[#9ca3af]">📁</span>
                  <span class="text-xs font-bold text-[#e5e7eb]">kazibee-app</span>
                </div>
                <span class="text-[#6b7280]">+</span>
              </div>
              <div class="space-y-0.5">
                <div class="flex items-center justify-between rounded-lg px-2 py-1.5" style="background: #1a2338;">
                  <span class="text-xs font-medium text-[#e5e7eb]">api routes</span>
                  <span class="text-[10px] text-[#6b7280]">now</span>
                </div>
                <div class="flex items-center justify-between px-2 py-1.5">
                  <span class="text-xs text-[#9ca3af]">auth bug</span>
                  <span class="text-[10px] text-[#4b5563]">1h</span>
                </div>
                <div class="flex items-center justify-between px-2 py-1.5">
                  <span class="text-xs text-[#9ca3af]">schema work</span>
                  <span class="text-[10px] text-[#4b5563]">3h</span>
                </div>
                <div class="flex items-center justify-between px-2 py-1.5">
                  <span class="text-xs text-[#9ca3af]">deploy setup</span>
                  <span class="text-[10px] text-[#4b5563]">1d</span>
                </div>
              </div>
            </div>
          </div>
          <div class="flex flex-1 flex-col gap-3 p-5">
            <p class="text-sm leading-relaxed text-[#9ca3af]">
              Looking at your routes — the issue is middleware ordering.
              <code class="mx-1 rounded px-1.5 py-0.5 text-xs text-[#f59e0b]" style="background:#1c2434;">authMiddleware</code>
              needs to run before
              <code class="mx-1 rounded px-1.5 py-0.5 text-xs text-[#f59e0b]" style="background:#1c2434;">validateSchema</code>.
              Here's the fix:
            </p>
            <div class="mt-auto flex justify-end">
              <div class="rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-[#e5e7eb]" style="background: #1c2434;">
                apply it
              </div>
            </div>
          </div>
        </div>
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
              <span class="text-xs font-bold text-[#60a5fa]">✦ Claude Sonnet 4.6 ⌄</span>
              <span class="text-[#1c2434]">|</span>
              <span class="text-xs text-[#9ca3af]">≋ Low ⌄</span>
              <span class="text-[#1c2434]">|</span>
              <span class="flex items-center gap-1.5 text-xs text-[#9ca3af]">🛡 Supervisor <span class="inline-block h-3 w-6 rounded-full" style="background:#1c2434;"></span></span>
              <span class="ml-auto flex items-center gap-2">
                <span class="text-xs text-[#9ca3af]">🔒 Standard</span>
                <span class="text-[#3b82f6]">✓</span>
              </span>
            </div>
            <div class="mt-2 flex items-center justify-between border-t border-[#1c2434] pt-2">
              <span class="font-mono text-[10px] text-[#6b7280]">📁 ~/dev/kazibee-app</span>
              <span class="flex items-center gap-2 text-[10px] text-[#6b7280]"><span>🌐</span><span>↳ feature/auth-v2 ⌄</span></span>
            </div>
          </div>
        </div>
      </div>
      <p class="mt-4 text-center text-xs text-navy-600">4 named threads. 2 worktrees. One window. Full context in every session.</p>
    </div>
  </div>

  <!-- ─── KEYBOARD-FIRST ─── -->
  <div class="bg-white px-5 py-20 sm:px-8" data-test-id="dev-keyboard-first">
    <div class="mx-auto max-w-4xl text-center">
      <p class="mb-4 text-xs font-bold uppercase tracking-widest text-blue-600">Keyboard-first workspace</p>
      <h2 class="text-4xl font-black tracking-tight text-ink sm:text-5xl">
        The power of Vim.<br>In a graphical interface.
      </h2>
      <p class="mx-auto mt-4 max-w-xl text-lg text-ink-muted">
        Vim users don't open 16 files in separate terminals. They have buffers, splits, and a command palette.
        Kazibee is that — for AI workspaces.
      </p>
    </div>
  </div>

  <!-- ─── FEATURE: WORKTREES ─── -->
  <div class="bg-white px-5 pb-20 sm:px-8" data-test-id="dev-worktrees">
    <div class="mx-auto max-w-4xl">
      <div class="grid gap-12 sm:grid-cols-2 sm:items-center">
        <div>
          <div class="mb-4 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1">
            <span class="text-xs font-bold uppercase tracking-wide text-green-700">Worktrees</span>
          </div>
          <h3 class="mb-4 text-3xl font-black tracking-tight text-ink leading-tight">
            One AI thread per branch.<br>No context bleed.
          </h3>
          <p class="mb-6 text-base leading-relaxed text-ink-muted">
            Work on <code class="rounded bg-navy-100 px-1.5 py-0.5 text-xs">feature/auth-v2</code> and
            <code class="rounded bg-navy-100 px-1.5 py-0.5 text-xs">main</code> simultaneously.
            Each worktree gets its own AI session with the right codebase context.
            Switch branches in one keystroke — the AI switches with you.
          </p>
          <div class="space-y-3" data-test-id="worktree-shortcuts">
            {#each [
              ['⌘K', 'Open the worktree branch picker'],
            ] as [key, desc]}
              <div class="flex items-center gap-3">
                <kbd class="shrink-0 rounded border border-navy-700 bg-navy-900 px-2 py-1 font-mono text-xs font-bold text-navy-200">{key}</kbd>
                <span class="text-sm text-ink-muted">{desc}</span>
              </div>
            {/each}
          </div>
        </div>

        <!-- Worktree visual — real app style -->
        <div class="overflow-hidden rounded-xl border border-[#1c2434]" style="background: #0d1117;" data-test-id="worktree-visual">
          <div class="border-b border-[#1c2434] px-4 py-2.5" style="background: #0b0f19;">
            <span class="font-mono text-xs text-[#6b7280]">$ git worktree list</span>
          </div>
          <div class="space-y-2 p-3 font-mono text-xs">
            {#each [
              { branch: 'main', model: 'Claude Sonnet · schema thread', msgs: '5 messages · full context', bg: '#161d2b', border: '#1c2434', label: '#9ca3af', status: '#6b7280' },
              { branch: 'feature/auth-v2', model: 'Claude Sonnet · auth bug thread', msgs: '12 messages · full context ← active', bg: '#0a1628', border: '#1d3a5c', label: '#60a5fa', status: '#3b82f6' },
              { branch: 'hotfix/deploy-config', model: 'Codex · deploy thread', msgs: '3 messages · paused', bg: '#161d2b', border: '#1c2434', label: '#9ca3af', status: '#4b5563' },
            ] as wt}
              <div class="rounded-lg p-3" style="background: {wt.bg}; border: 1px solid {wt.border};">
                <p class="font-bold" style="color: {wt.label};">{wt.branch}</p>
                <p class="mt-0.5 text-[11px]" style="color: {wt.status};">{wt.model}</p>
                <p class="text-[11px]" style="color: {wt.status};">{wt.msgs}</p>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ─── FEATURE: WORKSPACES ─── -->
  <div class="bg-navy-50 px-5 py-20 sm:px-8" data-test-id="dev-workspaces">
    <div class="mx-auto max-w-4xl">
      <div class="grid gap-12 sm:grid-cols-2 sm:items-center">

        <!-- Workspace switcher visual — real app style -->
        <div class="overflow-hidden rounded-xl border border-[#1c2434] order-last sm:order-first" style="background: #0d1117;" data-test-id="workspace-visual">
          <div class="border-b border-[#1c2434] px-4 py-2.5 text-xs text-[#60a5fa]" style="background: #0b0f19;">Workspace switcher</div>
          <div class="space-y-1.5 p-3">
            {#each [
              { name: 'kazibee-app', active: true, threads: '4 threads' },
              { name: 'client-site', active: false, threads: '2 threads' },
              { name: 'data-pipeline', active: false, threads: '1 thread' },
              { name: '+ New workspace', active: false, threads: '' },
            ] as ws}
              <div class="flex items-center justify-between rounded-lg px-3 py-2.5 text-xs" style="background: {ws.active ? '#161d2b' : 'transparent'}; border: 1px solid {ws.active ? '#1d3a5c' : '#1c2434'};">
                <span style="color: {ws.active ? '#e5e7eb' : '#6b7280'}; font-weight: {ws.active ? '600' : '400'};">{ws.name}</span>
                {#if ws.threads}
                  <span style="color: #374151;">{ws.active ? 'active · ' : ''}{ws.threads}</span>
                {/if}
              </div>
            {/each}
          </div>
        </div>

        <div>
          <div class="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-1">
            <span class="text-xs font-bold uppercase tracking-wide text-purple-700">Workspaces</span>
          </div>
          <h3 class="mb-4 text-3xl font-black tracking-tight text-ink leading-tight">
            Switch projects in a keystroke.<br>Context intact.
          </h3>
          <p class="mb-6 text-base leading-relaxed text-ink-muted">
            Every project is a workspace with its own threads, files, and AI history.
            Jump between <code class="rounded bg-navy-100 px-1.5 py-0.5 text-xs">kazibee-app</code>,
            <code class="rounded bg-navy-100 px-1.5 py-0.5 text-xs">client-site</code>, and
            <code class="rounded bg-navy-100 px-1.5 py-0.5 text-xs">data-pipeline</code>
            without losing a single thread.
          </p>
          <div class="space-y-3" data-test-id="workspace-shortcuts">
            {#each [
              ['⌘↑', 'Previous thread in workspace'],
              ['⌘↓', 'Next thread in workspace'],
              ['⌘N', 'New thread in current workspace'],
            ] as [key, desc]}
              <div class="flex items-center gap-3">
                <kbd class="shrink-0 rounded border border-navy-700 bg-navy-900 px-2 py-1 font-mono text-xs font-bold text-navy-200">{key}</kbd>
                <span class="text-sm text-ink-muted">{desc}</span>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ─── FEATURE: MODEL SWITCHING ─── -->
  <div class="bg-white px-5 py-20 sm:px-8" data-test-id="dev-model-switching">
    <div class="mx-auto max-w-4xl">
      <div class="grid gap-12 sm:grid-cols-2 sm:items-center">
        <div>
          <div class="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1">
            <span class="text-xs font-bold uppercase tracking-wide text-blue-700">Model Switching</span>
          </div>
          <h3 class="mb-4 text-3xl font-black tracking-tight text-ink leading-tight">
            Swap models mid-thread.<br>Same context.
          </h3>
          <p class="mb-6 text-base leading-relaxed text-ink-muted">
            Start a debugging session with Claude Opus. Get a second opinion from Gemini.
            Run the fix with Codex. Never leave the thread, never re-explain your setup.
          </p>
          <div class="space-y-3" data-test-id="model-shortcuts">
            {#each [
              ['⌘/', 'Toggle the model palette'],
              ['⌃⌘→', 'Raise reasoning level'],
              ['⌃⌘←', 'Lower reasoning level'],
            ] as [key, desc]}
              <div class="flex items-center gap-3">
                <kbd class="shrink-0 rounded border border-navy-700 bg-navy-900 px-2 py-1 font-mono text-xs font-bold text-navy-200">{key}</kbd>
                <span class="text-sm text-ink-muted">{desc}</span>
              </div>
            {/each}
          </div>
        </div>

        <!-- Model switch visual — real app style -->
        <div class="overflow-hidden rounded-xl border border-[#1c2434] p-4 space-y-4" style="background: #0d1117;" data-test-id="model-switch-visual">
          {#each [
            { label: 'Claude Opus', labelBg: '#1e3a5f', labelColor: '#93c5fd', msg: 'The N+1 query is in getMembers(). Hitting the DB once per user — batch it.', note: '' },
            { label: 'Codex', labelBg: '#14532d', labelColor: '#86efac', msg: 'implementing the batch fix now', note: '↳ same thread — ' },
            { label: 'Gemini Pro', labelBg: '#2e1065', labelColor: '#c4b5fd', msg: "reviewed Codex's fix — looks good", note: '↳ same thread — ' },
          ] as item}
            <div class="flex items-start gap-3">
              <span class="mt-0.5 shrink-0 rounded px-2 py-0.5 text-[10px] font-bold" style="background: {item.labelBg}; color: {item.labelColor};">{item.label}</span>
              <span class="text-sm leading-relaxed text-[#9ca3af]">
                {#if item.note}<span class="text-[#22c55e]">{item.note}</span>{/if}{item.msg}
              </span>
            </div>
          {/each}
          <div class="border-t border-[#1c2434] pt-3 flex items-center gap-2">
            <span class="text-[#60a5fa]">⌘/</span>
            <span class="text-xs text-[#4b5563]">model palette · context preserved across all 3</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ─── KEYBOARD SHORTCUT REFERENCE ─── -->
  <div class="bg-navy-900 px-5 py-20 sm:px-8" data-test-id="dev-shortcuts">
    <div class="mx-auto max-w-4xl">
      <div class="mb-12 text-center">
        <h2 class="text-4xl font-black tracking-tight text-white">Everything on the keyboard.</h2>
        <p class="mt-3 text-lg text-navy-400">If it's worth doing, it has a shortcut.</p>
      </div>
      <div class="grid gap-4 sm:grid-cols-3">
        {#each [
          {
            group: 'Threads',
            color: 'text-blue-400',
            keys: [
              ['⌘N', 'New thread in current folder'],
              ['⌘↑', 'Previous thread'],
              ['⌘↓', 'Next thread'],
              ['⌘R', 'Rename active thread'],
              ['⌘D', 'Toggle thread completed'],
            ]
          },
          {
            group: 'Models',
            color: 'text-green-400',
            keys: [
              ['⌘/', 'Toggle model palette'],
              ['⌃⌘→', 'Raise reasoning level'],
              ['⌃⌘←', 'Lower reasoning level'],
              ['Esc', 'Cancel running stream'],
            ]
          },
          {
            group: 'Worktrees',
            color: 'text-purple-400',
            keys: [
              ['⌘K', 'Open worktree branch picker'],
            ]
          },
        ] as group}
          <div class="overflow-hidden rounded-xl border border-navy-700 bg-navy-800" data-test-id="shortcut-group-{group.group.toLowerCase()}">
            <div class="border-b border-navy-700 bg-navy-950 px-4 py-3">
              <span class="text-xs font-bold uppercase tracking-widest {group.color}">{group.group}</span>
            </div>
            <div class="space-y-3 p-4">
              {#each group.keys as [key, desc]}
                <div class="flex items-center gap-3">
                  <kbd class="shrink-0 rounded border px-2.5 py-1 font-mono text-xs font-bold" style="background:#1e293b;border-color:#475569;color:#f1f5f9;">{key}</kbd>
                  <span class="text-sm" style="color:#cbd5e1;">{desc}</span>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- ─── CTA ─── -->
  <div class="bg-navy-950 px-5 py-24 text-center sm:px-8" data-test-id="dev-cta">
    <div class="mx-auto max-w-xl">
      <h2 class="text-5xl font-black tracking-tight text-white">
        Close those tabs.<br>
        <span class="italic text-blue-400">You don't need them.</span>
      </h2>
      <p class="mx-auto mt-6 max-w-md text-lg leading-relaxed text-navy-400">
        Named threads. Persistent context. Worktrees. One keyboard-first workspace that keeps up with how you actually work.
      </p>
      <div class="mt-10 flex flex-wrap items-center justify-center gap-4">
        <a href="/downloads" class="rounded-xl bg-blue-600 px-8 py-4 text-sm font-bold text-white transition hover:bg-blue-500">
          Download free →
        </a>
        <a href="/docs" class="rounded-xl border border-navy-700 px-8 py-4 text-sm font-semibold text-navy-400 transition hover:border-navy-600 hover:text-navy-300">
          Read the docs
        </a>
      </div>
      <p class="mt-6 text-xs text-navy-700">Free desktop app · Bring your own keys · Mac, Windows, Linux</p>
    </div>
  </div>

</section>
