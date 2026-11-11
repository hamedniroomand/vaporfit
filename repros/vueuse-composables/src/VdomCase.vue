<script setup>
import { onClickOutside, useElementSize, useLocalStorage, useToggle, useVModel } from '@vueuse/core'
import { ref } from 'vue'

const props = defineProps({ modelValue: String })
const emit = defineEmits(['update:modelValue'])
const model = useVModel(props, 'modelValue', emit)
const [on, toggle] = useToggle(false)
const box = ref(null)
const size = useElementSize(box)
const clicks = ref(0)
onClickOutside(box, () => {
  clicks.value += 1
})
const stored = useLocalStorage('vaporfit-vueuse-probe', 'empty')

function setModel(event) {
  model.value = event.target.value
}

function turnOn() {
  toggle(true)
}

function save() {
  stored.value = 'saved'
}
</script>

<template>
  <input class="model" :value="model" @input="setModel" />
  <p class="echo">{{ model }}</p>
  <p class="on">{{ on }}</p>
  <button class="toggle" type="button" @click="turnOn">Toggle</button>
  <div ref="box" class="box" style="width: 120px; height: 40px">box</div>
  <p class="size">{{ size.width }}x{{ size.height }}</p>
  <p class="clicks">{{ clicks }}</p>
  <button class="save" type="button" @click="save">Save</button>
  <p class="stored">{{ stored }}</p>
</template>
