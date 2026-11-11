import { createApp, vaporInteropPlugin } from 'vue'
import { createI18n } from 'vue-i18n'
import App from './App.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: { hello: 'Hello' },
    fr: { hello: 'Bonjour' },
  },
})

createApp(App).use(vaporInteropPlugin).use(i18n).mount('#app')
