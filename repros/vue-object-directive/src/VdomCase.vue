<script setup>
const vMark = {
  mounted(el) {
    el.textContent = 'directive ran'
  },
}
</script>

<template>
  <p class="target" v-mark>directive did not run</p>
</template>
