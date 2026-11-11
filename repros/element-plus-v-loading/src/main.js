import { createApp, vaporInteropPlugin } from 'vue'
import App from './App.vue'
import 'element-plus/dist/index.css'

createApp(App).use(vaporInteropPlugin).mount('#app')
