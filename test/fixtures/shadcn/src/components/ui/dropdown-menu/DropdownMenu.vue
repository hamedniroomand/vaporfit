<script setup>
	import { DropdownMenuRoot, DropdownMenuTrigger } from 'reka-ui';

	const props = defineProps({ asChild: Boolean });
</script>

<template>
	<DropdownMenuRoot>
		<DropdownMenuTrigger v-bind="props">
			<slot />
		</DropdownMenuTrigger>
	</DropdownMenuRoot>
</template>
