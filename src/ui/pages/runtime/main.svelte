<script lang="ts">
  import SeoHead from '../../component/seo_head.svelte';
  import TerminalFrame from '../../component/terminal_frame.svelte';
  import TerminalLine from '../../component/terminal_line.svelte';
</script>

<SeoHead
  title="Kazibee Runtime"
  path="/runtime"
  description="Understand how the Kazibee runtime validates generated code, loads plugin tools, manages permissions, and executes workflows safely."
/>

<section>
  <div class="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-20">
    <!-- Header -->
    <header class="mb-14" data-test-id="runtime-header">
      <h1 class="text-4xl font-black tracking-tight text-ink sm:text-5xl lg:text-6xl" data-test-id="runtime-title">
        The Kazibee Runtime
      </h1>
      <p class="mt-5 max-w-3xl text-lg leading-relaxed text-ink-muted" data-test-id="runtime-subtitle">
        This page covers what happens internally when code executes through Kazibee. Not how to build a plugin &mdash; but the execution model itself. How code is validated, how tools are loaded, and how the sandbox enforces boundaries.
      </p>
    </header>

    <!-- AI-Driven Execution -->
    <div class="mb-14" data-test-id="ai-driven-execution">
      <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-honey-600" data-test-id="ai-execution-label">AI-Driven Execution</p>
      <h2 class="mb-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">The AI writes the code. Kazibee runs it safely.</h2>
      <p class="mb-8 text-ink-muted max-w-2xl">An AI model decides when to use Kazibee, generates the code, and sends it for execution &mdash; all within a single conversation.</p>

      <div class="mb-6 space-y-4" data-test-id="ai-chat-mockup">
        <!-- User bubble -->
        <div class="flex justify-end" data-test-id="chat-user-bubble">
          <div class="max-w-md rounded-2xl border border-neutral-200 bg-white px-5 py-4">
            <p class="text-sm leading-relaxed text-ink">Can you check my latest emails and summarize them in a Google Sheet?</p>
          </div>
        </div>

        <!-- AI bubble -->
        <div class="flex justify-start" data-test-id="chat-ai-bubble">
          <div class="max-w-lg rounded-2xl border border-honey-200 bg-honey-50 px-5 py-4">
            <p class="text-sm leading-relaxed text-ink mb-3">I'll use Kazibee to read your Gmail and write to Google Sheets.</p>
            <div class="rounded-lg border border-neutral-800 bg-neutral-900 p-4 font-mono text-xs leading-6">
              <p><span class="text-purple-400">const</span> <span class="text-blue-300">emails</span> <span class="text-neutral-400">=</span> <span class="text-purple-400">await</span> <span class="text-amber-300">tools</span><span class="text-neutral-400">.</span><span class="text-blue-300">gmail</span><span class="text-neutral-400">.</span><span class="text-blue-300">getUnread</span><span class="text-neutral-400">(&#123;</span> <span class="text-blue-300">limit</span><span class="text-neutral-400">:</span> <span class="text-amber-300">10</span> <span class="text-neutral-400">&#125;);</span></p>
              <p><span class="text-purple-400">const</span> <span class="text-blue-300">rows</span> <span class="text-neutral-400">=</span> <span class="text-blue-300">emails</span><span class="text-neutral-400">.</span><span class="text-blue-300">map</span><span class="text-neutral-400">(</span><span class="text-amber-300">e</span> <span class="text-neutral-400">=&gt; [</span><span class="text-amber-300">e</span><span class="text-neutral-400">.</span><span class="text-blue-300">from</span><span class="text-neutral-400">,</span> <span class="text-amber-300">e</span><span class="text-neutral-400">.</span><span class="text-blue-300">subject</span><span class="text-neutral-400">,</span> <span class="text-amber-300">e</span><span class="text-neutral-400">.</span><span class="text-blue-300">date</span><span class="text-neutral-400">]);</span></p>
              <p><span class="text-purple-400">await</span> <span class="text-amber-300">tools</span><span class="text-neutral-400">.</span><span class="text-blue-300">sheets</span><span class="text-neutral-400">.</span><span class="text-blue-300">append</span><span class="text-neutral-400">(</span><span class="text-green-300">"Email Summary"</span><span class="text-neutral-400">,</span> <span class="text-blue-300">rows</span><span class="text-neutral-400">);</span></p>
            </div>
          </div>
        </div>
      </div>

      <TerminalFrame
        borderClass="border-neutral-700"
        panelBgClass="bg-[#0f1724]"
        shadowClass="shadow-[0_16px_36px_rgba(0,0,0,0.24)]"
        headerBorderClass="border-neutral-700/80"
        headerBgClass="bg-[#182235]"
        bodyClass="bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05),transparent_70%)] px-4 py-4"
        codeClass="block text-left font-mono text-sm leading-7 space-y-1.5"
      >
        <TerminalLine>
          <span class="text-green-300">echo</span> <span class="text-green-300">'const emails = await tools.gmail.getUnread(&#123; limit: 10 &#125;); ...'</span> <span class="text-neutral-400">|</span> <span class="text-white">kazibee</span> <span class="text-white">exec</span>
        </TerminalLine>
        <TerminalLine showPrompt={false} class="pt-2">
          <span class="text-honey-400">&#10003;</span> <span class="text-neutral-200">AST validation passed</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-honey-400">&#10003;</span> <span class="text-neutral-200">Resolved 2 tools: <span class="text-white font-semibold">gmail</span>, <span class="text-white font-semibold">google-sheets</span></span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-honey-400">&#10003;</span> <span class="text-neutral-200">Execution complete</span> <span class="text-neutral-400">(1.2s)</span>
        </TerminalLine>
        <TerminalLine showPrompt={false} class="pt-1">
          <span class="text-green-400">Result:</span> <span class="text-neutral-200">10 emails summarized → "Email Summary" sheet updated</span>
        </TerminalLine>
      </TerminalFrame>

      <div class="mt-6 rounded-xl bg-honey-50 border border-honey-300 p-5" data-test-id="ai-execution-callout">
        <p class="text-sm text-ink-muted">
          The AI generates the code, but never touches your APIs directly. Every snippet goes through the Kazibee runtime, which validates the AST, resolves tools, and sandboxes execution &mdash; the same pipeline every time, whether the caller is human or AI.
        </p>
      </div>
    </div>

    <!-- Execution Pipeline -->
    <div class="mb-14" data-test-id="execution-pipeline">
      <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-honey-600" data-test-id="pipeline-label">Execution pipeline</p>
      <h2 class="mb-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">What happens during <code class="font-mono text-honey-600">kazibee exec</code></h2>
      <p class="mb-8 text-ink-muted max-w-2xl">Every execution follows the same four-step pipeline. No shortcuts, no bypasses. Each step must pass before the next begins.</p>

      <div class="grid gap-6 sm:grid-cols-2" data-test-id="pipeline-steps">
        <div class="rounded-2xl border border-neutral-200 bg-white p-7 transition hover:border-honey-300 hover:honey-glow" data-test-id="pipeline-step-1">
          <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-honey-400">
            <span class="text-lg font-bold text-ink font-mono">1</span>
          </div>
          <h3 class="text-base font-bold text-ink">AST Validation</h3>
          <p class="mt-2 text-sm leading-relaxed text-ink-muted">Every code snippet is parsed into an Abstract Syntax Tree and validated before execution. Import declarations, <code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">require()</code> calls, <code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">eval()</code>, <code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">Function</code> constructors, and dynamic imports are all detected and blocked. If validation fails, execution never starts.</p>
        </div>

        <div class="rounded-2xl border border-neutral-200 bg-white p-7 transition hover:border-honey-300 hover:honey-glow" data-test-id="pipeline-step-2">
          <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-ink">
            <span class="text-lg font-bold text-honey-400 font-mono">2</span>
          </div>
          <h3 class="text-base font-bold text-ink">Tool Resolution</h3>
          <p class="mt-2 text-sm leading-relaxed text-ink-muted">The runtime queries its database to find which tools are installed for the current working directory. Tools can be installed locally (per-project) or globally. Only tools explicitly installed are available &mdash; nothing is implicit.</p>
        </div>

        <div class="rounded-2xl border border-neutral-200 bg-white p-7 transition hover:border-honey-300 hover:honey-glow" data-test-id="pipeline-step-3">
          <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-ink">
            <span class="text-lg font-bold text-honey-400 font-mono">3</span>
          </div>
          <h3 class="text-base font-bold text-ink">In-Process Tool Loading</h3>
          <p class="mt-2 text-sm leading-relaxed text-ink-muted">Each tool's entry point is loaded and its default export function is called with two arguments: scoped secrets (only the env vars the user explicitly granted) and a <code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">ContextService</code> for state persistence. The returned object becomes the tool's callable interface.</p>
        </div>

        <div class="rounded-2xl border border-neutral-200 bg-white p-7 transition hover:border-honey-300 hover:honey-glow" data-test-id="pipeline-step-4">
          <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-honey-400">
            <span class="text-lg font-bold text-ink font-mono">4</span>
          </div>
          <h3 class="text-base font-bold text-ink">Sandboxed Execution</h3>
          <p class="mt-2 text-sm leading-relaxed text-ink-muted">The validated code is wrapped in an async function with a single parameter: <code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">tools</code>. No other dependencies are injected. The code runs with access only to the tools object and standard JavaScript builtins.</p>
        </div>
      </div>
    </div>

    <!-- AST Validation Deep Dive -->
    <div class="mb-14 border-t border-neutral-100 pt-10" data-test-id="ast-validation">
      <h2 class="mb-4 text-2xl font-bold tracking-tight text-ink sm:text-3xl">AST Validation deep dive</h2>
      <p class="mb-6 text-ink-muted max-w-2xl">The validator catches escape attempts before any code runs. Here is what happens when someone tries to break out of the sandbox:</p>

      <TerminalFrame
        borderClass="border-neutral-700"
        panelBgClass="bg-[#0f1724]"
        shadowClass="shadow-[0_16px_36px_rgba(0,0,0,0.24)]"
        headerBorderClass="border-neutral-700/80"
        headerBgClass="bg-[#182235]"
        bodyClass="bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05),transparent_70%)] px-4 py-4"
        codeClass="block text-left font-mono text-sm leading-7 space-y-1.5"
      >
        <TerminalLine>
          <span class="text-green-300">echo</span> <span class="text-green-300">"import fs from 'fs';"</span> <span class="text-neutral-400">|</span> <span class="text-white">kazibee</span> <span class="text-white">exec</span>
        </TerminalLine>
        <TerminalLine showPrompt={false} class="pt-2">
          <span class="text-red-400">Error:</span> <span class="text-neutral-200">AST validation failed</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-neutral-400">Line 1:1</span> <span class="text-neutral-300">&mdash;</span> <span class="text-red-300">Import declarations are not allowed in sandboxed code</span>
        </TerminalLine>
        <TerminalLine showPrompt={false} class="pt-2 text-neutral-500">
          # Execution never started. Code was rejected at the AST gate.
        </TerminalLine>
      </TerminalFrame>

      <div class="mt-8 rounded-2xl border border-neutral-200 bg-white p-6" data-test-id="ast-blocked-list">
        <h3 class="text-sm font-bold text-ink mb-4">What the AST validator blocks:</h3>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="flex items-center gap-3">
            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-red-100 text-red-500 text-xs font-bold">&times;</span>
            <code class="font-mono text-sm text-ink-muted">import</code>
            <span class="text-sm text-ink-muted">declarations</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-red-100 text-red-500 text-xs font-bold">&times;</span>
            <code class="font-mono text-sm text-ink-muted">require()</code>
            <span class="text-sm text-ink-muted">calls</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-red-100 text-red-500 text-xs font-bold">&times;</span>
            <code class="font-mono text-sm text-ink-muted">eval()</code>
            <span class="text-sm text-ink-muted">calls</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-red-100 text-red-500 text-xs font-bold">&times;</span>
            <code class="font-mono text-sm text-ink-muted">new Function()</code>
            <span class="text-sm text-ink-muted">constructors</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-red-100 text-red-500 text-xs font-bold">&times;</span>
            <span class="text-sm text-ink-muted">Dynamic</span>
            <code class="font-mono text-sm text-ink-muted">import()</code>
          </div>
          <div class="flex items-center gap-3">
            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-red-100 text-red-500 text-xs font-bold">&times;</span>
            <code class="font-mono text-sm text-ink-muted">process</code>
            <span class="text-sm text-ink-muted">access</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-red-100 text-red-500 text-xs font-bold">&times;</span>
            <code class="font-mono text-sm text-ink-muted">__dirname</code>
            <span class="text-sm text-ink-muted">/</span>
            <code class="font-mono text-sm text-ink-muted">__filename</code>
          </div>
        </div>
      </div>
    </div>

    <!-- Security Architecture -->
    <div class="mb-14 border-t border-neutral-100 pt-10" data-test-id="security-architecture">
      <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-ink-faint">Security</p>
      <h2 class="mb-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Security architecture</h2>
      <p class="mb-8 text-ink-muted max-w-2xl">Three layers ensure that code cannot escape its intended boundary.</p>

      <div class="grid gap-5 sm:grid-cols-3" data-test-id="security-cards">
        <div class="rounded-2xl border-2 border-neutral-100 p-6 transition hover:border-honey-300" data-test-id="security-ast-gate">
          <div class="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-honey-100">
            <svg class="h-4.5 w-4.5 text-honey-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
          </div>
          <h3 class="text-sm font-bold text-ink">Static Analysis Gate</h3>
          <p class="mt-1.5 text-sm text-ink-muted">Code is analyzed at the AST level before any execution. This is not string matching &mdash; it is full syntax tree traversal that catches all known escape vectors.</p>
        </div>

        <div class="rounded-2xl border-2 border-neutral-100 p-6 transition hover:border-honey-300" data-test-id="security-closed-surface">
          <div class="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-ink">
            <svg class="h-4.5 w-4.5 text-honey-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
          </div>
          <h3 class="text-sm font-bold text-ink">Closed Execution Surface</h3>
          <p class="mt-1.5 text-sm text-ink-muted">The <code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">tools</code> object is the only injected dependency. No globals, no Node.js APIs, no filesystem access unless a plugin explicitly provides it.</p>
        </div>

        <div class="rounded-2xl border-2 border-neutral-100 p-6 transition hover:border-honey-300" data-test-id="security-scoped-secrets">
          <div class="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-honey-100">
            <svg class="h-4.5 w-4.5 text-honey-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg>
          </div>
          <h3 class="text-sm font-bold text-ink">Scoped Secret Injection</h3>
          <p class="mt-1.5 text-sm text-ink-muted">Each tool declares what environment variables it needs in a <code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">permissions.json</code>. During install, the user grants or denies each request. At runtime, only granted secrets are injected.</p>
        </div>
      </div>
    </div>

    <!-- Permission Model -->
    <div class="mb-14 border-t border-neutral-100 pt-10" data-test-id="permission-model">
      <h2 class="mb-4 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Permission model</h2>
      <p class="mb-6 text-ink-muted max-w-2xl">Tools declare their needs upfront. Users decide what to grant. Nothing is silent or automatic.</p>

      <div class="mb-8 rounded-2xl border border-neutral-200 bg-white p-6" data-test-id="permissions-json-example">
        <p class="text-sm font-bold text-ink mb-3">How a tool declares its needs (<code class="font-mono text-xs">permissions.json</code>):</p>
        <div class="rounded-lg border border-neutral-800 bg-neutral-900 p-4 font-mono text-xs leading-6">
          <p><span class="text-neutral-400">&#123;</span></p>
          <p class="pl-4"><span class="text-blue-300">"env"</span><span class="text-neutral-400">: &#123;</span></p>
          <p class="pl-8"><span class="text-blue-300">"GMAIL_CLIENT_ID"</span><span class="text-neutral-400">:</span> <span class="text-neutral-400">[</span><span class="text-green-300">"LOCAL:GMAIL_CLIENT_ID"</span><span class="text-neutral-400">,</span> <span class="text-green-300">"GLOBAL:GMAIL_CLIENT_ID"</span><span class="text-neutral-400">,</span> <span class="text-green-300">"SYSTEM:GMAIL_CLIENT_ID"</span><span class="text-neutral-400">],</span></p>
          <p class="pl-8"><span class="text-blue-300">"GMAIL_REFRESH_TOKEN"</span><span class="text-neutral-400">:</span> <span class="text-neutral-400">[</span><span class="text-green-300">"LOCAL:GMAIL_REFRESH_TOKEN"</span><span class="text-neutral-400">,</span> <span class="text-green-300">"GLOBAL:GMAIL_REFRESH_TOKEN"</span><span class="text-neutral-400">]</span></p>
          <p class="pl-4"><span class="text-neutral-400">&#125;</span></p>
          <p><span class="text-neutral-400">&#125;</span></p>
        </div>
      </div>

      <div class="mb-8 space-y-3" data-test-id="permission-sources">
        <p class="text-sm font-bold text-ink mb-2">Secret sources (checked in order):</p>
        <div class="flex items-center gap-3">
          <span class="inline-flex items-center rounded-md border border-honey-200 bg-honey-50 px-2.5 py-1 font-mono text-xs font-semibold text-honey-700">LOCAL</span>
          <span class="text-sm text-ink-muted">Project-scoped env vars set via <code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">kazibee env</code></span>
        </div>
        <div class="flex items-center gap-3">
          <span class="inline-flex items-center rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 font-mono text-xs font-semibold text-ink">ENV</span>
          <span class="text-sm text-ink-muted">Process environment variables (<code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">process.env</code>)</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="inline-flex items-center rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 font-mono text-xs font-semibold text-ink">GLOBAL</span>
          <span class="text-sm text-ink-muted">User-wide env vars set via <code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">kazibee env --global</code></span>
        </div>
        <div class="flex items-center gap-3">
          <span class="inline-flex items-center rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 font-mono text-xs font-semibold text-ink">SYSTEM</span>
          <span class="text-sm text-ink-muted">Env vars from the tool's setup script during installation</span>
        </div>
      </div>

      <TerminalFrame
        borderClass="border-neutral-700"
        panelBgClass="bg-[#0f1724]"
        shadowClass="shadow-[0_16px_36px_rgba(0,0,0,0.24)]"
        headerBorderClass="border-neutral-700/80"
        headerBgClass="bg-[#182235]"
        bodyClass="bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05),transparent_70%)] px-4 py-4"
        codeClass="block text-left font-mono text-sm leading-7 space-y-1.5"
      >
        <TerminalLine>
          <span class="text-white">kazibee</span> <span class="text-white">install</span> <span class="text-white">gmail</span> <span class="text-neutral-400">kazibee/gmail</span>
        </TerminalLine>
        <TerminalLine showPrompt={false} class="pt-2 text-neutral-100">
          Permissions requested by "gmail":
        </TerminalLine>
        <TerminalLine showPrompt={false} class="pt-2">
          <span class="text-neutral-200">Inject <span class="text-white font-semibold">"GMAIL_CLIENT_ID"</span> from:</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-neutral-400">{'  '}1)</span> <span class="text-neutral-300">Deny</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-neutral-400">{'  '}2)</span> <span class="text-neutral-300">LOCAL:GMAIL_CLIENT_ID</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-neutral-400">{'  '}3)</span> <span class="text-neutral-300">GLOBAL:GMAIL_CLIENT_ID</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-neutral-400">{'  '}4)</span> <span class="text-neutral-300">SYSTEM:GMAIL_CLIENT_ID</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-honey-400">Choose [1-4]:</span> <span class="text-green-400">2</span>
        </TerminalLine>
        <TerminalLine showPrompt={false} class="pt-2">
          <span class="text-neutral-200">Inject <span class="text-white font-semibold">"GMAIL_REFRESH_TOKEN"</span> from:</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-neutral-400">{'  '}1)</span> <span class="text-neutral-300">Deny</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-neutral-400">{'  '}2)</span> <span class="text-neutral-300">LOCAL:GMAIL_REFRESH_TOKEN</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-neutral-400">{'  '}3)</span> <span class="text-neutral-300">GLOBAL:GMAIL_REFRESH_TOKEN</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-honey-400">Choose [1-3]:</span> <span class="text-red-400">1</span>
        </TerminalLine>
        <TerminalLine showPrompt={false} class="pt-1 text-neutral-400">
          # Tool installed. GMAIL_REFRESH_TOKEN was denied and will not be available at runtime.
        </TerminalLine>
      </TerminalFrame>

      <div class="mt-6 rounded-xl bg-honey-50 border border-honey-300 p-5" data-test-id="permission-note">
        <p class="text-sm text-ink-muted">
          The user can deny any permission. The tool still installs, but the denied secret will not be available at runtime. Tools should handle missing secrets gracefully.
        </p>
      </div>
    </div>

    <!-- Tool Context & State -->
    <div class="mb-14 border-t border-neutral-100 pt-10" data-test-id="tool-context">
      <h2 class="mb-4 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Tool context and state</h2>
      <p class="mb-6 text-ink-muted max-w-2xl">Tools can persist data between executions using the <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">ContextService</code>. This is how plugins remember things across runs.</p>

      <div class="grid gap-5 sm:grid-cols-2 mb-8" data-test-id="context-features">
        <div class="rounded-2xl border border-neutral-200 bg-white p-6">
          <h3 class="text-sm font-bold text-ink mb-2">Key-value with TTL</h3>
          <p class="text-sm text-ink-muted"><code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">set(key, ttl, value)</code>, <code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">get(key)</code>, <code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">getAll()</code>, and <code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">delete(key)</code> with time-to-live in seconds. Expired entries are cleaned before each execution.</p>
        </div>
        <div class="rounded-2xl border border-neutral-200 bg-white p-6">
          <h3 class="text-sm font-bold text-ink mb-2">Constraints</h3>
          <p class="text-sm text-ink-muted">64KB max per key. Values must be JSON-serializable. Keys cannot contain <code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">%</code> or <code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">_</code> characters. Dot-notation keys (e.g. <code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">auth.token</code>) expand to nested objects in <code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">getAll()</code>.</p>
        </div>
      </div>

      <div class="rounded-lg border border-neutral-800 bg-neutral-900 p-4 font-mono text-xs leading-6" data-test-id="context-code-example">
        <p><span class="text-purple-400">export default function</span> <span class="text-blue-300">main</span><span class="text-neutral-400">(</span><span class="text-amber-300">env</span><span class="text-neutral-400">,</span> <span class="text-amber-300">context</span><span class="text-neutral-400">) &#123;</span></p>
        <p class="pl-4"><span class="text-purple-400">return</span> <span class="text-neutral-400">&#123;</span></p>
        <p class="pl-8"><span class="text-blue-300">getToken</span><span class="text-neutral-400">:</span> <span class="text-purple-400">async</span> <span class="text-neutral-400">() =&gt; &#123;</span></p>
        <p class="pl-12"><span class="text-purple-400">const</span> <span class="text-blue-300">cached</span> <span class="text-neutral-400">=</span> <span class="text-purple-400">await</span> <span class="text-amber-300">context</span><span class="text-neutral-400">.</span><span class="text-blue-300">get</span><span class="text-neutral-400">(</span><span class="text-green-300">"auth.token"</span><span class="text-neutral-400">);</span></p>
        <p class="pl-12"><span class="text-purple-400">if</span> <span class="text-neutral-400">(</span><span class="text-blue-300">cached</span><span class="text-neutral-400">)</span> <span class="text-purple-400">return</span> <span class="text-blue-300">cached</span><span class="text-neutral-400">;</span></p>
        <p class="pl-12"></p>
        <p class="pl-12"><span class="text-purple-400">const</span> <span class="text-blue-300">token</span> <span class="text-neutral-400">=</span> <span class="text-purple-400">await</span> <span class="text-blue-300">refreshAccessToken</span><span class="text-neutral-400">(</span><span class="text-amber-300">env</span><span class="text-neutral-400">.</span><span class="text-blue-300">REFRESH_TOKEN</span><span class="text-neutral-400">);</span></p>
        <p class="pl-12"><span class="text-purple-400">await</span> <span class="text-amber-300">context</span><span class="text-neutral-400">.</span><span class="text-blue-300">set</span><span class="text-neutral-400">(</span><span class="text-green-300">"auth.token"</span><span class="text-neutral-400">,</span> <span class="text-amber-300">3600</span><span class="text-neutral-400">,</span> <span class="text-blue-300">token</span><span class="text-neutral-400">);</span> <span class="text-neutral-500">// TTL: 1 hour</span></p>
        <p class="pl-12"><span class="text-purple-400">return</span> <span class="text-blue-300">token</span><span class="text-neutral-400">;</span></p>
        <p class="pl-8"><span class="text-neutral-400">&#125;</span></p>
        <p class="pl-4"><span class="text-neutral-400">&#125;;</span></p>
        <p><span class="text-neutral-400">&#125;</span></p>
      </div>
    </div>

    <!-- Directory Scoping -->
    <div class="mb-14 border-t border-neutral-100 pt-10" data-test-id="directory-scoping">
      <h2 class="mb-4 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Directory scoping</h2>
      <p class="mb-6 text-ink-muted max-w-2xl">Each project directory can have its own set of installed tools. Different projects, different tool sets. Global tools are available everywhere.</p>

      <div class="space-y-4 mb-8" data-test-id="scoping-rules">
        <div class="flex items-start gap-3">
          <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-honey-400 text-xs font-bold text-ink font-mono">&rarr;</span>
          <p class="text-sm text-ink-muted">Tools installed without <code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">--global</code> are scoped to the current directory only</p>
        </div>
        <div class="flex items-start gap-3">
          <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-honey-400 text-xs font-bold text-ink font-mono">&rarr;</span>
          <p class="text-sm text-ink-muted">Tools installed with <code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">--global</code> are available from any working directory</p>
        </div>
        <div class="flex items-start gap-3">
          <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-ink text-xs font-bold text-honey-400 font-mono">&rarr;</span>
          <p class="text-sm text-ink-muted"><code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">kazibee list</code> shows exactly what is available in the current directory</p>
        </div>
      </div>

      <TerminalFrame
        borderClass="border-neutral-700"
        panelBgClass="bg-[#0f1724]"
        shadowClass="shadow-[0_16px_36px_rgba(0,0,0,0.24)]"
        headerBorderClass="border-neutral-700/80"
        headerBgClass="bg-[#182235]"
        bodyClass="bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05),transparent_70%)] px-4 py-4"
        codeClass="block text-left font-mono text-sm leading-7 space-y-1.5"
      >
        <TerminalLine>
          <span class="text-white">kazibee</span> <span class="text-white">list</span>
        </TerminalLine>
        <TerminalLine showPrompt={false} class="pt-2 text-neutral-100">
          Tools for ~/projects/my-app:
        </TerminalLine>
        <TerminalLine showPrompt={false} class="pt-1">
          {'  '}<span class="text-white font-semibold">gmail</span> <span class="text-neutral-400">&mdash;</span> <span class="text-neutral-200">Read and manage Gmail messages</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          {'    '}<span class="text-neutral-500">Source:</span> <span class="text-neutral-400">github:kazibee/gmail#a1b2c3d4</span> <span class="text-neutral-500">(from ~/projects/my-app)</span>
        </TerminalLine>
        <TerminalLine showPrompt={false} class="pt-1">
          {'  '}<span class="text-white font-semibold">google-sheets</span> <span class="text-neutral-400">&mdash;</span> <span class="text-neutral-200">Read and write Google Sheets data</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          {'    '}<span class="text-neutral-500">Source:</span> <span class="text-neutral-400">github:kazibee/google-sheets#e4f5g6h7</span> <span class="text-neutral-500">(from ~/projects/my-app)</span>
        </TerminalLine>
        <TerminalLine showPrompt={false} class="pt-1">
          {'  '}<span class="text-white font-semibold">image-gen</span> <span class="text-neutral-400">&mdash;</span> <span class="text-neutral-200">Generate images with AI</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          {'    '}<span class="text-neutral-500">Source:</span> <span class="text-neutral-400">github:kazibee/image-gen#i7j8k9l0</span> <span class="text-neutral-500">(from /)</span>
        </TerminalLine>
      </TerminalFrame>
    </div>

    <!-- Local Development -->
    <div class="mb-14 border-t border-neutral-100 pt-10" data-test-id="local-development">
      <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-honey-600" data-test-id="local-development-label">Local Development</p>
      <h2 class="mb-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Develop tools locally with link</h2>
      <p class="mb-8 text-ink-muted max-w-2xl">During development, link a local directory as a tool so changes are picked up immediately without reinstalling. Linked tools take precedence over installed tools at the same directory scope &mdash; longest-path-wins, then link beats install.</p>

      <div class="grid gap-5 sm:grid-cols-2" data-test-id="local-development-cards">
        <div class="rounded-2xl border border-neutral-200 bg-white p-6">
          <h3 class="text-sm font-bold text-ink mb-2"><code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">kazibee link &lt;name&gt; &lt;path&gt;</code></h3>
          <p class="text-sm text-ink-muted">Links a local directory as a tool under the given name. The tool is resolved from the linked path instead of the registry, so code changes take effect on the next execution without reinstalling.</p>
        </div>
        <div class="rounded-2xl border border-neutral-200 bg-white p-6">
          <h3 class="text-sm font-bold text-ink mb-2"><code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">kazibee unlink &lt;name&gt;</code></h3>
          <p class="text-sm text-ink-muted">Removes a previously created link. The tool reverts to its installed version if one exists, or becomes unavailable if it was only linked.</p>
        </div>
      </div>
    </div>

    <!-- API Discovery -->
    <div class="mb-14 border-t border-neutral-100 pt-10" data-test-id="api-discovery">
      <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-honey-600" data-test-id="api-discovery-label">Developer Experience</p>
      <h2 class="mb-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">API discovery before execution</h2>
      <p class="mb-8 text-ink-muted max-w-2xl">Before writing code, AI agents and developers can inspect exactly what each tool provides.</p>

      <div class="grid gap-5 sm:grid-cols-2 mb-8" data-test-id="api-discovery-cards">
        <div class="rounded-2xl border border-neutral-200 bg-white p-6">
          <h3 class="text-sm font-bold text-ink mb-2"><code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">kazibee show</code></h3>
          <p class="text-sm text-ink-muted">Prints combined <code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">.d.ts</code> type interfaces for all installed tools &mdash; method signatures, parameter types, and return types. Target a specific tool with <code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">kazibee show &lt;tool&gt;</code>.</p>
        </div>
        <div class="rounded-2xl border border-neutral-200 bg-white p-6">
          <h3 class="text-sm font-bold text-ink mb-2"><code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">kazibee llm</code></h3>
          <p class="text-sm text-ink-muted">Prints the tool's <code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">llm.txt</code> &mdash; human and AI-readable documentation with usage patterns, examples, and best practices. Without arguments, <code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">kazibee llm</code> prints Kazibee-level docs.</p>
        </div>
      </div>

      <TerminalFrame
        borderClass="border-neutral-700"
        panelBgClass="bg-[#0f1724]"
        shadowClass="shadow-[0_16px_36px_rgba(0,0,0,0.24)]"
        headerBorderClass="border-neutral-700/80"
        headerBgClass="bg-[#182235]"
        bodyClass="bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05),transparent_70%)] px-4 py-4"
        codeClass="block text-left font-mono text-sm leading-7 space-y-1.5"
      >
        <TerminalLine>
          <span class="text-white">kazibee</span> <span class="text-white">show</span> <span class="text-white">gmail</span>
        </TerminalLine>
        <TerminalLine showPrompt={false} class="pt-2">
          <span class="text-purple-400">interface</span> <span class="text-blue-300">ToolInterface</span> <span class="text-neutral-400">&#123;</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          {'  '}<span class="text-green-300">'gmail'</span><span class="text-neutral-400">: &#123;</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          {'    '}<span class="text-blue-300">getUnread</span><span class="text-neutral-400">(</span><span class="text-amber-300">options</span><span class="text-neutral-400">?: &#123;</span> <span class="text-blue-300">limit</span><span class="text-neutral-400">?:</span> <span class="text-purple-400">number</span> <span class="text-neutral-400">&#125;):</span> <span class="text-purple-400">Promise</span><span class="text-neutral-400">&lt;</span><span class="text-blue-300">Email</span><span class="text-neutral-400">[]&gt;</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          {'    '}<span class="text-blue-300">send</span><span class="text-neutral-400">(</span><span class="text-amber-300">to</span><span class="text-neutral-400">:</span> <span class="text-purple-400">string</span><span class="text-neutral-400">,</span> <span class="text-amber-300">subject</span><span class="text-neutral-400">:</span> <span class="text-purple-400">string</span><span class="text-neutral-400">,</span> <span class="text-amber-300">body</span><span class="text-neutral-400">:</span> <span class="text-purple-400">string</span><span class="text-neutral-400">):</span> <span class="text-purple-400">Promise</span><span class="text-neutral-400">&lt;</span><span class="text-purple-400">void</span><span class="text-neutral-400">&gt;</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          {'    '}<span class="text-blue-300">search</span><span class="text-neutral-400">(</span><span class="text-amber-300">query</span><span class="text-neutral-400">:</span> <span class="text-purple-400">string</span><span class="text-neutral-400">):</span> <span class="text-purple-400">Promise</span><span class="text-neutral-400">&lt;</span><span class="text-blue-300">Email</span><span class="text-neutral-400">[]&gt;</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          {'  '}<span class="text-neutral-400">&#125;</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-neutral-400">&#125;</span>
        </TerminalLine>
      </TerminalFrame>
    </div>

    <!-- Tool Commands -->
    <div class="mb-14 border-t border-neutral-100 pt-10" data-test-id="tool-commands">
      <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-honey-600" data-test-id="tool-commands-label">Extensibility</p>
      <h2 class="mb-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Tools can expose CLI commands</h2>
      <p class="mb-8 text-ink-muted max-w-2xl">Beyond runtime APIs, tools can register CLI subcommands for setup flows, OAuth authentication, and administrative tasks.</p>

      <div class="mb-8 space-y-3" data-test-id="tool-commands-details">
        <div class="flex items-start gap-3">
          <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-honey-400 text-xs font-bold text-ink font-mono">&rarr;</span>
          <p class="text-sm text-ink-muted">Tools declare a <code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">command</code> field in <code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">package.json</code> pointing to a module</p>
        </div>
        <div class="flex items-start gap-3">
          <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-honey-400 text-xs font-bold text-ink font-mono">&rarr;</span>
          <p class="text-sm text-ink-muted">Run as <code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">kazibee &lt;tool&gt; &lt;subcommand&gt; [args]</code></p>
        </div>
        <div class="flex items-start gap-3">
          <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-honey-400 text-xs font-bold text-ink font-mono">&rarr;</span>
          <p class="text-sm text-ink-muted">Commands receive resolved env vars (<code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">SYSTEM</code> &rarr; <code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">GLOBAL</code> &rarr; <code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">LOCAL</code> priority)</p>
        </div>
        <div class="flex items-start gap-3">
          <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-ink text-xs font-bold text-honey-400 font-mono">&rarr;</span>
          <p class="text-sm text-ink-muted">If a command returns <code class="font-mono text-xs bg-neutral-100 px-1 py-0.5 rounded">Record&lt;string, string&gt;</code>, values are auto-stored as env vars</p>
        </div>
      </div>

      <TerminalFrame
        borderClass="border-neutral-700"
        panelBgClass="bg-[#0f1724]"
        shadowClass="shadow-[0_16px_36px_rgba(0,0,0,0.24)]"
        headerBorderClass="border-neutral-700/80"
        headerBgClass="bg-[#182235]"
        bodyClass="bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05),transparent_70%)] px-4 py-4"
        codeClass="block text-left font-mono text-sm leading-7 space-y-1.5"
      >
        <TerminalLine>
          <span class="text-white">kazibee</span> <span class="text-white">gmail</span> <span class="text-white">auth</span>
        </TerminalLine>
        <TerminalLine showPrompt={false} class="pt-2">
          <span class="text-neutral-200">Opening browser for OAuth consent...</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-honey-400">&#10003;</span> <span class="text-neutral-200">Authorization successful.</span>
        </TerminalLine>
        <TerminalLine showPrompt={false} class="pt-1">
          <span class="text-green-400">Stored env vars for "gmail":</span> <span class="text-white font-semibold">GMAIL_ACCESS_TOKEN</span><span class="text-neutral-400">,</span> <span class="text-white font-semibold">GMAIL_REFRESH_TOKEN</span>
        </TerminalLine>
      </TerminalFrame>
    </div>

    <!-- Setup Scripts -->
    <div class="mb-14 border-t border-neutral-100 pt-10" data-test-id="setup-scripts">
      <div class="rounded-xl bg-honey-50 border border-honey-300 p-6" data-test-id="setup-scripts-callout">
        <h3 class="text-base font-bold text-ink mb-2">Automated setup during installation</h3>
        <p class="text-sm text-ink-muted leading-relaxed">
          Tools can declare a setup script via <code class="font-mono text-xs bg-honey-100 px-1 py-0.5 rounded">kazibee.setup</code> in <code class="font-mono text-xs bg-honey-100 px-1 py-0.5 rounded">package.json</code>. This script runs during <code class="font-mono text-xs bg-honey-100 px-1 py-0.5 rounded">kazibee install</code> to populate env vars &mdash; for example, creating OAuth credentials or generating API keys. Setup env is stored per tool identity and available as the <code class="font-mono text-xs bg-honey-100 px-1 py-0.5 rounded">SYSTEM</code> source at runtime.
        </p>
      </div>
    </div>

    <!-- CTA -->
    <section class="rounded-2xl bg-honey-50 p-8" data-test-id="runtime-cta">
      <div class="flex items-start gap-4">
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-honey-400">
          <svg class="h-6 w-6 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
        </div>
        <div>
          <h2 class="text-xl font-bold text-ink">Ready to explore?</h2>
          <p class="mt-2 leading-relaxed text-ink-muted">
            Now that you understand how the runtime works, see what plugins are available or head back to learn more about Kazibee.
          </p>
          <div class="mt-6 flex flex-wrap gap-3" data-test-id="runtime-cta-actions">
            <a href="/plugins" class="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-light" data-test-id="runtime-cta-plugins">
              See what's available
            </a>
            <a href="/" class="rounded-xl border-2 border-honey-300 bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-honey-100" data-test-id="runtime-cta-home">
              Back to home
            </a>
          </div>
        </div>
      </div>
    </section>
  </div>
</section>
