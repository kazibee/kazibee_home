<script lang="ts">
  interface DownloadItem {
    name: string;
    href: string;
    size: number;
    lastModified: string | null;
  }

  interface VersionDownloads {
    version: string;
    downloads: DownloadItem[];
  }

  interface DownloadsData {
    versions: VersionDownloads[];
    selectedVersion: string;
    isLoading: boolean;
    error: string | null;
  }

  interface DownloadsInput {
    refresh(): Promise<void>;
  }

  const fallbackInput: DownloadsInput = {
    refresh: async () => {},
  };

  let {
    data,
    input = fallbackInput,
    versions = [],
    selectedVersion = "latest",
    error = null,
  }: {
    data?: DownloadsData;
    input?: DownloadsInput;
    versions?: VersionDownloads[];
    selectedVersion?: string;
    error?: string | null;
  } = $props();

  let pageData = $derived(data ?? {
    versions,
    selectedVersion,
    isLoading: false,
    error,
  });
  let selectedGroup = $derived(pageData.versions.find((versionGroup) => versionGroup.version === pageData.selectedVersion) ?? null);
  let otherVersions = $derived(pageData.versions.filter((versionGroup) => versionGroup.version !== pageData.selectedVersion));

  function formatBytes(size: number): string {
    if (!Number.isFinite(size) || size <= 0) {
      return "";
    }
    const units = ["B", "KB", "MB", "GB"];
    let value = size;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }

  function formatDate(value: string | null): string {
    if (!value) {
      return "";
    }
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function itemLabel(name: string): string {
    if (name === "SHA256SUMS") {
      return "SHA256 checksums";
    }
    const match = /^kazibee-([a-z]+)-([a-z0-9]+)(?:-v\d+\.\d+\.\d+)?\.(tar\.gz|zip)$/.exec(name);
    if (!match) {
      return name;
    }
    const os = match[1] === "macos" ? "macOS" : match[1][0].toUpperCase() + match[1].slice(1);
    const arch = match[2] === "x64" ? "x64" : "arm64";
    return `${os} ${arch}`;
  }

  function itemKind(name: string): string {
    if (name === "SHA256SUMS") {
      return "Checksum file";
    }
    if (name.endsWith(".zip")) {
      return "ZIP archive";
    }
    if (name.endsWith(".tar.gz")) {
      return "Tarball";
    }
    return "Download";
  }
</script>

<section class="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-20">
  <header class="mb-10 flex flex-col gap-6 border-b border-neutral-100 pb-10 sm:flex-row sm:items-end sm:justify-between" data-test-id="downloads-header">
    <div>
      <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-honey-600">Kazibee CLI</p>
      <h1 class="text-4xl font-black tracking-tight text-ink sm:text-5xl lg:text-6xl" data-test-id="downloads-title">
        {pageData.selectedVersion === 'latest' ? 'Downloads' : pageData.selectedVersion}
      </h1>
      <p class="mt-5 max-w-2xl text-lg leading-relaxed text-ink-muted" data-test-id="downloads-subtitle">
        {pageData.selectedVersion === 'latest'
          ? 'Download the latest Kazibee command line binary for your operating system. Each link is generated on demand and expires shortly after it is opened.'
          : 'Download this Kazibee command line release for your operating system. Each link is generated on demand and expires shortly after it is opened.'}
      </p>
    </div>

    <button
      onclick={() => input.refresh()}
      disabled={pageData.isLoading}
      class="inline-flex items-center justify-center rounded-xl border-2 border-neutral-200 px-5 py-3 text-sm font-semibold text-ink transition hover:border-honey-400 hover:bg-honey-50 disabled:cursor-not-allowed disabled:opacity-50"
      data-test-id="downloads-refresh"
    >
      {pageData.isLoading ? 'Refreshing...' : 'Refresh'}
    </button>
  </header>

  {#if pageData.error}
    <div class="mb-8 rounded-2xl border border-red-200 bg-red-50 p-5" data-test-id="downloads-error">
      <p class="text-sm font-semibold text-red-800">Unable to load downloads</p>
      <p class="mt-1 text-sm text-red-700">{pageData.error}</p>
    </div>
  {/if}

  {#if pageData.versions.length === 0 && !pageData.error}
    <div class="rounded-2xl border border-neutral-200 bg-white p-8 text-center" data-test-id="downloads-empty">
      <p class="text-lg font-semibold text-ink">No downloads are available yet.</p>
      <p class="mt-2 text-sm text-ink-muted">Published CLI builds will appear here after they are uploaded.</p>
    </div>
  {:else if !selectedGroup && !pageData.error}
    <div class="rounded-2xl border border-neutral-200 bg-white p-8 text-center" data-test-id="downloads-version-missing">
      <p class="text-lg font-semibold text-ink">Version not found.</p>
      <p class="mt-2 text-sm text-ink-muted">Choose one of the available versions below.</p>
    </div>
  {:else}
    <div class="space-y-12" data-test-id="downloads-version-list">
      {#if selectedGroup}
        <section class="border-b border-neutral-100 pb-10" data-test-id="downloads-version-section">
          <div class="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="text-2xl font-black tracking-tight text-ink" data-test-id="downloads-version-title">
                {selectedGroup.version === 'latest' ? 'Latest release' : selectedGroup.version}
              </h2>
              <p class="mt-1 text-sm text-ink-muted">
                {selectedGroup.version === 'latest' ? 'Recommended stable build' : `${selectedGroup.downloads.length} files available`}
              </p>
            </div>
          </div>

          <div class="overflow-hidden rounded-2xl border border-neutral-200 bg-white" data-test-id="downloads-table">
            <div class="hidden grid-cols-[minmax(0,1fr)_120px_120px_120px] gap-4 border-b border-neutral-100 bg-neutral-50 px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-ink-faint sm:grid">
              <span>Asset</span>
              <span>Type</span>
              <span>Size</span>
              <span class="text-right">Action</span>
            </div>

            {#each selectedGroup.downloads as item (item.name)}
              <div class="grid gap-3 border-b border-neutral-100 px-5 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_120px_120px_120px] sm:items-center sm:gap-4" data-test-id="download-row">
                <div class="min-w-0">
                  <p class="font-semibold text-ink" data-test-id="download-label">{itemLabel(item.name)}</p>
                  <p class="mt-1 truncate font-mono text-xs text-ink-muted" title={item.name} data-test-id="download-name">{item.name}</p>
                  {#if item.lastModified}
                    <p class="mt-1 text-xs text-ink-faint sm:hidden">Updated {formatDate(item.lastModified)}</p>
                  {/if}
                </div>

                <p class="text-sm text-ink-muted" data-test-id="download-kind">{itemKind(item.name)}</p>
                <p class="text-sm text-ink-muted" data-test-id="download-size">{formatBytes(item.size)}</p>
                <a
                  href={item.href}
                  class="inline-flex items-center justify-center rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-light"
                  data-test-id="download-link"
                >
                  Download
                </a>
              </div>
            {/each}
          </div>
        </section>

        {#if otherVersions.length > 0}
          <section data-test-id="downloads-other-versions">
            <h2 class="text-2xl font-black tracking-tight text-ink">Other versions</h2>
            <div class="mt-5 grid gap-3 sm:grid-cols-2">
              {#each otherVersions as versionGroup (versionGroup.version)}
                <a
                  href={versionGroup.version === 'latest' ? '/downloads/cli' : `/downloads/cli/${encodeURIComponent(versionGroup.version)}`}
                  class="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-sm font-semibold text-ink transition hover:border-honey-300 hover:bg-honey-50"
                  data-test-id="downloads-other-version-link"
                >
                  <span>{versionGroup.version === 'latest' ? 'latest' : versionGroup.version}</span>
                  <span class="text-xs font-medium text-ink-muted">{versionGroup.downloads.length} files</span>
                </a>
              {/each}
            </div>
          </section>
        {/if}
      {/if}
    </div>
  {/if}
</section>
