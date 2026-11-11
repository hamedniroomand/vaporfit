<script setup>
import { ref } from 'vue'
import VaporCase from './VaporCase.vue'
import VdomCase from './VdomCase.vue'

const vaporModel = ref('start')
const vdomModel = ref('start')
</script>

<template>
  <h2>VDOM component</h2>
  <div id="vdom"><VdomCase v-model="vdomModel" /></div>
  <h2>Vapor component</h2>
  <div id="vapor"><VaporCase v-model="vaporModel" /></div>
</template>
