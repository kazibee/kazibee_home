<script lang="ts">
  let { title, subtitle = '' }: { title: string; subtitle?: string } = $props();
</script>

<div class="mb-8">
  <h1 class="text-3xl font-bold text-gray-900">{title}</h1>
  {#if subtitle}
    <p class="mt-2 text-sm text-gray-600">{subtitle}</p>
  {/if}
</div>
