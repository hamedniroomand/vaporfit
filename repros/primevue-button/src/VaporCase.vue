<script setup vapor>
import Button from 'primevue/button'
import { ref } from 'vue'

const clicks = ref(0)

function inc() {
  clicks.value += 1
}
</script>

<template>
  <Button class="btn" label="Click" @click="inc" />
  <p class="clicks">{{ clicks }}</p>
</template>
