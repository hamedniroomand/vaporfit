<script setup vapor>
import Tooltip from 'primevue/tooltip';

const vTooltip = Tooltip;
</script>

<template>
  <button type="button" v-tooltip="'Tip'">Hover</button>
</template>
