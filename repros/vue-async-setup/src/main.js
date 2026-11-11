import { createApp, createVaporApp } from 'vue'
import VaporCase from './VaporCase.vue'
import VdomCase from './VdomCase.vue'

createApp(VdomCase).mount('#vdom')
createVaporApp(VaporCase).mount('#vapor')
