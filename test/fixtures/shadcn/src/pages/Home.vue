<script setup>
	import Button from '../components/ui/button/Button.vue';
	import Dialog from '../components/ui/dialog/Dialog.vue';
	import DropdownMenu from '../components/ui/dropdown-menu/DropdownMenu.vue';
</script>

<template>
	<Dialog as-child>
		<Button as-child>Open</Button>
	</Dialog>
	<DropdownMenu as-child>
		<Button>Menu</Button>
	</DropdownMenu>
</template>
