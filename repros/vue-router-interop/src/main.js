import { createApp, vaporInteropPlugin, defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from './App.vue'

function view(text) {
  return defineComponent({
    setup() {
      return () => h('p', { class: 'view' }, text)
    },
  })
}

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: view('home') },
    { path: '/next', component: view('next') },
    { path: '/link', component: view('link') },
  ],
})

createApp(App).use(vaporInteropPlugin).use(router).mount('#app')
