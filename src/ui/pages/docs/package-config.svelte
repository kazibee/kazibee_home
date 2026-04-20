<script lang="ts">
  import CodeFrame from '../../component/code_frame.svelte';
</script>

<section>
  <div class="space-y-8" data-test-id="docs-package-config">
    <header>
      <h1 class="text-3xl font-black tracking-tight text-ink sm:text-4xl">Package Configuration</h1>
      <p class="mt-3 text-ink-muted">How package.json tells Kazibee to load and run your plugin.</p>
    </header>

    <div class="space-y-3 mb-5">
      <div class="flex gap-3 items-start">
        <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded shrink-0">"name"</code>
        <p class="text-sm text-ink-muted">Your plugin's package name (can be anything, e.g. <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">my-plugin</code>)</p>
      </div>
      <div class="flex gap-3 items-start">
        <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded shrink-0">"type"</code>
        <p class="text-sm text-ink-muted">Must be <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">"module"</code></p>
      </div>
      <div class="flex gap-3 items-start">
        <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded shrink-0">"main"</code>
        <p class="text-sm text-ink-muted">Sandbox entry point: <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">"./src/index.ts"</code></p>
      </div>
      <div class="flex gap-3 items-start">
        <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded shrink-0">"command"</code>
        <p class="text-sm text-ink-muted">Optional CLI commands: <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">"./src/command.ts"</code></p>
      </div>
      <div class="flex gap-3 items-start">
        <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded shrink-0">"kazibee"</code>
        <p class="text-sm text-ink-muted">Optional config: <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">permissions</code> and <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">setup</code></p>
      </div>
    </div>

    <div>
      <p class="text-sm font-bold text-ink mb-2">Complete example:</p>
      <CodeFrame title="my-plugin/package.json">
        <p><span class="text-neutral-400">&#123;</span></p>
        <p class="pl-4"><span class="text-blue-300">"name"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"my-plugin"</span><span class="text-neutral-400">,</span></p>
        <p class="pl-4"><span class="text-blue-300">"version"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"1.0.0"</span><span class="text-neutral-400">,</span></p>
        <p class="pl-4"><span class="text-blue-300">"type"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"module"</span><span class="text-neutral-400">,</span></p>
        <p class="pl-4"><span class="text-blue-300">"main"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"./src/index.ts"</span><span class="text-neutral-400">,</span></p>
        <p class="pl-4"><span class="text-blue-300">"command"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"./src/command.ts"</span><span class="text-neutral-400">,</span></p>
        <p class="pl-4"><span class="text-blue-300">"kazibee"</span><span class="text-neutral-400">:</span> <span class="text-neutral-400">&#123;</span></p>
        <p class="pl-8"><span class="text-blue-300">"permissions"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"./permissions.json"</span><span class="text-neutral-400">,</span></p>
        <p class="pl-8"><span class="text-blue-300">"setup"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"./setup.ts"</span></p>
        <p class="pl-4"><span class="text-neutral-400">&#125;</span></p>
        <p><span class="text-neutral-400">&#125;</span></p>
      </CodeFrame>
    </div>

    <div>
      <p class="text-sm font-bold text-ink mb-2 pt-1">Setup scripts</p>
      <p class="text-sm text-ink-muted mb-3">
        The optional <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">setup</code> field points to a script that runs once at install or link time, before permission prompting.
        The script receives an <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">env</code> object and can set key-value pairs that become <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">SYSTEM</code>-level environment variables for the tool.
      </p>
      <p class="text-sm text-ink-muted mb-3">
        <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">SYSTEM</code> values have the lowest priority and are overridable by <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">GLOBAL</code>, <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">ENV</code>, and <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">LOCAL</code> sources.
        Use setup scripts to provide sensible defaults that users can override.
      </p>

      <CodeFrame title="my-plugin/setup.ts" class="mb-5">
        <p><span class="text-purple-400">export default</span> <span class="text-purple-400">async</span> <span class="text-neutral-400">(</span><span class="text-amber-300">env</span><span class="text-neutral-400">:</span> <span class="text-blue-300">Record</span><span class="text-neutral-400">&lt;</span><span class="text-blue-300">string</span><span class="text-neutral-400">,</span> <span class="text-blue-300">string</span><span class="text-neutral-400">&gt;) =&gt; &#123;</span></p>
        <p class="pl-4"><span class="text-amber-300">env</span><span class="text-neutral-400">.</span><span class="text-blue-300">DATABASE_URL</span> <span class="text-neutral-400">=</span> <span class="text-green-300">"sqlite://local.db"</span><span class="text-neutral-400">;</span></p>
        <p class="pl-4"><span class="text-amber-300">env</span><span class="text-neutral-400">.</span><span class="text-blue-300">DEFAULT_TIMEOUT</span> <span class="text-neutral-400">=</span> <span class="text-green-300">"5000"</span><span class="text-neutral-400">;</span></p>
        <p><span class="text-neutral-400">&#125;;</span></p>
      </CodeFrame>

      <p class="text-sm text-ink-muted">
        The setup script runs in the host process (not the sandbox). Existing env values are passed in so the script can modify or extend them on subsequent installs.
      </p>
    </div>

    <nav class="flex items-center justify-between border-t border-neutral-100 pt-6 mt-10">
      <a href="/docs/plugin-structure" class="text-sm text-ink-muted hover:text-ink transition">&larr; Plugin Structure</a>
      <a href="/docs/entry-point" class="text-sm font-semibold text-honey-600 hover:text-honey-700 transition">Next: Entry Point &rarr;</a>
    </nav>
  </div>
</section>
