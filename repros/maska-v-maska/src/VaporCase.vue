<script setup vapor>
import { vMaska } from 'maska/vue'
</script>

<template>
  <input class="by-value" v-maska="'#-#'" />
  <input class="by-data" v-maska data-maska="#-#" />
</template>
