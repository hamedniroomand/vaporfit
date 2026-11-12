<script setup lang="ts">
  import { computed, onMounted, onUnmounted, ref } from 'vue';

  import { browserPage } from './browser';
  import ComponentsView from './ComponentsView.vue';
  import DetailView from './DetailView.vue';
  import LibrariesView from './LibrariesView.vue';
  import RankingsView from './RankingsView.vue';
  import ReadyNote from './ReadyNote.vue';
  import { loadReport, type ViewReport } from './report';
  import SummaryView from './SummaryView.vue';
  import { baseName, parseRoute } from './view';

  const report = ref<ViewReport | null>(null);
  const error = ref('');
  const hash = ref(readHash());
  const theme = ref(initialTheme());

  const route = computed(() => parseRoute(hash.value));

  const detail = computed(() =>
    report.value?.components.find(component => component.id === route.value.id),
  );

  const tabs = computed(() => [
    { count: null, href: '#/', label: 'Summary', view: 'summary' },
    {
      count: report.value?.summary.components ?? null,
      href: '#/components',
      label: 'Components',
      view: 'components',
    },
    {
      count: report.value?.groups.length ?? null,
      href: '#/rankings',
      label: 'Rankings',
      view: 'rankings',
    },
    { count: null, href: '#/libraries', label: 'Libraries', view: 'libraries' },
  ]);

  function readHash(): string {
    return browserPage().location.hash;
  }

  function onHash(): void {
    hash.value = readHash();
  }

  function initialTheme(): 'light' | 'dark' {
    const saved = browserPage().localStorage.getItem('vaporfit-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return browserPage().matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(): void {
    browserPage().document.documentElement.dataset.theme = theme.value;
  }

  function toggleTheme(): void {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
    browserPage().localStorage.setItem('vaporfit-theme', theme.value);
    applyTheme();
  }

  function current(view: string): 'page' | undefined {
    const active = route.value.view === 'detail' ? 'components' : route.value.view;
    return active === view ? 'page' : undefined;
  }

  onMounted(() => {
    applyTheme();
    browserPage().addEventListener('hashchange', onHash);
    loadReport(value => {
      report.value = value;
    }).catch(() => {
      error.value =
        'The report is not available. Run vaporfit ui again, or make the static report again.';
    });
  });

  onUnmounted(() => {
    browserPage().removeEventListener('hashchange', onHash);
  });
</script>

<template>
  <a
    class="skip-link"
    href="#content"
    >Skip to the report</a
  >
  <header class="site-header">
    <div class="bar">
      <a
        class="brand"
        href="#/"
      >
        <svg
          class="brand-mark"
          viewBox="0 0 32 32"
          aria-hidden="true"
        >
          <path d="M5 8l9 17 4-7.5" />
          <circle
            cx="21.6"
            cy="11.6"
            r="2.3"
            opacity=".8"
          />
          <circle
            cx="24.8"
            cy="6.6"
            r="1.8"
            opacity=".55"
          />
          <circle
            cx="27.4"
            cy="2.8"
            r="1.3"
            opacity=".3"
          />
        </svg>
        <span>vaporfit</span>
      </a>
      <span
        v-if="report"
        class="project mono truncate"
        :title="report.project.root"
        >{{ baseName(report.project.root) }}</span
      >
      <button
        type="button"
        class="icon-button"
        :aria-pressed="theme === 'dark'"
        :title="theme === 'dark' ? 'Use the light theme' : 'Use the dark theme'"
        @click="toggleTheme"
      >
        <svg
          v-if="theme === 'dark'"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <circle
            cx="10"
            cy="10"
            r="3.5"
          />
          <path
            d="M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7l1.3 1.3M14 14l1.3 1.3M4.7 15.3 6 14M14 6l1.3-1.3"
          />
        </svg>
        <svg
          v-else
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M16 12.5A6.5 6.5 0 0 1 7.5 4a6.5 6.5 0 1 0 8.5 8.5Z" />
        </svg>
        <span class="sr-only">Theme</span>
      </button>
    </div>
    <nav
      class="tabs"
      aria-label="Report"
    >
      <a
        v-for="tab in tabs"
        :key="tab.view"
        :href="tab.href"
        :aria-current="current(tab.view)"
      >
        {{ tab.label }}
        <span
          v-if="tab.count !== null"
          class="tab-count"
          >{{ tab.count }}</span
        >
      </a>
    </nav>
  </header>

  <main
    id="content"
    class="content"
    tabindex="-1"
  >
    <div
      v-if="error"
      class="callout tone-blocked"
      role="alert"
    >
      <p class="callout-title">{{ error }}</p>
    </div>
    <div
      v-else-if="!report"
      class="stack"
      aria-busy="true"
      aria-label="The report is loading"
    >
      <div class="tier-grid">
        <div class="panel skeleton tall" />
        <div class="panel skeleton tall" />
      </div>
      <div class="panel skeleton" />
      <div class="panel skeleton" />
    </div>
    <template v-else>
      <SummaryView
        v-if="route.view === 'summary'"
        :report="report"
      />
      <ComponentsView
        v-else-if="route.view === 'components'"
        :report="report"
        :route="route"
      />
      <DetailView
        v-else-if="route.view === 'detail'"
        :component="detail"
      />
      <RankingsView
        v-else-if="route.view === 'rankings'"
        :report="report"
      />
      <LibrariesView
        v-else
        :report="report"
      />
    </template>
  </main>

  <footer class="site-footer">
    <ReadyNote />
    <p
      v-if="report"
      class="mono small muted"
    >
      vaporfit {{ report.tool.version }} · vue {{ report.project.vue ?? 'not installed' }} ·
      compiler {{ report.project.compiler.version }} from
      {{ report.project.compiler.source === 'tool' ? 'vaporfit' : 'the project' }} · data
      {{ report.tool.data }}
    </p>
  </footer>
</template>
