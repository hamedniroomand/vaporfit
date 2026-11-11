<script setup lang="ts">
  // The default layout with a line at the top that shows the scroll position.
  import DefaultTheme from 'vitepress/theme';
  import { onBeforeUnmount, onMounted, ref } from 'vue';

  const bar = ref<HTMLElement | null>(null);
  let frame = 0;

  function progress(): void {
    if (frame !== 0) {
      return;
    }
    frame = requestAnimationFrame(() => {
      frame = 0;
      const range = document.documentElement.scrollHeight - innerHeight;
      bar.value?.style.setProperty('--vf-progress', String(range > 0 ? scrollY / range : 0));
    });
  }

  onMounted(() => addEventListener('scroll', progress, { passive: true }));

  onBeforeUnmount(() => {
    removeEventListener('scroll', progress);
    cancelAnimationFrame(frame);
  });
</script>

<template>
  <DefaultTheme.Layout>
    <template #layout-top>
      <div
        ref="bar"
        class="vf-progress"
        aria-hidden="true"
      />
    </template>
  </DefaultTheme.Layout>
</template>
