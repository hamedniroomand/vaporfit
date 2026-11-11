<script setup>
	import { DialogRoot, DialogTrigger } from 'reka-ui';

	const props = defineProps({ asChild: Boolean });
</script>

<template>
	<DialogRoot>
		<DialogTrigger v-bind="props">
			<slot />
		</DialogTrigger>
	</DialogRoot>
</template>
