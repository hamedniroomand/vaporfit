import { createApp, vaporInteropPlugin } from 'vue'
import { MotionPlugin } from '@vueuse/motion'
import App from './App.vue'

createApp(App).use(vaporInteropPlugin).use(MotionPlugin).mount('#app')
