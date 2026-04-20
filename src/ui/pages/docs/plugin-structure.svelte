<script lang="ts">
  import CodeFrame from '../../component/code_frame.svelte';
</script>

<section>
  <div class="space-y-8" data-test-id="docs-plugin-structure">
    <header>
      <h1 class="text-3xl font-black tracking-tight text-ink sm:text-4xl">Plugin Structure</h1>
      <p class="mt-3 text-ink-muted">Directory layout and file roles for a complete plugin.</p>
    </header>

    <div>
      <p class="text-ink-muted mb-4">A complete plugin directory looks like this:</p>

      <CodeFrame title="my-plugin/">
        <p><span class="text-blue-300">my-plugin/</span></p>
        <p><span class="text-neutral-400">&boxvr;&boxh;</span> <span class="text-green-300">package.json</span></p>
        <p><span class="text-neutral-400">&boxvr;&boxh;</span> <span class="text-green-300">tsconfig.json</span></p>
        <p><span class="text-neutral-400">&boxvr;&boxh;</span> <span class="text-green-300">permissions.json</span>   <span class="text-neutral-500">(optional)</span></p>
        <p><span class="text-neutral-400">&boxvr;&boxh;</span> <span class="text-green-300">llm.txt</span>            <span class="text-neutral-500">(optional)</span></p>
        <p><span class="text-neutral-400">&boxvr;&boxh;</span> <span class="text-green-300">setup.ts</span>           <span class="text-neutral-500">(optional)</span></p>
        <p><span class="text-neutral-400">&boxvr;&boxh;</span> <span class="text-green-300">README.md</span></p>
        <p><span class="text-neutral-400">&boxur;&boxh;</span> <span class="text-blue-300">src/</span></p>
        <p><span class="text-neutral-400">    &boxvr;&boxh;</span> <span class="text-green-300">index.ts</span>        <span class="text-neutral-500">(required - main entry)</span></p>
        <p><span class="text-neutral-400">    &boxur;&boxh;</span> <span class="text-green-300">command.ts</span>      <span class="text-neutral-500">(optional - CLI commands)</span></p>
      </CodeFrame>

      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink">package.json</p>
          <p class="text-xs text-ink-muted mt-1">Plugin metadata, entry points, and Kazibee configuration.</p>
        </div>
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink">src/index.ts</p>
          <p class="text-xs text-ink-muted mt-1">Main entry. Exports a default function returning the plugin API.</p>
        </div>
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink">src/command.ts</p>
          <p class="text-xs text-ink-muted mt-1">Named exports become CLI commands (e.g. <code class="font-mono text-xs bg-neutral-100 px-1 rounded">kazibee my-plugin login</code>).</p>
        </div>
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink">permissions.json</p>
          <p class="text-xs text-ink-muted mt-1">Declares required environment variables and their sources.</p>
        </div>
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink">llm.txt</p>
          <p class="text-xs text-ink-muted mt-1">Instructions for AI agents on how to use the plugin effectively.</p>
        </div>
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink">setup.ts</p>
          <p class="text-xs text-ink-muted mt-1">Runs once at install/link time to set SYSTEM-level env defaults.</p>
        </div>
      </div>
    </div>

    <nav class="flex items-center justify-between border-t border-neutral-100 pt-6 mt-10">
      <a href="/docs/quick-start" class="text-sm text-ink-muted hover:text-ink transition">&larr; Quick Start</a>
      <a href="/docs/package-config" class="text-sm font-semibold text-honey-600 hover:text-honey-700 transition">Next: Package Config &rarr;</a>
    </nav>
  </div>
</section>
