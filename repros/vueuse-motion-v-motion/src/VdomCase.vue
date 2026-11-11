<script setup>
</script>

<template>
  <p
    class="target"
    v-motion
    :initial="{ opacity: 0 }"
    :enter="{ opacity: 0.4 }"
  >
    motion
  </p>
</template>
