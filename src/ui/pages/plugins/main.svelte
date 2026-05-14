<script lang="ts">
  import BlurUpImage from '../../component/blur_up_image.svelte';
  import TerminalFrame from '../../component/terminal_frame.svelte';
  import TerminalLine from '../../component/terminal_line.svelte';
</script>

<section>
  <div class="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-20">
    <!-- Header -->
    <header class="mb-12" data-test-id="plugins-header">
      <h1 class="text-4xl font-black tracking-tight text-ink sm:text-5xl lg:text-6xl" data-test-id="plugins-title">
        Plugins
      </h1>
      <p class="mt-5 max-w-3xl text-lg leading-relaxed text-ink-muted">
        Everything in Kazibee is a plugin. Create your own or use pre-built official plugins maintained by the team.
      </p>
    </header>

    <!-- How plugins work -->
    <div class="mb-14 space-y-10" data-test-id="plugin-architecture">
      <!-- Real Workflows -->
      <div class="mb-8" data-test-id="plugin-workflows">
        <h3 class="text-lg font-bold text-ink mb-2">Real work you can automate today</h3>
        <p class="text-ink-muted mb-5">
          Plugins are made for outcomes. Combine tools and complete multi-step work in one flow.
        </p>

        <div class="space-y-12 pt-4 lg:px-6 xl:px-8 xl:pt-6">
          <article class="relative py-4" data-test-id="workflow-story-inbox">
            <BlurUpImage
              src="/images/work/productive-spreadsheet_768.webp"
              placeholder="/images/work/productive-spreadsheet_blur.webp"
              alt="A young Black woman focused on spreadsheet analysis at her desk"
              class="pointer-events-none absolute right-0 top-0 z-0 hidden -mr-56 -mt-1 h-48 w-72 -rotate-2 rounded-xl object-cover opacity-95 shadow-xl ring-1 ring-black/5 lg:block xl:-mr-72 xl:-mt-3 xl:h-52 xl:w-80 2xl:-mr-80 2xl:-mt-4 2xl:h-56 2xl:w-96"
            />
            <div class="relative z-10 rounded-2xl border-t border-r border-white/70 bg-white/35 p-4 backdrop-blur-md backdrop-saturate-75 backdrop-brightness-90">
              <p class="text-xs font-bold uppercase tracking-[0.12em] text-honey-700">Inbox to action</p>
              <p class="mt-2 text-sm text-ink-muted">
                A manager wakes up to 40 customer emails. Kazibee groups themes, drafts replies,
                and prepares a clean handoff document for the team.
              </p>
              <div class="mt-4 space-y-3">
                <div class="ml-auto max-w-[88%] text-right">
                  <p class="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8a3b00]">You</p>
                  <div class="inline-block max-w-full rounded-xl border border-[#f2b94b] bg-[#fff2cc] px-3.5 py-2.5 text-left">
                    <p class="text-sm text-ink">Get my top inbox priorities and draft today's memo with calendar context.</p>
                  </div>
                </div>
                <div class="max-w-[88%]">
                  <p class="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#0f4f85]">Kazibee</p>
                  <div class="inline-block max-w-full rounded-xl border border-[#7bb7e6] bg-[#dff1ff] px-3.5 py-2.5">
                    <p class="text-sm text-ink">Absolutely. I'll look into that now and share what I find before updating both memos.</p>
                  </div>
                </div>
                <div class="rounded-xl border border-[#7da2c4]/55 bg-gradient-to-b from-[#4d6783]/95 to-[#2f455d]/95 px-3.5 py-3 shadow-lg shadow-[#213244]/30">
                  <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#c8dcf1]">Working in the background</p>
                  <div class="mt-2 rounded-lg border border-[#a9c1d9]/30 bg-[#22374d]/70 px-3 py-2.5 font-mono text-[11px] leading-6 text-[#e4edf7]">
                    <p><span class="text-[#a6c0da]">const</span> weekTask = <span class="text-[#e8f2fc]">await</span> tools["task-docs"].getWeekTaskDocument("this-week");</p>
                    <p><span class="text-[#a6c0da]">const</span> rankedInbox = <span class="text-[#e8f2fc]">await</span> tools["mail-ranker"].getRankedMessages("label:inbox newer_than:1d", 60, weekTask.documentId);</p>
                    <p><span class="text-[#a6c0da]">const</span> appointments = <span class="text-[#e8f2fc]">await</span> tools["google-calendar"].listEvents("today");</p>
                    <p><span class="text-[#a6c0da]">const</span> todayMemo = <span class="text-[#e8f2fc]">await</span> tools["today-summarizer"].buildTodayMemo(rankedInbox.items, appointments);</p>
                    <p><span class="text-[#e8f2fc]">await</span> tools["memo-writer"].appendToTodayMemo(todayMemo.todaySection);</p>
                    <p><span class="text-[#e8f2fc]">await</span> tools["memo-writer"].appendToWeeklyMemo(todayMemo.weeklySection);</p>
                  </div>
                </div>
                <div class="max-w-[88%]">
                  <p class="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#0f4f85]">Kazibee</p>
                  <div class="inline-block max-w-full rounded-xl border border-[#7bb7e6] bg-[#dff1ff] px-3.5 py-2.5">
                    <p class="text-sm text-ink">Done. I ranked fresh inbox items, combined them with today's appointments, and prepared updates for today and weekly memos.</p>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article class="relative py-4" data-test-id="workflow-story-reporting">
            <BlurUpImage
              src="/images/work/productive-email_768.webp"
              placeholder="/images/work/productive-email_blur.webp"
              alt="A person focused on email and planning tasks at a laptop"
              class="pointer-events-none absolute left-0 top-0 z-0 hidden -ml-64 mt-1 h-48 w-72 rotate-3 rounded-xl object-cover opacity-95 shadow-xl ring-1 ring-black/5 lg:block xl:-ml-80 xl:mt-0 xl:h-52 xl:w-80 2xl:-ml-80 2xl:-mt-1 2xl:h-56 2xl:w-96"
            />
            <div class="relative z-10 rounded-2xl border-t border-r border-white/70 bg-white/35 p-4 backdrop-blur-md backdrop-saturate-75 backdrop-brightness-90">
              <p class="text-xs font-bold uppercase tracking-[0.12em] text-honey-700">Weekly reporting</p>
              <p class="mt-2 text-sm text-ink-muted">
                Every Monday, Kazibee pulls KPI ranges from Sheets, generates a visual update,
                and drafts the stakeholder email with the latest assets attached.
              </p>
              <div class="mt-4 space-y-3">
                <div class="ml-auto max-w-[88%] text-right">
                  <p class="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8a3b00]">You</p>
                  <div class="inline-block max-w-full rounded-xl border border-[#f2b94b] bg-[#fff2cc] px-3.5 py-2.5 text-left">
                    <p class="text-sm text-ink">Refresh this week's KPI sheet, generate a chart, and prep the update email for review.</p>
                  </div>
                </div>
                <div class="max-w-[88%]">
                  <p class="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#0f4f85]">Kazibee</p>
                  <div class="inline-block max-w-full rounded-xl border border-[#7bb7e6] bg-[#dff1ff] px-3.5 py-2.5">
                    <p class="text-sm text-ink">On it. I'll sync the KPI data first, then build the chart and prepare the draft for review.</p>
                  </div>
                </div>
                <div class="rounded-xl border border-[#7da2c4]/55 bg-gradient-to-b from-[#4d6783]/95 to-[#2f455d]/95 px-3.5 py-3 shadow-lg shadow-[#213244]/30">
                  <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#c8dcf1]">Working in the background</p>
                  <div class="mt-2 rounded-lg border border-[#a9c1d9]/30 bg-[#22374d]/70 px-3 py-2.5 font-mono text-[11px] leading-6 text-[#e4edf7]">
                    <p><span class="text-[#a6c0da]">const</span> metrics = <span class="text-[#e8f2fc]">await</span> tools["metrics-hub"].fetchWeeklyKPIs("this-week");</p>
                    <p><span class="text-[#e8f2fc]">await</span> tools["google-sheets"].writeRange("WEEKLY_METRICS", "Summary!A1:F20", metrics.rows);</p>
                    <p><span class="text-[#a6c0da]">const</span> chart = <span class="text-[#e8f2fc]">await</span> tools["google-sheets"].exportChart("WEEKLY_METRICS", "KPI_Trend", "/tmp/weekly-kpi.jpg");</p>
                    <p><span class="text-[#a6c0da]">const</span> draft = <span class="text-[#e8f2fc]">await</span> tools["gmail"].createDraftWithAttachments("ops@company.com", "Weekly KPI Update", "Draft attached for review.", [&#123;path: chart.path&#125;]);</p>
                    <p><span class="text-[#e8f2fc]">await</span> tools["slack"].sendMessage("#ops-reviews", "Weekly KPI draft ready", draft.webLink);</p>
                  </div>
                </div>
                <div class="max-w-[88%]">
                  <p class="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#0f4f85]">Kazibee</p>
                  <div class="inline-block max-w-full rounded-xl border border-[#7bb7e6] bg-[#dff1ff] px-3.5 py-2.5">
                    <p class="text-sm text-ink">Done. Metrics were synced into Sheets, a chart was exported, and a draft with attachment was posted to Slack for signoff.</p>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article class="relative py-4" data-test-id="workflow-story-media">
            <BlurUpImage
              src="/images/work/productive-video-audio_768.webp"
              placeholder="/images/work/productive-video-audio_blur.webp"
              alt="A person focused on editing a video timeline and audio tracks"
              class="pointer-events-none absolute right-0 bottom-0 z-20 hidden -mr-56 -mb-4 h-48 w-72 -rotate-1 rounded-xl object-cover opacity-95 shadow-xl ring-1 ring-black/5 lg:block xl:-mr-72 xl:-mb-6 xl:h-52 xl:w-80 2xl:-mr-80 2xl:-mb-8 2xl:h-56 2xl:w-96"
            />
            <div class="relative z-10 rounded-2xl border-t border-r border-white/70 bg-white/35 p-4 backdrop-blur-md backdrop-saturate-75 backdrop-brightness-90">
              <p class="text-xs font-bold uppercase tracking-[0.12em] text-honey-700">Media assembly pipeline</p>
              <p class="mt-2 text-sm text-ink-muted">
                Marketing gets source video in Drive and voice notes via Gmail.
                Kazibee pulls both inputs and assembles a publishable cut.
              </p>
              <div class="mt-4 space-y-3">
                <div class="ml-auto max-w-[88%] text-right">
                  <p class="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8a3b00]">You</p>
                  <div class="inline-block max-w-full rounded-xl border border-[#f2b94b] bg-[#fff2cc] px-3.5 py-2.5 text-left">
                    <p class="text-sm text-ink">Use the voice note from Gmail and merge it into the source video for today's publish.</p>
                  </div>
                </div>
                <div class="max-w-[88%]">
                  <p class="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#0f4f85]">Kazibee</p>
                  <div class="inline-block max-w-full rounded-xl border border-[#7bb7e6] bg-[#dff1ff] px-3.5 py-2.5">
                    <p class="text-sm text-ink">Great - I'll pull the latest voice note, merge it with the source clip, and get the final export ready.</p>
                  </div>
                </div>
                <div class="rounded-xl border border-[#7da2c4]/55 bg-gradient-to-b from-[#4d6783]/95 to-[#2f455d]/95 px-3.5 py-3 shadow-lg shadow-[#213244]/30">
                  <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#c8dcf1]">Working in the background</p>
                  <div class="mt-2 rounded-lg border border-[#a9c1d9]/30 bg-[#22374d]/70 px-3 py-2.5 font-mono text-[11px] leading-6 text-[#e4edf7]">
                    <p><span class="text-[#a6c0da]">const</span> parts = <span class="text-[#e8f2fc]">await</span> tools["gmail"].listAttachments("VOICE_NOTE_MESSAGE_ID");</p>
                    <p><span class="text-[#e8f2fc]">await</span> tools["gmail"].downloadAttachmentPart("VOICE_NOTE_MESSAGE_ID", parts[0].partId, "/tmp/voice.wav");</p>
                    <p><span class="text-[#e8f2fc]">await</span> tools["video-editor"].mixAudioAndVideo(&#123;videoPath: "/tmp/source.mp4", audioPath: "/tmp/voice.wav", outputPath: "/tmp/final-cut.mp4"&#125;);</p>
                  </div>
                </div>
                <div class="max-w-[88%]">
                  <p class="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#0f4f85]">Kazibee</p>
                  <div class="inline-block max-w-full rounded-xl border border-[#7bb7e6] bg-[#dff1ff] px-3.5 py-2.5">
                    <p class="text-sm text-ink">Done. I pulled the latest audio attachment, mixed it into the source clip, and produced a final export path for publishing.</p>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>

      <div class="border-t border-neutral-100 pt-8" data-test-id="plugin-structure">
        <h3 class="text-lg font-bold text-ink mb-4">Plugin structure</h3>
        <p class="text-ink-muted mb-4">A Kazibee plugin is a TypeScript package with three key files:</p>

        <p class="text-sm font-bold text-ink mb-2 pt-1">1. Package wiring (package.json)</p>
        <div class="rounded-lg border border-neutral-800 bg-neutral-900 p-3 font-mono text-xs mb-4">
          <p><span class="text-neutral-400">&#123;</span></p>
          <p class="pl-4"><span class="text-blue-300">"name"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"@kazibee/gmail"</span><span class="text-neutral-400">,</span></p>
          <p class="pl-4"><span class="text-blue-300">"main"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"./src/index.ts"</span><span class="text-neutral-400">,</span></p>
          <p class="pl-4"><span class="text-blue-300">"command"</span><span class="text-neutral-400">:</span> <span class="text-green-300">"./src/command.ts"</span></p>
          <p><span class="text-neutral-400">&#125;</span></p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <p class="text-sm font-bold text-ink mb-2 pt-1">2. Main export (index.ts)</p>
            <div class="rounded-lg border border-neutral-800 bg-neutral-900 p-3 font-mono text-xs">
              <p><span class="text-purple-400">export default function</span> <span class="text-blue-300">main</span><span class="text-neutral-400">(</span><span class="text-amber-300">env</span><span class="text-neutral-400">) &#123;</span></p>
              <p class="pl-4"><span class="text-purple-400">const</span> <span class="text-blue-300">client</span> <span class="text-neutral-400">=</span> <span class="text-purple-400">new</span> <span class="text-blue-300">GmailClient</span><span class="text-neutral-400">(</span><span class="text-amber-300">env</span><span class="text-neutral-400">);</span></p>
              <p class="pl-4"><span class="text-purple-400">return</span> <span class="text-neutral-400">&#123;</span></p>
              <p class="pl-8"><span class="text-blue-300">listMessages</span><span class="text-neutral-400">:</span> <span class="text-purple-400">async</span> <span class="text-neutral-400">(query) =&gt; client.listMessages(query),</span></p>
              <p class="pl-8"><span class="text-blue-300">sendMessage</span><span class="text-neutral-400">:</span> <span class="text-purple-400">async</span> <span class="text-neutral-400">(to, subject, body) =&gt; client.sendMessage(to, subject, body)</span></p>
              <p class="pl-4"><span class="text-neutral-400">&#125;;</span></p>
              <p><span class="text-neutral-400">&#125;</span></p>
            </div>
          </div>

          <div>
            <p class="text-sm font-bold text-ink mb-2 pt-1">3. Optional CLI command (command.ts)</p>
            <div class="rounded-lg border border-neutral-800 bg-neutral-900 p-3 font-mono text-xs">
              <p><span class="text-purple-400">export async function</span> <span class="text-blue-300">login</span><span class="text-neutral-400">() &#123;</span></p>
              <p class="pl-4"><span class="text-purple-400">const</span> <span class="text-neutral-400">&#123;</span><span class="text-amber-300">refreshToken</span><span class="text-neutral-400">&#125; =</span> <span class="text-purple-400">await</span> <span class="text-blue-300">runOAuthFlow</span><span class="text-neutral-400">();</span></p>
              <p class="pl-4"><span class="text-purple-400">return</span> <span class="text-neutral-400">&#123;</span></p>
              <p class="pl-8"><span class="text-blue-300">CLIENT_ID</span><span class="text-neutral-400">:</span> <span class="text-green-300">"..."</span><span class="text-neutral-400">,</span></p>
              <p class="pl-8"><span class="text-blue-300">CLIENT_SECRET</span><span class="text-neutral-400">:</span> <span class="text-green-300">"..."</span><span class="text-neutral-400">,</span></p>
              <p class="pl-8"><span class="text-blue-300">REFRESH_TOKEN</span><span class="text-neutral-400">:</span> <span class="text-amber-300">refreshToken</span></p>
              <p class="pl-4"><span class="text-neutral-400">&#125;;</span></p>
              <p><span class="text-neutral-400">&#125;</span></p>
            </div>
          </div>
        </div>

        <div class="mt-6 rounded-xl bg-honey-50 border-2 border-honey-300 p-5">
          <p class="text-sm font-bold text-ink mb-2">Key concepts:</p>
          <ul class="space-y-2 text-sm text-ink-muted">
            <li class="flex gap-2"><span class="text-honey-600">•</span> Export a default function that returns an object of methods</li>
            <li class="flex gap-2"><span class="text-honey-600">•</span> Methods become callable via <code class="font-mono text-xs bg-white px-1.5 py-0.5 rounded">tools["plugin-name"].methodName()</code></li>
            <li class="flex gap-2"><span class="text-honey-600">•</span> Optional <code class="font-mono text-xs bg-white px-1.5 py-0.5 rounded">command.ts</code> for CLI commands like <code class="font-mono text-xs bg-white px-1.5 py-0.5 rounded">kazibee gmail login</code></li>
            <li class="flex gap-2"><span class="text-honey-600">•</span> Installed from GitHub with SHA pinning for reproducibility</li>
          </ul>
        </div>
      </div>

      <!-- Plugin Commands -->
      <div class="border-t border-neutral-100 pt-8" data-test-id="plugin-command-usage">
        <h3 class="text-lg font-bold text-ink mb-4">Running plugin commands</h3>
        <p class="text-ink-muted mb-5">
          Each named export in <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">command.ts</code> becomes a CLI command. Example:
          <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">export async function login()</code> maps to
          <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">kazibee &lt;plugin-name&gt; login</code>.
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
            <span class="text-white">kazibee</span> <span class="text-white">&lt;plugin-name&gt;</span> <span class="text-white">&lt;command&gt;</span>
          </TerminalLine>
          <TerminalLine showPrompt={false} class="pt-1 text-neutral-100">
            # examples from official plugins
          </TerminalLine>
          <TerminalLine>
            <span class="text-white">kazibee</span> <span class="text-white">gmail</span> <span class="text-white">login</span>
          </TerminalLine>
          <TerminalLine>
            <span class="text-white">kazibee</span> <span class="text-white">google-drive</span> <span class="text-white">login</span>
          </TerminalLine>
          <TerminalLine>
            <span class="text-white">kazibee</span> <span class="text-white">google-sheets</span> <span class="text-white">login</span>
          </TerminalLine>
          <TerminalLine>
            <span class="text-white">kazibee</span> <span class="text-white">google-docs</span> <span class="text-white">login</span>
          </TerminalLine>
        </TerminalFrame>

      </div>

      <!-- LLM Instructions -->
      <div class="border-t border-neutral-100 pt-8" data-test-id="plugin-llm-instructions">
        <h3 class="text-lg font-bold text-ink mb-4">Plugin-specific LLM instructions (llm.txt)</h3>
        <p class="text-ink-muted mb-4">
          Each plugin includes an <code class="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">llm.txt</code> file with instructions for AI agents. This tells the LLM how to use the plugin effectively.
        </p>

        <div class="space-y-4">
          <div>
            <p class="text-sm font-bold text-ink mb-2">Load plugin instructions for the LLM:</p>
            <div class="rounded-lg border border-neutral-800 bg-neutral-900 p-3 font-mono text-xs">
              <p><span class="text-cyan-400">kazibee</span> <span class="text-green-400">llm</span> <span class="text-amber-300">gmail</span></p>
            </div>
          </div>

          <div class="rounded-xl bg-honey-50 border border-honey-300 p-5">
            <p class="text-sm text-ink-muted">
              The <code class="font-mono text-xs bg-white px-1.5 py-0.5 rounded">llm.txt</code> includes usage examples, intent mappings, auth requirements, and best practices. When the LLM reads this file, it understands exactly how to use the plugin correctly.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Official Plugins -->
    <div class="mb-6">
      <h2 class="mb-6 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Official plugins</h2>
      <p class="text-ink-muted mb-8">Pre-built, production-ready plugins maintained by the Kazibee team.</p>
    </div>

    <!-- Plugin Grid -->
    <div class="grid gap-6 sm:grid-cols-2" data-test-id="plugins-grid">

      <!-- Gmail -->
      <article class="rounded-2xl bg-white p-6" data-test-id="plugin-gmail">
        <div class="flex items-start gap-4">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-honey-400">
            <svg class="h-6 w-6 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-bold text-ink">Gmail</h3>
            <p class="mt-1 text-sm text-ink-muted">Send, receive, search emails. Download attachments. Manage labels and filters.</p>
            <div class="mt-3 rounded-lg border border-neutral-800 bg-neutral-900 p-2 font-mono text-xs">
              <span class="text-cyan-400">kazibee</span> <span class="text-green-400">install</span> <span class="text-amber-300">gmail</span> <span class="text-purple-300">github:kazibee/gmail</span>
            </div>
          </div>
        </div>
      </article>

      <!-- Google Drive -->
      <article class="rounded-2xl bg-white p-6" data-test-id="plugin-drive">
        <div class="flex items-start gap-4">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-honey-400">
            <svg class="h-6 w-6 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-bold text-ink">Google Drive</h3>
            <p class="mt-1 text-sm text-ink-muted">Upload, download, search files. Create folders. Manage permissions.</p>
            <div class="mt-3 rounded-lg border border-neutral-800 bg-neutral-900 p-2 font-mono text-xs">
              <span class="text-cyan-400">kazibee</span> <span class="text-green-400">install</span> <span class="text-amber-300">google-drive</span> <span class="text-purple-300">github:kazibee/google-drive</span>
            </div>
          </div>
        </div>
      </article>

      <!-- Google Sheets -->
      <article class="rounded-2xl bg-white p-6" data-test-id="plugin-sheets">
        <div class="flex items-start gap-4">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ink">
            <svg class="h-6 w-6 text-honey-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-bold text-ink">Google Sheets</h3>
            <p class="mt-1 text-sm text-ink-muted">Read, write, format spreadsheet data. Create sheets and manage ranges.</p>
            <div class="mt-3 rounded-lg border border-neutral-800 bg-neutral-900 p-2 font-mono text-xs">
              <span class="text-cyan-400">kazibee</span> <span class="text-green-400">install</span> <span class="text-amber-300">google-sheets</span> <span class="text-purple-300">github:kazibee/google-sheets</span>
            </div>
          </div>
        </div>
      </article>

      <!-- Image Generator -->
      <article class="rounded-2xl bg-white p-6" data-test-id="plugin-image-gen">
        <div class="flex items-start gap-4">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ink">
            <svg class="h-6 w-6 text-honey-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-bold text-ink">Image Generator</h3>
            <p class="mt-1 text-sm text-ink-muted">Text-to-image generation powered by Gemini. Edit and enhance images.</p>
            <div class="mt-3 rounded-lg border border-neutral-800 bg-neutral-900 p-2 font-mono text-xs">
              <span class="text-cyan-400">kazibee</span> <span class="text-green-400">install</span> <span class="text-amber-300">image-gen</span> <span class="text-purple-300">github:kazibee/image-gen</span>
            </div>
          </div>
        </div>
      </article>

      <!-- Image Editor -->
      <article class="rounded-2xl bg-white p-6" data-test-id="plugin-image-editor">
        <div class="flex items-start gap-4">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-honey-400">
            <svg class="h-6 w-6 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-bold text-ink">Image Editor</h3>
            <p class="mt-1 text-sm text-ink-muted">Resize, crop, rotate images. Remove backgrounds. Advanced compositing.</p>
            <div class="mt-3 rounded-lg border border-neutral-800 bg-neutral-900 p-2 font-mono text-xs">
              <span class="text-cyan-400">kazibee</span> <span class="text-green-400">install</span> <span class="text-amber-300">image-editor</span> <span class="text-purple-300">github:kazibee/image-editor</span>
            </div>
          </div>
        </div>
      </article>

      <!-- Google Docs -->
      <article class="rounded-2xl bg-white p-6" data-test-id="plugin-docs">
        <div class="flex items-start gap-4">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ink">
            <svg class="h-6 w-6 text-honey-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-bold text-ink">Google Docs</h3>
            <p class="mt-1 text-sm text-ink-muted">Create documents. Insert text, headings, tables. Format and style content.</p>
            <div class="mt-3 rounded-lg border border-neutral-800 bg-neutral-900 p-2 font-mono text-xs">
              <span class="text-cyan-400">kazibee</span> <span class="text-green-400">install</span> <span class="text-amber-300">google-docs</span> <span class="text-purple-300">github:kazibee/google-docs</span>
            </div>
          </div>
        </div>
      </article>

      <!-- DigitalOcean -->
      <article class="rounded-2xl bg-white p-6" data-test-id="plugin-digitalocean">
        <div class="flex items-start gap-4">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-honey-400">
            <svg class="h-6 w-6 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-bold text-ink">DigitalOcean</h3>
            <p class="mt-1 text-sm text-ink-muted">Manage droplets, domains, and cloud infrastructure programmatically.</p>
            <div class="mt-3 rounded-lg border border-neutral-800 bg-neutral-900 p-2 font-mono text-xs">
              <span class="text-cyan-400">kazibee</span> <span class="text-green-400">install</span> <span class="text-amber-300">digitalocean</span> <span class="text-purple-300">github:kazibee/digitalocean</span>
            </div>
          </div>
        </div>
      </article>

      <!-- Chrome Browser -->
      <article class="rounded-2xl bg-white p-6" data-test-id="plugin-chrome-browser">
        <div class="flex items-start gap-4">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ink">
            <svg class="h-6 w-6 text-honey-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 5h18M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zm4 14h8" />
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-bold text-ink">Chrome Browser</h3>
            <p class="mt-1 text-sm text-ink-muted">Automate browser tasks with CDP. Navigate pages, inspect elements, and run UI actions.</p>
            <div class="mt-3 rounded-lg border border-neutral-800 bg-neutral-900 p-2 font-mono text-xs">
              <span class="text-cyan-400">kazibee</span> <span class="text-green-400">install</span> <span class="text-amber-300">chrome-browser</span> <span class="text-purple-300">github:kazibee/chrome-browser</span>
            </div>
          </div>
        </div>
      </article>

    </div>

    <!-- CTA -->
    <section class="mt-12 rounded-2xl bg-honey-50 p-8" data-test-id="plugins-cta">
      <div class="flex items-start gap-4">
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-honey-400">
          <svg class="h-6 w-6 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h2 class="text-xl font-bold text-ink">Build your own plugin</h2>
          <p class="mt-2 leading-relaxed text-ink-muted">
            Need a custom capability? Build your own plugin and contribute it back to the community.
          </p>
          <div class="mt-6 flex flex-wrap gap-3" data-test-id="plugins-cta-actions">
            <a href="/technical-details" class="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-light" data-test-id="technical-link">
              Technical details
            </a>
            <a href="/" class="rounded-xl border-2 border-honey-300 bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-honey-100" data-test-id="back-home-button">
              Back to home
            </a>
          </div>
        </div>
      </div>
    </section>
  </div>
</section>
