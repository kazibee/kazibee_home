<script>
  import { onMount } from 'svelte';

  let props = $props();
  let loaded = $state(false);
  let imageElement;

  onMount(() => {
    if (imageElement?.complete) {
      loaded = true;
    }
  });
</script>

<span class={`relative overflow-hidden ${props.class ?? ''}`}>
  <img
    src={props.placeholder}
    alt=""
    aria-hidden="true"
    class={`absolute inset-0 ${props.imageClass ?? 'h-full w-full object-cover'} scale-110 blur-lg transition-opacity duration-200 ${loaded ? 'opacity-0' : 'opacity-100'}`}
  />
  <img
    bind:this={imageElement}
    src={props.src}
    alt={props.alt}
    class={`absolute inset-0 ${props.imageClass ?? 'h-full w-full object-cover'} transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
    loading={props.loading ?? 'lazy'}
    decoding="async"
    onload={() => loaded = true}
  />
</span>
