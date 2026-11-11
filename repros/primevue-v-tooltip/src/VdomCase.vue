<script setup>
import Tooltip from 'primevue/tooltip'

const vTooltip = Tooltip
</script>

<template>
  <button class="target" v-tooltip="'Tooltip text'">Hover me</button>
</template>
