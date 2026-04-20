<script lang="ts">
  import CodeFrame from '../../component/code_frame.svelte';
  import TerminalFrame from '../../component/terminal_frame.svelte';
  import TerminalLine from '../../component/terminal_line.svelte';
</script>

<section>
  <div class="space-y-8" data-test-id="docs-llm-instructions">
    <header>
      <h1 class="text-3xl font-black tracking-tight text-ink sm:text-4xl">LLM Instructions</h1>
      <p class="mt-3 text-ink-muted">How to write an llm.txt file so AI agents know how to use your plugin correctly.</p>
    </header>

    <!-- Quick reminder -->
    <div class="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p class="text-sm font-bold text-amber-900 mb-1">Quick reminder: how AI agents call your plugin</p>
      <p class="text-xs text-amber-800">
        Your plugin's <code class="font-mono text-xs bg-amber-100 px-1 rounded">main(env)</code> function returns an object of methods. AI agents call these methods through <code class="font-mono text-xs bg-amber-100 px-1 rounded">tools["your-plugin"].methodName()</code>. The <code class="font-mono text-xs bg-amber-100 px-1 rounded">llm.txt</code> file is how you teach the AI <em>when</em> and <em>how</em> to call each method. Without it, the AI has to guess &mdash; and it will guess wrong.
      </p>
    </div>

    <!-- What is llm.txt and why it matters -->
    <div>
      <p class="text-sm font-bold text-ink mb-2">What is llm.txt?</p>
      <p class="text-sm text-ink-muted mb-3">
        <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">llm.txt</code> is a plain text file in your plugin's root directory. It is the instruction manual that AI agents read before they use your plugin. Think of it like a README, but written specifically for an AI that needs to make function calls on behalf of a user.
      </p>
      <p class="text-sm text-ink-muted mb-3">
        When a user asks an AI agent to do something &mdash; like "check my time entries" or "send an email" &mdash; the AI reads your llm.txt to figure out which method to call, what arguments to pass, and how to format the result. If your llm.txt is vague or missing, the AI might call the wrong method, pass bad arguments, or give the user confusing output.
      </p>
    </div>

    <!-- Where does it go -->
    <div>
      <p class="text-sm font-bold text-ink mb-2">Where does the file go?</p>
      <p class="text-sm text-ink-muted mb-3">
        Place <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">llm.txt</code> in your plugin's root directory, alongside <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">package.json</code> and <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">permissions.json</code>:
      </p>
      <CodeFrame title="Plugin directory">
        <p><span class="text-neutral-300">my-plugin/</span></p>
        <p><span class="text-neutral-300">  package.json</span></p>
        <p><span class="text-neutral-300">  permissions.json</span></p>
        <p><span class="text-blue-300">  llm.txt</span> <span class="text-neutral-500">&larr; this file</span></p>
        <p><span class="text-neutral-300">  src/</span></p>
        <p><span class="text-neutral-300">    index.ts</span></p>
      </CodeFrame>
    </div>

    <!-- How it gets used -->
    <div>
      <p class="text-sm font-bold text-ink mb-2">How the AI reads your instructions</p>
      <p class="text-sm text-ink-muted mb-3">
        When Kazibee starts a session with an AI agent, it loads the llm.txt for every installed plugin and includes it in the AI's context. The AI reads these instructions before the user even types a message. You can also preview what the AI will see:
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
          <span class="text-white">kazibee</span> <span class="text-white">llm</span> <span class="text-amber-300">clockify</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-neutral-400">Tool: clockify</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-neutral-400">Package: clockify</span>
        </TerminalLine>
        <TerminalLine showPrompt={false}>
          <span class="text-neutral-400">...</span>
        </TerminalLine>
      </TerminalFrame>
      <p class="text-xs text-ink-muted mt-2">
        Use this to check your instructions look right. If something is confusing to <em>you</em>, it will be confusing to the AI.
      </p>
    </div>

    <!-- Anatomy of a good llm.txt -->
    <div class="space-y-4">
      <div>
        <p class="text-sm font-bold text-ink mb-2">Anatomy of a good llm.txt</p>
        <p class="text-sm text-ink-muted mb-3">
          A well-structured llm.txt has six sections. Here is the Clockify plugin's llm.txt as a complete, real-world example:
        </p>
      </div>

      <CodeFrame title="clockify/llm.txt">
        <p><span class="text-blue-300">Tool: clockify</span></p>
        <p><span class="text-blue-300">Package: clockify</span></p>
        <p>&nbsp;</p>
        <p><span class="text-neutral-300">Use this tool for Clockify time tracking management.</span></p>
        <p>&nbsp;</p>
        <p><span class="text-blue-300">Auth requirements</span></p>
        <p><span class="text-neutral-300">- CLOCKIFY_API_KEY</span></p>
        <p>&nbsp;</p>
        <p><span class="text-blue-300">Runtime note</span></p>
        <p><span class="text-neutral-300">- API key is expected to be injected via `--env` (not interactive login).</span></p>
        <p><span class="text-neutral-300">- Generate your key at https://app.clockify.me/user/preferences#advanced</span></p>
        <p>&nbsp;</p>
        <p><span class="text-blue-300">Common workflow</span></p>
        <p><span class="text-neutral-300">- First call getCurrentUser() to get the userId and activeWorkspace.</span></p>
        <p><span class="text-neutral-300">- Use the activeWorkspace as workspaceId for subsequent calls.</span></p>
        <p><span class="text-neutral-300">- Time entries require both workspaceId and userId.</span></p>
        <p>&nbsp;</p>
        <p><span class="text-blue-300">Typical intents to map</span></p>
        <p><span class="text-neutral-300">- "who am I" -> getCurrentUser()</span></p>
        <p><span class="text-neutral-300">- "my workspaces" -> listWorkspaces()</span></p>
        <p><span class="text-neutral-300">- "list projects" -> listProjects(workspaceId)</span></p>
        <p><span class="text-neutral-300">- "my time entries" -> listTimeEntries(workspaceId, userId)</span></p>
        <p><span class="text-neutral-300">- "start timer" -> createTimeEntry(workspaceId, &#123; start: ... &#125;)</span></p>
        <p><span class="text-neutral-300">- "stop timer" -> stopTimer(workspaceId, userId)</span></p>
        <p>&nbsp;</p>
        <p><span class="text-blue-300">Code call examples</span></p>
        <p><span class="text-green-300">const user = await tools["clockify"].getCurrentUser();</span></p>
        <p><span class="text-green-300">const wsId = user.activeWorkspace;</span></p>
        <p><span class="text-green-300">const projects = await tools["clockify"].listProjects(wsId);</span></p>
        <p>&nbsp;</p>
        <p><span class="text-blue-300">Output behavior</span></p>
        <p><span class="text-neutral-300">- Include IDs/names in responses for follow-up actions.</span></p>
        <p><span class="text-neutral-300">- When listing time entries, format durations readably.</span></p>
        <p><span class="text-neutral-300">- For running timers (end is null), indicate the timer is active.</span></p>
      </CodeFrame>
    </div>

    <!-- Breaking down each section -->
    <div class="space-y-4">
      <p class="text-sm font-bold text-ink mb-2">Breaking down each section</p>

      <div class="space-y-3">
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink">Tool name and package</p>
          <p class="text-xs text-ink-muted mt-1">
            Always start with <code class="font-mono text-xs bg-neutral-100 px-1 rounded">Tool: &lt;name&gt;</code> and <code class="font-mono text-xs bg-neutral-100 px-1 rounded">Package: &lt;package&gt;</code>. This tells the AI exactly which tool to reference. Follow it with a one-line summary of what the plugin does.
          </p>
        </div>
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink">Auth requirements</p>
          <p class="text-xs text-ink-muted mt-1">
            List which environment variables the plugin needs. This helps the AI give useful error messages &mdash; if auth fails, it can tell the user exactly what to set up. For OAuth plugins, include the login command (e.g., "run <code class="font-mono text-xs bg-neutral-100 px-1 rounded">kazibee gmail login</code>").
          </p>
        </div>
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink">Common workflow</p>
          <p class="text-xs text-ink-muted mt-1">
            Describe the order of operations. Many APIs require a setup call first &mdash; like getting a workspace ID before listing projects. Without this, the AI will try to call methods with missing arguments.
          </p>
        </div>
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink">Intent mapping</p>
          <p class="text-xs text-ink-muted mt-1">
            Map natural language phrases to method calls. When a user says "start a timer," the AI needs to know that means <code class="font-mono text-xs bg-neutral-100 px-1 rounded">createTimeEntry()</code>. This is the most impactful section &mdash; it directly determines whether the AI picks the right method.
          </p>
        </div>
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink">Code call examples</p>
          <p class="text-xs text-ink-muted mt-1">
            Show runnable code snippets using <code class="font-mono text-xs bg-neutral-100 px-1 rounded">await tools["plugin-name"].method()</code>. Include realistic arguments and chained workflows (e.g., get user, then use their ID for the next call). The AI learns the exact calling pattern from these examples.
          </p>
        </div>
        <div class="rounded-lg border border-neutral-100 p-3">
          <p class="text-sm font-bold text-ink">Output behavior</p>
          <p class="text-xs text-ink-muted mt-1">
            Tell the AI how to present results to the user. Should it show IDs? Format dates? Summarize long lists? Without this guidance, the AI might dump raw JSON or hide important information.
          </p>
        </div>
      </div>
    </div>

    <!-- Bad vs good example -->
    <div class="space-y-4">
      <div>
        <p class="text-sm font-bold text-ink mb-2">Bad vs. good: why specificity matters</p>
        <p class="text-sm text-ink-muted mb-3">
          The difference between a useful and useless llm.txt comes down to how specific you are. Compare these two approaches:
        </p>
      </div>

      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Bad: too vague</p>
        <CodeFrame title="llm.txt (don't do this)" class="mb-1">
          <p><span class="text-neutral-300">Tool: my-api</span></p>
          <p><span class="text-neutral-300">This tool connects to an API.</span></p>
          <p><span class="text-neutral-300">It has methods for reading and writing data.</span></p>
          <p><span class="text-neutral-300">Use the appropriate method for each request.</span></p>
        </CodeFrame>
        <p class="text-xs text-ink-muted mb-4">
          The AI has no idea what methods exist, what arguments they take, or what "appropriate" means. It will hallucinate method names and pass wrong arguments.
        </p>
      </div>

      <div>
        <p class="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Good: specific and actionable</p>
        <CodeFrame title="llm.txt (do this)" class="mb-1">
          <p><span class="text-blue-300">Tool: my-api</span></p>
          <p><span class="text-blue-300">Package: my-api</span></p>
          <p>&nbsp;</p>
          <p><span class="text-neutral-300">Use this tool to manage customer records in the CRM.</span></p>
          <p>&nbsp;</p>
          <p><span class="text-blue-300">Auth requirements</span></p>
          <p><span class="text-neutral-300">- CRM_API_KEY</span></p>
          <p>&nbsp;</p>
          <p><span class="text-blue-300">Typical intents to map</span></p>
          <p><span class="text-neutral-300">- "find customer" -> searchCustomers(query, limit?)</span></p>
          <p><span class="text-neutral-300">- "add customer" -> createCustomer(&#123; name, email &#125;)</span></p>
          <p><span class="text-neutral-300">- "update customer" -> updateCustomer(id, &#123; ...fields &#125;)</span></p>
          <p>&nbsp;</p>
          <p><span class="text-blue-300">Code call examples</span></p>
          <p><span class="text-green-300">const results = await tools["my-api"].searchCustomers("acme", 10);</span></p>
          <p><span class="text-green-300">const customer = await tools["my-api"].createCustomer(&#123;</span></p>
          <p><span class="text-green-300">  name: "Jane Doe",</span></p>
          <p><span class="text-green-300">  email: "jane@acme.com"</span></p>
          <p><span class="text-green-300">&#125;);</span></p>
          <p>&nbsp;</p>
          <p><span class="text-blue-300">Output behavior</span></p>
          <p><span class="text-neutral-300">- Show customer name and email in results, not raw IDs.</span></p>
          <p><span class="text-neutral-300">- If search returns no results, say so explicitly.</span></p>
          <p><span class="text-neutral-300">- On create/update, confirm success with the customer name.</span></p>
        </CodeFrame>
        <p class="text-xs text-ink-muted">
          Now the AI knows exactly which methods to call, what arguments they expect, and how to present results. No guessing required.
        </p>
      </div>
    </div>

    <!-- Larger example: Gmail -->
    <div class="space-y-4">
      <div>
        <p class="text-sm font-bold text-ink mb-2">Larger example: Gmail plugin</p>
        <p class="text-sm text-ink-muted mb-3">
          Plugins with many methods benefit from additional sections. The Gmail plugin includes a <strong>method selection policy</strong> (when the AI has multiple ways to do something) and <strong>defaults and limits</strong> (sane defaults when the user is vague):
        </p>
      </div>

      <CodeFrame title="gmail/llm.txt (excerpt)">
        <p><span class="text-blue-300">Method selection policy</span></p>
        <p><span class="text-neutral-300">- For generic list intents, use listMessageSummaries(query?, maxResults?).</span></p>
        <p><span class="text-neutral-300">- Use listMessages() only when user explicitly asks for IDs-only output.</span></p>
        <p><span class="text-neutral-300">- Use getMessage(messageId) to read one specific message.</span></p>
        <p><span class="text-neutral-300">- Use replyToMessage(messageId, body) to reply in the same thread.</span></p>
        <p>&nbsp;</p>
        <p><span class="text-blue-300">Defaults and limits</span></p>
        <p><span class="text-neutral-300">- If user gives no count, use maxResults = 20.</span></p>
        <p><span class="text-neutral-300">- If user asks for "all emails", use a safe cap of 50.</span></p>
        <p><span class="text-neutral-300">- Preserve user-provided filters exactly (from:, subject:, is:unread).</span></p>
        <p>&nbsp;</p>
        <p><span class="text-blue-300">Output behavior</span></p>
        <p><span class="text-neutral-300">- Default to listMessageSummaries for generic "get my emails" requests.</span></p>
        <p><span class="text-neutral-300">- Do not show internal message IDs unless the user asks for them.</span></p>
        <p><span class="text-neutral-300">- For list outputs, prefer: from, subject, date, snippet.</span></p>
        <p><span class="text-neutral-300">- On auth errors, tell user to run: kazibee gmail login.</span></p>
      </CodeFrame>
      <p class="text-xs text-ink-muted mt-2">
        These extra sections prevent the AI from making common mistakes: using the wrong list method, returning too many results, or showing raw metadata instead of human-friendly summaries.
      </p>
    </div>

    <!-- Tips -->
    <div class="space-y-3">
      <p class="text-sm font-bold text-ink mb-2">Writing tips</p>
      <div class="rounded-lg border border-neutral-100 p-3">
        <p class="text-sm font-bold text-ink">Write for someone who has never seen your API</p>
        <p class="text-xs text-ink-muted mt-1">
          The AI has no prior knowledge of your service. Explain what parameters mean, not just what they are called. "workspaceId (get this from getCurrentUser().activeWorkspace)" is much better than just "workspaceId".
        </p>
      </div>
      <div class="rounded-lg border border-neutral-100 p-3">
        <p class="text-sm font-bold text-ink">Include the calling convention</p>
        <p class="text-xs text-ink-muted mt-1">
          Always use <code class="font-mono text-xs bg-neutral-100 px-1 rounded">await tools["plugin-name"].method()</code> in your examples. This is the exact pattern the AI needs to emit. If you write examples in a different format, the AI might get the syntax wrong.
        </p>
      </div>
      <div class="rounded-lg border border-neutral-100 p-3">
        <p class="text-sm font-bold text-ink">Map user intent to methods, not just methods to descriptions</p>
        <p class="text-xs text-ink-muted mt-1">
          Users say "send an email," not "call sendMessage." The intent mapping section is what bridges the gap. Include as many natural phrases as you can think of for each method.
        </p>
      </div>
      <div class="rounded-lg border border-neutral-100 p-3">
        <p class="text-sm font-bold text-ink">Specify error recovery</p>
        <p class="text-xs text-ink-muted mt-1">
          Tell the AI what to do when things go wrong. "On auth errors, tell user to run <code class="font-mono text-xs bg-neutral-100 px-1 rounded">kazibee &lt;plugin&gt; login</code>" is far more helpful than letting the AI make up its own error message.
        </p>
      </div>
      <div class="rounded-lg border border-neutral-100 p-3">
        <p class="text-sm font-bold text-ink">Test it with kazibee llm</p>
        <p class="text-xs text-ink-muted mt-1">
          Run <code class="font-mono text-xs bg-neutral-100 px-1 rounded">kazibee llm &lt;plugin-name&gt;</code> to preview exactly what the AI will see. Read through it as if you were an AI with no context &mdash; would you know what to do?
        </p>
      </div>
    </div>

    <nav class="flex items-center justify-between border-t border-neutral-100 pt-6 mt-10">
      <a href="/docs/permissions" class="text-sm text-ink-muted hover:text-ink transition">&larr; Permissions</a>
      <a href="/docs/dev-workflow" class="text-sm font-semibold text-honey-600 hover:text-honey-700 transition">Next: Dev Workflow &rarr;</a>
    </nav>
  </div>
</section>
