<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    children,
    class: className = '',
    borderClass = 'border-neutral-600',
    panelBgClass = 'bg-[#0f1724]',
    shadowClass = 'shadow-[0_16px_50px_rgba(0,0,0,0.45)]',
    headerBorderClass = 'border-neutral-600/80',
    headerBgClass = 'bg-[#182235]',
    title = 'kazibee-terminal',
    titleClass = 'text-neutral-300',
    bodyClass = 'bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05),transparent_60%)] px-4 py-4',
    codeClass = 'block text-left text-sm font-mono leading-6'
  }: {
    children: Snippet;
    class?: string;
    borderClass?: string;
    panelBgClass?: string;
    shadowClass?: string;
    headerBorderClass?: string;
    headerBgClass?: string;
    title?: string;
    titleClass?: string;
    bodyClass?: string;
    codeClass?: string;
  } = $props();
</script>

<div class={`overflow-hidden rounded-xl border ${borderClass} ${panelBgClass} ${shadowClass} ${className}`}>
  <div class={`flex items-center gap-2 border-b ${headerBorderClass} ${headerBgClass} px-4 py-3`}>
    <span class="h-3 w-3 rounded-full bg-red-400/70"></span>
    <span class="h-3 w-3 rounded-full bg-honey-400/70"></span>
    <span class="h-3 w-3 rounded-full bg-green-400/70"></span>
    <span class={`ml-2 text-xs font-mono ${titleClass}`}>{title}</span>
  </div>
  <div class={bodyClass}>
    <code class={codeClass}>
      {@render children()}
    </code>
  </div>
</div>
