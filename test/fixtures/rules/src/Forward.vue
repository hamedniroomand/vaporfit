<script setup vapor>
import { useForwardProps } from 'reka-ui';

const props = useForwardProps({});
</script>

<template>
  <p>{{ props }}</p>
</template>
