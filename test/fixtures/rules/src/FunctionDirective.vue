<script setup vapor>
const vMark = el => {
  el.textContent = 'ran';
};
</script>

<template>
  <p v-mark>text</p>
</template>
