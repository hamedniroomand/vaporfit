<script setup>
import { ElButton, ElInput } from 'element-plus'
import { ref } from 'vue'

const clicks = ref(0)
const text = ref('')

function inc() {
  clicks.value += 1
}
</script>

<template>
  <ElButton class="btn" @click="inc">Click</ElButton>
  <p class="clicks">{{ clicks }}</p>
  <ElInput v-model="text" />
  <p class="text">{{ text }}</p>
</template>
