<script>
  import SeoHead from '../../component/seo_head.svelte';

  const lastUpdated = 'August 31, 2026';
</script>

<SeoHead
  title="Terms of Service"
  path="/terms"
  description="The terms governing use of the Kazibee desktop app and website: a free, bring-your-own-keys AI workspace provided as-is."
/>

<section>

  <!-- HEADER -->
  <div class="bg-navy-950 px-5 pt-24 pb-16 sm:px-8" data-test-id="terms-hero">
    <div class="mx-auto max-w-3xl">
      <p class="mb-4 text-xs font-bold uppercase tracking-widest text-blue-300">Legal</p>
      <h1 class="text-5xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl">
        Terms of Service
      </h1>
      <p class="mt-6 text-lg leading-relaxed text-navy-300">
        The terms that govern your use of the Kazibee desktop app and this website.
      </p>
      <p class="mt-4 text-xs text-navy-700">Last updated: {lastUpdated}</p>
    </div>
  </div>

  <!-- BODY -->
  <div class="bg-white px-5 py-16 sm:px-8" data-test-id="terms-body">
    <div class="mx-auto max-w-3xl space-y-12">

      <div>
        <h2 class="text-2xl font-black tracking-tight text-ink">Acceptance of these terms</h2>
        <p class="mt-4 text-base leading-relaxed text-ink-muted">
          By downloading, installing, or using Kazibee, or by using this website, you agree to these
          terms. If you do not agree, do not use Kazibee.
        </p>
      </div>

      <div>
        <h2 class="text-2xl font-black tracking-tight text-ink">The service</h2>
        <p class="mt-4 text-base leading-relaxed text-ink-muted">
          Kazibee is a free desktop application for working with AI models using your own API keys.
          It runs locally on your machine. No account is required, and we do not host or process your
          conversations. Your use of any third-party model provider through Kazibee is governed by that
          provider's own terms, and you are responsible for complying with them and for any fees they charge.
        </p>
      </div>

      <div>
        <h2 class="text-2xl font-black tracking-tight text-ink">Your responsibilities</h2>
        <ul class="mt-4 space-y-2 text-base leading-relaxed text-ink-muted">
          <li>You are responsible for the API keys you configure and for keeping them secure.</li>
          <li>You are responsible for the plugins you install or link, including reviewing what systems they access.</li>
          <li>You are responsible for the actions Kazibee takes on your behalf, including tool calls your configured models trigger against your own systems and data.</li>
          <li>You may not use Kazibee for unlawful purposes or to violate the rights of others.</li>
        </ul>
      </div>

      <div>
        <h2 class="text-2xl font-black tracking-tight text-ink">Plugins and third-party code</h2>
        <p class="mt-4 text-base leading-relaxed text-ink-muted">
          Plugins are developed and maintained by their authors, not by us. Plugins run locally under your
          control and within the interfaces they declare, but we do not audit, endorse, or guarantee
          third-party plugins. Install plugins from sources you trust.
        </p>
      </div>

      <div>
        <h2 class="text-2xl font-black tracking-tight text-ink">AI-generated output</h2>
        <p class="mt-4 text-base leading-relaxed text-ink-muted">
          Output produced by AI models through Kazibee may be inaccurate, incomplete, or unsuitable for
          your purposes. You are responsible for reviewing output before relying on it, especially for
          code, legal, financial, or safety-relevant decisions.
        </p>
      </div>

      <div>
        <h2 class="text-2xl font-black tracking-tight text-ink">Intellectual property</h2>
        <p class="mt-4 text-base leading-relaxed text-ink-muted">
          Kazibee's name, logo, and website content belong to us. Open source components of Kazibee are
          licensed under the license terms that accompany them; those license terms govern your use of
          that code. Content you create with Kazibee is yours.
        </p>
      </div>

      <div>
        <h2 class="text-2xl font-black tracking-tight text-ink">Disclaimer of warranties</h2>
        <p class="mt-4 text-base leading-relaxed text-ink-muted">
          Kazibee is provided free of charge, "as is" and "as available", without warranties of any kind,
          express or implied, including merchantability, fitness for a particular purpose, and
          non-infringement. We do not warrant that Kazibee will be uninterrupted, error-free, or secure.
        </p>
      </div>

      <div>
        <h2 class="text-2xl font-black tracking-tight text-ink">Limitation of liability</h2>
        <p class="mt-4 text-base leading-relaxed text-ink-muted">
          To the maximum extent permitted by law, we are not liable for any indirect, incidental,
          special, consequential, or exemplary damages, or for any loss of data, profits, or business,
          arising from your use of Kazibee — including actions taken by AI models or plugins you
          configured. Because Kazibee is free, our total liability for any claim is limited to the
          amount you paid us for it: zero.
        </p>
      </div>

      <div>
        <h2 class="text-2xl font-black tracking-tight text-ink">Changes to Kazibee or these terms</h2>
        <p class="mt-4 text-base leading-relaxed text-ink-muted">
          We may change or discontinue Kazibee, or update these terms, at any time. Changes to these
          terms take effect when posted on this page, with the "Last updated" date revised above.
          Continued use after a change means you accept the updated terms.
        </p>
      </div>

      <div>
        <h2 class="text-2xl font-black tracking-tight text-ink">Privacy</h2>
        <p class="mt-4 text-base leading-relaxed text-ink-muted">
          How we handle data is described in our <a href="/privacy" class="font-semibold text-blue-600 transition hover:text-blue-500">Privacy Policy</a>.
        </p>
      </div>

    </div>
  </div>

</section>
