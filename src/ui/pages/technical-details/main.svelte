<script lang="ts">
  import BlurUpImage from '../../component/blur_up_image.svelte';
  import SeoHead from '../../component/seo_head.svelte';
</script>

<SeoHead
  title="Technical Details"
  path="/technical-details"
  description="Learn how Kazibee constrains AI execution through plugin interfaces, typed tool boundaries, sandboxed runtime behavior, and explicit user control."
/>

<section>
  <div class="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-20">
    <!-- Header -->
    <header class="mb-10" data-test-id="technical-header">
      <h1 class="text-4xl font-black tracking-tight text-ink sm:text-5xl lg:text-6xl" data-test-id="technical-title">
        Universal Safe Execution
      </h1>
      <p class="mt-5 max-w-3xl text-lg leading-relaxed text-ink-muted">
        Kazibee is a bounded code execution agent. Build anything—image editors, workflow engines, data processors—expose it as callable functions, and let AI do real work. Only against capabilities you explicitly define.
      </p>
    </header>

    <!-- Problem / Solution -->
    <div class="grid gap-6 sm:grid-cols-2" data-test-id="problem-solution">
      <div class="rounded-2xl bg-red-100 p-8" data-test-id="problem-card">
        <p class="text-sm font-black uppercase tracking-wider text-red-600 mb-4">The problem</p>
        <p class="text-base leading-relaxed text-ink font-medium">
          Work doesn't happen in a chat window. It doesn't happen in a folder. It happens everywhere. Yet AI is trapped in one interface—no flexibility to meet you where the work actually is.
        </p>
      </div>
      <div class="rounded-2xl bg-honey-100 border-2 border-honey-300 p-8" style="box-shadow: -8px 8px 16px 1px rgba(0, 0, 0, 0.08);" data-test-id="solution-card">
        <p class="text-sm font-black uppercase tracking-wider text-honey-700 mb-4">The solution</p>
        <p class="text-base leading-relaxed text-ink font-medium">
          A bounded execution layer where AI receives a fixed interface, not general system access. If a function isn't on the approved interface, it isn't callable. Faster execution without losing control.
        </p>
      </div>
    </div>

    <!-- How it works -->
    <div id="how-it-works" class="mt-14 relative" data-test-id="how-it-works">
      <!-- Bees positioned at edges -->
      <BlurUpImage
        src="/images/bee-topdown-transparent_256.webp"
        placeholder="/images/bee-topdown-transparent_blur.webp"
        alt=""
        class="absolute w-32 h-32 pointer-events-none z-0 top-[10%] -left-20"
        imageClass="h-full w-full object-contain"
      />
      <BlurUpImage
        src="/images/bee-topdown-alt-transparent_256.webp"
        placeholder="/images/bee-topdown-alt-transparent_blur.webp"
        alt=""
        class="absolute w-32 h-32 pointer-events-none z-0 bottom-[10%] -right-40"
        imageClass="h-full w-full object-contain"
      />

      <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-honey-600">How it works</p>
      <h2 class="mb-8 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Plugin-based execution for AI agents</h2>

      <div class="space-y-8">
        <article class="flex items-start gap-5" data-test-id="step-connect">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-honey-400">
            <span class="text-lg font-bold text-ink font-mono">1</span>
          </div>
          <div>
              <h3 class="text-xl font-bold text-ink">Install any capability as a plugin</h3>
              <p class="mt-2 leading-relaxed text-ink-muted">
                Everything in Kazibee is a plugin. Install pre-built tools from GitHub or build your own. Image editing, Gmail automation, Google Sheets, cloud infrastructure—every capability is a plugin you explicitly install and control.
              </p>
              <div class="mt-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4 font-mono text-sm" data-test-id="step-install-code">
                <p class="text-neutral-500"># Install any plugin from GitHub</p>
                <p class="mt-1"><span class="text-cyan-400">kazibee</span> <span class="text-green-400">install</span> <span class="text-amber-300">gmail</span> <span class="text-purple-300">github:kazibee-team/kazibee-tool-gmail</span></p>
                <p class="mt-1"><span class="text-cyan-400">kazibee</span> <span class="text-green-400">install</span> <span class="text-amber-300">image-gen</span> <span class="text-purple-300">github:user/custom-tool</span></p>
                <p class="text-neutral-500 mt-3"># Install globally for all projects</p>
                <p class="mt-1"><span class="text-cyan-400">kazibee</span> <span class="text-green-400">install</span> <span class="text-amber-300">image-editor</span> <span class="text-purple-300">github:user/tool</span> <span class="text-pink-400">--global</span></p>
              </div>
              <div class="mt-4 flex flex-wrap gap-2" data-test-id="step-connect-tags">
                <span class="rounded-lg border border-honey-200 bg-honey-50 px-3 py-1.5 text-xs font-semibold text-honey-700 font-mono">Image editing</span>
                <span class="rounded-lg border border-honey-200 bg-honey-50 px-3 py-1.5 text-xs font-semibold text-honey-700 font-mono">Email automation</span>
                <span class="rounded-lg border border-honey-200 bg-honey-50 px-3 py-1.5 text-xs font-semibold text-honey-700 font-mono">Spreadsheets</span>
                <span class="rounded-lg border border-honey-200 bg-honey-50 px-3 py-1.5 text-xs font-semibold text-honey-700 font-mono">Cloud infra</span>
                <span class="rounded-lg border border-honey-200 bg-honey-50 px-3 py-1.5 text-xs font-semibold text-honey-700 font-mono">Custom APIs</span>
              </div>
            </div>
        </article>

        <article class="flex items-start gap-5" data-test-id="step-expose">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ink">
            <span class="text-lg font-bold text-honey-400 font-mono">2</span>
          </div>
          <div>
              <h3 class="text-xl font-bold text-ink">Plugins expose typed interfaces</h3>
              <p class="mt-2 leading-relaxed text-ink-muted">
                Each plugin defines a TypeScript interface. AI agents discover capabilities through introspection—no guessing, no arbitrary access. View merged interfaces across all tools or inspect individual plugins.
              </p>
              <div class="mt-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4 font-mono text-sm" data-test-id="step-expose-code">
                <p class="text-neutral-500"># Discover all installed tools</p>
                <p class="mt-1"><span class="text-cyan-400">kazibee</span> <span class="text-green-400">list</span></p>
                <p class="text-neutral-500 mt-3"># View merged interface across all tools</p>
                <p class="mt-1"><span class="text-cyan-400">kazibee</span> <span class="text-green-400">show</span></p>
                <p class="text-neutral-500 mt-3"># Inspect a specific tool's interface</p>
                <p class="mt-1"><span class="text-cyan-400">kazibee</span> <span class="text-green-400">show</span> <span class="text-amber-300">gmail</span></p>
              </div>
            </div>
        </article>

        <article class="flex items-start gap-5" data-test-id="step-execute">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-honey-400">
            <span class="text-lg font-bold text-ink font-mono">3</span>
          </div>
          <div>
              <h3 class="text-xl font-bold text-ink">AI executes JavaScript against fixed interfaces</h3>
              <p class="mt-2 leading-relaxed text-ink-muted">
                AI writes JavaScript that calls plugin methods. Execution runs in a controlled environment—only installed plugins are accessible. No dynamic imports, no eval, no arbitrary code execution.
              </p>
              <div class="mt-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4 font-mono text-sm" data-test-id="step-execute-code">
                <p class="text-neutral-500"># Find reports on Drive, create draft email with attachments</p>
                <p class="mt-1"><span class="text-cyan-400">kazibee</span> <span class="text-green-400">exec</span> <span class="text-pink-400">&lt;&lt;'EOF'</span></p>
                <p class="mt-2"><span class="text-purple-400">const</span> <span class="text-blue-300">files</span> <span class="text-pink-400">=</span> <span class="text-purple-400">await</span> <span class="text-blue-300">tools</span><span class="text-neutral-400">[</span><span class="text-green-300">"google-drive"</span><span class="text-neutral-400">].</span><span class="text-blue-300">listFiles</span><span class="text-neutral-400">(</span><span class="text-green-300">"name contains 'Q4 Report'"</span><span class="text-neutral-400">);</span></p>
                <p><span class="text-purple-400">const</span> <span class="text-blue-300">attachments</span> <span class="text-pink-400">=</span> <span class="text-blue-300">files</span><span class="text-neutral-400">.</span><span class="text-blue-300">slice</span><span class="text-neutral-400">(</span><span class="text-amber-300">0</span><span class="text-neutral-400">,</span> <span class="text-amber-300">3</span><span class="text-neutral-400">).</span><span class="text-blue-300">map</span><span class="text-neutral-400">(</span><span class="text-blue-300">f</span> <span class="text-pink-400">=&gt;</span> <span class="text-neutral-400">(&#123;</span></p>
                <p class="pl-4"><span class="text-blue-300">fileId</span><span class="text-neutral-400">:</span> <span class="text-blue-300">f</span><span class="text-neutral-400">.</span><span class="text-blue-300">id</span><span class="text-neutral-400">,</span> <span class="text-blue-300">filename</span><span class="text-neutral-400">:</span> <span class="text-blue-300">f</span><span class="text-neutral-400">.</span><span class="text-blue-300">name</span></p>
                <p><span class="text-neutral-400">&#125;));</span></p>
                <p class="mt-1"><span class="text-purple-400">await</span> <span class="text-blue-300">tools</span><span class="text-neutral-400">[</span><span class="text-green-300">"gmail"</span><span class="text-neutral-400">].</span><span class="text-blue-300">createDraftWithDriveAttachments</span><span class="text-neutral-400">(</span></p>
                <p class="pl-4"><span class="text-green-300">"team@company.com"</span><span class="text-neutral-400">,</span></p>
                <p class="pl-4"><span class="text-green-300">"Q4 Reports Ready"</span><span class="text-neutral-400">,</span></p>
                <p class="pl-4"><span class="text-green-300">"Hi team, attached are the Q4 reports."</span><span class="text-neutral-400">,</span></p>
                <p class="pl-4"><span class="text-blue-300">attachments</span></p>
                <p><span class="text-neutral-400">);</span></p>
                <p class="mt-2"><span class="text-pink-400">EOF</span></p>
              </div>
              <div class="mt-4 grid gap-3 sm:grid-cols-3">
                <div class="rounded-xl bg-neutral-50 p-4 text-center">
                  <p class="text-2xl font-black text-ink">Fixed</p>
                  <p class="mt-1 text-xs font-medium text-ink-faint">Interface</p>
                </div>
                <div class="rounded-xl bg-neutral-50 p-4 text-center">
                  <p class="text-2xl font-black text-ink">Zero</p>
                  <p class="mt-1 text-xs font-medium text-ink-faint">Implicit access</p>
                </div>
                <div class="rounded-xl bg-neutral-50 p-4 text-center">
                  <p class="text-2xl font-black text-ink">100%</p>
                  <p class="mt-1 text-xs font-medium text-ink-faint">Reviewable</p>
                </div>
              </div>
            </div>
        </article>
      </div>
    </div>

    <!-- Execution boundary -->
    <div class="mt-14 rounded-2xl border-2 border-neutral-200 bg-white p-8 sm:p-10" data-test-id="execution-boundary">
      <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-honey-600">Execution boundary</p>
      <h2 class="mb-4 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Sandbox enforcement before runtime</h2>
      <p class="max-w-3xl leading-relaxed text-ink-muted">
        Every code snippet is statically analyzed before execution. Try to escape the sandbox and execution is blocked immediately.
      </p>

      <div class="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-5">
        <p class="text-sm font-bold text-ink mb-3">Example: Attempting to use forbidden imports</p>
        <div class="rounded-lg border border-neutral-800 bg-neutral-900 p-3 font-mono text-xs">
          <p class="text-neutral-500"># Try to import fs module and access Drive</p>
          <p class="mt-1"><span class="text-cyan-400">kazibee</span> <span class="text-green-400">exec</span> <span class="text-pink-400">&lt;&lt;'EOF'</span></p>
          <p class="mt-1"><span class="text-purple-400">import</span> <span class="text-blue-300">fs</span> <span class="text-purple-400">from</span> <span class="text-green-300">'fs'</span><span class="text-neutral-400">;</span></p>
          <p><span class="text-purple-400">const</span> <span class="text-blue-300">files</span> <span class="text-pink-400">=</span> <span class="text-purple-400">await</span> <span class="text-blue-300">tools</span><span class="text-neutral-400">[</span><span class="text-green-300">"google-drive"</span><span class="text-neutral-400">].</span><span class="text-blue-300">listFiles</span><span class="text-neutral-400">();</span></p>
          <p class="mt-1"><span class="text-pink-400">EOF</span></p>
        </div>
        <div class="mt-3 rounded-lg bg-neutral-100 border border-neutral-300 p-3">
          <p class="text-xs font-mono text-ink">❌ AST validation failed:</p>
          <p class="text-xs font-mono text-ink-muted mt-1 pl-4">Line 1:1 — Import declarations are not allowed in sandboxed code</p>
        </div>
      </div>
      <div class="mt-6 grid gap-3 sm:grid-cols-3">
        <div class="rounded-xl bg-neutral-50 p-4" data-test-id="boundary-ast">
          <p class="text-sm font-bold text-ink">Static analysis</p>
          <p class="mt-1 text-xs text-ink-muted">Before every execution</p>
        </div>
        <div class="rounded-xl bg-neutral-50 p-4" data-test-id="boundary-allowlist">
          <p class="text-sm font-bold text-ink">Allowlisted APIs only</p>
          <p class="mt-1 text-xs text-ink-muted">Nothing outside your defined interface</p>
        </div>
        <div class="rounded-xl bg-neutral-50 p-4" data-test-id="boundary-deterministic">
          <p class="text-sm font-bold text-ink">Deterministic boundaries</p>
          <p class="mt-1 text-xs text-ink-muted">Reviewable, repeatable, controlled</p>
        </div>
      </div>
    </div>

    <!-- Differentiators -->
    <div class="mt-14" data-test-id="differentiators">
      <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-ink-faint">Why Kazibee</p>
      <h2 class="mb-8 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Not just another automation tool</h2>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="flex items-start gap-4" data-test-id="diff-programmable">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-honey-400">
            <svg class="h-4 w-4 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
          </div>
          <div>
            <p class="text-sm font-bold text-ink">Programmable, not prebuilt</p>
            <p class="mt-1 text-sm text-ink-muted">Execution via real functions, not rigid templates.</p>
          </div>
        </div>
        <div class="flex items-start gap-4" data-test-id="diff-agnostic">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-honey-400">
            <svg class="h-4 w-4 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
          </div>
          <div>
            <p class="text-sm font-bold text-ink">Integration-agnostic</p>
            <p class="mt-1 text-sm text-ink-muted">Not tied to one ecosystem. Any API works.</p>
          </div>
        </div>
        <div class="flex items-start gap-4" data-test-id="diff-code">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink">
            <svg class="h-4 w-4 text-honey-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
          </div>
          <div>
            <p class="text-sm font-bold text-ink">Code-based logic</p>
            <p class="mt-1 text-sm text-ink-muted">Supports branching and orchestration, not just triggers.</p>
          </div>
        </div>
        <div class="flex items-start gap-4" data-test-id="diff-action">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink">
            <svg class="h-4 w-4 text-honey-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
          </div>
          <div>
            <p class="text-sm font-bold text-ink">Bounded security</p>
            <p class="mt-1 text-sm text-ink-muted">Security through fixed interfaces. If it's not on the allowlist, it's not callable.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- CTA -->
    <section class="mt-14 rounded-2xl bg-honey-50 p-8" data-test-id="technical-cta">
      <div class="flex items-start gap-4">
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-honey-400">
          <svg class="h-6 w-6 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.841m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /></svg>
        </div>
        <div>
          <h2 class="text-xl font-bold text-ink">Put AI to work</h2>
          <p class="mt-2 leading-relaxed text-ink-muted">
            Connect your APIs, build your first connector, and start executing real workflows today. Kazibee is free and open source.
          </p>
          <div class="mt-6 flex flex-wrap gap-3" data-test-id="technical-cta-actions">
            <a href="/" class="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-light" data-test-id="back-home-button">
              Back to home
            </a>
            <a href="/plugins" class="rounded-xl border-2 border-honey-300 bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-honey-100" data-test-id="view-plugins-button">
              View plugins
            </a>
          </div>
        </div>
      </div>
    </section>
  </div>
</section>
