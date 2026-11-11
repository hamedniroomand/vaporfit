<script setup vapor>
import { ref } from 'vue';

const box = ref(null);
</script>

<template>
  <div ref="box"></div>
  <p>{{ box.$el }}</p>
</template>
