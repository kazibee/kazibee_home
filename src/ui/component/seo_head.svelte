<script>
  const siteName = 'Kazibee';
  const origin = 'https://kazibee.com';
  const defaultDescription = 'Kazibee is a desktop AI workspace for switching models, managing threads, running parallel work, and using plugins with your own API keys.';

  let {
    title = siteName,
    description = defaultDescription,
    path = '/',
    image = '/images/og-image.png',
    type = 'website',
    noindex = false
  } = $props();

  let pageTitle = $derived(title === siteName ? siteName : `${title} | ${siteName}`);
  let canonicalPath = $derived(path.startsWith('/') ? path : `/${path}`);
  let url = $derived(`${origin}${canonicalPath}`);
  let imageUrl = $derived(image.startsWith('http') ? image : `${origin}${image}`);
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta name="description" content={description} />
  {#if noindex}
    <meta name="robots" content="noindex, nofollow" />
  {/if}
  <link rel="canonical" href={url} />

  <meta property="og:site_name" content={siteName} />
  <meta property="og:type" content={type} />
  <meta property="og:title" content={pageTitle} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={url} />
  <meta property="og:image" content={imageUrl} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={pageTitle} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={imageUrl} />
  {#if canonicalPath === '/'}
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Kazibee",
        "applicationCategory": "DeveloperApplication",
        "operatingSystem": "macOS, Windows, Linux",
        "url": "https://kazibee.com",
        "description": "Kazibee is a desktop AI workspace for switching models, managing threads, running parallel work, and using plugins with your own API keys.",
        "image": "https://kazibee.com/images/og-image.png",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        }
      }
    </script>
  {/if}
</svelte:head>
