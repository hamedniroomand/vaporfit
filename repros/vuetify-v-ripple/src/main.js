import { createApp, vaporInteropPlugin } from 'vue'
import { createVuetify } from 'vuetify'
import App from './App.vue'

createApp(App).use(vaporInteropPlugin).use(createVuetify()).mount('#app')
