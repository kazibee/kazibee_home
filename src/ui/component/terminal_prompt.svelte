<script lang="ts">
  let {
    user = 'dev@local',
    path = '~/workspace',
    userClass = 'text-green-300 drop-shadow-[0_0_8px_rgba(134,239,172,0.5)]',
    separatorClass = 'text-fuchsia-300 drop-shadow-[0_0_8px_rgba(244,114,182,0.45)]',
    pathClass = 'text-cyan-300 drop-shadow-[0_0_8px_rgba(103,232,249,0.5)]',
    dollarClass = 'text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.5)]'
  }: {
    user?: string;
    path?: string;
    userClass?: string;
    separatorClass?: string;
    pathClass?: string;
    dollarClass?: string;
  } = $props();
</script>

<span class={userClass}>{user}</span><span class={separatorClass}>:</span><span class={pathClass}>{path}</span> <span class={dollarClass}>$</span>{' '}
