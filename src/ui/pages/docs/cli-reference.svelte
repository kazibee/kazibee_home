<script lang="ts">
  import TerminalFrame from '../../component/terminal_frame.svelte';
  import TerminalLine from '../../component/terminal_line.svelte';
</script>

<section>
  <div class="space-y-8" data-test-id="docs-cli-reference">
    <header>
      <h1 class="text-3xl font-black tracking-tight text-ink sm:text-4xl">CLI Reference</h1>
      <p class="mt-3 text-ink-muted">Complete reference for all kazibee commands.</p>
    </header>

    <!-- Tool Discovery -->
    <div class="space-y-6">
      <div>
        <p class="text-sm font-bold text-ink mb-2">Tool Discovery</p>
        <p class="text-sm text-ink-muted mb-3">
          Commands for finding and inspecting tools available in the current directory.
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
            <span class="text-white">kazibee</span> <span class="text-white">list</span>
          </TerminalLine>
          <TerminalLine>
            <span class="text-white">kazibee</span> <span class="text-white">list</span> <span class="text-neutral-400">--all</span>
          </TerminalLine>
          <TerminalLine>
            <span class="text-white">kazibee</span> <span class="text-white">info</span>
          </TerminalLine>
          <TerminalLine>
            <span class="text-white">kazibee</span> <span class="text-white">show</span> <span class="text-amber-300">my-plugin</span>
          </TerminalLine>
        </TerminalFrame>
      </div>

      <div>
        <p class="text-sm font-bold text-ink mb-2 pt-1">list</p>
        <p class="text-sm text-ink-muted mb-3">
          List tools available in the current directory. Use <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">-a, --all</code> to list all registered tools across all directories.
        </p>
      </div>

      <div>
        <p class="text-sm font-bold text-ink mb-2 pt-1">info</p>
        <p class="text-sm text-ink-muted mb-3">
          Show detailed tool info including source, <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">.d.ts</code> path, and masked environment variables.
        </p>
      </div>

      <div>
        <p class="text-sm font-bold text-ink mb-2 pt-1">show</p>
        <p class="text-sm text-ink-muted mb-3">
          Print the combined <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">.d.ts</code> interface for a tool. Usage: <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">kazibee show [toolName]</code>.
        </p>
      </div>
    </div>

    <!-- Tool Management -->
    <div class="space-y-6">
      <div>
        <p class="text-sm font-bold text-ink mb-2">Tool Management</p>
        <p class="text-sm text-ink-muted mb-3">
          Install, link, and remove tools.
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
            <span class="text-white">kazibee</span> <span class="text-white">install</span> <span class="text-amber-300">my-plugin</span> <span class="text-green-300">github:org/my-plugin#abc123</span>
          </TerminalLine>
          <TerminalLine>
            <span class="text-white">kazibee</span> <span class="text-white">install</span> <span class="text-amber-300">my-plugin</span> <span class="text-green-300">org/my-plugin</span>
          </TerminalLine>
          <TerminalLine>
            <span class="text-white">kazibee</span> <span class="text-white">link</span> <span class="text-amber-300">my-plugin</span> <span class="text-green-300">./my-plugin</span>
          </TerminalLine>
          <TerminalLine>
            <span class="text-white">kazibee</span> <span class="text-white">uninstall</span> <span class="text-amber-300">my-plugin</span>
          </TerminalLine>
          <TerminalLine>
            <span class="text-white">kazibee</span> <span class="text-white">unlink</span> <span class="text-amber-300">my-plugin</span>
          </TerminalLine>
          <TerminalLine>
            <span class="text-white">kazibee</span> <span class="text-white">remove</span> <span class="text-amber-300">my-plugin</span> <span class="text-neutral-400">--global</span>
          </TerminalLine>
        </TerminalFrame>
      </div>

      <div>
        <p class="text-sm font-bold text-ink mb-2 pt-1">install</p>
        <p class="text-sm text-ink-muted mb-3">
          Install a tool from GitHub. Source format: <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">github:owner/repo#sha</code> or shorthand <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">owner/repo</code>.
          Flags: <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">-g, --global</code>, <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">--skip-permissions</code>.
        </p>
      </div>

      <div>
        <p class="text-sm font-bold text-ink mb-2 pt-1">link</p>
        <p class="text-sm text-ink-muted mb-3">
          Link a local tool directory for development. Path must contain <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">package.json</code>.
          Flags: <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">-g, --global</code>, <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">--skip-permissions</code>.
        </p>
      </div>

      <div>
        <p class="text-sm font-bold text-ink mb-2 pt-1">uninstall</p>
        <p class="text-sm text-ink-muted mb-3">
          Uninstall a GitHub-installed tool. Removes registration and files if orphaned.
          Flag: <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">-g, --global</code>.
          Errors if tool is linked — use <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">unlink</code> instead.
        </p>
      </div>

      <div>
        <p class="text-sm font-bold text-ink mb-2 pt-1">unlink</p>
        <p class="text-sm text-ink-muted mb-3">
          Unlink a locally-linked tool.
          Flag: <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">-g, --global</code>.
          Errors if tool is GitHub-installed — use <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">uninstall</code> instead.
        </p>
      </div>

      <div>
        <p class="text-sm font-bold text-ink mb-2 pt-1">remove</p>
        <p class="text-sm text-ink-muted mb-3">
          Remove tool registration without deleting files.
          Flag: <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">-g, --global</code>.
        </p>
      </div>
    </div>

    <!-- Environment & Config -->
    <div class="space-y-6">
      <div>
        <p class="text-sm font-bold text-ink mb-2">Environment &amp; Config</p>
        <p class="text-sm text-ink-muted mb-3">
          Manage environment variables for tools.
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
            <span class="text-white">kazibee</span> <span class="text-white">env</span> <span class="text-amber-300">my-plugin</span>
          </TerminalLine>
          <TerminalLine>
            <span class="text-white">kazibee</span> <span class="text-white">env</span> <span class="text-amber-300">my-plugin</span> <span class="text-neutral-400">--set</span> <span class="text-green-300">API_KEY=sk-your-key</span> <span class="text-green-300">SECRET=abc123</span>
          </TerminalLine>
          <TerminalLine>
            <span class="text-white">kazibee</span> <span class="text-white">env</span> <span class="text-amber-300">my-plugin</span> <span class="text-neutral-400">--delete</span> <span class="text-green-300">API_KEY</span>
          </TerminalLine>
          <TerminalLine>
            <span class="text-white">kazibee</span> <span class="text-white">env</span> <span class="text-amber-300">my-plugin</span> <span class="text-neutral-400">--global</span> <span class="text-neutral-400">--set</span> <span class="text-green-300">API_KEY=sk-your-key</span>
          </TerminalLine>
        </TerminalFrame>
      </div>

      <div>
        <p class="text-sm font-bold text-ink mb-2 pt-1">env</p>
        <p class="text-sm text-ink-muted mb-3">
          Manage environment variables for a tool. With no flags, displays current env.
          Flags: <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">--set KEY=VALUE</code> (multiple pairs),
          <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">--delete KEY</code> (multiple keys),
          <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">-g, --global</code>.
        </p>
      </div>
    </div>

    <!-- Development & Debugging -->
    <div class="space-y-6">
      <div>
        <p class="text-sm font-bold text-ink mb-2">Development &amp; Debugging</p>
        <p class="text-sm text-ink-muted mb-3">
          Commands for developing, testing, and debugging plugins.
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
            <span class="text-white">kazibee</span> <span class="text-white">spec</span>
          </TerminalLine>
          <TerminalLine>
            <span class="text-white">kazibee</span> <span class="text-white">spec</span> <span class="text-green-300">LINK_SPEC</span>
          </TerminalLine>
          <TerminalLine>
            <span class="text-white">kazibee</span> <span class="text-white">llm</span>
          </TerminalLine>
          <TerminalLine>
            <span class="text-white">kazibee</span> <span class="text-white">llm</span> <span class="text-amber-300">my-plugin</span>
          </TerminalLine>
          <TerminalLine>
            <span class="text-white">echo</span> <span class="text-green-300">'Use my-plugin to greet the world'</span> <span class="text-neutral-400">|</span> <span class="text-white">kazibee</span> <span class="text-white">exec</span>
          </TerminalLine>
          <TerminalLine>
            <span class="text-white">kazibee</span> <span class="text-white">usage</span> <span class="text-green-300">claude</span>
          </TerminalLine>
          <TerminalLine>
            <span class="text-white">kazibee</span> <span class="text-white">usage</span> <span class="text-green-300">claude</span> <span class="text-neutral-400">--install</span>
          </TerminalLine>
        </TerminalFrame>
      </div>

      <div>
        <p class="text-sm font-bold text-ink mb-2 pt-1">spec</p>
        <p class="text-sm text-ink-muted mb-3">
          List or print built-in specification documents. No argument lists all specs. With an argument, prints that spec's content.
          Available specs: <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">LINK_SPEC</code>,
          <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">PERMISSIONS_SPEC</code>,
          <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">COMMAND_ARGS</code>,
          <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">CONTEXT_SPEC</code>.
          Useful during development and for AI agents helping develop plugins.
        </p>
      </div>

      <div>
        <p class="text-sm font-bold text-ink mb-2 pt-1">llm</p>
        <p class="text-sm text-ink-muted mb-3">
          Print <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">llm.txt</code> documentation.
          No argument prints Kazibee's own <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">llm.txt</code>.
          With a tool name, prints that tool's <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">llm.txt</code>.
        </p>
      </div>

      <div>
        <p class="text-sm font-bold text-ink mb-2 pt-1">exec</p>
        <p class="text-sm text-ink-muted mb-3">
          Execute JavaScript code from stdin in a sandbox with tool access.
          Tools are available as <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">tools["name"]</code>.
        </p>
      </div>

      <div>
        <p class="text-sm font-bold text-ink mb-2 pt-1">usage</p>
        <p class="text-sm text-ink-muted mb-3">
          Print tool usage documentation. Targets: <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">claude</code>, <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">codex</code>.
          Flag: <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">--install</code> to write the skill file to <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">~/.claude/skills/kazibee/SKILL.md</code> or <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">~/.codex/skills/kazibee/SKILL.md</code>.
        </p>
      </div>
    </div>

    <!-- Plugin Commands -->
    <div class="space-y-6">
      <div>
        <p class="text-sm font-bold text-ink mb-2">Plugin Commands (Dynamic)</p>
        <p class="text-sm text-ink-muted mb-3">
          Run commands exported by installed tools. With no subcommand, lists available commands.
          Commands that return <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">Record&lt;string, string&gt;</code> are auto-persisted as environment variables.
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
            <span class="text-white">kazibee</span> <span class="text-amber-300">my-plugin</span>
          </TerminalLine>
          <TerminalLine>
            <span class="text-white">kazibee</span> <span class="text-amber-300">my-plugin</span> <span class="text-white">login</span>
          </TerminalLine>
          <TerminalLine>
            <span class="text-white">kazibee</span> <span class="text-amber-300">my-plugin</span> <span class="text-white">sync</span> <span class="text-neutral-400">--force</span>
          </TerminalLine>
        </TerminalFrame>
      </div>
    </div>

    <nav class="flex items-center justify-between border-t border-neutral-100 pt-6 mt-10">
      <a href="/docs/publishing" class="text-sm text-ink-muted hover:text-ink transition">&larr; Publishing</a>
      <span></span>
    </nav>
  </div>
</section>
