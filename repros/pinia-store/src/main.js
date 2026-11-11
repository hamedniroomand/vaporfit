import { createApp, vaporInteropPlugin } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

createApp(App).use(vaporInteropPlugin).use(createPinia()).mount('#app')
