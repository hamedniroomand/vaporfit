<script setup lang="ts">
  // Two buttons that show the result of the probe `repros/reka-ui-as-child` with Vue 3.6.0-rc.14.
  import { ref, watch } from 'vue';

  import { useReveal } from '../reveal';

  // The attribute that the Vapor button does not get.
  const ATTRIBUTE = ' aria-haspopup="dialog"';
  const GHOST_MS = 2800;

  const root = ref<HTMLElement | null>(null);
  const reveal = useReveal(root);
  const open = ref(false);
  const clicks = ref(0);
  // The page shows `<button>` at all times. When the demo comes into view, the attribute shows
  // for a short time and then goes away.
  const ghost = ref(false);

  watch(reveal, state => {
    if (state === 'in') {
      ghost.value = true;
      setTimeout(() => {
        ghost.value = false;
      }, GHOST_MS);
    }
  });

  const button =
    'rounded-md border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground ' +
    'shadow-small transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
</script>

<template>
  <figure
    ref="root"
    class="silent-demo my-6"
    :data-reveal="reveal"
  >
    <div class="border-border shadow-menu grid overflow-hidden rounded-2xl border md:grid-cols-2">
      <section
        class="vf-r bg-card flex flex-col gap-5 p-6 sm:p-8"
        aria-label="VDOM component"
      >
        <code class="text-muted-foreground font-mono text-sm">&lt;script setup&gt;</code>
        <div class="flex min-h-24 flex-col items-start gap-3">
          <button
            type="button"
            aria-haspopup="dialog"
            :aria-expanded="open"
            :class="button"
            @click="open = !open"
          >
            Open dialog
          </button>
          <Transition name="pop">
            <p
              v-if="open"
              class="border-success-border bg-success-tint text-success m-0 w-full rounded-md border px-3 py-2 text-sm"
            >
              The dialog is open.
            </p>
          </Transition>
        </div>
        <dl class="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs">
          <dt class="text-muted-foreground">HTML</dt>
          <dd class="text-foreground m-0">&lt;button aria-haspopup="dialog"&gt;</dd>
          <dt class="text-muted-foreground">Console</dt>
          <dd class="text-foreground m-0">(empty)</dd>
        </dl>
      </section>

      <section
        class="vf-r border-border bg-card flex flex-col gap-5 border-t p-6 sm:p-8 md:border-t-0 md:border-l"
        style="--i: 2"
        aria-label="Vapor component"
      >
        <code class="text-muted-foreground font-mono text-sm">
          &lt;script setup <span class="text-brand">vapor</span>&gt;
        </code>
        <div class="flex min-h-24 flex-col items-start gap-3">
          <button
            type="button"
            :class="button"
            @click="clicks++"
          >
            Open dialog
          </button>
          <Transition name="pop">
            <p
              v-if="clicks > 0"
              class="border-warning-border bg-warning-tint text-warning m-0 w-full rounded-md border px-3 py-2 text-sm"
              aria-live="polite"
            >
              Clicks: {{ clicks }}. Nothing opens.
            </p>
          </Transition>
        </div>
        <dl class="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs">
          <dt class="text-muted-foreground">HTML</dt>
          <dd class="text-foreground m-0 whitespace-nowrap">
            &lt;button<span
              v-if="ghost"
              class="ghost"
              aria-hidden="true"
              ><span
                v-for="(char, index) in ATTRIBUTE"
                :key="index"
                :style="{ '--i': index }"
                >{{ char }}</span
              ></span
            >&gt;
          </dd>
          <dt class="text-muted-foreground">Console</dt>
          <dd class="text-foreground m-0">(empty)</dd>
        </dl>
      </section>
    </div>
    <figcaption
      class="vf-r text-muted-foreground mt-4 text-sm"
      style="--i: 4"
    >
      <slot />
    </figcaption>
  </figure>
</template>

<style scoped>
  /* Each character of the attribute goes up and away, then gives its space back. */
  .ghost span {
    display: inline-block;
    width: 1ch;
    white-space: pre;
    color: var(--brand);
    animation: evaporate 1s ease-in both;
    animation-delay: calc(0.9s + var(--i) * 35ms);
  }

  @keyframes evaporate {
    60% {
      width: 1ch;
      opacity: 0;
      filter: blur(3px);
      transform: translateY(-1.2em);
    }
    100% {
      width: 0;
      opacity: 0;
      transform: translateY(-1.2em);
    }
  }

  .pop-enter-active {
    transition:
      opacity 0.25s ease-out,
      transform 0.25s ease-out;
  }

  .pop-enter-from {
    opacity: 0;
    transform: translateY(-6px);
  }

  @media (prefers-reduced-motion: reduce) {
    .pop-enter-active {
      transition: none;
    }
  }
</style>
