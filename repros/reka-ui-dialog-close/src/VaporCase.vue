<script setup vapor>
import { DialogClose, DialogContent, DialogDescription, DialogPortal, DialogRoot, DialogTitle, DialogTrigger } from 'reka-ui'
</script>

<template>
  <DialogRoot>
    <DialogTrigger class="open">Open</DialogTrigger>
    <DialogPortal>
      <DialogContent>
        <DialogTitle>Title</DialogTitle>
        <DialogDescription>Description</DialogDescription>
        <DialogClose as-child>
          <button class="trigger" type="button">Close</button>
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
