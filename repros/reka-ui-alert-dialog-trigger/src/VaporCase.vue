<script setup vapor>
import { AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogPortal, AlertDialogRoot, AlertDialogTitle, AlertDialogTrigger } from 'reka-ui'
</script>

<template>
  <AlertDialogRoot>
    <AlertDialogTrigger as-child>
      <button class="trigger" type="button">Open</button>
    </AlertDialogTrigger>
    <AlertDialogPortal>
      <AlertDialogContent>
        <AlertDialogTitle>Title</AlertDialogTitle>
        <AlertDialogDescription>Description</AlertDialogDescription>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>
