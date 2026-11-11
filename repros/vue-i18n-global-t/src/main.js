import { createApp, vaporInteropPlugin } from 'vue'
import { createI18n } from 'vue-i18n'
import App from './App.vue'

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: 'en',
  messages: { en: { hello: 'Hello' } },
})

createApp(App).use(vaporInteropPlugin).use(i18n).mount('#app')
