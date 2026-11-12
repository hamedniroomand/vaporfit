<script setup>
import { DialogContent, DialogDescription, DialogPortal, DialogRoot, DialogTitle, DialogTrigger } from 'reka-ui'

const props = defineProps({ asChild: Boolean })
</script>

<template>
  <DialogRoot>
    <DialogTrigger v-bind="props">
      <slot />
    </DialogTrigger>
    <DialogPortal>
      <DialogContent class="content">
        <DialogTitle>Title</DialogTitle>
        <DialogDescription>Description</DialogDescription>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
