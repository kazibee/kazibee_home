<script lang="ts">
  import CodeFrame from '../../component/code_frame.svelte';
  import TerminalFrame from '../../component/terminal_frame.svelte';
  import TerminalLine from '../../component/terminal_line.svelte';
</script>

<section>
  <div class="space-y-8" data-test-id="docs-cli-commands">
    <header>
      <h1 class="text-3xl font-black tracking-tight text-ink sm:text-4xl">CLI Commands</h1>
      <p class="mt-3 text-ink-muted">User-facing commands that run outside the sandbox &mdash; for tasks like login flows, setup scripts, and diagnostics.</p>
    </header>

    <!-- Quick reminder -->
    <div class="rounded-xl bg-honey-50 border-2 border-honey-300 p-5">
      <p class="text-sm font-bold text-ink mb-2">Quick reminder: Two execution contexts</p>
      <p class="text-sm text-ink-muted">
        Your plugin has two types of code. The <code class="font-mono text-xs bg-white px-1.5 py-0.5 rounded">main()</code> function in <code class="font-mono text-xs bg-white px-1.5 py-0.5 rounded">index.ts</code> returns methods that run inside a sandbox &mdash; the AI agent calls these. <strong>CLI commands</strong> in <code class="font-mono text-xs bg-white px-1.5 py-0.5 rounded">command.ts</code> run outside the sandbox, in the host process, with full access to the terminal, browser, network, and filesystem. This is where you put things like OAuth login flows, setup wizards, or any task that requires user interaction.
      </p>
    </div>

    <!-- Why commands exist -->
    <div>
      <p class="text-sm font-bold text-ink mb-2">Why commands exist</p>
      <p class="text-sm text-ink-muted mb-3">
        Some things simply cannot happen inside a sandbox. Opening a browser for OAuth consent, starting an HTTP server to receive a callback, prompting the user for input, or printing diagnostic information &mdash; these all need access to the host machine. CLI commands give your plugin a way to do these things.
      </p>
      <p class="text-sm text-ink-muted">
        The most common use case is a <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">login</code> command that authenticates the user and stores credentials so the sandboxed tool methods can use them later.
      </p>
    </div>

    <!-- How it works -->
    <div>
      <p class="text-sm font-bold text-ink mb-2">How it works</p>
      <div class="space-y-2">
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-sm">1.</span>
          <p class="text-sm text-ink-muted">Create a <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">command.ts</code> file and export named functions</p>
        </div>
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-sm">2.</span>
          <p class="text-sm text-ink-muted">Point to it in <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">package.json</code> with <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">"command": "./src/command.ts"</code></p>
        </div>
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-sm">3.</span>
          <p class="text-sm text-ink-muted">Each exported function becomes a CLI command: <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">export function login</code> becomes <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">kazibee my-plugin login</code></p>
        </div>
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-sm">4.</span>
          <p class="text-sm text-ink-muted">If the function returns <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">Record&lt;string, string&gt;</code>, Kazibee automatically stores those values as env vars for the plugin</p>
        </div>
      </div>
    </div>

    <!-- Package.json setup -->
    <div class="space-y-4">
      <div>
        <p class="text-sm font-bold text-ink mb-2">Setting up package.json</p>
        <p class="text-sm text-ink-muted mb-3">
          Add a <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">"command"</code> field to your <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">package.json</code> pointing to the command module. This tells Kazibee where to find your CLI commands.
        </p>
      </div>

      <CodeFrame title="my-plugin/package.json">
        <p><span class="text-neutral-400">&#123;</span></p>
        <p class="pl-4"><span class="text-blue-300">"name"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"my-plugin"</span><span class="text-neutral-400">,</span></p>
        <p class="pl-4"><span class="text-blue-300">"type"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"module"</span><span class="text-neutral-400">,</span></p>
        <p class="pl-4"><span class="text-blue-300">"main"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"./src/index.ts"</span><span class="text-neutral-400">,</span></p>
        <p class="pl-4"><span class="text-blue-300">"command"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"./src/command.ts"</span><span class="text-neutral-400">,</span></p>
        <p class="pl-4"><span class="text-blue-300">"kazibee"</span><span class="text-neutral-400">:</span> <span class="text-neutral-400">&#123;</span></p>
        <p class="pl-8"><span class="text-blue-300">"permissions"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"./permissions.json"</span></p>
        <p class="pl-4"><span class="text-neutral-400">&#125;</span></p>
        <p><span class="text-neutral-400">&#125;</span></p>
      </CodeFrame>
    </div>

    <!-- The function signature -->
    <div class="space-y-4">
      <div>
        <p class="text-sm font-bold text-ink mb-2">The command function signature</p>
        <p class="text-sm text-ink-muted mb-3">
          Every command function receives two things: the plugin's current env vars, and any extra arguments the user typed after the command name.
        </p>
      </div>

      <CodeFrame title="Function signature">
        <p><span class="text-purple-400">export async function</span> <span class="text-blue-300">commandName</span><span class="text-neutral-400">(</span></p>
        <p class="pl-4"><span class="text-amber-300">env</span><span class="text-neutral-400">:</span> <span class="text-blue-300">Record</span><span class="text-neutral-400">&lt;</span><span class="text-blue-300">string</span><span class="text-neutral-400">,</span> <span class="text-blue-300">string</span><span class="text-neutral-400">&gt;,</span>  <span class="text-neutral-500">// plugin's current env vars</span></p>
        <p class="pl-4"><span class="text-neutral-400">...</span><span class="text-amber-300">args</span><span class="text-neutral-400">:</span> <span class="text-blue-300">string</span><span class="text-neutral-400">[]</span>                  <span class="text-neutral-500">// extra CLI arguments</span></p>
        <p><span class="text-neutral-400">):</span> <span class="text-blue-300">Promise</span><span class="text-neutral-400">&lt;</span><span class="text-blue-300">Record</span><span class="text-neutral-400">&lt;</span><span class="text-blue-300">string</span><span class="text-neutral-400">,</span> <span class="text-blue-300">string</span><span class="text-neutral-400">&gt; |</span> <span class="text-blue-300">void</span><span class="text-neutral-400">&gt;</span></p>
      </CodeFrame>

      <div class="space-y-3">
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink"><code class="font-mono text-xs bg-neutral-100 px-1 rounded">env</code></p>
          <p class="text-xs text-ink-muted mt-1">The plugin's currently stored environment variables. For example, if the user already set <code class="font-mono text-xs bg-neutral-100 px-1 rounded">CLIENT_ID</code> via <code class="font-mono text-xs bg-neutral-100 px-1 rounded">kazibee env</code>, it will be in <code class="font-mono text-xs bg-neutral-100 px-1 rounded">env.CLIENT_ID</code>. This lets commands build on previously stored credentials.</p>
        </div>
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink"><code class="font-mono text-xs bg-neutral-100 px-1 rounded">...args</code></p>
          <p class="text-xs text-ink-muted mt-1">Any additional tokens the user typed after the command name, forwarded exactly as the shell tokenized them. Kazibee does not parse flags &mdash; your command is responsible for interpreting arguments.</p>
        </div>
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink">Return value</p>
          <p class="text-xs text-ink-muted mt-1">If you return <code class="font-mono text-xs bg-neutral-100 px-1 rounded">Record&lt;string, string&gt;</code>, Kazibee automatically stores each key-value pair as an env var for the plugin. If you return <code class="font-mono text-xs bg-neutral-100 px-1 rounded">void</code>, nothing is stored. This is how login commands persist tokens without requiring a separate <code class="font-mono text-xs bg-neutral-100 px-1 rounded">kazibee env --set</code> step.</p>
        </div>
      </div>
    </div>

    <!-- How args are forwarded -->
    <div class="space-y-4">
      <div>
        <p class="text-sm font-bold text-ink mb-2">How arguments are forwarded</p>
        <p class="text-sm text-ink-muted mb-3">
          Kazibee splits the command line into three parts: the plugin name, the command name, and everything else. Everything else becomes <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">args</code>.
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
          <span class="text-white">kazibee</span> <span class="text-amber-300">gmail</span> <span class="text-white">login</span> <span class="text-green-300">my-client-id</span> <span class="text-green-300">my-client-secret</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-neutral-500">#         ^tool   ^cmd   ^args[0]         ^args[1]</span>
        </TerminalLine>
      </TerminalFrame>

      <p class="text-sm text-ink-muted">
        In this example, Kazibee calls <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">login(env, "my-client-id", "my-client-secret")</code>. Your function receives the extra arguments as the rest parameters. Kazibee does not parse <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">--flags</code> for you &mdash; tokens are forwarded exactly as-is.
      </p>
    </div>

    <!-- Complete login example -->
    <div class="space-y-4">
      <div>
        <p class="text-sm font-bold text-ink mb-2">Complete example: OAuth login command</p>
        <p class="text-sm text-ink-muted mb-3">
          This is a simplified version of the real Gmail plugin's login command. It opens a browser for OAuth consent, receives the callback, exchanges the code for tokens, and returns the credentials for auto-persistence.
        </p>
      </div>

      <CodeFrame title="my-plugin/src/command.ts">
        <p><span class="text-purple-400">import</span> <span class="text-neutral-400">&#123;</span> <span class="text-blue-300">auth</span> <span class="text-neutral-400">&#125;</span> <span class="text-purple-400">from</span> <span class="text-green-300">'@googleapis/gmail'</span><span class="text-neutral-400">;</span></p>
        <p><span class="text-purple-400">import</span> <span class="text-neutral-400">&#123;</span> <span class="text-blue-300">createServer</span> <span class="text-neutral-400">&#125;</span> <span class="text-purple-400">from</span> <span class="text-green-300">'node:http'</span><span class="text-neutral-400">;</span></p>
        <p>&nbsp;</p>
        <p><span class="text-purple-400">export interface</span> <span class="text-blue-300">LoginResult</span> <span class="text-neutral-400">&#123;</span></p>
        <p class="pl-4"><span class="text-blue-300">CLIENT_ID</span><span class="text-neutral-400">:</span> <span class="text-blue-300">string</span><span class="text-neutral-400">;</span></p>
        <p class="pl-4"><span class="text-blue-300">CLIENT_SECRET</span><span class="text-neutral-400">:</span> <span class="text-blue-300">string</span><span class="text-neutral-400">;</span></p>
        <p class="pl-4"><span class="text-blue-300">REFRESH_TOKEN</span><span class="text-neutral-400">:</span> <span class="text-blue-300">string</span><span class="text-neutral-400">;</span></p>
        <p><span class="text-neutral-400">&#125;</span></p>
        <p>&nbsp;</p>
        <p><span class="text-purple-400">export async function</span> <span class="text-blue-300">login</span><span class="text-neutral-400">(</span></p>
        <p class="pl-4"><span class="text-amber-300">env</span><span class="text-neutral-400">:</span> <span class="text-blue-300">Record</span><span class="text-neutral-400">&lt;</span><span class="text-blue-300">string</span><span class="text-neutral-400">,</span> <span class="text-blue-300">string</span><span class="text-neutral-400">&gt;,</span></p>
        <p class="pl-4"><span class="text-neutral-400">...</span><span class="text-amber-300">args</span><span class="text-neutral-400">:</span> <span class="text-blue-300">string</span><span class="text-neutral-400">[]</span></p>
        <p><span class="text-neutral-400">):</span> <span class="text-blue-300">Promise</span><span class="text-neutral-400">&lt;</span><span class="text-blue-300">LoginResult</span><span class="text-neutral-400">&gt; &#123;</span></p>
        <p class="pl-4"><span class="text-neutral-500">// CLI args override stored env values</span></p>
        <p class="pl-4"><span class="text-purple-400">const</span> <span class="text-blue-300">CLIENT_ID</span> <span class="text-neutral-400">=</span> <span class="text-amber-300">args</span><span class="text-neutral-400">[0] ||</span> <span class="text-amber-300">env</span><span class="text-neutral-400">.</span><span class="text-blue-300">CLIENT_ID</span><span class="text-neutral-400">;</span></p>
        <p class="pl-4"><span class="text-purple-400">const</span> <span class="text-blue-300">CLIENT_SECRET</span> <span class="text-neutral-400">=</span> <span class="text-amber-300">args</span><span class="text-neutral-400">[1] ||</span> <span class="text-amber-300">env</span><span class="text-neutral-400">.</span><span class="text-blue-300">CLIENT_SECRET</span><span class="text-neutral-400">;</span></p>
        <p>&nbsp;</p>
        <p class="pl-4"><span class="text-neutral-500">// Build OAuth consent URL</span></p>
        <p class="pl-4"><span class="text-purple-400">const</span> <span class="text-blue-300">oauth2</span> <span class="text-neutral-400">=</span> <span class="text-purple-400">new</span> <span class="text-blue-300">auth</span><span class="text-neutral-400">.</span><span class="text-blue-300">OAuth2</span><span class="text-neutral-400">(</span><span class="text-blue-300">CLIENT_ID</span><span class="text-neutral-400">,</span> <span class="text-blue-300">CLIENT_SECRET</span><span class="text-neutral-400">,</span> <span class="text-green-300">'http://localhost:3848'</span><span class="text-neutral-400">);</span></p>
        <p class="pl-4"><span class="text-purple-400">const</span> <span class="text-blue-300">authUrl</span> <span class="text-neutral-400">=</span> <span class="text-blue-300">oauth2</span><span class="text-neutral-400">.</span><span class="text-blue-300">generateAuthUrl</span><span class="text-neutral-400">(&#123;</span></p>
        <p class="pl-8"><span class="text-blue-300">access_type</span><span class="text-neutral-400">:</span> <span class="text-green-300">'offline'</span><span class="text-neutral-400">,</span></p>
        <p class="pl-8"><span class="text-blue-300">scope</span><span class="text-neutral-400">: [</span><span class="text-green-300">'https://...gmail.modify'</span><span class="text-neutral-400">],</span></p>
        <p class="pl-8"><span class="text-blue-300">prompt</span><span class="text-neutral-400">:</span> <span class="text-green-300">'consent'</span></p>
        <p class="pl-4"><span class="text-neutral-400">&#125;);</span></p>
        <p>&nbsp;</p>
        <p class="pl-4"><span class="text-neutral-500">// Open browser and wait for callback</span></p>
        <p class="pl-4"><span class="text-purple-400">const</span> <span class="text-blue-300">code</span> <span class="text-neutral-400">=</span> <span class="text-purple-400">await</span> <span class="text-blue-300">waitForAuthCode</span><span class="text-neutral-400">(</span><span class="text-blue-300">authUrl</span><span class="text-neutral-400">);</span></p>
        <p class="pl-4"><span class="text-purple-400">const</span> <span class="text-neutral-400">&#123;</span> <span class="text-blue-300">tokens</span> <span class="text-neutral-400">&#125; =</span> <span class="text-purple-400">await</span> <span class="text-blue-300">oauth2</span><span class="text-neutral-400">.</span><span class="text-blue-300">getToken</span><span class="text-neutral-400">(</span><span class="text-blue-300">code</span><span class="text-neutral-400">);</span></p>
        <p>&nbsp;</p>
        <p class="pl-4"><span class="text-neutral-500">// Return credentials &mdash; Kazibee auto-stores these</span></p>
        <p class="pl-4"><span class="text-purple-400">return</span> <span class="text-neutral-400">&#123;</span></p>
        <p class="pl-8"><span class="text-blue-300">CLIENT_ID</span><span class="text-neutral-400">,</span></p>
        <p class="pl-8"><span class="text-blue-300">CLIENT_SECRET</span><span class="text-neutral-400">,</span></p>
        <p class="pl-8"><span class="text-blue-300">REFRESH_TOKEN</span><span class="text-neutral-400">:</span> <span class="text-blue-300">tokens</span><span class="text-neutral-400">.</span><span class="text-blue-300">refresh_token</span></p>
        <p class="pl-4"><span class="text-neutral-400">&#125;;</span></p>
        <p><span class="text-neutral-400">&#125;</span></p>
      </CodeFrame>

      <p class="text-sm text-ink-muted">
        Because the function returns <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">&#123; CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN &#125;</code>, Kazibee stores all three as env vars. The next time the sandboxed <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">main(env)</code> runs, <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">env.REFRESH_TOKEN</code> will have the token from the login flow.
      </p>
    </div>

    <!-- Running it -->
    <div class="space-y-4">
      <div>
        <p class="text-sm font-bold text-ink mb-2">What the user sees</p>
        <p class="text-sm text-ink-muted mb-3">
          After installing the plugin, the user runs the login command. The browser opens, they authorize, and the credentials are stored automatically.
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
          <span class="text-white">kazibee</span> <span class="text-amber-300">gmail</span> <span class="text-white">login</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-neutral-500"># Browser opens &rarr; user authorizes &rarr; tokens saved</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          &nbsp;
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-neutral-500"># Or pass client credentials directly as arguments:</span>
        </TerminalLine>
        <TerminalLine>
          <span class="text-white">kazibee</span> <span class="text-amber-300">gmail</span> <span class="text-white">login</span> <span class="text-green-300">my-client-id</span> <span class="text-green-300">my-client-secret</span>
        </TerminalLine>
      </TerminalFrame>
    </div>

    <!-- Non-login example -->
    <div class="space-y-4">
      <div>
        <p class="text-sm font-bold text-ink mb-2">Non-login example: A simple API key command</p>
        <p class="text-sm text-ink-muted mb-3">
          Not every command needs a complex OAuth flow. For services that use static API keys, you might not even need a login command. But you can still create commands for other tasks. Here is a command that validates an API key is working.
        </p>
      </div>

      <CodeFrame title="my-plugin/src/command.ts">
        <p><span class="text-purple-400">export async function</span> <span class="text-blue-300">status</span><span class="text-neutral-400">(</span></p>
        <p class="pl-4"><span class="text-amber-300">env</span><span class="text-neutral-400">:</span> <span class="text-blue-300">Record</span><span class="text-neutral-400">&lt;</span><span class="text-blue-300">string</span><span class="text-neutral-400">,</span> <span class="text-blue-300">string</span><span class="text-neutral-400">&gt;</span></p>
        <p><span class="text-neutral-400">):</span> <span class="text-blue-300">Promise</span><span class="text-neutral-400">&lt;</span><span class="text-blue-300">void</span><span class="text-neutral-400">&gt; &#123;</span></p>
        <p class="pl-4"><span class="text-purple-400">if</span> <span class="text-neutral-400">(!</span><span class="text-amber-300">env</span><span class="text-neutral-400">.</span><span class="text-blue-300">API_KEY</span><span class="text-neutral-400">) &#123;</span></p>
        <p class="pl-8"><span class="text-blue-300">console</span><span class="text-neutral-400">.</span><span class="text-blue-300">log</span><span class="text-neutral-400">(</span><span class="text-green-300">'No API key set. Run: kazibee env my-plugin --set API_KEY=...'</span><span class="text-neutral-400">);</span></p>
        <p class="pl-8"><span class="text-purple-400">return</span><span class="text-neutral-400">;</span></p>
        <p class="pl-4"><span class="text-neutral-400">&#125;</span></p>
        <p>&nbsp;</p>
        <p class="pl-4"><span class="text-purple-400">const</span> <span class="text-blue-300">res</span> <span class="text-neutral-400">=</span> <span class="text-purple-400">await</span> <span class="text-blue-300">fetch</span><span class="text-neutral-400">(</span><span class="text-green-300">'https://api.example.com/me'</span><span class="text-neutral-400">, &#123;</span></p>
        <p class="pl-8"><span class="text-blue-300">headers</span><span class="text-neutral-400">: &#123;</span> <span class="text-blue-300">Authorization</span><span class="text-neutral-400">:</span> <span class="text-green-300">`Bearer $&#123;</span><span class="text-amber-300">env</span><span class="text-neutral-400">.</span><span class="text-blue-300">API_KEY</span><span class="text-green-300">&#125;`</span> <span class="text-neutral-400">&#125;</span></p>
        <p class="pl-4"><span class="text-neutral-400">&#125;);</span></p>
        <p>&nbsp;</p>
        <p class="pl-4"><span class="text-purple-400">if</span> <span class="text-neutral-400">(</span><span class="text-blue-300">res</span><span class="text-neutral-400">.</span><span class="text-blue-300">ok</span><span class="text-neutral-400">) &#123;</span></p>
        <p class="pl-8"><span class="text-purple-400">const</span> <span class="text-blue-300">user</span> <span class="text-neutral-400">=</span> <span class="text-purple-400">await</span> <span class="text-blue-300">res</span><span class="text-neutral-400">.</span><span class="text-blue-300">json</span><span class="text-neutral-400">();</span></p>
        <p class="pl-8"><span class="text-blue-300">console</span><span class="text-neutral-400">.</span><span class="text-blue-300">log</span><span class="text-neutral-400">(</span><span class="text-green-300">`Connected as $&#123;</span><span class="text-blue-300">user</span><span class="text-neutral-400">.</span><span class="text-blue-300">name</span><span class="text-green-300">&#125;`</span><span class="text-neutral-400">);</span></p>
        <p class="pl-4"><span class="text-neutral-400">&#125;</span> <span class="text-purple-400">else</span> <span class="text-neutral-400">&#123;</span></p>
        <p class="pl-8"><span class="text-blue-300">console</span><span class="text-neutral-400">.</span><span class="text-blue-300">log</span><span class="text-neutral-400">(</span><span class="text-green-300">`API key invalid (HTTP $&#123;</span><span class="text-blue-300">res</span><span class="text-neutral-400">.</span><span class="text-blue-300">status</span><span class="text-green-300">&#125;)`</span><span class="text-neutral-400">);</span></p>
        <p class="pl-4"><span class="text-neutral-400">&#125;</span></p>
        <p><span class="text-neutral-400">&#125;</span></p>
      </CodeFrame>

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
          <span class="text-white">kazibee</span> <span class="text-amber-300">my-plugin</span> <span class="text-white">status</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-green-300">Connected as Jane Doe</span>
        </TerminalLine>
      </TerminalFrame>

      <p class="text-sm text-ink-muted">
        This command returns <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">void</code>, so Kazibee does not try to store anything. It just prints output for the user. Use <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">console.log</code> in commands when you want the user to see something &mdash; return values are not auto-printed.
      </p>
    </div>

    <!-- Key concepts -->
    <div>
      <p class="text-sm font-bold text-ink mb-2">Key concepts</p>
      <div class="space-y-3">
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink">Commands run outside the sandbox</p>
          <p class="text-xs text-ink-muted mt-1">Functions in <code class="font-mono text-xs bg-neutral-100 px-1 rounded">command.ts</code> run in the host process with full access to the machine. They can open browsers, start HTTP servers, read files, and interact with the terminal. This is the opposite of <code class="font-mono text-xs bg-neutral-100 px-1 rounded">main()</code> tool methods, which run in the sandbox.</p>
        </div>
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink">Auto-persistence</p>
          <p class="text-xs text-ink-muted mt-1">Return <code class="font-mono text-xs bg-neutral-100 px-1 rounded">Record&lt;string, string&gt;</code> and Kazibee stores each key-value pair as an env var for the plugin. Return <code class="font-mono text-xs bg-neutral-100 px-1 rounded">void</code> and nothing is stored. This is how login commands save tokens without requiring a separate <code class="font-mono text-xs bg-neutral-100 px-1 rounded">kazibee env --set</code> step.</p>
        </div>
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink">Output is not auto-printed</p>
          <p class="text-xs text-ink-muted mt-1">Kazibee does not auto-print return values from commands. To show output to the user, use <code class="font-mono text-xs bg-neutral-100 px-1 rounded">console.log()</code> inside your command. Returning a <code class="font-mono text-xs bg-neutral-100 px-1 rounded">Record&lt;string, string&gt;</code> triggers env persistence only &mdash; it will not be displayed.</p>
        </div>
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink">Missing commands show available ones</p>
          <p class="text-xs text-ink-muted mt-1">If a user runs <code class="font-mono text-xs bg-neutral-100 px-1 rounded">kazibee my-plugin</code> without a command name, Kazibee prints the list of available commands (i.e. the exported function names from your <code class="font-mono text-xs bg-neutral-100 px-1 rounded">command.ts</code>). If the user types an unknown command name, they get an error with the list of valid ones.</p>
        </div>
      </div>
    </div>

    <nav class="flex items-center justify-between border-t border-neutral-100 pt-6 mt-10">
      <a href="/docs/entry-point" class="text-sm text-ink-muted hover:text-ink transition">&larr; Entry Point</a>
      <a href="/docs/authentication" class="text-sm font-semibold text-honey-600 hover:text-honey-700 transition">Next: Authentication &rarr;</a>
    </nav>
  </div>
</section>
