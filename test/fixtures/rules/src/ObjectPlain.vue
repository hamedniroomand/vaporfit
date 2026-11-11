<script setup>
const vMark = {
  mounted(el) {
    el.textContent = 'ran';
  },
};
</script>

<template>
  <p v-mark>text</p>
</template>
