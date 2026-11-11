<script setup lang="ts">
  // A part of the report of `test/fixtures/shadcn`. The lines are the lines that vaporfit printed.
  import { ref } from 'vue';

  import { useReveal } from '../utils/reveal';

  const LINES = [
    'vaporfit 0.0.0',
    'vue 3.6.0-rc.14',
    'data 2026-11-10',
    'components 4',
    'interop 3 ready 1 blocked 0 unknown',
    'pure 0 ready 4 blocked 0 unknown',
    '',
    'error silent vf_30bf4dc5fc',
    'as-child does not pass attributes or listeners to the child in a Vapor component',
    'src/pages/Home.vue:8:10',
    'reka-ui/as-child',
    'chain src/pages/Home.vue > src/components/ui/dialog/Dialog.vue > reka-ui',
    'package reka-ui 2.11.0',
  ];
  const FINDING = 'error silent ';

  const root = ref<HTMLElement | null>(null);
  const reveal = useReveal(root);
</script>

<template>
  <figure
    ref="root"
    class="border-border bg-card shadow-menu m-0 overflow-hidden rounded-2xl border"
    :data-reveal="reveal"
  >
    <figcaption class="border-border text-muted-foreground border-b px-5 py-3 font-mono text-xs">
      A part of the report of test/fixtures/shadcn
    </figcaption>
    <pre
      class="text-foreground m-0 overflow-x-auto px-5 py-4 font-mono text-[0.8125rem] leading-6"
    ><code><span
        v-for="(line, index) in LINES"
        :key="index"
        class="vf-r block min-h-6"
        :style="{ '--i': index }"
      ><template v-if="line.startsWith(FINDING)"><span class="text-danger">error</span> <span class="text-warning">silent</span> {{ line.slice(FINDING.length) }}</template><template v-else>{{ line }}</template></span><span class="caret" aria-hidden="true" /></code></pre>
  </figure>
</template>

<style scoped>
  .caret {
    display: inline-block;
    width: 0.55em;
    height: 1.1em;
    vertical-align: text-bottom;
    background: var(--brand);
    animation: blink 1.1s steps(2, start) infinite;
  }

  @keyframes blink {
    to {
      visibility: hidden;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .caret {
      animation: none;
    }
  }
</style>
