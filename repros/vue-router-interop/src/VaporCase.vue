<script setup vapor>
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
</script>

<template>
  <p class="path">{{ route.path }}</p>
  <button class="home" type="button" @click="router.push('/')">Home</button>
  <button class="go" type="button" @click="router.push('/next')">Go</button>
  <RouterLink class="link" to="/link">Link</RouterLink>
  <RouterView />
</template>
