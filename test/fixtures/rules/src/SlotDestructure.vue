<script setup vapor>
import { useSlots } from 'vue';

const { default: renderSlot } = useSlots();
renderSlot();
</script>

<template>
  <p>text</p>
</template>
