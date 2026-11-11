import { createApp, vaporInteropPlugin } from 'vue';
import App from './App.vue';

const plugin = vaporInteropPlugin;
createApp(App).use(plugin).mount('#app');
