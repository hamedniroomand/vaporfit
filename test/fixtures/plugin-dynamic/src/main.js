import { createApp } from 'vue';
import App from './App.vue';

const vue = await import('vue');
createApp(App).use(vue.vaporInteropPlugin).mount('#app');
