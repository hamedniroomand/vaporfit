<script setup vapor>
import { ref } from 'vue';

const Child = { template: '<p>child</p>' };
const box = ref(null);
box.value.$el;
</script>

<template>
  <Child ref="box" />
</template>
