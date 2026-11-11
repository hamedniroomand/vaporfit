<script setup>
	import { Primitive } from 'reka-ui';

	const props = defineProps({ asChild: Boolean });
</script>

<template>
	<Primitive v-bind="props">
		<slot />
	</Primitive>
</template>
