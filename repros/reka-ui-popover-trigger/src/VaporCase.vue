<script setup vapor>
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
</script>

<template>
  <PopoverRoot>
    <PopoverTrigger as-child>
      <button class="trigger" type="button">Open</button>
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent class="panel">Popover text</PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
