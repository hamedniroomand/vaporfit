<script setup vapor>
import { DialogContent, DialogDescription, DialogPortal, DialogRoot, DialogTitle, DialogTrigger } from 'reka-ui'
</script>

<template>
  <DialogRoot>
    <DialogTrigger class="trigger">Open</DialogTrigger>
    <DialogPortal>
      <DialogContent>
        <DialogTitle>Title</DialogTitle>
        <DialogDescription>Description</DialogDescription>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
