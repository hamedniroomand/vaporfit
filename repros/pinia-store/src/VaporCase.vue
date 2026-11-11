<script setup vapor>
import { storeToRefs } from 'pinia'
import { useCounter } from './store.js'

const store = useCounter()
const { n } = storeToRefs(store)

function reset() {
  store.reset()
}

function inc() {
  store.inc()
}
</script>

<template>
  <p class="count">{{ store.n }}</p>
  <p class="ref">{{ n }}</p>
  <p class="label">{{ store.label }}</p>
  <button class="reset" type="button" @click="reset">Reset</button>
  <button class="inc" type="button" @click="inc">Inc</button>
</template>
