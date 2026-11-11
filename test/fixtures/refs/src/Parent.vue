<script setup>
	import { ref } from 'vue';

	import Child from './Child.vue';

	const box = ref(null);
</script>

<template>
	<Child ref="box" />
	<p>{{ box.$el }}</p>
</template>
