<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    children,
    title,
    class: className = ''
  }: {
    children: Snippet;
    title: string;
    class?: string;
  } = $props();
</script>

<div class={`overflow-hidden rounded-xl border border-neutral-800 ${className}`}>
  <div class="flex items-center gap-2 border-b border-neutral-700 bg-neutral-800 px-4 py-2.5">
    <span class="h-2.5 w-2.5 rounded-full bg-red-400/70"></span>
    <span class="h-2.5 w-2.5 rounded-full bg-honey-400/70"></span>
    <span class="h-2.5 w-2.5 rounded-full bg-green-400/70"></span>
    <span class="ml-2 text-xs font-mono text-neutral-400">{title}</span>
  </div>
  <div class="bg-neutral-900 p-3 font-mono text-xs">
    {@render children()}
  </div>
</div>
