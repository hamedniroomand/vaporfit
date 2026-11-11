<script setup vapor>
import { HoverCardContent, HoverCardPortal, HoverCardRoot, HoverCardTrigger } from 'reka-ui'
</script>

<template>
  <HoverCardRoot :open-delay="0" :close-delay="0">
    <HoverCardTrigger as-child>
      <button class="trigger" type="button">Hover</button>
    </HoverCardTrigger>
    <HoverCardPortal>
      <HoverCardContent class="panel">Card text</HoverCardContent>
    </HoverCardPortal>
  </HoverCardRoot>
</template>
