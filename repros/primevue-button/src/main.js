import { createApp, vaporInteropPlugin } from 'vue'
import PrimeVue from 'primevue/config'
import App from './App.vue'

createApp(App).use(vaporInteropPlugin).use(PrimeVue).mount('#app')
