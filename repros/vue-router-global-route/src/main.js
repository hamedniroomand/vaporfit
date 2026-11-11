import { createApp, defineComponent, h, vaporInteropPlugin } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from './App.vue'

const home = defineComponent({
  setup() {
    return () => h('p', 'home')
  },
})

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: home }],
})

createApp(App).use(vaporInteropPlugin).use(router).mount('#app')
