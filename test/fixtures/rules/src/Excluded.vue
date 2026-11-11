<script setup vapor>
import { ref } from 'vue';

defineProps({ title: String });
const items = ref([1]);
const handler = () => {};
</script>

<template>
  <p>{{ Math.round(1) }}</p>
  <p>{{ $props.title }}</p>
  <p>{{ $emit }}</p>
  <p>{{ $attrs }}</p>
  <p>{{ $slots }}</p>
  <p>{{ require }}</p>
  <p>{{ title }}</p>
  <p v-for="item in items" :key="item">{{ item }}</p>
  <button type="button" @click="handler($event)">Go</button>
  <Child v-slot="{ slotName }">{{ slotName }}</Child>
</template>

<style module>
.title {
  color: red;
}
</style>
