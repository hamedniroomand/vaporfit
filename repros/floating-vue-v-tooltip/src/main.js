import { createApp, vaporInteropPlugin } from 'vue'
import App from './App.vue'
import 'floating-vue/dist/style.css'

createApp(App).use(vaporInteropPlugin).mount('#app')
