<script lang="ts">
  import CodeFrame from '../../component/code_frame.svelte';
  import TerminalFrame from '../../component/terminal_frame.svelte';
  import TerminalLine from '../../component/terminal_line.svelte';
</script>

<section>
  <div class="space-y-8" data-test-id="docs-permissions">
    <header>
      <h1 class="text-3xl font-black tracking-tight text-ink sm:text-4xl">Permissions</h1>
      <p class="mt-3 text-ink-muted">How your plugin declares the environment variables it needs, and how Kazibee resolves them from the right source.</p>
    </header>

    <!-- Quick reminder -->
    <div class="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p class="text-sm font-bold text-amber-900 mb-1">Quick reminder: sandbox isolation</p>
      <p class="text-xs text-amber-800">
        Your plugin runs in a sandbox. It cannot read <code class="font-mono text-xs bg-amber-100 px-1 rounded">process.env</code> or access the host machine's environment directly. The <strong>only</strong> way your plugin gets credentials is through the <code class="font-mono text-xs bg-amber-100 px-1 rounded">env</code> object passed to <code class="font-mono text-xs bg-amber-100 px-1 rounded">main(env)</code>. That object only contains variables you declared in <code class="font-mono text-xs bg-amber-100 px-1 rounded">permissions.json</code> and the user explicitly granted.
      </p>
    </div>

    <!-- Why permissions.json exists -->
    <div>
      <p class="text-sm font-bold text-ink mb-2">Why permissions.json exists</p>
      <p class="text-sm text-ink-muted mb-3">
        Because plugins are sandboxed, you cannot just call <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">process.env.MY_API_KEY</code> like you would in a normal Node app. Instead, you create a <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">permissions.json</code> file that tells Kazibee: "My plugin needs these environment variables to function."
      </p>
      <p class="text-sm text-ink-muted mb-3">
        When a user installs your plugin, Kazibee reads this file and asks them to approve each variable. At runtime, only approved variables are injected into the <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">env</code> object your <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">main(env)</code> function receives. Think of it as a permission slip &mdash; "I need access to X, do you allow it?"
      </p>
    </div>

    <!-- The structure -->
    <div class="space-y-4">
      <div>
        <p class="text-sm font-bold text-ink mb-2">The permissions.json structure</p>
        <p class="text-sm text-ink-muted mb-3">
          The file has one top-level key: <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">"env"</code>. Inside it, each key is the variable name your plugin code will see on the <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">env</code> object. The value tells Kazibee where to look for it.
        </p>
      </div>

      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">The simplest case</p>
        <p class="text-sm text-ink-muted mb-3">
          If your plugin needs one API key, your permissions file looks like this:
        </p>
        <CodeFrame title="my-plugin/permissions.json">
          <p><span class="text-neutral-400">&#123;</span></p>
          <p class="pl-4"><span class="text-blue-300">"env"</span><span class="text-neutral-400">:</span> <span class="text-neutral-400">&#123;</span></p>
          <p class="pl-8"><span class="text-blue-300">"API_KEY"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"API_KEY"</span></p>
          <p class="pl-4"><span class="text-neutral-400">&#125;</span></p>
          <p><span class="text-neutral-400">&#125;</span></p>
        </CodeFrame>
        <p class="text-xs text-ink-muted mt-2">
          The left side (<code class="font-mono text-xs bg-neutral-100 px-1 rounded">"API_KEY"</code>) is the key your plugin code uses: <code class="font-mono text-xs bg-neutral-100 px-1 rounded">env.API_KEY</code>. The right side tells Kazibee which source key to resolve.
        </p>
      </div>

      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">A plugin with many variables</p>
        <p class="text-sm text-ink-muted mb-3">
          The Chrome Browser plugin needs seven environment variables. Each one follows the same pattern:
        </p>
        <CodeFrame title="chrome-browser/permissions.json">
          <p><span class="text-neutral-400">&#123;</span></p>
          <p class="pl-4"><span class="text-blue-300">"env"</span><span class="text-neutral-400">:</span> <span class="text-neutral-400">&#123;</span></p>
          <p class="pl-8"><span class="text-blue-300">"GEMINI_API_KEY"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"GEMINI_API_KEY"</span><span class="text-neutral-400">,</span></p>
          <p class="pl-8"><span class="text-blue-300">"CHROME_PATH"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"CHROME_PATH"</span><span class="text-neutral-400">,</span></p>
          <p class="pl-8"><span class="text-blue-300">"CHROME_USER_DATA_DIR"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"CHROME_USER_DATA_DIR"</span><span class="text-neutral-400">,</span></p>
          <p class="pl-8"><span class="text-blue-300">"CHROME_HEADLESS"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"CHROME_HEADLESS"</span><span class="text-neutral-400">,</span></p>
          <p class="pl-8"><span class="text-blue-300">"CHROME_REMOTE_DEBUGGING_PORT"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"CHROME_REMOTE_DEBUGGING_PORT"</span><span class="text-neutral-400">,</span></p>
          <p class="pl-8"><span class="text-blue-300">"CHROME_CDP_URL"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"CHROME_CDP_URL"</span><span class="text-neutral-400">,</span></p>
          <p class="pl-8"><span class="text-blue-300">"CHROME_AUTO_LAUNCH"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"CHROME_AUTO_LAUNCH"</span></p>
          <p class="pl-4"><span class="text-neutral-400">&#125;</span></p>
          <p><span class="text-neutral-400">&#125;</span></p>
        </CodeFrame>
        <p class="text-xs text-ink-muted mt-2">
          At install time, the user is prompted for each of these seven variables. They grant or deny each one individually.
        </p>
      </div>

      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Don't forget package.json</p>
        <p class="text-sm text-ink-muted mb-3">
          Point to your permissions file from <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">package.json</code> so Kazibee knows where to find it:
        </p>
        <CodeFrame title="my-plugin/package.json">
          <p><span class="text-neutral-400">&#123;</span></p>
          <p class="pl-4"><span class="text-blue-300">"name"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"my-plugin"</span><span class="text-neutral-400">,</span></p>
          <p class="pl-4"><span class="text-blue-300">"kazibee"</span><span class="text-neutral-400">:</span> <span class="text-neutral-400">&#123;</span></p>
          <p class="pl-8"><span class="text-blue-300">"permissions"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"./permissions.json"</span></p>
          <p class="pl-4"><span class="text-neutral-400">&#125;</span></p>
          <p><span class="text-neutral-400">&#125;</span></p>
        </CodeFrame>
      </div>
    </div>

    <!-- Source types -->
    <div class="space-y-4">
      <div>
        <p class="text-sm font-bold text-ink mb-2">Where values come from: the four sources</p>
        <p class="text-sm text-ink-muted mb-3">
          When a user grants a permission, they choose <em>where</em> Kazibee should look for the actual value. There are four possible sources, listed from highest to lowest priority:
        </p>
      </div>

      <div class="space-y-3">
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink">LOCAL <span class="text-xs font-normal text-ink-muted ml-1">(highest priority)</span></p>
          <p class="text-xs text-ink-muted mt-1">
            Directory-scoped values, set with <code class="font-mono text-xs bg-neutral-100 px-1 rounded">kazibee env &lt;plugin&gt; --set KEY=value</code>. These only apply when Kazibee runs from that specific directory. Useful when you have different credentials per project &mdash; for example, different API keys for a staging project vs. a production project.
          </p>
        </div>
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink">ENV</p>
          <p class="text-xs text-ink-muted mt-1">
            Reads directly from the host machine's <code class="font-mono text-xs bg-neutral-100 px-1 rounded">process.env</code>. This is for values you already have set in your shell profile, <code class="font-mono text-xs bg-neutral-100 px-1 rounded">.bashrc</code>, or CI environment. Kazibee does not store the value &mdash; it reads it live at runtime.
          </p>
        </div>
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink">GLOBAL</p>
          <p class="text-xs text-ink-muted mt-1">
            User-wide values, set with <code class="font-mono text-xs bg-neutral-100 px-1 rounded">kazibee env --global &lt;plugin&gt; --set KEY=value</code>. These apply no matter which directory you run from. Good for credentials that are the same everywhere, like a personal API key.
          </p>
        </div>
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink">SYSTEM <span class="text-xs font-normal text-ink-muted ml-1">(lowest priority)</span></p>
          <p class="text-xs text-ink-muted mt-1">
            Values set automatically by a plugin's setup script during install. The plugin author writes a <code class="font-mono text-xs bg-neutral-100 px-1 rounded">setup.ts</code> that pre-populates default values (like a default database URL). These are always overridden by any other source.
          </p>
        </div>
      </div>

      <div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p class="text-sm font-bold text-blue-900 mb-1">Priority order</p>
        <p class="text-xs text-blue-800">
          When multiple sources have a value for the same key, Kazibee uses the highest-priority one: <strong>LOCAL &gt; ENV &gt; GLOBAL &gt; SYSTEM</strong>. A LOCAL value always wins. A SYSTEM value is only used if nothing else is available.
        </p>
      </div>
    </div>

    <!-- Unscoped vs scoped -->
    <div class="space-y-4">
      <div>
        <p class="text-sm font-bold text-ink mb-2">Unscoped vs. scoped candidates</p>
        <p class="text-sm text-ink-muted mb-3">
          The value side of each entry in <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">permissions.json</code> controls where Kazibee looks for the actual value. You have two options:
        </p>
      </div>

      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Unscoped (any source)</p>
        <p class="text-sm text-ink-muted mb-3">
          Just write the key name with no prefix. At install time, the user picks which source to use. If they choose "any source," Kazibee checks them in priority order: LOCAL, then ENV, then GLOBAL, then SYSTEM.
        </p>
        <CodeFrame title="permissions.json" class="mb-3">
          <p><span class="text-neutral-400">&#123;</span></p>
          <p class="pl-4"><span class="text-blue-300">"env"</span><span class="text-neutral-400">:</span> <span class="text-neutral-400">&#123;</span></p>
          <p class="pl-8"><span class="text-blue-300">"API_KEY"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"API_KEY"</span> <span class="text-neutral-500">// user picks the source at install time</span></p>
          <p class="pl-4"><span class="text-neutral-400">&#125;</span></p>
          <p><span class="text-neutral-400">&#125;</span></p>
        </CodeFrame>
        <p class="text-xs text-ink-muted">
          This is the most common pattern. Most plugins use unscoped keys exclusively.
        </p>
      </div>

      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Scoped (exact source)</p>
        <p class="text-sm text-ink-muted mb-3">
          Prefix the key with a source name to force resolution from that exact source. If the value does not exist in that source, it will not be injected &mdash; Kazibee will <strong>not</strong> silently fall back to another source.
        </p>
        <CodeFrame title="permissions.json">
          <p><span class="text-neutral-400">&#123;</span></p>
          <p class="pl-4"><span class="text-blue-300">"env"</span><span class="text-neutral-400">:</span> <span class="text-neutral-400">&#123;</span></p>
          <p class="pl-8"><span class="text-blue-300">"DB_URL"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"LOCAL:DB_URL"</span><span class="text-neutral-400">,</span> <span class="text-neutral-500">// only from local project scope</span></p>
          <p class="pl-8"><span class="text-blue-300">"SHARED_KEY"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"GLOBAL:SHARED_KEY"</span> <span class="text-neutral-500">// only from global config</span></p>
          <p class="pl-4"><span class="text-neutral-400">&#125;</span></p>
          <p><span class="text-neutral-400">&#125;</span></p>
        </CodeFrame>
        <p class="text-xs text-ink-muted mt-2">
          Use scoped candidates when you know the value should only ever come from one place. For example, a database URL that is always project-specific should be <code class="font-mono text-xs bg-neutral-100 px-1 rounded">LOCAL:DB_URL</code> so it never accidentally picks up a global value.
        </p>
      </div>
    </div>

    <!-- Array fallbacks -->
    <div class="space-y-4">
      <div>
        <p class="text-sm font-bold text-ink mb-2">Array fallbacks</p>
        <p class="text-sm text-ink-muted mb-3">
          Sometimes you want to try multiple sources in a specific order. Use an array &mdash; Kazibee tries each candidate in order and uses the first one that has a value.
        </p>
      </div>

      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Real-world example: shared API keys</p>
        <p class="text-sm text-ink-muted mb-3">
          Both the Chrome Browser plugin and the Image Gen plugin need a <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">GEMINI_API_KEY</code>. A user might already have this key set in their shell environment from installing the Chrome Browser plugin. With array fallbacks, the Image Gen plugin can reuse that existing value instead of making the user configure it again:
        </p>
        <CodeFrame title="image-gen/permissions.json">
          <p><span class="text-neutral-400">&#123;</span></p>
          <p class="pl-4"><span class="text-blue-300">"env"</span><span class="text-neutral-400">:</span> <span class="text-neutral-400">&#123;</span></p>
          <p class="pl-8"><span class="text-blue-300">"GEMINI_API_KEY"</span><span class="text-neutral-400">:</span> <span class="text-neutral-400">[</span></p>
          <p class="pl-12"><span class="text-green-300">"ENV:GEMINI_API_KEY"</span><span class="text-neutral-400">,</span> <span class="text-neutral-500">// first, check host process.env</span></p>
          <p class="pl-12"><span class="text-green-300">"GLOBAL:GEMINI_API_KEY"</span><span class="text-neutral-400">,</span> <span class="text-neutral-500">// then, check global config</span></p>
          <p class="pl-12"><span class="text-green-300">"LOCAL:GEMINI_API_KEY"</span> <span class="text-neutral-500">// finally, check local project</span></p>
          <p class="pl-8"><span class="text-neutral-400">]</span></p>
          <p class="pl-4"><span class="text-neutral-400">&#125;</span></p>
          <p><span class="text-neutral-400">&#125;</span></p>
        </CodeFrame>
        <p class="text-xs text-ink-muted mt-2">
          At install time, the user can select which candidate to use, or let Kazibee try them in order at runtime.
        </p>
      </div>
    </div>

    <!-- Key renaming -->
    <div class="space-y-4">
      <div>
        <p class="text-sm font-bold text-ink mb-2">Key renaming</p>
        <p class="text-sm text-ink-muted mb-3">
          The left side of each entry is the name your plugin code sees on the <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">env</code> object. The right side is the name Kazibee looks up in the source. These do not have to match.
        </p>
      </div>

      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">When is this useful?</p>
        <p class="text-sm text-ink-muted mb-3">
          Suppose you are building a plugin that uses the Gemini API, but your code internally calls it <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">LLM_KEY</code>. The user already has a <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">GEMINI_API_KEY</code> saved from another plugin. Instead of making them save the same key under a new name, you rename it:
        </p>
        <CodeFrame title="my-plugin/permissions.json">
          <p><span class="text-neutral-400">&#123;</span></p>
          <p class="pl-4"><span class="text-blue-300">"env"</span><span class="text-neutral-400">:</span> <span class="text-neutral-400">&#123;</span></p>
          <p class="pl-8"><span class="text-blue-300">"LLM_KEY"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"GEMINI_API_KEY"</span> <span class="text-neutral-500">// env.LLM_KEY in code, resolved from GEMINI_API_KEY source</span></p>
          <p class="pl-4"><span class="text-neutral-400">&#125;</span></p>
          <p><span class="text-neutral-400">&#125;</span></p>
        </CodeFrame>
        <p class="text-xs text-ink-muted mt-2">
          Your plugin code uses <code class="font-mono text-xs bg-neutral-100 px-1 rounded">env.LLM_KEY</code>, but the value comes from the user's existing <code class="font-mono text-xs bg-neutral-100 px-1 rounded">GEMINI_API_KEY</code>. No duplicate configuration needed.
        </p>
      </div>
    </div>

    <!-- What happens at install time -->
    <div class="space-y-4">
      <div>
        <p class="text-sm font-bold text-ink mb-2">What happens at install time</p>
        <p class="text-sm text-ink-muted mb-3">
          When a user runs <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">kazibee install</code> or <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">kazibee link</code>, Kazibee reads your <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">permissions.json</code> and shows an interactive prompt for each variable. The user selects which source to allow, or denies it entirely.
        </p>
      </div>

      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Example: installing a Gmail plugin</p>
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
            <span class="text-white">kazibee</span> <span class="text-white">link</span> <span class="text-amber-300">gmail</span> <span class="text-green-300">./gmail</span>
          </TerminalLine>
          <TerminalLine showPrompt={false}>
            <span class="text-neutral-400">Linking gmail...</span>
          </TerminalLine>
          <TerminalLine showPrompt={false}>&nbsp;</TerminalLine>
          <TerminalLine showPrompt={false}>
            <span class="text-white">Permissions required:</span>
          </TerminalLine>
          <TerminalLine showPrompt={false}>
            <span class="text-blue-300">  CLIENT_ID</span>
          </TerminalLine>
          <TerminalLine showPrompt={false}>
            <span class="text-neutral-400">  Grant from? [LOCAL / ENV / GLOBAL / SYSTEM / deny]:</span> <span class="text-green-300">LOCAL</span>
          </TerminalLine>
          <TerminalLine showPrompt={false}>
            <span class="text-blue-300">  CLIENT_SECRET</span>
          </TerminalLine>
          <TerminalLine showPrompt={false}>
            <span class="text-neutral-400">  Grant from? [LOCAL / ENV / GLOBAL / SYSTEM / deny]:</span> <span class="text-green-300">LOCAL</span>
          </TerminalLine>
          <TerminalLine showPrompt={false}>
            <span class="text-blue-300">  REFRESH_TOKEN</span>
          </TerminalLine>
          <TerminalLine showPrompt={false}>
            <span class="text-neutral-400">  Grant from? [LOCAL / ENV / GLOBAL / SYSTEM / deny]:</span> <span class="text-green-300">LOCAL</span>
          </TerminalLine>
          <TerminalLine showPrompt={false}>&nbsp;</TerminalLine>
          <TerminalLine showPrompt={false}>
            <span class="text-green-400">Linked successfully. 3 permissions granted.</span>
          </TerminalLine>
        </TerminalFrame>
        <p class="text-xs text-ink-muted mt-2">
          The user chose LOCAL for each variable, which means Kazibee will look for these values in the local project scope at runtime. They still need to set the actual values with <code class="font-mono text-xs bg-neutral-100 px-1 rounded">kazibee env</code> or a login command.
        </p>
      </div>

      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Setting the actual value</p>
        <p class="text-sm text-ink-muted mb-3">
          Granting the permission just tells Kazibee <em>where</em> to look. The user still needs to provide the actual value:
        </p>
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
            <span class="text-neutral-500"># Set a local value (only in this directory)</span>
          </TerminalLine>
          <TerminalLine>
            <span class="text-white">kazibee</span> <span class="text-white">env</span> <span class="text-amber-300">gmail</span> <span class="text-neutral-400">--set</span> <span class="text-green-300">CLIENT_ID=xxx</span> <span class="text-green-300">CLIENT_SECRET=yyy</span>
          </TerminalLine>
          <TerminalLine showPrompt={false}>&nbsp;</TerminalLine>
          <TerminalLine>
            <span class="text-neutral-500"># Or set a global value (available everywhere)</span>
          </TerminalLine>
          <TerminalLine>
            <span class="text-white">kazibee</span> <span class="text-white">env</span> <span class="text-neutral-400">--global</span> <span class="text-amber-300">gmail</span> <span class="text-neutral-400">--set</span> <span class="text-green-300">CLIENT_ID=xxx</span> <span class="text-green-300">CLIENT_SECRET=yyy</span>
          </TerminalLine>
        </TerminalFrame>
      </div>
    </div>

    <!-- Skip permissions flag -->
    <div>
      <p class="text-sm font-bold text-ink mb-2">Skipping the interactive prompts</p>
      <p class="text-sm text-ink-muted mb-3">
        In CI environments or when reinstalling a plugin you have already configured, you can skip the permission prompts:
      </p>
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
          <span class="text-white">kazibee</span> <span class="text-white">install</span> <span class="text-amber-300">gmail</span> <span class="text-neutral-400">--skip-permissions</span>
        </TerminalLine>
      </TerminalFrame>
      <p class="text-xs text-ink-muted mt-2">
        When <code class="font-mono text-xs bg-neutral-100 px-1 rounded">--skip-permissions</code> is used, any previously saved grants remain unchanged. New permissions that have never been granted will remain ungranted until the user runs the permission flow again.
      </p>
    </div>

    <!-- Runtime resolution -->
    <div class="space-y-4">
      <div>
        <p class="text-sm font-bold text-ink mb-2">What happens at runtime</p>
        <p class="text-sm text-ink-muted mb-3">
          Every time your plugin runs, Kazibee builds the <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">env</code> object by resolving each granted variable from the source the user selected:
        </p>
      </div>

      <div class="space-y-2">
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-sm">1.</span>
          <p class="text-sm text-ink-muted">For each key in <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">permissions.json</code>, check if the user granted it</p>
        </div>
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-sm">2.</span>
          <p class="text-sm text-ink-muted">Look up the value from the granted source (LOCAL store, host process.env, GLOBAL store, or SYSTEM store)</p>
        </div>
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-sm">3.</span>
          <p class="text-sm text-ink-muted">If the value exists, add it to the <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">env</code> object. If not, skip it</p>
        </div>
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-sm">4.</span>
          <p class="text-sm text-ink-muted">Pass the filtered <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">env</code> object to <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">main(env)</code></p>
        </div>
      </div>

      <div class="rounded-lg border border-red-200 bg-red-50 p-4">
        <p class="text-sm font-bold text-red-900 mb-1">No silent source substitution</p>
        <p class="text-xs text-red-800">
          If the user granted <code class="font-mono text-xs bg-red-100 px-1 rounded">ENV:API_KEY</code> but the key is not in their <code class="font-mono text-xs bg-red-100 px-1 rounded">process.env</code>, Kazibee will <strong>not</strong> silently fall back to LOCAL or GLOBAL. The variable simply will not be injected. This is a deliberate security choice &mdash; you always know exactly where your values are coming from.
        </p>
      </div>
    </div>

    <!-- Setup scripts -->
    <div class="space-y-4">
      <div>
        <p class="text-sm font-bold text-ink mb-2">Setup scripts (SYSTEM-level defaults)</p>
        <p class="text-sm text-ink-muted mb-3">
          If your plugin has sensible default values (like a default database URL or a default port), you can provide a setup script that runs once at install time. Values set by the setup script become SYSTEM-level entries &mdash; the lowest priority source, easily overridden by the user.
        </p>
      </div>

      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Declaring a setup script</p>
        <CodeFrame title="my-plugin/package.json">
          <p><span class="text-neutral-400">&#123;</span></p>
          <p class="pl-4"><span class="text-blue-300">"kazibee"</span><span class="text-neutral-400">:</span> <span class="text-neutral-400">&#123;</span></p>
          <p class="pl-8"><span class="text-blue-300">"permissions"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"./permissions.json"</span><span class="text-neutral-400">,</span></p>
          <p class="pl-8"><span class="text-blue-300">"setup"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"./setup.ts"</span></p>
          <p class="pl-4"><span class="text-neutral-400">&#125;</span></p>
          <p><span class="text-neutral-400">&#125;</span></p>
        </CodeFrame>
      </div>

      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Writing the setup script</p>
        <p class="text-sm text-ink-muted mb-3">
          Export a default function that receives an empty <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">env</code> object. Set key-value pairs on it, and they become SYSTEM-level defaults:
        </p>
        <CodeFrame title="my-plugin/setup.ts">
          <p><span class="text-purple-400">export default</span> <span class="text-purple-400">async</span> <span class="text-neutral-400">(</span><span class="text-amber-300">env</span><span class="text-neutral-400">)</span> <span class="text-purple-400">=&gt;</span> <span class="text-neutral-400">&#123;</span></p>
          <p class="pl-4"><span class="text-amber-300">env</span><span class="text-neutral-400">.</span><span class="text-blue-300">DATABASE_URL</span> <span class="text-neutral-400">=</span> <span class="text-green-300">"sqlite://local.db"</span><span class="text-neutral-400">;</span></p>
          <p class="pl-4"><span class="text-amber-300">env</span><span class="text-neutral-400">.</span><span class="text-blue-300">DEFAULT_PORT</span> <span class="text-neutral-400">=</span> <span class="text-green-300">"3000"</span><span class="text-neutral-400">;</span></p>
          <p><span class="text-neutral-400">&#125;;</span></p>
        </CodeFrame>
        <p class="text-xs text-ink-muted mt-2">
          The setup script runs before the permission prompts, so SYSTEM values are available as an option during install. If the user later sets the same key via LOCAL or GLOBAL, their value takes precedence.
        </p>
      </div>
    </div>

    <!-- Troubleshooting -->
    <div class="space-y-3">
      <p class="text-sm font-bold text-ink mb-2">Troubleshooting</p>
      <div class="rounded-lg border border-neutral-100 p-3">
        <p class="text-sm font-bold text-ink">My plugin gets an empty env object</p>
        <p class="text-xs text-ink-muted mt-1">
          Check three things: (1) Your <code class="font-mono text-xs bg-neutral-100 px-1 rounded">package.json</code> points to the correct <code class="font-mono text-xs bg-neutral-100 px-1 rounded">permissions.json</code> path. (2) The user actually granted the permissions during install (re-run <code class="font-mono text-xs bg-neutral-100 px-1 rounded">kazibee link</code> without <code class="font-mono text-xs bg-neutral-100 px-1 rounded">--skip-permissions</code> to go through the prompts again). (3) The actual values were set in the granted source with <code class="font-mono text-xs bg-neutral-100 px-1 rounded">kazibee env</code>.
        </p>
      </div>
      <div class="rounded-lg border border-neutral-100 p-3">
        <p class="text-sm font-bold text-ink">My variable is set, but the plugin does not see it</p>
        <p class="text-xs text-ink-muted mt-1">
          The value might exist in a different source than what was granted. If the user granted <code class="font-mono text-xs bg-neutral-100 px-1 rounded">ENV:API_KEY</code> but set the value with <code class="font-mono text-xs bg-neutral-100 px-1 rounded">kazibee env --set</code> (which writes to LOCAL), the plugin will not see it. Kazibee does not silently substitute sources. The source must match.
        </p>
      </div>
      <div class="rounded-lg border border-neutral-100 p-3">
        <p class="text-sm font-bold text-ink">Multiple plugins need the same key</p>
        <p class="text-xs text-ink-muted mt-1">
          Use <code class="font-mono text-xs bg-neutral-100 px-1 rounded">GLOBAL</code> source for keys shared across plugins (like <code class="font-mono text-xs bg-neutral-100 px-1 rounded">GEMINI_API_KEY</code>). Set it once with <code class="font-mono text-xs bg-neutral-100 px-1 rounded">kazibee env --global &lt;plugin&gt; --set KEY=value</code>, and grant both plugins access from GLOBAL. Alternatively, use the ENV source if the key is already in your shell environment.
        </p>
      </div>
    </div>

    <nav class="flex items-center justify-between border-t border-neutral-100 pt-6 mt-10">
      <a href="/docs/authentication" class="text-sm text-ink-muted hover:text-ink transition">&larr; Authentication</a>
      <a href="/docs/llm-instructions" class="text-sm font-semibold text-honey-600 hover:text-honey-700 transition">Next: LLM Instructions &rarr;</a>
    </nav>
  </div>
</section>
