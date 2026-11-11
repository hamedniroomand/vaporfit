<script setup vapor>
import { useSlots } from 'vue';

const slots = useSlots();
slots.default?.();
</script>

<template>
  <p>text</p>
</template>
