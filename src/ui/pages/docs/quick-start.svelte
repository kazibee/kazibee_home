<script lang="ts">
  import CodeFrame from '../../component/code_frame.svelte';
  import TerminalFrame from '../../component/terminal_frame.svelte';
  import TerminalLine from '../../component/terminal_line.svelte';
</script>

<section>
  <div class="space-y-8" data-test-id="docs-quick-start">
    <header>
      <h1 class="text-3xl font-black tracking-tight text-ink sm:text-4xl">Quick Start</h1>
      <p class="mt-3 text-ink-muted">Build a working plugin in 5 minutes. From an empty folder to a tested tool.</p>
    </header>

    <!-- What you're building -->
    <div>
      <p class="text-sm font-bold text-ink mb-2">What you are building</p>
      <p class="text-sm text-ink-muted mb-3">
        A Kazibee plugin is a TypeScript module that exposes methods to AI agents. When an agent needs to interact with an external service &mdash; check a calendar, send a message, query a database &mdash; it calls your plugin's methods as tools.
      </p>
      <p class="text-sm text-ink-muted mb-3">
        In this guide, you will create a simple plugin, link it for local development, and test it. By the end, you will have a working plugin that an AI agent can call.
      </p>
    </div>

    <!-- What you need -->
    <div class="rounded-lg border border-honey-200 bg-honey-50 p-4">
      <p class="text-sm font-bold text-ink mb-1">What you need</p>
      <p class="text-xs text-ink-muted">
        A minimum viable plugin requires just two files: a <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">package.json</code> that tells Kazibee about your plugin, and a <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">src/index.ts</code> that exports the methods. That is it. No build step, no configuration files, no dependencies.
      </p>
    </div>

    <!-- Step 1: Create directory + package.json -->
    <div class="space-y-4">
      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Step 1 &mdash; Create your project and package.json</p>
        <p class="text-sm text-ink-muted mb-3">
          Create a new directory for your plugin and add a <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">package.json</code>. Every field here matters:
        </p>
      </div>

      <CodeFrame title="my-plugin/package.json">
        <p><span class="text-neutral-400">&#123;</span></p>
        <p class="pl-4"><span class="text-blue-300">"name"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"my-plugin"</span><span class="text-neutral-400">,</span></p>
        <p class="pl-4"><span class="text-blue-300">"type"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"module"</span><span class="text-neutral-400">,</span></p>
        <p class="pl-4"><span class="text-blue-300">"main"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"./src/index.ts"</span></p>
        <p><span class="text-neutral-400">&#125;</span></p>
      </CodeFrame>

      <div class="space-y-2">
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-xs">&bull;</span>
          <p class="text-sm text-ink-muted"><code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">"name"</code> &mdash; Your plugin's package name. Can be anything you like.</p>
        </div>
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-xs">&bull;</span>
          <p class="text-sm text-ink-muted"><code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">"type"</code> &mdash; Must be <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">"module"</code>. Kazibee uses ES modules. Without this, imports will fail.</p>
        </div>
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-xs">&bull;</span>
          <p class="text-sm text-ink-muted"><code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">"main"</code> &mdash; Points to your entry file. This is where Kazibee looks for your <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">main()</code> function.</p>
        </div>
      </div>
    </div>

    <!-- Step 2: Write index.ts -->
    <div class="space-y-4">
      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Step 2 &mdash; Write your entry point</p>
        <p class="text-sm text-ink-muted mb-3">
          Create <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">src/index.ts</code>. Your plugin must export a default function called <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">main</code> that returns an object. Each property on that object becomes a method (tool) that AI agents can call.
        </p>
      </div>

      <CodeFrame title="my-plugin/src/index.ts">
        <p><span class="text-purple-400">export default function</span> <span class="text-blue-300">main</span><span class="text-neutral-400">() &#123;</span></p>
        <p class="pl-4"><span class="text-purple-400">return</span> <span class="text-neutral-400">&#123;</span></p>
        <p class="pl-8"><span class="text-blue-300">hello</span><span class="text-neutral-400">:</span> <span class="text-purple-400">async</span> <span class="text-neutral-400">(</span><span class="text-amber-300">name</span><span class="text-neutral-400">:</span> <span class="text-blue-300">string</span><span class="text-neutral-400">) =&gt; &#123;</span></p>
        <p class="pl-12"><span class="text-purple-400">return</span> <span class="text-green-300">`Hello, $&#123;</span><span class="text-amber-300">name</span><span class="text-green-300">&#125;!`</span><span class="text-neutral-400">;</span></p>
        <p class="pl-8"><span class="text-neutral-400">&#125;,</span></p>
        <p class="pl-8"><span class="text-blue-300">add</span><span class="text-neutral-400">:</span> <span class="text-purple-400">async</span> <span class="text-neutral-400">(</span><span class="text-amber-300">a</span><span class="text-neutral-400">:</span> <span class="text-blue-300">number</span><span class="text-neutral-400">,</span> <span class="text-amber-300">b</span><span class="text-neutral-400">:</span> <span class="text-blue-300">number</span><span class="text-neutral-400">) =&gt; &#123;</span></p>
        <p class="pl-12"><span class="text-purple-400">return</span> <span class="text-amber-300">a</span> <span class="text-neutral-400">+</span> <span class="text-amber-300">b</span><span class="text-neutral-400">;</span></p>
        <p class="pl-8"><span class="text-neutral-400">&#125;</span></p>
        <p class="pl-4"><span class="text-neutral-400">&#125;;</span></p>
        <p><span class="text-neutral-400">&#125;</span></p>
      </CodeFrame>

      <p class="text-sm text-ink-muted">
        That is your entire plugin. The <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">hello</code> method takes a name and returns a greeting. The <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">add</code> method takes two numbers and returns their sum. When an AI agent calls <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">tools["my-plugin"].hello("world")</code>, it gets back <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">"Hello, world!"</code>.
      </p>
    </div>

    <!-- Step 3: Link -->
    <div class="space-y-4">
      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Step 3 &mdash; Link it for local development</p>
        <p class="text-sm text-ink-muted mb-3">
          Now tell Kazibee where your plugin code lives. The <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">link</code> command creates a symlink from Kazibee's internal registry to your local directory. This is for development &mdash; every time you edit your code, Kazibee picks up the changes automatically.
        </p>
        <p class="text-sm text-ink-muted mb-3">
          (For production, you would use <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">kazibee install</code> to clone from GitHub. But during development, <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">link</code> is what you want.)
        </p>
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
          <span class="text-white">kazibee</span> <span class="text-white">link</span> <span class="text-amber-300">my-plugin</span> <span class="text-green-300">./my-plugin</span>
        </TerminalLine>
      </TerminalFrame>

      <p class="text-sm text-ink-muted">
        The first argument (<code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">my-plugin</code>) is the name you are registering. The second (<code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">./my-plugin</code>) is the path to your plugin directory.
      </p>
    </div>

    <!-- Step 4: Verify -->
    <div class="space-y-4">
      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Step 4 &mdash; Verify it loaded</p>
        <p class="text-sm text-ink-muted mb-3">
          Run <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">kazibee show</code> to confirm Kazibee loaded your plugin and can see its methods. This reads your entry point, calls <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">main()</code>, and prints the methods it found.
        </p>
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
          <span class="text-white">kazibee</span> <span class="text-white">show</span> <span class="text-amber-300">my-plugin</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-neutral-500"># You should see your methods listed:</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-neutral-400">&nbsp;&nbsp;hello(name: string) =&gt; Promise&lt;string&gt;</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-neutral-400">&nbsp;&nbsp;add(a: number, b: number) =&gt; Promise&lt;number&gt;</span>
        </TerminalLine>
      </TerminalFrame>

      <p class="text-sm text-ink-muted">
        If you see your methods with their types, everything is working. If not, check the <a href="/docs/dev-workflow" class="text-honey-600 hover:text-honey-700 underline">Development Workflow</a> troubleshooting section.
      </p>
    </div>

    <!-- Step 5: Test -->
    <div class="space-y-4">
      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Step 5 &mdash; Test it</p>
        <p class="text-sm text-ink-muted mb-3">
          Use <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">kazibee exec</code> to run your plugin's methods in the same sandbox environment that AI agents use. Pipe in a JavaScript expression and see the result.
        </p>
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
          <span class="text-white">echo</span> <span class="text-green-300">'return await tools["my-plugin"].hello("world")'</span> <span class="text-neutral-400">|</span> <span class="text-white">kazibee</span> <span class="text-white">exec</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-neutral-400">&nbsp;&nbsp;"Hello, world!"</span>
        </TerminalLine>
      </TerminalFrame>

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
          <span class="text-white">echo</span> <span class="text-green-300">'return await tools["my-plugin"].add(2, 3)'</span> <span class="text-neutral-400">|</span> <span class="text-white">kazibee</span> <span class="text-white">exec</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-neutral-400">&nbsp;&nbsp;5</span>
        </TerminalLine>
      </TerminalFrame>

      <p class="text-sm text-ink-muted">
        Your plugin is working. An AI agent can now call these methods as tools.
      </p>
    </div>

    <!-- Adding auth note -->
    <div class="rounded-lg border border-neutral-100 p-4">
      <p class="text-sm font-bold text-ink mb-1">Need API keys or credentials?</p>
      <p class="text-xs text-ink-muted">
        If your plugin connects to an external service, you will need to declare environment variables and set up authentication. See the <a href="/docs/authentication" class="text-honey-600 hover:text-honey-700 underline">Authentication</a> page for the full walkthrough &mdash; it covers API keys, OAuth2, and how credentials flow through the sandbox.
      </p>
    </div>

    <!-- What's next -->
    <div>
      <p class="text-sm font-bold text-ink mb-2">What to read next</p>
      <div class="space-y-2">
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-xs">&bull;</span>
          <p class="text-sm text-ink-muted"><a href="/docs/plugin-structure" class="text-honey-600 hover:text-honey-700 underline">Plugin Structure</a> &mdash; Understand the full file layout: index.ts, command.ts, permissions.json, and llm.txt</p>
        </div>
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-xs">&bull;</span>
          <p class="text-sm text-ink-muted"><a href="/docs/entry-point" class="text-honey-600 hover:text-honey-700 underline">Entry Point</a> &mdash; Deep dive into the <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">main(env)</code> function, return types, and how Kazibee discovers your methods</p>
        </div>
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-xs">&bull;</span>
          <p class="text-sm text-ink-muted"><a href="/docs/dev-workflow" class="text-honey-600 hover:text-honey-700 underline">Development Workflow</a> &mdash; The full dev loop with every command explained, plus troubleshooting tips</p>
        </div>
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-xs">&bull;</span>
          <p class="text-sm text-ink-muted"><a href="/docs/authentication" class="text-honey-600 hover:text-honey-700 underline">Authentication</a> &mdash; Set up API keys, OAuth2, and credential management for your plugin</p>
        </div>
      </div>
    </div>

    <nav class="flex items-center justify-between border-t border-neutral-100 pt-6 mt-10">
      <a href="/docs" class="text-sm text-ink-muted hover:text-ink transition">&larr; Overview</a>
      <a href="/docs/plugin-structure" class="text-sm font-semibold text-honey-600 hover:text-honey-700 transition">Next: Plugin Structure &rarr;</a>
    </nav>
  </div>
</section>
