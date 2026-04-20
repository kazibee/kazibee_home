<script lang="ts">
  import TerminalFrame from '../../component/terminal_frame.svelte';
  import TerminalLine from '../../component/terminal_line.svelte';
</script>

<section>
  <div class="space-y-8" data-test-id="docs-dev-workflow">
    <header>
      <h1 class="text-3xl font-black tracking-tight text-ink sm:text-4xl">Development Workflow</h1>
      <p class="mt-3 text-ink-muted">The complete development loop: link, configure, test, iterate. Every command explained.</p>
    </header>

    <!-- Quick reminder -->
    <div class="rounded-lg border border-honey-200 bg-honey-50 p-4">
      <p class="text-sm font-bold text-ink mb-1">Quick reminder</p>
      <p class="text-xs text-ink-muted">
        A Kazibee plugin is a TypeScript module that exports a <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">main(env)</code> function returning an object of methods. Each method becomes a tool that AI agents can call. During development, you <strong>link</strong> your local directory so Kazibee loads your code directly &mdash; no publishing required.
      </p>
    </div>

    <!-- The dev loop overview -->
    <div>
      <p class="text-sm font-bold text-ink mb-2">The development loop</p>
      <p class="text-sm text-ink-muted mb-3">
        Building a plugin is an iterative cycle. You do not need to publish anything to test your code. The typical flow looks like this:
      </p>
      <div class="space-y-2">
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-sm">1.</span>
          <p class="text-sm text-ink-muted"><strong>Link</strong> your local directory so Kazibee can find it</p>
        </div>
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-sm">2.</span>
          <p class="text-sm text-ink-muted"><strong>Verify</strong> that Kazibee loaded your plugin correctly</p>
        </div>
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-sm">3.</span>
          <p class="text-sm text-ink-muted"><strong>Configure</strong> environment variables (API keys, credentials)</p>
        </div>
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-sm">4.</span>
          <p class="text-sm text-ink-muted"><strong>Preview</strong> what AI agents will see (your LLM documentation)</p>
        </div>
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-sm">5.</span>
          <p class="text-sm text-ink-muted"><strong>Test</strong> your methods in the sandbox</p>
        </div>
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-sm">6.</span>
          <p class="text-sm text-ink-muted"><strong>Test</strong> your CLI commands</p>
        </div>
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-sm">7.</span>
          <p class="text-sm text-ink-muted"><strong>Inspect</strong> install path, type, and env vars</p>
        </div>
      </div>
      <p class="text-sm text-ink-muted mt-3">
        Let's walk through each step. You will repeat steps 2&ndash;5 frequently as you write code.
      </p>
    </div>

    <!-- Step 1: Link -->
    <div class="space-y-4">
      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Step 1 &mdash; Link your plugin for local development</p>
        <p class="text-sm text-ink-muted mb-3">
          Before Kazibee can load your plugin, it needs to know where the code lives. The <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">kazibee link</code> command creates a symlink from Kazibee's internal registry to your local project directory. Think of it like <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">npm link</code> &mdash; it tells the system "this plugin lives here, load it from this folder."
        </p>
        <p class="text-sm text-ink-muted mb-3">
          This is different from <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">kazibee install</code>, which clones a plugin from GitHub for production use. During development, you always want <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">link</code> because it points to your live working directory &mdash; every code change is picked up immediately without reinstalling.
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
        <TerminalLine showPrompt={false}>
          <span class="text-neutral-500"># Creates a symlink: Kazibee now loads from ./my-plugin</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-neutral-500"># If your plugin has permissions.json, you'll be prompted to grant variables</span>
        </TerminalLine>
      </TerminalFrame>

      <p class="text-sm text-ink-muted">
        The first argument is the name you want to register (this is how you will refer to it in all future commands). The second argument is the path to your plugin directory.
      </p>
    </div>

    <!-- Step 2: Verify -->
    <div class="space-y-4">
      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Step 2 &mdash; Verify it loaded correctly</p>
        <p class="text-sm text-ink-muted mb-3">
          After linking, run <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">kazibee show</code> to confirm Kazibee can actually load your plugin. This command reads your entry point, executes <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">main()</code>, and prints back the methods it found, along with their parameter types and return types.
        </p>
        <p class="text-sm text-ink-muted mb-3">
          This is your first sanity check. If something is wrong with your export, your types, or your <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">package.json</code> configuration, this is where you will find out.
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
          <span class="text-neutral-500"># Prints your plugin's methods, parameter types, and return types</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-neutral-500"># Example output:</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-neutral-400">&nbsp;&nbsp;hello(name: string) =&gt; Promise&lt;string&gt;</span>
        </TerminalLine>
      </TerminalFrame>

      <p class="text-sm text-ink-muted">
        If you see your methods listed, your plugin is loading correctly. Run this again after every change to your method signatures to verify the types are what you expect.
      </p>
    </div>

    <!-- Step 3: Env vars -->
    <div class="space-y-4">
      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Step 3 &mdash; Set environment variables</p>
        <p class="text-sm text-ink-muted mb-3">
          If your plugin connects to external services (APIs, databases, etc.), it needs credentials. Plugins run inside a sandbox and cannot access <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">process.env</code> directly &mdash; Kazibee injects only the specific variables you declared in <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">permissions.json</code> and that the user has granted.
        </p>
        <p class="text-sm text-ink-muted mb-3">
          Use <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">kazibee env --set</code> to provide those values. Think of this as setting secrets for your plugin &mdash; Kazibee stores them securely and passes them to <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">main(env)</code> at runtime.
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
          <span class="text-white">kazibee</span> <span class="text-white">env</span> <span class="text-amber-300">my-plugin</span> <span class="text-neutral-400">--set</span> <span class="text-green-300">API_KEY=sk-your-key</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-neutral-500"># You can set multiple variables at once:</span>
        </TerminalLine>
        <TerminalLine>
          <span class="text-white">kazibee</span> <span class="text-white">env</span> <span class="text-amber-300">my-plugin</span> <span class="text-neutral-400">--set</span> <span class="text-green-300">CLIENT_ID=xxx</span> <span class="text-green-300">CLIENT_SECRET=yyy</span>
        </TerminalLine>
      </TerminalFrame>

      <p class="text-sm text-ink-muted">
        You only need to do this once per variable. The values persist across sessions. To check what is currently set, run <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">kazibee env my-plugin</code> without the <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">--set</code> flag. For a deeper explanation of how credentials flow through the system, see the <a href="/docs/authentication" class="text-honey-600 hover:text-honey-700 underline">Authentication</a> page.
      </p>
    </div>

    <!-- Step 4: LLM docs -->
    <div class="space-y-4">
      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Step 4 &mdash; Preview LLM documentation</p>
        <p class="text-sm text-ink-muted mb-3">
          AI agents do not read your source code. They read a generated document called <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">llm.txt</code> that describes your plugin's methods, parameters, and usage examples. The <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">kazibee llm</code> command shows you exactly what an AI agent will see when it tries to use your plugin.
        </p>
        <p class="text-sm text-ink-muted mb-3">
          This matters because if the documentation is unclear, the AI will call your methods incorrectly. Review this output and ask yourself: "Would someone who has never seen my code understand how to use these methods?" If not, improve your <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">llm.txt</code> file (see <a href="/docs/llm-instructions" class="text-honey-600 hover:text-honey-700 underline">LLM Instructions</a>).
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
          <span class="text-white">kazibee</span> <span class="text-white">llm</span> <span class="text-amber-300">my-plugin</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-neutral-500"># Prints the full LLM documentation that AI agents receive</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-neutral-500"># Includes: method signatures, descriptions, and usage examples</span>
        </TerminalLine>
      </TerminalFrame>
    </div>

    <!-- Step 5: Sandbox exec -->
    <div class="space-y-4">
      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Step 5 &mdash; Test in the sandbox</p>
        <p class="text-sm text-ink-muted mb-3">
          The <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">kazibee exec</code> command runs code inside the exact same sandbox environment that AI agents use. This is important because the sandbox has restrictions (no <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">process.env</code>, no filesystem access) that might cause code to behave differently than it would in a normal Node.js process.
        </p>
        <p class="text-sm text-ink-muted mb-3">
          Pipe in a JavaScript expression that calls your plugin's methods. The expression has access to a <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">tools</code> object where each key is a registered plugin name and the value is the object returned by that plugin's <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">main()</code>.
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

      <p class="text-sm text-ink-muted">
        If the method returns data, it will be printed as JSON. If it throws an error, you will see the full stack trace. This is the fastest way to verify your plugin works end-to-end &mdash; from loading, through credential injection, to actual execution.
      </p>
    </div>

    <!-- Step 6: CLI commands -->
    <div class="space-y-4">
      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Step 6 &mdash; Test CLI commands</p>
        <p class="text-sm text-ink-muted mb-3">
          If your plugin exports functions from <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">command.ts</code> (like <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">login</code>, <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">setup</code>, or any custom commands), you can run them directly. Unlike sandbox methods, CLI commands run on the host machine with full access &mdash; they can open browsers, read files, and interact with the terminal.
        </p>
        <p class="text-sm text-ink-muted mb-3">
          The syntax is <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">kazibee &lt;plugin-name&gt; &lt;command&gt;</code>. Kazibee looks up the named export in your <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">command.ts</code> file and calls it.
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
          <span class="text-white">kazibee</span> <span class="text-amber-300">my-plugin</span> <span class="text-white">login</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-neutral-500"># Runs the "login" export from your command.ts</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-neutral-500"># Commands run on the host machine, not in the sandbox</span>
        </TerminalLine>
      </TerminalFrame>
    </div>

    <!-- Step 7: Info -->
    <div class="space-y-4">
      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Step 7 &mdash; Check plugin info</p>
        <p class="text-sm text-ink-muted mb-3">
          The <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">kazibee info</code> command shows you metadata about a registered plugin: where it is installed, whether it is linked or installed from GitHub, and what environment variables are currently configured.
        </p>
        <p class="text-sm text-ink-muted mb-3">
          This is useful for debugging &mdash; especially when you are not sure if Kazibee is loading the right directory, or if you want to double-check which env vars are set.
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
          <span class="text-white">kazibee</span> <span class="text-white">info</span> <span class="text-amber-300">my-plugin</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-neutral-500"># Shows: install path, type (linked/installed), env vars</span>
        </TerminalLine>
      </TerminalFrame>
    </div>

    <!-- Troubleshooting -->
    <div>
      <p class="text-sm font-bold text-ink mb-2">Troubleshooting</p>
      <p class="text-sm text-ink-muted mb-3">
        If something is not working, start here. These are the most common issues developers hit during the dev loop.
      </p>
      <div class="space-y-3">
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink">Plugin not loading?</p>
          <p class="text-xs text-ink-muted mt-1">Check the <code class="font-mono text-xs bg-neutral-100 px-1 rounded">"main"</code> field in your <code class="font-mono text-xs bg-neutral-100 px-1 rounded">package.json</code>. It must point to your entry file (e.g. <code class="font-mono text-xs bg-neutral-100 px-1 rounded">"./src/index.ts"</code>). Also make sure <code class="font-mono text-xs bg-neutral-100 px-1 rounded">"type"</code> is set to <code class="font-mono text-xs bg-neutral-100 px-1 rounded">"module"</code>. Run <code class="font-mono text-xs bg-neutral-100 px-1 rounded">kazibee info my-plugin</code> to verify the path Kazibee is using.</p>
        </div>
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink">Methods not showing up in <code class="font-mono text-xs bg-neutral-100 px-1 rounded">kazibee show</code>?</p>
          <p class="text-xs text-ink-muted mt-1">Make sure your <code class="font-mono text-xs bg-neutral-100 px-1 rounded">index.ts</code> has a <code class="font-mono text-xs bg-neutral-100 px-1 rounded">export default function main()</code> that returns an object. Each property on that object becomes a method. If you are using named exports instead of a default export, Kazibee will not find your methods.</p>
        </div>
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink">Auth not working?</p>
          <p class="text-xs text-ink-muted mt-1">Run <code class="font-mono text-xs bg-neutral-100 px-1 rounded">kazibee env my-plugin</code> to see what variables are currently set. If a variable is missing, use <code class="font-mono text-xs bg-neutral-100 px-1 rounded">kazibee env my-plugin --set KEY=value</code> to add it. Also check that your <code class="font-mono text-xs bg-neutral-100 px-1 rounded">permissions.json</code> declares the variable and that <code class="font-mono text-xs bg-neutral-100 px-1 rounded">package.json</code> points to <code class="font-mono text-xs bg-neutral-100 px-1 rounded">permissions.json</code> via the <code class="font-mono text-xs bg-neutral-100 px-1 rounded">"kazibee.permissions"</code> field.</p>
        </div>
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink">Changes not taking effect?</p>
          <p class="text-xs text-ink-muted mt-1">If you linked your plugin, code changes should be picked up automatically. If they are not, try unlinking and re-linking: <code class="font-mono text-xs bg-neutral-100 px-1 rounded">kazibee unlink my-plugin</code> then <code class="font-mono text-xs bg-neutral-100 px-1 rounded">kazibee link my-plugin ./my-plugin</code>.</p>
        </div>
      </div>
    </div>

    <nav class="flex items-center justify-between border-t border-neutral-100 pt-6 mt-10">
      <a href="/docs/llm-instructions" class="text-sm text-ink-muted hover:text-ink transition">&larr; LLM Instructions</a>
      <a href="/docs/publishing" class="text-sm font-semibold text-honey-600 hover:text-honey-700 transition">Next: Publishing &rarr;</a>
    </nav>
  </div>
</section>
