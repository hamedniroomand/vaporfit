<script setup vapor>
import { vAutoAnimate } from '@formkit/auto-animate/vue'
import { ref } from 'vue'

const items = ref(['one', 'two'])
</script>

<template>
  <ul class="target" v-auto-animate>
    <li v-for="item in items" :key="item">{{ item }}</li>
  </ul>
</template>
