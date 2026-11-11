<script setup>
import { DialogContent, DialogDescription, DialogPortal, DialogRoot, DialogTitle, DialogTrigger } from 'reka-ui'
</script>

<template>
  <DialogRoot>
    <DialogTrigger as-child>
      <button class="trigger">Open</button>
    </DialogTrigger>
    <DialogPortal>
      <DialogContent class="content">
        <DialogTitle>Title</DialogTitle>
        <DialogDescription>Description</DialogDescription>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
