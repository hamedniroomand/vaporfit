<script setup vapor>
function onFoo() {}
</script>

<template>
  <div @foo.delegate="onFoo"></div>
</template>
