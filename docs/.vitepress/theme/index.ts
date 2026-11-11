import type { Theme } from 'vitepress';
import CopyOrDownloadAsMarkdownButtons from 'vitepress-plugin-llms/vitepress-components/CopyOrDownloadAsMarkdownButtons.vue';
import DefaultTheme from 'vitepress/theme';

import Landing from './components/Landing.vue';
import Layout from './Layout.vue';

import './style.css';

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('Landing', Landing);
    app.component('CopyOrDownloadAsMarkdownButtons', CopyOrDownloadAsMarkdownButtons);
  },
} satisfies Theme;
