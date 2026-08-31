<script>
  import SeoHead from '../../component/seo_head.svelte';

  const lastUpdated = 'August 31, 2026';
</script>

<SeoHead
  title="Privacy Policy"
  path="/privacy"
  description="How Kazibee handles your data: a local-first desktop app where your API keys, conversations, and files stay on your machine."
/>

<section>

  <!-- HEADER -->
  <div class="bg-navy-950 px-5 pt-24 pb-16 sm:px-8" data-test-id="privacy-hero">
    <div class="mx-auto max-w-3xl">
      <p class="mb-4 text-xs font-bold uppercase tracking-widest text-blue-300">Legal</p>
      <h1 class="text-5xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl">
        Privacy Policy
      </h1>
      <p class="mt-6 text-lg leading-relaxed text-navy-300">
        Kazibee is a local-first desktop app. Your API keys, conversations, and files stay on your machine.
      </p>
      <p class="mt-4 text-xs text-navy-700">Last updated: {lastUpdated}</p>
    </div>
  </div>

  <!-- BODY -->
  <div class="bg-white px-5 py-16 sm:px-8" data-test-id="privacy-body">
    <div class="mx-auto max-w-3xl space-y-12">

      <div>
        <h2 class="text-2xl font-black tracking-tight text-ink">Overview</h2>
        <p class="mt-4 text-base leading-relaxed text-ink-muted">
          Kazibee is a free desktop application that runs on your computer. It does not require an account,
          and we do not operate servers that store your conversations, files, or credentials. This policy
          describes what data the app touches, where it goes, and what we collect through this website.
        </p>
      </div>

      <div>
        <h2 class="text-2xl font-black tracking-tight text-ink">Data stored on your machine</h2>
        <p class="mt-4 text-base leading-relaxed text-ink-muted">
          Everything the app needs lives locally: your API keys, conversation threads, project context,
          worktree configuration, and plugin settings. This data is stored on your device and is never
          transmitted to us. Deleting the app's data directory removes it.
        </p>
      </div>

      <div>
        <h2 class="text-2xl font-black tracking-tight text-ink">Model providers</h2>
        <p class="mt-4 text-base leading-relaxed text-ink-muted">
          Kazibee is a bring-your-own-keys app. When you send a message, the content of that conversation
          (including any files or tool results you include) is sent directly from your machine to the model
          provider whose key you configured — such as Anthropic, OpenAI, or Google. That data is governed by
          the provider's own privacy policy and terms, not ours. We are not a party to those requests and
          cannot see them.
        </p>
      </div>

      <div>
        <h2 class="text-2xl font-black tracking-tight text-ink">Plugins</h2>
        <p class="mt-4 text-base leading-relaxed text-ink-muted">
          Plugins you install or link can access the systems their code connects to (APIs, databases, files)
          within the interfaces they declare. Plugins run locally under your control; review a plugin's code
          and its declared contract before granting it access to sensitive systems.
        </p>
      </div>

      <div>
        <h2 class="text-2xl font-black tracking-tight text-ink">This website</h2>
        <p class="mt-4 text-base leading-relaxed text-ink-muted">
          kazibee.com serves static pages and downloads. Like most websites, our hosting infrastructure may
          record standard server logs (IP address, user agent, requested page) for security and operational
          purposes. We do not use these logs to identify you and do not sell or share them.
        </p>
      </div>

      <div>
        <h2 class="text-2xl font-black tracking-tight text-ink">Update checks and downloads</h2>
        <p class="mt-4 text-base leading-relaxed text-ink-muted">
          The desktop app may contact our servers to check for new versions and download updates. These
          requests contain the information needed to serve the correct build (such as app version and
          operating system) and are not linked to your identity or your conversations.
        </p>
      </div>

      <div>
        <h2 class="text-2xl font-black tracking-tight text-ink">What we do not do</h2>
        <ul class="mt-4 space-y-2 text-base leading-relaxed text-ink-muted">
          <li>We do not collect, store, or read your conversations.</li>
          <li>We do not have access to your API keys.</li>
          <li>We do not sell data to anyone.</li>
          <li>We do not require an account to use Kazibee.</li>
        </ul>
      </div>

      <div>
        <h2 class="text-2xl font-black tracking-tight text-ink">Changes to this policy</h2>
        <p class="mt-4 text-base leading-relaxed text-ink-muted">
          If this policy changes, we will update this page and revise the "Last updated" date above.
        </p>
      </div>

    </div>
  </div>

</section>
