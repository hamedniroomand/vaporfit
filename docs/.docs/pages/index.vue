<script setup lang="ts">
  import { useHead } from '@unhead/vue';
  import AppLink from 'undocs/src/app/components/app/AppLink';
  import Container from 'undocs/src/app/components/Container.vue';
  import Icon from 'undocs/src/app/components/global/Icon.vue';
  import { useAppConfig } from 'undocs/src/app/composables/useAppConfig';
  import { usePageSEO } from 'undocs/src/app/composables/usePageSEO';
  import { onBeforeUnmount, onMounted, ref } from 'vue';

  import ReportTerminal from '../components/ReportTerminal.vue';
  import SilentDemo from '../components/SilentDemo.vue';
  import VaporScene from '../components/VaporScene.vue';
  import { useReveal } from '../utils/reveal';
  import { useStructuredHead } from '../utils/seo';

  import '../theme.css';

  const COMMAND = 'npx vaporfit';
  const COPIED_MS = 1600;

  // The letters of "vapor" go in and out of view. The letters of "fit" do not move.
  const LETTERS = [...'vaporfit'].map((letter, index) => ({ letter, vapor: index < 5 }));

  const FEATURES = [
    {
      icon: 'i-lucide-volume-x',
      title: 'Finds silent failures',
      text: 'A lost listener gives no error and no warning. For a finding in a component, the report shows the file, the line and the rule.',
    },
    {
      icon: 'i-lucide-library',
      title: 'Knows the libraries',
      text: 'The <a href="/libraries">library table</a> has the verified version, the tests and the known broken features of each library.',
    },
    {
      icon: 'i-lucide-flask-conical',
      title: 'Shows the evidence',
      text: 'A row gets its data from a probe in <code>repros/</code>, a maintainer text or an issue link. The <a href="/upstream">upstream reports</a> have the steps.',
    },
    {
      icon: 'i-lucide-wand-sparkles',
      title: 'Edits the ready components',
      text: '<code>vaporfit fix</code> prints the changes. <code>--write</code> writes them only when the app already installs <code>vaporInteropPlugin</code>.',
    },
    {
      icon: 'i-lucide-layout-dashboard',
      title: 'Opens a local report',
      text: '<code>vaporfit ui</code> opens the report in a browser. <code>vaporfit report</code> writes the same page as static files.',
    },
    {
      icon: 'i-lucide-bot',
      title: 'Works with agents',
      text: '<code>vaporfit mcp</code> serves three read-only tools over stdio. <code>--json</code> prints the report as JSON.',
    },
  ];

  const PAGES = [
    { to: '/guide', title: 'Get started', text: 'The commands, the options and the exit codes.' },
    { to: '/libraries', title: 'Libraries', text: 'The known broken features of each library.' },
    { to: '/rules', title: 'Rules', text: 'Each rule, with the failure type and the sources.' },
    {
      to: '/upstream',
      title: 'Upstream reports',
      text: 'The steps and the cause of each failure.',
    },
  ];

  const { site, docs } = useAppConfig();

  usePageSEO({ title: `${site.name} - ${docs.shortDescription}`, description: site.description });

  useStructuredHead(url => ({
    '@graph': [
      { '@type': 'WebSite', name: site.name, url, description: site.description },
      {
        '@type': 'SoftwareSourceCode',
        name: site.name,
        description: site.description,
        url,
        codeRepository: `https://github.com/${docs.github}`,
        programmingLanguage: 'TypeScript',
        runtimePlatform: 'Node.js',
        license: 'https://opensource.org/license/mit',
      },
    ],
  }));

  // True while the hero is behind the header. The header then uses light text on the dark sky.
  const hero = ref<HTMLElement | null>(null);
  const overHero = ref(true);

  function measure(): void {
    overHero.value = (hero.value?.getBoundingClientRect().bottom ?? 0) > 64;
  }

  useHead({ htmlAttrs: { 'data-vf-hero': () => (overHero.value ? '' : undefined) } });

  onMounted(() => {
    measure();
    addEventListener('scroll', measure, { passive: true });
  });

  onBeforeUnmount(() => removeEventListener('scroll', measure));

  const copied = ref(false);

  async function copy(): Promise<void> {
    await navigator.clipboard.writeText(COMMAND);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, COPIED_MS);
  }

  const report = ref<HTMLElement | null>(null);
  const features = ref<HTMLElement | null>(null);
  const pages = ref<HTMLElement | null>(null);
  const reportReveal = useReveal(report);
  const featuresReveal = useReveal(features);
  const pagesReveal = useReveal(pages);
</script>

<template>
  <div class="landing">
    <section
      ref="hero"
      class="hero"
    >
      <VaporScene />
      <Container>
        <div class="hero-body">
          <h1
            class="word"
            aria-label="vaporfit"
          >
            <span
              v-for="(item, index) in LETTERS"
              :key="index"
              :class="{ vapor: item.vapor }"
              :style="{ '--i': index }"
              aria-hidden="true"
              >{{ item.letter }}</span
            >
          </h1>
          <p class="tag vf-display">See what will silently break</p>
          <p class="lead">
            Vue 3.6 can compile a component that has <code>vapor</code> and print nothing when a
            feature is skipped. vaporfit checks the components in a project and reports the problems
            it knows about.
          </p>
          <div class="actions">
            <AppLink
              to="/guide"
              class="pill pill-main"
            >
              <Icon
                name="i-lucide-rocket"
                class="size-4"
              />
              Get started
            </AppLink>
            <button
              type="button"
              class="pill pill-code"
              @click="copy"
            >
              <code>{{ COMMAND }}</code>
              <Icon
                :name="copied ? 'i-lucide-check' : 'i-lucide-copy'"
                class="size-4"
              />
              <span
                class="sr-only"
                aria-live="polite"
                >{{ copied ? 'Copied' : 'Copy the command' }}</span
              >
            </button>
          </div>
        </div>
      </Container>
    </section>

    <Container>
      <section class="block-demo">
        <h2 class="heading">The same button, with and without vapor</h2>
        <SilentDemo>
          <p class="m-0">
            This is an illustration of the probe <code>repros/reka-ui-as-child</code>. It does not
            run Reka UI. The two components have the same content. The only difference is the
            <code>vapor</code> attribute on <code>&lt;script setup&gt;</code>.
          </p>
          <p class="mt-2 mb-0">
            The VDOM button has <code>aria-haspopup="dialog"</code>, and a click opens the dialog.
            The Vapor button has no attributes and no listener. A click does nothing. The console is
            empty. There is no Vue warning.
            <AppLink
              to="/upstream/reka-ui-as-child"
              class="text-brand underline underline-offset-4"
            >
              Read the Reka UI report
            </AppLink>
          </p>
        </SilentDemo>
      </section>

      <section
        ref="report"
        class="block-report"
        :data-reveal="reportReveal"
      >
        <div>
          <h2 class="heading vf-r">The report shows the place</h2>
          <p
            class="copy vf-r"
            style="--i: 1"
          >
            For a finding in a component, the report shows the file, the line and the rule. Some
            findings also show a chain of components.
          </p>
          <p
            class="copy vf-r"
            style="--i: 2"
          >
            "ready" means that vaporfit found no known problem. It does not test behavior.
          </p>
        </div>
        <ReportTerminal />
      </section>

      <section
        ref="features"
        class="block-features"
        :data-reveal="featuresReveal"
      >
        <h2 class="heading vf-r">What vaporfit does</h2>
        <ul class="features">
          <li
            v-for="(feature, index) in FEATURES"
            :key="feature.title"
            class="vf-r"
            :style="{ '--i': index + 1 }"
          >
            <Icon
              :name="feature.icon"
              class="text-brand size-6"
            />
            <h3>{{ feature.title }}</h3>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <p v-html="feature.text" />
          </li>
        </ul>
      </section>

      <section
        ref="pages"
        class="block-pages"
        :data-reveal="pagesReveal"
      >
        <h2 class="heading vf-r">Read the pages</h2>
        <ul class="pages">
          <li
            v-for="(page, index) in PAGES"
            :key="page.to"
            class="vf-r"
            :style="{ '--i': index + 1 }"
          >
            <AppLink :to="page.to">
              <span class="vf-display">{{ page.title }}</span>
              <span>{{ page.text }}</span>
              <Icon
                name="i-lucide-arrow-up-right"
                class="arrow size-5"
              />
            </AppLink>
          </li>
        </ul>
      </section>
    </Container>
  </div>
</template>

<style scoped>
  /* The hero goes up behind the header, which has no background at the top of the page. */
  .hero {
    position: relative;
    isolation: isolate;
    display: flex;
    min-height: 100svh;
    margin-top: -4rem;
    padding-top: 4rem;
    align-items: center;
    color: #fff;
  }

  .hero-body {
    padding-block: 4rem 12rem;
    text-align: center;
  }

  .word {
    margin: 0;
    font-size: clamp(4.5rem, 21vw, 19rem);
    font-weight: 600;
    font-variation-settings:
      'SOFT' 100,
      'WONK' 0;
    padding-bottom: 0.13em;
    line-height: 1.02;
    letter-spacing: -0.04em;
    color: rgb(255 255 255 / 0.94);
    text-shadow: 0 0 60px rgb(255 220 170 / 0.35);
  }

  /* On load, each letter comes out of the vapor. */
  .word span {
    display: inline-block;
    animation: condense 1.5s var(--vf-ease) both;
    animation-delay: calc(0.15s + var(--i) * 80ms);
  }

  .word .vapor {
    animation:
      condense 1.5s var(--vf-ease) both,
      shimmer 7s ease-in-out infinite;
    animation-delay: calc(0.15s + var(--i) * 80ms), calc(2.4s + var(--i) * 0.5s);
  }

  @keyframes condense {
    from {
      opacity: 0;
      filter: blur(24px);
      transform: translateY(0.18em) scale(1.1);
    }
  }

  @keyframes shimmer {
    50% {
      opacity: 0.55;
      filter: blur(3px);
      transform: translateY(-0.04em);
    }
  }

  .tag {
    margin: 0.5rem 0 0;
    font-size: clamp(1.5rem, 3.4vw, 2.5rem);
    font-weight: 400;
    line-height: 1.15;
    animation: vf-rise 0.9s var(--vf-ease) 0.9s both;
  }

  .lead {
    max-width: 38rem;
    margin: 1.25rem auto 0;
    font-size: 1.0625rem;
    line-height: 1.65;
    color: rgb(255 255 255 / 0.9);
    text-shadow: 0 1px 12px rgb(13 16 48 / 0.45);
    animation: vf-rise 0.9s var(--vf-ease) 1.05s both;
  }

  .lead code {
    font-size: 0.95em;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: center;
    margin-top: 2.25rem;
    animation: vf-rise 0.9s var(--vf-ease) 1.2s both;
  }

  /* A pill is glass: the scene shows through it. */
  .pill {
    display: inline-flex;
    gap: 0.6rem;
    align-items: center;
    height: 3rem;
    padding-inline: 1.4rem;
    font-size: 0.9375rem;
    font-weight: 500;
    color: #fff;
    cursor: pointer;
    background: rgb(255 255 255 / 0.14);
    border: 1px solid rgb(255 255 255 / 0.38);
    border-radius: 999px;
    -webkit-backdrop-filter: blur(14px);
    backdrop-filter: blur(14px);
    transition:
      background-color 0.2s,
      transform 0.2s var(--vf-ease);
  }

  .pill:hover {
    background: rgb(255 255 255 / 0.24);
    transform: translateY(-2px);
  }

  .pill:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 3px;
  }

  .pill-main {
    color: #1a1330;
    background: rgb(255 255 255 / 0.92);
  }

  .pill-main:hover {
    background: #fff;
  }

  .pill-code {
    background: rgb(13 16 48 / 0.34);
  }

  .pill-code code {
    font-size: 0.875rem;
  }

  .heading {
    margin: 0;
    font-size: clamp(1.75rem, 3.6vw, 2.75rem);
    font-weight: 500;
    line-height: 1.1;
    color: var(--foreground);
  }

  .copy {
    max-width: 34rem;
    margin: 1rem 0 0;
    line-height: 1.7;
    color: var(--muted-foreground);
  }

  .block-demo {
    max-width: 60rem;
    padding-block: 2rem 5rem;
    margin-inline: auto;
  }

  .block-demo .heading {
    margin-bottom: 1.75rem;
    text-align: center;
  }

  .block-report {
    display: grid;
    gap: 2.5rem;
    align-items: center;
    padding-block: 5rem;
  }

  /* A long report line scrolls in the terminal and does not make the page wide. */
  .block-report > * {
    min-width: 0;
  }

  .block-features,
  .block-pages {
    padding-block: 5rem;
  }

  .features {
    display: grid;
    gap: 2.5rem 3rem;
    padding: 0;
    margin: 2.5rem 0 0;
    list-style: none;
  }

  .features li {
    padding-top: 1.5rem;
    border-top: 1px solid var(--border);
  }

  .features h3 {
    margin: 0.9rem 0 0.4rem;
    font-size: 1.0625rem;
    font-weight: 600;
    color: var(--foreground);
  }

  .features p {
    margin: 0;
    line-height: 1.65;
    color: var(--muted-foreground);
  }

  .features :deep(a) {
    color: var(--brand);
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  .features :deep(code),
  .copy code {
    padding: 0.1em 0.35em;
    font-size: 0.875em;
    background: var(--muted);
    border: 1px solid var(--border);
    border-radius: 0.375rem;
  }

  .pages {
    padding: 0;
    margin: 2rem 0 0;
    list-style: none;
    border-top: 1px solid var(--border);
  }

  .pages a {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.25rem 1rem;
    align-items: center;
    padding: 1.4rem 0.25rem;
    color: var(--muted-foreground);
    border-bottom: 1px solid var(--border);
    transition:
      padding 0.3s var(--vf-ease),
      color 0.2s;
  }

  .pages a span:first-child {
    grid-row: 1;
    grid-column: 1;
    font-size: clamp(1.375rem, 2.6vw, 2rem);
    color: var(--foreground);
  }

  .pages a span:nth-child(2) {
    grid-row: 2;
    grid-column: 1;
  }

  .pages .arrow {
    grid-row: 1 / span 2;
    grid-column: 2;
    transition: transform 0.3s var(--vf-ease);
  }

  .pages a:hover,
  .pages a:focus-visible {
    padding-inline: 1rem 0.25rem;
    color: var(--foreground);
  }

  .pages a:hover .arrow,
  .pages a:focus-visible .arrow {
    color: var(--brand);
    transform: translate(3px, -3px);
  }

  @media (min-width: 48rem) {
    .features {
      grid-template-columns: repeat(2, 1fr);
    }

    .pages a {
      grid-template-columns: 16rem 1fr auto;
    }

    .pages a span:nth-child(2) {
      grid-row: 1;
      grid-column: 2;
    }

    .pages .arrow {
      grid-row: 1;
      grid-column: 3;
    }
  }

  @media (min-width: 64rem) {
    .block-report {
      grid-template-columns: 5fr 7fr;
      gap: 4rem;
    }

    .features {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .word span,
    .word .vapor,
    .tag,
    .lead,
    .actions {
      animation: none;
    }

    .pill,
    .pages a,
    .pages .arrow {
      transition: none;
    }
  }
</style>
