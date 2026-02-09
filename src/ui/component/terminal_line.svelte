<script lang="ts">
  import type { Snippet } from 'svelte';
  import TerminalPrompt from './terminal_prompt.svelte';

  let {
    children,
    class: className = '',
    showPrompt = true,
    promptUser = 'dev@local',
    promptPath = '~/workspace',
    promptUserClass,
    promptSeparatorClass,
    promptPathClass,
    promptDollarClass
  }: {
    children?: Snippet;
    class?: string;
    showPrompt?: boolean;
    promptUser?: string;
    promptPath?: string;
    promptUserClass?: string;
    promptSeparatorClass?: string;
    promptPathClass?: string;
    promptDollarClass?: string;
  } = $props();
</script>

<p class={className}>
  {#if showPrompt}
    <TerminalPrompt
      user={promptUser}
      path={promptPath}
      userClass={promptUserClass}
      separatorClass={promptSeparatorClass}
      pathClass={promptPathClass}
      dollarClass={promptDollarClass}
    />
  {/if}
  {#if children}
    {@render children()}
  {/if}
</p>
