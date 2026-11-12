<script setup lang="ts">
  import { computed } from 'vue';

  import { splitPath } from './view';

  const props = defineProps<{ file: string; vapor?: boolean }>();

  // The file name is the part that a person looks for, so it comes first.
  const parts = computed(() => splitPath(props.file));
</script>

<template>
  <span
    class="path"
    :title="file"
  >
    <span class="path-name">
      {{ parts.name }}
      <span
        v-if="vapor"
        class="tag"
        >vapor</span
      >
    </span>
    <span
      v-if="parts.folder"
      class="path-folder"
      >{{ parts.folder }}</span
    >
  </span>
</template>
