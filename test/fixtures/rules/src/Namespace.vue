<script setup vapor>
import * as Floating from 'floating-vue';

const vTooltip = Floating.vTooltip;
</script>

<template>
  <button type="button" v-tooltip="'Tip'">Hover</button>
</template>
