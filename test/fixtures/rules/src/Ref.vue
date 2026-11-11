<script setup vapor>
import { ref } from 'vue';

const Child = { template: '<p>child</p>' };
const box = ref(null);
</script>

<template>
  <Child ref="box" />
  <p>{{ box.$el }}</p>
</template>
