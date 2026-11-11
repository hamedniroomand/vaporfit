<script setup vapor>
import { vOnClickOutside } from '@vueuse/components'
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <p class="target" v-on-click-outside="() => count++">outside clicks: {{ count }}</p>
</template>
