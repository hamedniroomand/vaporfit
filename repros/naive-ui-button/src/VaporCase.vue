<script setup vapor>
import { NButton, NInput } from 'naive-ui'
import { ref } from 'vue'

const clicks = ref(0)
const text = ref('')

function inc() {
  clicks.value += 1
}
</script>

<template>
  <NButton class="btn" @click="inc">Click</NButton>
  <p class="clicks">{{ clicks }}</p>
  <NInput class="field" v-model:value="text" />
  <p class="text">{{ text }}</p>
</template>
