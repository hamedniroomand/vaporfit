import { createApp, vaporInteropPlugin } from 'vue'
import { createI18n } from 'vue-i18n'
import App from './App.vue'

createApp(App).use(vaporInteropPlugin).use(createI18n({ legacy: false, locale: 'en', messages: { en: { hello: 'Hello' } } })).mount('#app')
