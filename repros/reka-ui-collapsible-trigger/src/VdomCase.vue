<script setup>
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui'
</script>

<template>
  <CollapsibleRoot>
    <CollapsibleTrigger as-child>
      <button class="trigger" type="button">Toggle</button>
    </CollapsibleTrigger>
    <CollapsibleContent class="panel">Hidden text</CollapsibleContent>
  </CollapsibleRoot>
</template>
