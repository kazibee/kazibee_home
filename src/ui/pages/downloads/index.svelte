<script lang="ts">
  const options = [
    {
      kind: "app",
      title: "Kazibee App",
      href: "/downloads/app",
      description: "Desktop hub for managing devices, sessions, and the local relay.",
      cta: "Get the app",
    },
    {
      kind: "cli",
      title: "Kazibee CLI",
      href: "/downloads/cli",
      description: "Command-line binaries for scripting and headless workflows.",
      cta: "Get the CLI",
    },
  ];
</script>

<section class="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-20" data-test-id="downloads-hub">
  <header class="mb-12 border-b border-neutral-100 pb-10">
    <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-honey-600">Downloads</p>
    <h1 class="text-4xl font-black tracking-tight text-ink sm:text-5xl lg:text-6xl">Get Kazibee</h1>
    <p class="mt-5 max-w-2xl text-lg leading-relaxed text-ink-muted">
      Pick the build you need. Download links are signed on demand and expire shortly after they are opened.
    </p>
  </header>

  <div class="grid gap-5 sm:grid-cols-2">
    {#each options as option (option.kind)}
      <a
        href={option.href}
        class="group flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-7 transition hover:border-honey-300 hover:bg-honey-50"
        data-test-id={`downloads-hub-${option.kind}`}
      >
        <div>
          <h2 class="text-2xl font-black tracking-tight text-ink">{option.title}</h2>
          <p class="mt-3 text-sm leading-relaxed text-ink-muted">{option.description}</p>
        </div>
        <span class="mt-8 inline-flex items-center text-sm font-semibold text-ink transition group-hover:text-honey-700">
          {option.cta} →
        </span>
      </a>
    {/each}
  </div>
</section>
