<script setup vapor>
import { getCurrentInstance } from 'vue';

const instance = getCurrentInstance();
</script>

<template>
  <p>{{ instance }}</p>
</template>
