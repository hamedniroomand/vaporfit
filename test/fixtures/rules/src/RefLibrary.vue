<script setup vapor>
import { ElButton } from 'element-plus';
import { ref } from 'vue';

const box = ref(null);
</script>

<template>
  <ElButton ref="box" />
  <p>{{ box.$el }}</p>
</template>
