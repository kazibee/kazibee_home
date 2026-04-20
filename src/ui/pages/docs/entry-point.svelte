<script lang="ts">
  import CodeFrame from '../../component/code_frame.svelte';
  import TerminalFrame from '../../component/terminal_frame.svelte';
  import TerminalLine from '../../component/terminal_line.svelte';
</script>

<section>
  <div class="space-y-8" data-test-id="docs-entry-point">
    <header>
      <h1 class="text-3xl font-black tracking-tight text-ink sm:text-4xl">Main Entry Point</h1>
      <p class="mt-3 text-ink-muted">Your plugin's <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">index.ts</code> is the single file Kazibee loads at runtime. What you export from here becomes the tools an AI agent can use.</p>
    </header>

    <!-- Quick reminder -->
    <div class="rounded-xl bg-honey-50 border-2 border-honey-300 p-5">
      <p class="text-sm font-bold text-ink mb-2">Quick reminder: How plugins work</p>
      <p class="text-sm text-ink-muted">
        Your plugin is not a standalone app. Kazibee loads it, calls your <code class="font-mono text-xs bg-white px-1.5 py-0.5 rounded">main(env)</code> function, and takes whatever object you return. Each property on that object becomes a tool method that an AI agent can call. Think of it like registering API endpoints &mdash; except instead of HTTP routes, you are registering functions that an AI can invoke.
      </p>
    </div>

    <!-- The big picture -->
    <div>
      <p class="text-sm font-bold text-ink mb-2">The big picture</p>
      <p class="text-sm text-ink-muted mb-3">
        Here is exactly what happens when an AI agent runs your plugin:
      </p>
      <div class="space-y-2">
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-sm">1.</span>
          <p class="text-sm text-ink-muted">Kazibee reads your <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">package.json</code> to find <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">"main": "./src/index.ts"</code></p>
        </div>
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-sm">2.</span>
          <p class="text-sm text-ink-muted">It imports your <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">index.ts</code> and grabs the <strong>default export</strong> (your <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">main</code> function)</p>
        </div>
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-sm">3.</span>
          <p class="text-sm text-ink-muted">It calls <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">main(env)</code> with the sandboxed environment variables your plugin declared in <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">permissions.json</code></p>
        </div>
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-sm">4.</span>
          <p class="text-sm text-ink-muted">Whatever object you return becomes <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">tools["your-plugin"]</code> &mdash; each property is a method the AI can call</p>
        </div>
      </div>
    </div>

    <!-- Simplest possible example -->
    <div class="space-y-4">
      <div>
        <p class="text-sm font-bold text-ink mb-2">Start here: The simplest plugin</p>
        <p class="text-sm text-ink-muted mb-3">
          If your plugin does not need any credentials or API keys, you can ignore the <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">env</code> parameter entirely. Just export a default function that returns an object of methods.
        </p>
      </div>

      <CodeFrame title="my-plugin/src/index.ts">
        <p><span class="text-purple-400">export default function</span> <span class="text-blue-300">main</span><span class="text-neutral-400">() &#123;</span></p>
        <p class="pl-4"><span class="text-purple-400">return</span> <span class="text-neutral-400">&#123;</span></p>
        <p class="pl-8"><span class="text-blue-300">greet</span><span class="text-neutral-400">:</span> <span class="text-purple-400">async</span> <span class="text-neutral-400">(</span><span class="text-amber-300">name</span><span class="text-neutral-400">:</span> <span class="text-blue-300">string</span><span class="text-neutral-400">) =&gt; &#123;</span></p>
        <p class="pl-12"><span class="text-purple-400">return</span> <span class="text-green-300">`Hello, $&#123;</span><span class="text-amber-300">name</span><span class="text-green-300">&#125;!`</span><span class="text-neutral-400">;</span></p>
        <p class="pl-8"><span class="text-neutral-400">&#125;,</span></p>
        <p class="pl-8"><span class="text-blue-300">add</span><span class="text-neutral-400">:</span> <span class="text-purple-400">async</span> <span class="text-neutral-400">(</span><span class="text-amber-300">a</span><span class="text-neutral-400">:</span> <span class="text-blue-300">number</span><span class="text-neutral-400">,</span> <span class="text-amber-300">b</span><span class="text-neutral-400">:</span> <span class="text-blue-300">number</span><span class="text-neutral-400">) =&gt; &#123;</span></p>
        <p class="pl-12"><span class="text-purple-400">return</span> <span class="text-amber-300">a</span> <span class="text-neutral-400">+</span> <span class="text-amber-300">b</span><span class="text-neutral-400">;</span></p>
        <p class="pl-8"><span class="text-neutral-400">&#125;</span></p>
        <p class="pl-4"><span class="text-neutral-400">&#125;;</span></p>
        <p><span class="text-neutral-400">&#125;</span></p>
      </CodeFrame>

      <p class="text-sm text-ink-muted">
        That is a complete plugin. When an AI agent loads it, the agent can call:
      </p>

      <CodeFrame title="What the AI agent sees">
        <p><span class="text-purple-400">await</span> <span class="text-blue-300">tools</span><span class="text-neutral-400">[</span><span class="text-green-300">"my-plugin"</span><span class="text-neutral-400">].</span><span class="text-blue-300">greet</span><span class="text-neutral-400">(</span><span class="text-green-300">"world"</span><span class="text-neutral-400">)</span>  <span class="text-neutral-500">// "Hello, world!"</span></p>
        <p><span class="text-purple-400">await</span> <span class="text-blue-300">tools</span><span class="text-neutral-400">[</span><span class="text-green-300">"my-plugin"</span><span class="text-neutral-400">].</span><span class="text-blue-300">add</span><span class="text-neutral-400">(</span><span class="text-amber-300">2</span><span class="text-neutral-400">,</span> <span class="text-amber-300">3</span><span class="text-neutral-400">)</span>          <span class="text-neutral-500">// 5</span></p>
      </CodeFrame>

      <p class="text-sm text-ink-muted">
        The plugin name in <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">tools["my-plugin"]</code> comes from the name you used when you installed or linked the plugin with Kazibee. Each method name (<code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">greet</code>, <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">add</code>) is whatever key you put on the returned object.
      </p>
    </div>

    <!-- What is env? -->
    <div class="space-y-4">
      <div>
        <p class="text-sm font-bold text-ink mb-2">What is the <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">env</code> parameter?</p>
        <p class="text-sm text-ink-muted mb-3">
          Most real plugins need credentials &mdash; an API key, OAuth tokens, or some secret. Your <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">main</code> function receives these as the <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">env</code> parameter.
        </p>
        <p class="text-sm text-ink-muted mb-3">
          This is <strong>not</strong> the same as <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">process.env</code>. Plugins run inside a sandbox. The <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">env</code> object only contains the specific variables you declared in your <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">permissions.json</code> that the user has granted. Nothing more.
        </p>
      </div>

      <div class="rounded-lg border border-neutral-100 p-3">
        <p class="text-sm font-bold text-ink">Sandbox isolation</p>
        <p class="text-xs text-ink-muted mt-1">Your plugin cannot access <code class="font-mono text-xs bg-neutral-100 px-1 rounded">process.env</code>, the filesystem, or anything on the host machine. The <code class="font-mono text-xs bg-neutral-100 px-1 rounded">env</code> parameter is the only way your plugin receives external data. If you declared <code class="font-mono text-xs bg-neutral-100 px-1 rounded">CLIENT_ID</code> in <code class="font-mono text-xs bg-neutral-100 px-1 rounded">permissions.json</code>, then <code class="font-mono text-xs bg-neutral-100 px-1 rounded">env.CLIENT_ID</code> is the only way to get it.</p>
      </div>
    </div>

    <!-- Real-world pattern: with auth -->
    <div class="space-y-4">
      <div>
        <p class="text-sm font-bold text-ink mb-2">Real-world pattern: Plugin with authentication</p>
        <p class="text-sm text-ink-muted mb-3">
          In practice, most plugins follow a consistent three-file pattern. Here is how a Gmail plugin does it &mdash; this is based on real production code.
        </p>
      </div>

      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Step 1 &mdash; Define a typed Env interface in auth.ts</p>
        <p class="text-sm text-ink-muted mb-3">
          Create an <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">Env</code> interface that matches the variable names in your <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">permissions.json</code>. This gives you type safety &mdash; TypeScript will catch misspelled variable names at compile time. The <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">createAuthClient</code> function validates the credentials and creates an authenticated OAuth2 client.
        </p>
        <CodeFrame title="gmail/src/auth.ts">
          <p><span class="text-purple-400">import</span> <span class="text-neutral-400">&#123;</span> <span class="text-blue-300">auth</span> <span class="text-neutral-400">&#125;</span> <span class="text-purple-400">from</span> <span class="text-green-300">'@googleapis/gmail'</span><span class="text-neutral-400">;</span></p>
          <p>&nbsp;</p>
          <p><span class="text-purple-400">export interface</span> <span class="text-blue-300">Env</span> <span class="text-neutral-400">&#123;</span></p>
          <p class="pl-4"><span class="text-blue-300">CLIENT_ID</span><span class="text-neutral-400">:</span> <span class="text-blue-300">string</span><span class="text-neutral-400">;</span></p>
          <p class="pl-4"><span class="text-blue-300">CLIENT_SECRET</span><span class="text-neutral-400">:</span> <span class="text-blue-300">string</span><span class="text-neutral-400">;</span></p>
          <p class="pl-4"><span class="text-blue-300">REFRESH_TOKEN</span><span class="text-neutral-400">:</span> <span class="text-blue-300">string</span><span class="text-neutral-400">;</span></p>
          <p><span class="text-neutral-400">&#125;</span></p>
          <p>&nbsp;</p>
          <p><span class="text-purple-400">export function</span> <span class="text-blue-300">createAuthClient</span><span class="text-neutral-400">(</span><span class="text-amber-300">env</span><span class="text-neutral-400">:</span> <span class="text-blue-300">Env</span><span class="text-neutral-400">) &#123;</span></p>
          <p class="pl-4"><span class="text-purple-400">const</span> <span class="text-blue-300">oauth2</span> <span class="text-neutral-400">=</span> <span class="text-purple-400">new</span> <span class="text-blue-300">auth</span><span class="text-neutral-400">.</span><span class="text-blue-300">OAuth2</span><span class="text-neutral-400">(</span></p>
          <p class="pl-8"><span class="text-amber-300">env</span><span class="text-neutral-400">.</span><span class="text-blue-300">CLIENT_ID</span><span class="text-neutral-400">,</span></p>
          <p class="pl-8"><span class="text-amber-300">env</span><span class="text-neutral-400">.</span><span class="text-blue-300">CLIENT_SECRET</span></p>
          <p class="pl-4"><span class="text-neutral-400">);</span></p>
          <p class="pl-4"><span class="text-blue-300">oauth2</span><span class="text-neutral-400">.</span><span class="text-blue-300">setCredentials</span><span class="text-neutral-400">(&#123;</span></p>
          <p class="pl-8"><span class="text-blue-300">refresh_token</span><span class="text-neutral-400">:</span> <span class="text-amber-300">env</span><span class="text-neutral-400">.</span><span class="text-blue-300">REFRESH_TOKEN</span></p>
          <p class="pl-4"><span class="text-neutral-400">&#125;);</span></p>
          <p class="pl-4"><span class="text-purple-400">return</span> <span class="text-blue-300">oauth2</span><span class="text-neutral-400">;</span></p>
          <p><span class="text-neutral-400">&#125;</span></p>
        </CodeFrame>
      </div>

      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Step 2 &mdash; Use it in index.ts</p>
        <p class="text-sm text-ink-muted mb-3">
          Your <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">main(env)</code> imports the <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">Env</code> type for safety, creates an authenticated client, and returns the plugin's methods. The returned object's methods become the tools.
        </p>
        <CodeFrame title="gmail/src/index.ts">
          <p><span class="text-purple-400">import</span> <span class="text-neutral-400">&#123;</span> <span class="text-blue-300">createAuthClient</span><span class="text-neutral-400">,</span> <span class="text-purple-400">type</span> <span class="text-blue-300">Env</span> <span class="text-neutral-400">&#125;</span> <span class="text-purple-400">from</span> <span class="text-green-300">'./auth'</span><span class="text-neutral-400">;</span></p>
          <p><span class="text-purple-400">import</span> <span class="text-neutral-400">&#123;</span> <span class="text-blue-300">createGmailClient</span> <span class="text-neutral-400">&#125;</span> <span class="text-purple-400">from</span> <span class="text-green-300">'./gmail-client'</span><span class="text-neutral-400">;</span></p>
          <p>&nbsp;</p>
          <p><span class="text-neutral-500">// Re-export Env so Kazibee can use it for type generation</span></p>
          <p><span class="text-purple-400">export type</span> <span class="text-neutral-400">&#123;</span> <span class="text-blue-300">Env</span> <span class="text-neutral-400">&#125;</span> <span class="text-purple-400">from</span> <span class="text-green-300">'./auth'</span><span class="text-neutral-400">;</span></p>
          <p>&nbsp;</p>
          <p><span class="text-purple-400">export default function</span> <span class="text-blue-300">main</span><span class="text-neutral-400">(</span><span class="text-amber-300">env</span><span class="text-neutral-400">:</span> <span class="text-blue-300">Env</span><span class="text-neutral-400">) &#123;</span></p>
          <p class="pl-4"><span class="text-purple-400">const</span> <span class="text-blue-300">auth</span> <span class="text-neutral-400">=</span> <span class="text-blue-300">createAuthClient</span><span class="text-neutral-400">(</span><span class="text-amber-300">env</span><span class="text-neutral-400">);</span></p>
          <p class="pl-4"><span class="text-purple-400">return</span> <span class="text-blue-300">createGmailClient</span><span class="text-neutral-400">(</span><span class="text-blue-300">auth</span><span class="text-neutral-400">);</span></p>
          <p><span class="text-neutral-400">&#125;</span></p>
        </CodeFrame>
      </div>

      <p class="text-sm text-ink-muted">
        That is the entire entry point. The <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">createGmailClient</code> function returns an object like <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">&#123; listMessages, sendMessage, getMessage, ... &#125;</code>, and each of those becomes a tool the AI agent can call via <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">tools["gmail"].listMessages()</code>.
      </p>
    </div>

    <!-- What you return matters -->
    <div class="space-y-4">
      <div>
        <p class="text-sm font-bold text-ink mb-2">What you return matters</p>
        <p class="text-sm text-ink-muted mb-3">
          The object you return from <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">main()</code> has a direct, concrete effect. Here is how the mapping works:
        </p>
      </div>

      <CodeFrame title="Your index.ts">
        <p><span class="text-purple-400">export default function</span> <span class="text-blue-300">main</span><span class="text-neutral-400">(</span><span class="text-amber-300">env</span><span class="text-neutral-400">:</span> <span class="text-blue-300">Env</span><span class="text-neutral-400">) &#123;</span></p>
        <p class="pl-4"><span class="text-purple-400">return</span> <span class="text-neutral-400">&#123;</span></p>
        <p class="pl-8"><span class="text-blue-300">getUser</span><span class="text-neutral-400">:</span>    <span class="text-purple-400">async</span> <span class="text-neutral-400">() =&gt;</span> <span class="text-neutral-400">&#123;</span> <span class="text-neutral-500">/* ... */</span> <span class="text-neutral-400">&#125;,</span></p>
        <p class="pl-8"><span class="text-blue-300">listItems</span><span class="text-neutral-400">:</span>  <span class="text-purple-400">async</span> <span class="text-neutral-400">(</span><span class="text-amber-300">query</span><span class="text-neutral-400">:</span> <span class="text-blue-300">string</span><span class="text-neutral-400">) =&gt;</span> <span class="text-neutral-400">&#123;</span> <span class="text-neutral-500">/* ... */</span> <span class="text-neutral-400">&#125;,</span></p>
        <p class="pl-8"><span class="text-blue-300">createItem</span><span class="text-neutral-400">:</span> <span class="text-purple-400">async</span> <span class="text-neutral-400">(</span><span class="text-amber-300">data</span><span class="text-neutral-400">:</span> <span class="text-blue-300">ItemInput</span><span class="text-neutral-400">) =&gt;</span> <span class="text-neutral-400">&#123;</span> <span class="text-neutral-500">/* ... */</span> <span class="text-neutral-400">&#125;</span></p>
        <p class="pl-4"><span class="text-neutral-400">&#125;;</span></p>
        <p><span class="text-neutral-400">&#125;</span></p>
      </CodeFrame>

      <CodeFrame title="What the AI agent can call">
        <p><span class="text-purple-400">await</span> <span class="text-blue-300">tools</span><span class="text-neutral-400">[</span><span class="text-green-300">"my-plugin"</span><span class="text-neutral-400">].</span><span class="text-blue-300">getUser</span><span class="text-neutral-400">()</span></p>
        <p><span class="text-purple-400">await</span> <span class="text-blue-300">tools</span><span class="text-neutral-400">[</span><span class="text-green-300">"my-plugin"</span><span class="text-neutral-400">].</span><span class="text-blue-300">listItems</span><span class="text-neutral-400">(</span><span class="text-green-300">"active"</span><span class="text-neutral-400">)</span></p>
        <p><span class="text-purple-400">await</span> <span class="text-blue-300">tools</span><span class="text-neutral-400">[</span><span class="text-green-300">"my-plugin"</span><span class="text-neutral-400">].</span><span class="text-blue-300">createItem</span><span class="text-neutral-400">(&#123;</span> <span class="text-blue-300">name</span><span class="text-neutral-400">:</span> <span class="text-green-300">"New item"</span> <span class="text-neutral-400">&#125;)</span></p>
      </CodeFrame>

      <p class="text-sm text-ink-muted">
        Keep your method signatures clear and well-typed. The AI agent reads your TypeScript types to understand what arguments each method expects and what it returns.
      </p>
    </div>

    <!-- Trying it out -->
    <div class="space-y-4">
      <div>
        <p class="text-sm font-bold text-ink mb-2">Trying it out</p>
        <p class="text-sm text-ink-muted mb-3">
          Once your plugin is linked, you can test it immediately from the terminal:
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
          <span class="text-white">echo</span> <span class="text-green-300">'return await tools["my-plugin"].greet("world")'</span> <span class="text-neutral-400">|</span> <span class="text-white">kazibee</span> <span class="text-white">exec</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-green-300">Hello, world!</span>
        </TerminalLine>
      </TerminalFrame>

      <p class="text-sm text-ink-muted">
        The <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">kazibee exec</code> command loads all installed plugins, calls each plugin's <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">main(env)</code>, and makes the returned methods available as <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">tools</code>. Your code runs inside that context.
      </p>
    </div>

    <!-- Re-exporting the Env type -->
    <div class="space-y-4">
      <div>
        <p class="text-sm font-bold text-ink mb-2">Re-exporting the Env type</p>
        <p class="text-sm text-ink-muted mb-3">
          You may have noticed this line in the Gmail example:
        </p>
      </div>

      <CodeFrame title="my-plugin/src/index.ts">
        <p><span class="text-purple-400">export type</span> <span class="text-neutral-400">&#123;</span> <span class="text-blue-300">Env</span> <span class="text-neutral-400">&#125;</span> <span class="text-purple-400">from</span> <span class="text-green-300">'./auth'</span><span class="text-neutral-400">;</span></p>
      </CodeFrame>

      <p class="text-sm text-ink-muted">
        This re-exports the <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">Env</code> interface from your entry point so Kazibee can read it for type generation. The pattern is: define <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">Env</code> in <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">auth.ts</code> (so your auth logic has access to it), then re-export it from <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">index.ts</code> (so Kazibee can find it).
      </p>
    </div>

    <!-- The pattern is the same -->
    <div class="rounded-xl bg-honey-50 border-2 border-honey-300 p-5">
      <p class="text-sm font-bold text-ink mb-2">The pattern is always the same</p>
      <p class="text-sm text-ink-muted">
        Whether your plugin uses an API key, OAuth tokens, or no auth at all, the entry point structure is identical: import auth helper, import client factory, wire them together in <code class="font-mono text-xs bg-white px-1.5 py-0.5 rounded">main()</code>. The only thing that changes is what variables are in <code class="font-mono text-xs bg-white px-1.5 py-0.5 rounded">env</code>.
      </p>
    </div>

    <!-- Common mistakes -->
    <div class="space-y-4">
      <div>
        <p class="text-sm font-bold text-ink mb-2">Common mistakes</p>
        <p class="text-sm text-ink-muted mb-3">
          If your plugin is not working, check these first:
        </p>
      </div>

      <div class="space-y-3">
        <div class="rounded-lg border border-red-100 bg-red-50/50 p-3">
          <p class="text-sm font-bold text-ink">Forgetting <code class="font-mono text-xs bg-white px-1 rounded">export default</code></p>
          <p class="text-xs text-ink-muted mt-1">Kazibee looks for the <strong>default export</strong> of your module. A named export like <code class="font-mono text-xs bg-white px-1 rounded">export function main()</code> will not work. It must be <code class="font-mono text-xs bg-white px-1 rounded">export default function main()</code>.</p>
        </div>

        <div class="rounded-lg border border-red-100 bg-red-50/50 p-3">
          <p class="text-sm font-bold text-ink">Returning a class instead of an object</p>
          <p class="text-xs text-ink-muted mt-1">Kazibee expects a plain object with method properties. If you return <code class="font-mono text-xs bg-white px-1 rounded">new MyClient()</code>, the class instance's methods may not be enumerable. Return a plain object: <code class="font-mono text-xs bg-white px-1 rounded">&#123; getUser: async () =&gt; ... &#125;</code>.</p>
        </div>

        <div class="rounded-lg border border-red-100 bg-red-50/50 p-3">
          <p class="text-sm font-bold text-ink">Trying to access <code class="font-mono text-xs bg-white px-1 rounded">process.env</code></p>
          <p class="text-xs text-ink-muted mt-1">This will not work in the sandbox. All credentials must come through the <code class="font-mono text-xs bg-white px-1 rounded">env</code> parameter. If you need a variable, declare it in <code class="font-mono text-xs bg-white px-1 rounded">permissions.json</code> and read it from <code class="font-mono text-xs bg-white px-1 rounded">env</code>.</p>
        </div>

        <div class="rounded-lg border border-red-100 bg-red-50/50 p-3">
          <p class="text-sm font-bold text-ink">Forgetting to make methods <code class="font-mono text-xs bg-white px-1 rounded">async</code></p>
          <p class="text-xs text-ink-muted mt-1">The AI agent calls your methods with <code class="font-mono text-xs bg-white px-1 rounded">await</code>. If your methods are not async and they throw, the error handling may behave unexpectedly. Use <code class="font-mono text-xs bg-white px-1 rounded">async</code> for all tool methods, even if the implementation is synchronous.</p>
        </div>

        <div class="rounded-lg border border-red-100 bg-red-50/50 p-3">
          <p class="text-sm font-bold text-ink">Env variable names do not match</p>
          <p class="text-xs text-ink-muted mt-1">The keys in your <code class="font-mono text-xs bg-white px-1 rounded">Env</code> interface must exactly match the keys in <code class="font-mono text-xs bg-white px-1 rounded">permissions.json</code>. If permissions.json says <code class="font-mono text-xs bg-white px-1 rounded">"CLIENT_ID"</code> but your Env interface says <code class="font-mono text-xs bg-white px-1 rounded">clientId</code>, you will get <code class="font-mono text-xs bg-white px-1 rounded">undefined</code>.</p>
        </div>
      </div>
    </div>

    <!-- Recap -->
    <div class="rounded-xl bg-honey-50 border-2 border-honey-300 p-5">
      <p class="text-sm font-bold text-ink mb-2">Recap</p>
      <div class="space-y-1.5">
        <p class="text-sm text-ink-muted"><strong>1.</strong> Your <code class="font-mono text-xs bg-white px-1.5 py-0.5 rounded">index.ts</code> must have a <code class="font-mono text-xs bg-white px-1.5 py-0.5 rounded">export default function main(env)</code></p>
        <p class="text-sm text-ink-muted"><strong>2.</strong> <code class="font-mono text-xs bg-white px-1.5 py-0.5 rounded">env</code> contains only the variables from <code class="font-mono text-xs bg-white px-1.5 py-0.5 rounded">permissions.json</code> that the user granted (not <code class="font-mono text-xs bg-white px-1.5 py-0.5 rounded">process.env</code>)</p>
        <p class="text-sm text-ink-muted"><strong>3.</strong> Return a plain object &mdash; each property becomes a tool method the AI can call</p>
        <p class="text-sm text-ink-muted"><strong>4.</strong> Define your <code class="font-mono text-xs bg-white px-1.5 py-0.5 rounded">Env</code> type in <code class="font-mono text-xs bg-white px-1.5 py-0.5 rounded">auth.ts</code> and re-export it from <code class="font-mono text-xs bg-white px-1.5 py-0.5 rounded">index.ts</code></p>
        <p class="text-sm text-ink-muted"><strong>5.</strong> Use <code class="font-mono text-xs bg-white px-1.5 py-0.5 rounded">async</code> for all tool methods</p>
      </div>
    </div>

    <nav class="flex items-center justify-between border-t border-neutral-100 pt-6 mt-10">
      <a href="/docs/package-config" class="text-sm text-ink-muted hover:text-ink transition">&larr; Package Config</a>
      <a href="/docs/cli-commands" class="text-sm font-semibold text-honey-600 hover:text-honey-700 transition">Next: CLI Commands &rarr;</a>
    </nav>
  </div>
</section>
