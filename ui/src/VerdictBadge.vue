<script setup lang="ts">
  import { computed } from 'vue';

  const props = defineProps<{ verdict: string; label?: string }>();

  const tone = computed(() =>
    props.verdict === 'ready' || props.verdict === 'blocked' ? props.verdict : 'unknown',
  );
</script>

<template>
  <span :class="['badge', `tone-${tone}`]">
    <span
      class="dot"
      aria-hidden="true"
    />
    <span
      v-if="label"
      class="badge-label"
      >{{ label }}</span
    >
    {{ verdict }}
  </span>
</template>
