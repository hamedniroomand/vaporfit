import { createApp, vaporInteropPlugin } from 'vue'
import { Quasar } from 'quasar'
import App from './App.vue'

createApp(App).use(vaporInteropPlugin).use(Quasar).mount('#app')
