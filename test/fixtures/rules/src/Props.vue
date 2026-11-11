<script setup vapor>
import { DialogRoot, DialogTrigger } from 'reka-ui';
</script>

<template>
  <DialogTrigger as-child />
  <DialogTrigger :asChild="true" />
  <DialogRoot as-child />
</template>
