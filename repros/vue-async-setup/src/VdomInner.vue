<script setup>
const label = await Promise.resolve('ready')
</script>

<template>
  <p class="target">{{ label }}</p>
</template>
