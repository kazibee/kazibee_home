<script>
  let {
    phrases = [],
    intervalSeconds = 1.4,
  } = $props();

  const fallbackPhrases = ['work on UI'];
  const reelPhrases = $derived(phrases.length > 0 ? phrases : fallbackPhrases);
  const repeatedPhrases = $derived([...reelPhrases, reelPhrases[0]]);
  const rowHeight = 44;
  const windowHeight = 52;
  const stepCount = $derived(reelPhrases.length);
  const durationSeconds = $derived(stepCount * intervalSeconds);
</script>

<span
  class="odometer-word-reel"
  style={`--row-height: ${rowHeight}px; --window-height: ${windowHeight}px; --step-count: ${stepCount}; --duration: ${durationSeconds}s;`}
>
  <span class="odometer-word-reel__notch odometer-word-reel__notch--left" aria-hidden="true"></span>
  <span class="odometer-word-reel__notch odometer-word-reel__notch--right" aria-hidden="true"></span>
  <span class="odometer-word-reel__window">
    <span class="odometer-word-reel__split" aria-hidden="true"></span>
    <span class="odometer-word-reel__stack" aria-hidden="true">
      {#each repeatedPhrases as phrase, index (`${phrase}-${index}`)}
        <span class="odometer-word-reel__item">{phrase}</span>
      {/each}
    </span>
    <span class="odometer-word-reel__static">{reelPhrases[0]}</span>
  </span>
</span>

<style>
  .odometer-word-reel {
    --row-height: 48px;
    --window-height: 52px;
    --step-count: 1;
    --duration: 1.4s;

    background: linear-gradient(180deg, #f8fafc 0%, #d8e0ea 54%, #bfccda 100%);
    border-radius: 13px;
    box-shadow:
      0 16px 26px rgb(0 0 0 / 0.45),
      0 7px 14px rgb(15 23 42 / 0.35);
    display: inline-block;
    height: calc(var(--window-height) + 10px);
    padding: 5px;
    position: relative;
    transform: perspective(740px) rotateX(4deg);
    vertical-align: middle;
    max-width: calc(100vw - 48px);
    width: clamp(196px, 56vw, 222px);
  }

  .odometer-word-reel::before {
    background: linear-gradient(180deg, rgb(255 255 255 / 0.8), transparent 32%, rgb(15 23 42 / 0.18) 100%);
    border-radius: inherit;
    content: '';
    inset: 0;
    pointer-events: none;
    position: absolute;
  }

  .odometer-word-reel::after {
    border-radius: 9px;
    box-shadow:
      inset 0 0 0 1px rgb(255 255 255 / 0.08),
      0 0 0 1px rgb(15 23 42 / 0.18);
    content: '';
    inset: 5px;
    pointer-events: none;
    position: absolute;
  }

  .odometer-word-reel__notch {
    background: #cbd5e1;
    height: 22px;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 5px;
    z-index: 4;
  }

  .odometer-word-reel__notch--left {
    border-radius: 0 999px 999px 0;
    left: 9px;
  }

  .odometer-word-reel__notch--right {
    border-radius: 999px 0 0 999px;
    right: 9px;
  }

  .odometer-word-reel__window {
    background: #172131;
    border-radius: 9px;
    box-shadow:
      inset 0 2px 4px rgb(255 255 255 / 0.12),
      inset 0 -10px 16px rgb(0 0 0 / 0.42);
    display: block;
    height: var(--window-height);
    overflow: hidden;
    position: relative;
  }

  .odometer-word-reel__window::before,
  .odometer-word-reel__window::after {
    content: '';
    left: 0;
    pointer-events: none;
    position: absolute;
    right: 0;
    z-index: 3;
  }

  .odometer-word-reel__window::before {
    background: linear-gradient(180deg, rgb(0 0 0 / 0.62), rgb(23 33 49 / 0.84), transparent);
    height: 22px;
    top: 0;
  }

  .odometer-word-reel__window::after {
    background: linear-gradient(0deg, rgb(0 0 0 / 0.7), rgb(23 33 49 / 0.84), transparent);
    bottom: 0;
    height: 24px;
  }

  .odometer-word-reel__split {
    background: rgb(248 250 252 / 0.18);
    box-shadow: 0 1px 0 rgb(0 0 0 / 0.55);
    height: 1px;
    left: 0;
    position: absolute;
    right: 0;
    top: 50%;
    z-index: 4;
  }

  .odometer-word-reel__stack {
    animation: odometer-word-reel-roll var(--duration) cubic-bezier(0.7, 0, 0.17, 1) infinite;
    display: flex;
    flex-direction: column;
    position: absolute;
    top: calc((var(--window-height) - var(--row-height)) / 2);
    width: 100%;
  }

  .odometer-word-reel__item,
  .odometer-word-reel__static {
    align-items: center;
    color: #d7dee8;
    display: flex;
    font-size: clamp(18px, 5vw, 21px);
    font-style: italic;
    font-weight: 950;
    height: var(--row-height);
    justify-content: center;
    letter-spacing: 0.01em;
    line-height: 1;
    text-shadow: 0 2px 10px rgb(0 0 0 / 0.36);
    white-space: nowrap;
  }

  .odometer-word-reel__static {
    opacity: 0;
    pointer-events: none;
  }

  @keyframes odometer-word-reel-roll {
    0%,
    11% {
      transform: translateY(0);
    }

    13%,
    24% {
      transform: translateY(calc(var(--row-height) * -1));
    }

    26%,
    37% {
      transform: translateY(calc(var(--row-height) * -2));
    }

    39%,
    50% {
      transform: translateY(calc(var(--row-height) * -3));
    }

    52%,
    63% {
      transform: translateY(calc(var(--row-height) * -4));
    }

    65%,
    76% {
      transform: translateY(calc(var(--row-height) * -5));
    }

    78%,
    89% {
      transform: translateY(calc(var(--row-height) * -6));
    }

    91%,
    100% {
      transform: translateY(calc(var(--row-height) * var(--step-count) * -1));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .odometer-word-reel__stack {
      animation: none;
    }
  }
</style>
