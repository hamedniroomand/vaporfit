import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type HeadConfig } from 'vitepress';
import llmstxt, { copyOrDownloadAsMarkdownButtons } from 'vitepress-plugin-llms';

const SITE = 'https://vaporfit.kitdev.space';
const NAME = 'vaporfit';
const TAGLINE = 'See what will silently break';
const DESCRIPTION = 'Before you add vapor to a Vue component, see what will silently break.';
const REPOSITORY = 'https://github.com/hamedniroomand/vaporfit';
const DOCS = path.resolve(import.meta.dirname, '..');
const VERDICTS = new Set(['ready', 'blocked', 'unknown']);

// `1.guide/2.ui.md` gives `guide/ui.md`. The number sets the order in the sidebar only.
function route(file: string): string {
  return file.replace(/(^|\/)\d+\./g, '$1');
}

// The address of a page file. The home page and each section index end with a slash.
function link(file: string): string {
  return `/${route(file)}`.replace(/(index)?\.md$/, '');
}

interface Item {
  text: string;
  link: string;
}

// The sidebar title is `navigation.title` of the frontmatter, or the first heading.
function title(source: string): string {
  const short = /^navigation:\n\s+title:\s*'?(.+?)'?\s*$/m.exec(source)?.[1];
  return (short ?? /^# (.+)$/m.exec(source)?.[1] ?? '').replaceAll('`', '');
}

function items(directory: string): Item[] {
  return readdirSync(path.join(DOCS, directory))
    .filter(file => file.endsWith('.md'))
    .toSorted((left, right) => {
      const index = Number(right.endsWith('index.md')) - Number(left.endsWith('index.md'));
      return index || left.localeCompare(right, 'en', { numeric: true });
    })
    .map(file => ({
      text: title(readFileSync(path.join(DOCS, directory, file), 'utf8')),
      link: link(`${directory}/${file}`),
    }));
}

const guide = items('1.guide');
const upstream = items('4.upstream').map(item =>
  item.link === '/upstream/' ? { ...item, text: 'Overview' } : item,
);

const sidebar = [
  { text: 'Guide', items: guide },
  {
    text: 'Reference',
    items: [
      { text: 'Libraries', link: '/libraries' },
      { text: 'Rules', link: '/rules' },
    ],
  },
  { text: 'Upstream reports', collapsed: false, items: upstream },
];

const sections: Record<string, string> = { guide: 'Guide', upstream: 'Upstream reports' };

function jsonLd(data: object): HeadConfig {
  return [
    'script',
    { type: 'application/ld+json' },
    JSON.stringify({ '@context': 'https://schema.org', ...data }),
  ];
}

function breadcrumbs(address: string, pageTitle: string): object {
  const section = address.split('/')[1] ?? '';
  const trail = [{ name: NAME, item: `${SITE}/` }];
  if (sections[section] !== undefined && address !== `/${section}/`) {
    trail.push({ name: sections[section], item: `${SITE}/${section}/` });
  }
  trail.push({ name: pageTitle, item: SITE + address });
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      ...entry,
    })),
  };
}

const home = {
  '@graph': [
    { '@type': 'WebSite', name: NAME, url: `${SITE}/`, description: DESCRIPTION },
    {
      '@type': 'SoftwareSourceCode',
      name: NAME,
      description: DESCRIPTION,
      url: `${SITE}/`,
      codeRepository: REPOSITORY,
      programmingLanguage: 'TypeScript',
      runtimePlatform: 'Node.js',
      license: 'https://opensource.org/license/mit',
    },
  ],
};

export default defineConfig({
  lang: 'en-US',
  title: NAME,
  description: DESCRIPTION,
  cleanUrls: true,
  rewrites: route,
  sitemap: { hostname: SITE },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' }],
    ['meta', { name: 'theme-color', content: '#f5a623' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: NAME }],
    ['meta', { property: 'og:image', content: `${SITE}/og.png` }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { property: 'og:image:alt', content: `${NAME}: ${TAGLINE}` }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
  ],
  transformPageData(page) {
    if (page.isNotFound) return;
    const isHome = page.relativePath === 'index.md';
    const address = link(page.relativePath);
    const pageTitle = isHome ? `${NAME} - ${TAGLINE}` : `${page.title} | ${NAME}`;
    const description = String(page.frontmatter.description ?? DESCRIPTION).replaceAll('`', '');
    page.description = description;
    page.frontmatter.head ??= [];
    page.frontmatter.head.push(
      ['link', { rel: 'canonical', href: SITE + address }],
      ['meta', { property: 'og:url', content: SITE + address }],
      ['meta', { property: 'og:title', content: pageTitle }],
      ['meta', { property: 'og:description', content: description }],
      jsonLd(isHome ? home : breadcrumbs(address, page.title)),
    );
  },
  markdown: {
    config(md) {
      md.use(copyOrDownloadAsMarkdownButtons);
      // The section, the title and the description of a page go into one header block.
      md.core.ruler.push('vf-head', state => {
        const tokens = state.tokens;
        const open = tokens.findIndex(token => token.type === 'heading_open' && token.tag === 'h1');
        const close = tokens.findIndex(
          token => token.type === 'heading_close' && token.tag === 'h1',
        );
        if (open === -1 || close === -1) return;
        const description: unknown = state.env.frontmatter?.description;
        const lead =
          typeof description === 'string'
            ? `<p class="vf-lead" v-pre>${md.utils.escapeHtml(description.replaceAll('`', ''))}</p>`
            : '';
        const end = new state.Token('html_block', '', 0);
        end.content = `${lead}</header>\n`;
        const section = sections[route(String(state.env.relativePath)).split('/')[0] ?? ''];
        const isIndex = String(state.env.relativePath).endsWith('index.md');
        const crumb =
          section === undefined || isIndex
            ? ''
            : `<p class="vf-crumb"><a href="${link(`${String(state.env.relativePath).split('/')[0]}/index.md`)}">${section}</a></p>`;
        const start = new state.Token('html_block', '', 0);
        start.content = `<header class="vf-head">${crumb}\n`;
        tokens.splice(close + 1, 0, end);
        tokens.splice(open, 0, start);
      });
      // The three verdict words show with the color of the verdict.
      md.core.ruler.push('vf-verdict', state => {
        for (const block of state.tokens) {
          for (const token of block.children ?? []) {
            if (token.type === 'code_inline' && VERDICTS.has(token.content)) {
              token.attrSet('class', `vf-verdict vf-${token.content}`);
            }
          }
        }
      });
    },
  },
  vite: {
    plugins: [
      tailwindcss(),
      llmstxt({
        domain: SITE,
        title: NAME,
        description:
          'vaporfit checks the components in a Vue project before you add vapor. It reports the problems it knows about. These pages have the guide, the library table, the rules and the upstream reports.',
      }),
    ],
  },
  themeConfig: {
    logo: '/icon.svg',
    nav: [
      { text: 'Guide', link: '/guide/', activeMatch: '^/guide/' },
      { text: 'Libraries', link: '/libraries' },
      { text: 'Rules', link: '/rules' },
      { text: 'Upstream reports', link: '/upstream/', activeMatch: '^/upstream/' },
    ],
    sidebar: {
      '/guide/': sidebar,
      '/libraries': sidebar,
      '/rules': sidebar,
      '/upstream/': sidebar,
    },
    outline: { level: [2, 3] },
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: REPOSITORY }],
    editLink: {
      pattern: `${REPOSITORY}/edit/main/docs/:path`,
      text: 'Edit this page on GitHub',
    },
    footer: {
      message:
        `Released under the <a href="${REPOSITORY}/blob/main/LICENSE">MIT License</a>.<br>` +
        '"ready" means that vaporfit found no known problem. It does not test behavior.',
    },
  },
});
