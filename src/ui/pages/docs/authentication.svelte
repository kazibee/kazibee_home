<script lang="ts">
  import CodeFrame from '../../component/code_frame.svelte';
  import TerminalFrame from '../../component/terminal_frame.svelte';
  import TerminalLine from '../../component/terminal_line.svelte';
</script>

<section>
  <div class="space-y-8" data-test-id="docs-authentication">
    <header>
      <h1 class="text-3xl font-black tracking-tight text-ink sm:text-4xl">Authentication</h1>
      <p class="mt-3 text-ink-muted">How plugins receive credentials and connect to external services.</p>
    </header>

    <!-- The key concept -->
    <div>
      <p class="text-sm font-bold text-ink mb-2">How credentials reach your plugin</p>
      <p class="text-sm text-ink-muted mb-3">
        Plugins run inside a sandbox. They cannot read <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">process.env</code> or access the host machine's environment directly. The <strong>only</strong> way your plugin receives credentials is through the <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">env</code> object that Kazibee passes to your <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">main(env)</code> function.
      </p>
      <p class="text-sm text-ink-muted mb-3">
        This means you need to tell Kazibee what variables your plugin needs. You do this by creating a <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">permissions.json</code> file and pointing to it from <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">package.json</code>. At install time, Kazibee reads this file and asks the user to grant each variable. At runtime, only granted variables are injected into your <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">env</code>.
      </p>
    </div>

    <!-- The flow -->
    <div>
      <p class="text-sm font-bold text-ink mb-2">The end-to-end flow</p>
      <div class="space-y-2">
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-sm">1.</span>
          <p class="text-sm text-ink-muted">You declare required env vars in <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">permissions.json</code></p>
        </div>
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-sm">2.</span>
          <p class="text-sm text-ink-muted">User installs or links your plugin &mdash; Kazibee prompts them to grant each variable from a source (LOCAL, ENV, GLOBAL, or SYSTEM)</p>
        </div>
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-sm">3.</span>
          <p class="text-sm text-ink-muted">User provides the actual values (via <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">kazibee env</code>, a login command, or a setup script)</p>
        </div>
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-sm">4.</span>
          <p class="text-sm text-ink-muted">At runtime, Kazibee resolves only granted variables from their granted sources and passes them as the <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">env</code> object to <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">main(env)</code></p>
        </div>
        <div class="flex gap-3 items-start">
          <span class="text-honey-600 font-bold shrink-0 text-sm">5.</span>
          <p class="text-sm text-ink-muted">Your plugin uses <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">env</code> to create authenticated API clients</p>
        </div>
      </div>
    </div>

    <!-- Pattern 1: API Key -->
    <div class="space-y-4">
      <div>
        <p class="text-sm font-bold text-ink mb-2">Pattern 1: API Key</p>
        <p class="text-sm text-ink-muted mb-3">
          The simplest pattern. The external service gives you a static API key (e.g. from a settings page).
          The user sets this key once, and your plugin reads it from <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">env</code> every time it runs.
        </p>
      </div>

      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Step 1 &mdash; Declare the variable</p>
        <p class="text-sm text-ink-muted mb-3">
          Create <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">permissions.json</code> in your plugin root.
          Each key in the <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">"env"</code> object is a variable name your plugin code will see.
          The value tells Kazibee which source key to look up (see the <a href="/docs/permissions" class="text-honey-600 hover:text-honey-700 underline">Permissions</a> page for advanced source options).
        </p>
        <CodeFrame title="my-plugin/permissions.json">
          <p><span class="text-neutral-400">&#123;</span></p>
          <p class="pl-4"><span class="text-blue-300">"env"</span><span class="text-neutral-400">:</span> <span class="text-neutral-400">&#123;</span></p>
          <p class="pl-8"><span class="text-blue-300">"CLOCKIFY_API_KEY"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"CLOCKIFY_API_KEY"</span></p>
          <p class="pl-4"><span class="text-neutral-400">&#125;</span></p>
          <p><span class="text-neutral-400">&#125;</span></p>
        </CodeFrame>
      </div>

      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Step 2 &mdash; Point to it from package.json</p>
        <CodeFrame title="my-plugin/package.json">
          <p><span class="text-neutral-400">&#123;</span></p>
          <p class="pl-4"><span class="text-blue-300">"name"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"clockify"</span><span class="text-neutral-400">,</span></p>
          <p class="pl-4"><span class="text-blue-300">"type"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"module"</span><span class="text-neutral-400">,</span></p>
          <p class="pl-4"><span class="text-blue-300">"main"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"./src/index.ts"</span><span class="text-neutral-400">,</span></p>
          <p class="pl-4"><span class="text-blue-300">"kazibee"</span><span class="text-neutral-400">:</span> <span class="text-neutral-400">&#123;</span></p>
          <p class="pl-8"><span class="text-blue-300">"permissions"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"./permissions.json"</span></p>
          <p class="pl-4"><span class="text-neutral-400">&#125;</span></p>
          <p><span class="text-neutral-400">&#125;</span></p>
        </CodeFrame>
      </div>

      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Step 3 &mdash; Define a typed Env interface</p>
        <p class="text-sm text-ink-muted mb-3">
          Create an <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">auth.ts</code> file that defines an <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">Env</code> interface matching your permissions.json keys. This gives you type safety so you catch missing or misspelled keys at compile time. It also provides a single place to validate credentials and create the authenticated client.
        </p>
        <CodeFrame title="my-plugin/src/auth.ts">
          <p><span class="text-purple-400">export interface</span> <span class="text-blue-300">Env</span> <span class="text-neutral-400">&#123;</span></p>
          <p class="pl-4"><span class="text-blue-300">CLOCKIFY_API_KEY</span><span class="text-neutral-400">:</span> <span class="text-blue-300">string</span><span class="text-neutral-400">;</span></p>
          <p><span class="text-neutral-400">&#125;</span></p>
          <p>&nbsp;</p>
          <p><span class="text-purple-400">export interface</span> <span class="text-blue-300">AuthConfig</span> <span class="text-neutral-400">&#123;</span></p>
          <p class="pl-4"><span class="text-blue-300">apiKey</span><span class="text-neutral-400">:</span> <span class="text-blue-300">string</span><span class="text-neutral-400">;</span></p>
          <p><span class="text-neutral-400">&#125;</span></p>
          <p>&nbsp;</p>
          <p><span class="text-purple-400">export function</span> <span class="text-blue-300">getAuthConfig</span><span class="text-neutral-400">(</span><span class="text-amber-300">env</span><span class="text-neutral-400">:</span> <span class="text-blue-300">Env</span><span class="text-neutral-400">):</span> <span class="text-blue-300">AuthConfig</span> <span class="text-neutral-400">&#123;</span></p>
          <p class="pl-4"><span class="text-purple-400">if</span> <span class="text-neutral-400">(!</span><span class="text-amber-300">env</span><span class="text-neutral-400">.</span><span class="text-blue-300">CLOCKIFY_API_KEY</span><span class="text-neutral-400">)</span></p>
          <p class="pl-8"><span class="text-purple-400">throw new</span> <span class="text-blue-300">Error</span><span class="text-neutral-400">(</span><span class="text-green-300">'Missing CLOCKIFY_API_KEY'</span><span class="text-neutral-400">);</span></p>
          <p class="pl-4"><span class="text-purple-400">return</span> <span class="text-neutral-400">&#123;</span> <span class="text-blue-300">apiKey</span><span class="text-neutral-400">:</span> <span class="text-amber-300">env</span><span class="text-neutral-400">.</span><span class="text-blue-300">CLOCKIFY_API_KEY</span> <span class="text-neutral-400">&#125;;</span></p>
          <p><span class="text-neutral-400">&#125;</span></p>
        </CodeFrame>
      </div>

      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Step 4 &mdash; Use it in index.ts</p>
        <p class="text-sm text-ink-muted mb-3">
          Your <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">main(env)</code> receives the sandboxed env, creates an authenticated config, and passes it to your client code.
        </p>
        <CodeFrame title="my-plugin/src/index.ts">
          <p><span class="text-purple-400">import</span> <span class="text-neutral-400">&#123;</span> <span class="text-blue-300">getAuthConfig</span><span class="text-neutral-400">,</span> <span class="text-purple-400">type</span> <span class="text-blue-300">Env</span> <span class="text-neutral-400">&#125;</span> <span class="text-purple-400">from</span> <span class="text-green-300">'./auth'</span><span class="text-neutral-400">;</span></p>
          <p><span class="text-purple-400">import</span> <span class="text-neutral-400">&#123;</span> <span class="text-blue-300">createClient</span> <span class="text-neutral-400">&#125;</span> <span class="text-purple-400">from</span> <span class="text-green-300">'./client'</span><span class="text-neutral-400">;</span></p>
          <p>&nbsp;</p>
          <p><span class="text-purple-400">export default function</span> <span class="text-blue-300">main</span><span class="text-neutral-400">(</span><span class="text-amber-300">env</span><span class="text-neutral-400">:</span> <span class="text-blue-300">Env</span><span class="text-neutral-400">) &#123;</span></p>
          <p class="pl-4"><span class="text-purple-400">const</span> <span class="text-blue-300">config</span> <span class="text-neutral-400">=</span> <span class="text-blue-300">getAuthConfig</span><span class="text-neutral-400">(</span><span class="text-amber-300">env</span><span class="text-neutral-400">);</span></p>
          <p class="pl-4"><span class="text-purple-400">return</span> <span class="text-blue-300">createClient</span><span class="text-neutral-400">(</span><span class="text-blue-300">config</span><span class="text-neutral-400">);</span></p>
          <p><span class="text-neutral-400">&#125;</span></p>
        </CodeFrame>
      </div>

      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">User experience</p>
        <p class="text-sm text-ink-muted mb-3">
          After installing, the user sets the key with <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">kazibee env</code>. From that point on, every execution of the plugin has access to the key.
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
            <span class="text-white">kazibee</span> <span class="text-white">link</span> <span class="text-amber-300">clockify</span> <span class="text-green-300">./clockify</span>
          </TerminalLine>
          <TerminalLine showPrompt={false}>
            <span class="text-neutral-500"># Kazibee prompts: "Grant CLOCKIFY_API_KEY? [LOCAL/ENV/GLOBAL/SYSTEM]"</span>
          </TerminalLine>
          <TerminalLine>
            <span class="text-white">kazibee</span> <span class="text-white">env</span> <span class="text-amber-300">clockify</span> <span class="text-neutral-400">--set</span> <span class="text-green-300">CLOCKIFY_API_KEY=abc123</span>
          </TerminalLine>
          <TerminalLine>
            <span class="text-white">echo</span> <span class="text-green-300">'return await tools["clockify"].getUser()'</span> <span class="text-neutral-400">|</span> <span class="text-white">kazibee</span> <span class="text-white">exec</span>
          </TerminalLine>
        </TerminalFrame>
      </div>
    </div>

    <!-- Pattern 2: OAuth2 -->
    <div class="space-y-4">
      <div>
        <p class="text-sm font-bold text-ink mb-2">Pattern 2: OAuth2</p>
        <p class="text-sm text-ink-muted mb-3">
          For services that use OAuth2 (like Google, Microsoft, etc.), you need a browser-based consent flow.
          The user runs a <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">login</code> command that opens the browser, handles the redirect, exchanges the authorization code for tokens, and returns the credentials.
          Because the login command returns a <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">Record&lt;string, string&gt;</code>, Kazibee automatically persists the returned values as env vars for the plugin.
        </p>
      </div>

      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Step 1 &mdash; Declare the variables</p>
        <p class="text-sm text-ink-muted mb-3">
          OAuth2 typically needs three variables: the client credentials (CLIENT_ID, CLIENT_SECRET) and the refresh token obtained during the login flow.
        </p>
        <CodeFrame title="my-plugin/permissions.json">
          <p><span class="text-neutral-400">&#123;</span></p>
          <p class="pl-4"><span class="text-blue-300">"env"</span><span class="text-neutral-400">:</span> <span class="text-neutral-400">&#123;</span></p>
          <p class="pl-8"><span class="text-blue-300">"CLIENT_ID"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"CLIENT_ID"</span><span class="text-neutral-400">,</span></p>
          <p class="pl-8"><span class="text-blue-300">"CLIENT_SECRET"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"CLIENT_SECRET"</span><span class="text-neutral-400">,</span></p>
          <p class="pl-8"><span class="text-blue-300">"REFRESH_TOKEN"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"REFRESH_TOKEN"</span></p>
          <p class="pl-4"><span class="text-neutral-400">&#125;</span></p>
          <p><span class="text-neutral-400">&#125;</span></p>
        </CodeFrame>
      </div>

      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Step 2 &mdash; Write the auth helper</p>
        <p class="text-sm text-ink-muted mb-3">
          The <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">auth.ts</code> file defines the <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">Env</code> interface and creates an authenticated OAuth2 client using the credentials from <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">env</code>.
        </p>
        <CodeFrame title="my-plugin/src/auth.ts">
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
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Step 3 &mdash; Write the login command</p>
        <p class="text-sm text-ink-muted mb-3">
          The login command runs outside the sandbox (it's a CLI command, not a tool method).
          It starts a local HTTP server, opens the browser to the OAuth consent screen, waits for the redirect callback with the auth code,
          exchanges it for tokens, and returns the credentials as <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">Record&lt;string, string&gt;</code>.
          Kazibee sees that return type and automatically stores the values as env vars for the plugin.
        </p>
        <CodeFrame title="my-plugin/src/command.ts">
          <p><span class="text-purple-400">import</span> <span class="text-neutral-400">&#123;</span> <span class="text-blue-300">auth</span> <span class="text-neutral-400">&#125;</span> <span class="text-purple-400">from</span> <span class="text-green-300">'@googleapis/gmail'</span><span class="text-neutral-400">;</span></p>
          <p><span class="text-purple-400">import</span> <span class="text-neutral-400">&#123;</span> <span class="text-blue-300">createServer</span> <span class="text-neutral-400">&#125;</span> <span class="text-purple-400">from</span> <span class="text-green-300">'node:http'</span><span class="text-neutral-400">;</span></p>
          <p>&nbsp;</p>
          <p><span class="text-purple-400">const</span> <span class="text-blue-300">SCOPES</span> <span class="text-neutral-400">= [</span><span class="text-green-300">'https://...gmail.modify'</span><span class="text-neutral-400">];</span></p>
          <p><span class="text-purple-400">const</span> <span class="text-blue-300">REDIRECT_PORT</span> <span class="text-neutral-400">=</span> <span class="text-amber-300">3848</span><span class="text-neutral-400">;</span></p>
          <p><span class="text-purple-400">const</span> <span class="text-blue-300">REDIRECT_URI</span> <span class="text-neutral-400">=</span> <span class="text-green-300">`http://localhost:$&#123;REDIRECT_PORT&#125;`</span><span class="text-neutral-400">;</span></p>
          <p>&nbsp;</p>
          <p><span class="text-purple-400">export async function</span> <span class="text-blue-300">login</span><span class="text-neutral-400">(</span></p>
          <p class="pl-4"><span class="text-amber-300">env</span><span class="text-neutral-400">:</span> <span class="text-blue-300">Record</span><span class="text-neutral-400">&lt;</span><span class="text-blue-300">string</span><span class="text-neutral-400">,</span> <span class="text-blue-300">string</span><span class="text-neutral-400">&gt;,</span></p>
          <p class="pl-4"><span class="text-neutral-400">...</span><span class="text-amber-300">args</span><span class="text-neutral-400">:</span> <span class="text-blue-300">string</span><span class="text-neutral-400">[]</span></p>
          <p><span class="text-neutral-400">) &#123;</span></p>
          <p class="pl-4"><span class="text-purple-400">const</span> <span class="text-blue-300">CLIENT_ID</span> <span class="text-neutral-400">=</span> <span class="text-amber-300">args</span><span class="text-neutral-400">[0] ||</span> <span class="text-amber-300">env</span><span class="text-neutral-400">.</span><span class="text-blue-300">CLIENT_ID</span><span class="text-neutral-400">;</span></p>
          <p class="pl-4"><span class="text-purple-400">const</span> <span class="text-blue-300">CLIENT_SECRET</span> <span class="text-neutral-400">=</span> <span class="text-amber-300">args</span><span class="text-neutral-400">[1] ||</span> <span class="text-amber-300">env</span><span class="text-neutral-400">.</span><span class="text-blue-300">CLIENT_SECRET</span><span class="text-neutral-400">;</span></p>
          <p>&nbsp;</p>
          <p class="pl-4"><span class="text-neutral-500">// 1. Build consent URL</span></p>
          <p class="pl-4"><span class="text-purple-400">const</span> <span class="text-blue-300">oauth2</span> <span class="text-neutral-400">=</span> <span class="text-purple-400">new</span> <span class="text-blue-300">auth</span><span class="text-neutral-400">.</span><span class="text-blue-300">OAuth2</span><span class="text-neutral-400">(</span><span class="text-blue-300">CLIENT_ID</span><span class="text-neutral-400">,</span> <span class="text-blue-300">CLIENT_SECRET</span><span class="text-neutral-400">,</span> <span class="text-blue-300">REDIRECT_URI</span><span class="text-neutral-400">);</span></p>
          <p class="pl-4"><span class="text-purple-400">const</span> <span class="text-blue-300">authUrl</span> <span class="text-neutral-400">=</span> <span class="text-blue-300">oauth2</span><span class="text-neutral-400">.</span><span class="text-blue-300">generateAuthUrl</span><span class="text-neutral-400">(&#123;</span></p>
          <p class="pl-8"><span class="text-blue-300">access_type</span><span class="text-neutral-400">:</span> <span class="text-green-300">'offline'</span><span class="text-neutral-400">,</span></p>
          <p class="pl-8"><span class="text-blue-300">scope</span><span class="text-neutral-400">:</span> <span class="text-blue-300">SCOPES</span><span class="text-neutral-400">,</span></p>
          <p class="pl-8"><span class="text-blue-300">prompt</span><span class="text-neutral-400">:</span> <span class="text-green-300">'consent'</span></p>
          <p class="pl-4"><span class="text-neutral-400">&#125;);</span></p>
          <p>&nbsp;</p>
          <p class="pl-4"><span class="text-neutral-500">// 2. Start local server, open browser</span></p>
          <p class="pl-4"><span class="text-purple-400">const</span> <span class="text-blue-300">code</span> <span class="text-neutral-400">=</span> <span class="text-purple-400">await</span> <span class="text-blue-300">waitForAuthCode</span><span class="text-neutral-400">(</span><span class="text-blue-300">authUrl</span><span class="text-neutral-400">);</span></p>
          <p>&nbsp;</p>
          <p class="pl-4"><span class="text-neutral-500">// 3. Exchange code for tokens</span></p>
          <p class="pl-4"><span class="text-purple-400">const</span> <span class="text-neutral-400">&#123;</span> <span class="text-blue-300">tokens</span> <span class="text-neutral-400">&#125; =</span> <span class="text-purple-400">await</span> <span class="text-blue-300">oauth2</span><span class="text-neutral-400">.</span><span class="text-blue-300">getToken</span><span class="text-neutral-400">(</span><span class="text-blue-300">code</span><span class="text-neutral-400">);</span></p>
          <p>&nbsp;</p>
          <p class="pl-4"><span class="text-neutral-500">// 4. Return credentials &mdash; Kazibee auto-stores these</span></p>
          <p class="pl-4"><span class="text-purple-400">return</span> <span class="text-neutral-400">&#123;</span></p>
          <p class="pl-8"><span class="text-blue-300">CLIENT_ID</span><span class="text-neutral-400">,</span></p>
          <p class="pl-8"><span class="text-blue-300">CLIENT_SECRET</span><span class="text-neutral-400">,</span></p>
          <p class="pl-8"><span class="text-blue-300">REFRESH_TOKEN</span><span class="text-neutral-400">:</span> <span class="text-blue-300">tokens</span><span class="text-neutral-400">.</span><span class="text-blue-300">refresh_token</span></p>
          <p class="pl-4"><span class="text-neutral-400">&#125;;</span></p>
          <p><span class="text-neutral-400">&#125;</span></p>
        </CodeFrame>
      </div>

      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Step 4 &mdash; Wire it together in index.ts</p>
        <CodeFrame title="my-plugin/src/index.ts">
          <p><span class="text-purple-400">import</span> <span class="text-neutral-400">&#123;</span> <span class="text-blue-300">createAuthClient</span><span class="text-neutral-400">,</span> <span class="text-purple-400">type</span> <span class="text-blue-300">Env</span> <span class="text-neutral-400">&#125;</span> <span class="text-purple-400">from</span> <span class="text-green-300">'./auth'</span><span class="text-neutral-400">;</span></p>
          <p><span class="text-purple-400">import</span> <span class="text-neutral-400">&#123;</span> <span class="text-blue-300">createGmailClient</span> <span class="text-neutral-400">&#125;</span> <span class="text-purple-400">from</span> <span class="text-green-300">'./gmail-client'</span><span class="text-neutral-400">;</span></p>
          <p>&nbsp;</p>
          <p><span class="text-purple-400">export default function</span> <span class="text-blue-300">main</span><span class="text-neutral-400">(</span><span class="text-amber-300">env</span><span class="text-neutral-400">:</span> <span class="text-blue-300">Env</span><span class="text-neutral-400">) &#123;</span></p>
          <p class="pl-4"><span class="text-purple-400">const</span> <span class="text-blue-300">auth</span> <span class="text-neutral-400">=</span> <span class="text-blue-300">createAuthClient</span><span class="text-neutral-400">(</span><span class="text-amber-300">env</span><span class="text-neutral-400">);</span></p>
          <p class="pl-4"><span class="text-purple-400">return</span> <span class="text-blue-300">createGmailClient</span><span class="text-neutral-400">(</span><span class="text-blue-300">auth</span><span class="text-neutral-400">);</span></p>
          <p><span class="text-neutral-400">&#125;</span></p>
        </CodeFrame>
      </div>

      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">User experience</p>
        <p class="text-sm text-ink-muted mb-3">
          The user sets client credentials first (often via a setup script or <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">kazibee env</code>), then runs the login command. The browser opens, the user grants consent, and the refresh token is saved automatically. The plugin is ready to use.
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
            <span class="text-white">kazibee</span> <span class="text-white">env</span> <span class="text-amber-300">gmail</span> <span class="text-neutral-400">--set</span> <span class="text-green-300">CLIENT_ID=xxx</span> <span class="text-green-300">CLIENT_SECRET=yyy</span>
          </TerminalLine>
          <TerminalLine>
            <span class="text-white">kazibee</span> <span class="text-amber-300">gmail</span> <span class="text-white">login</span>
          </TerminalLine>
          <TerminalLine showPrompt={false}>
            <span class="text-neutral-500"># Browser opens &rarr; user authorizes &rarr; tokens saved</span>
          </TerminalLine>
          <TerminalLine>
            <span class="text-white">echo</span> <span class="text-green-300">'return await tools["gmail"].listMessages("in:inbox", 5)'</span> <span class="text-neutral-400">|</span> <span class="text-white">kazibee</span> <span class="text-white">exec</span>
          </TerminalLine>
        </TerminalFrame>
      </div>
    </div>

    <!-- Key concepts -->
    <div>
      <p class="text-sm font-bold text-ink mb-2">Key concepts</p>
      <div class="space-y-3">
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink">Sandbox isolation</p>
          <p class="text-xs text-ink-muted mt-1">Plugins never see <code class="font-mono text-xs bg-neutral-100 px-1 rounded">process.env</code>. They only receive the specific variables declared in <code class="font-mono text-xs bg-neutral-100 px-1 rounded">permissions.json</code> and granted by the user. Unganted variables are not injected.</p>
        </div>
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink">Auto-persistence</p>
          <p class="text-xs text-ink-muted mt-1">When a CLI command (like <code class="font-mono text-xs bg-neutral-100 px-1 rounded">login</code>) returns <code class="font-mono text-xs bg-neutral-100 px-1 rounded">Record&lt;string, string&gt;</code>, Kazibee stores each key-value pair as an env var for that plugin. No manual <code class="font-mono text-xs bg-neutral-100 px-1 rounded">kazibee env --set</code> needed.</p>
        </div>
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink">Commands run outside the sandbox</p>
          <p class="text-xs text-ink-muted mt-1">Functions in <code class="font-mono text-xs bg-neutral-100 px-1 rounded">command.ts</code> (like login) run in the host process with full access. This is why they can open browsers, start HTTP servers, and interact with the terminal. The sandbox only applies to the tool API methods defined by <code class="font-mono text-xs bg-neutral-100 px-1 rounded">main()</code>.</p>
        </div>
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink">The Env interface</p>
          <p class="text-xs text-ink-muted mt-1">Define an <code class="font-mono text-xs bg-neutral-100 px-1 rounded">Env</code> interface in <code class="font-mono text-xs bg-neutral-100 px-1 rounded">auth.ts</code> that matches your <code class="font-mono text-xs bg-neutral-100 px-1 rounded">permissions.json</code> keys. Export it from <code class="font-mono text-xs bg-neutral-100 px-1 rounded">index.ts</code> so Kazibee can use it for type generation.</p>
        </div>
      </div>
    </div>

    <nav class="flex items-center justify-between border-t border-neutral-100 pt-6 mt-10">
      <a href="/docs/cli-commands" class="text-sm text-ink-muted hover:text-ink transition">&larr; CLI Commands</a>
      <a href="/docs/permissions" class="text-sm font-semibold text-honey-600 hover:text-honey-700 transition">Next: Permissions &rarr;</a>
    </nav>
  </div>
</section>
