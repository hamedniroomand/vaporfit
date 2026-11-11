<script setup lang="ts">
  import { computed, onMounted, onUnmounted, ref } from 'vue';

  import { browserPage } from './browser';
  import ReadyNote from './ReadyNote.vue';
  import {
    evidenceUrls,
    loadReport,
    pluginText,
    type ViewFinding,
    type ViewReport,
  } from './report';

  const report = ref<ViewReport | null>(null);
  const error = ref('');
  const hash = ref(readHash());
  const filter = ref('all');
  const theme = ref(initialTheme());

  const view = computed(() => {
    const value = hash.value;
    if (value.startsWith('#/component/')) return 'detail';
    if (value.startsWith('#/components')) return 'components';
    if (value.startsWith('#/rankings')) return 'rankings';
    if (value.startsWith('#/libraries')) return 'libraries';
    return 'summary';
  });

  const detail = computed(() => {
    const id = decodeURIComponent(hash.value.slice('#/component/'.length));
    return report.value?.components.find(component => component.id === id);
  });

  const rows = computed(() => {
    const components = report.value?.components ?? [];
    if (filter.value === 'all') return components;
    return components.filter(component => component.interop === filter.value);
  });

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

  function place(finding: ViewFinding): string {
    const { file, line, column } = finding.location;
    return `${file}:${line}:${column}`;
  }

  function packageLine(finding: ViewFinding): string | undefined {
    if (finding.package === undefined) return undefined;
    return `package ${finding.package.name} ${finding.package.version ?? 'none'}`;
  }

  function current(name: string): 'page' | undefined {
    return view.value === name ? 'page' : undefined;
  }

  onMounted(() => {
    applyTheme();
    browserPage().addEventListener('hashchange', onHash);
    loadReport(value => {
      report.value = value;
    }).catch(() => {
      error.value = 'The report is not available.';
    });
  });

  onUnmounted(() => {
    browserPage().removeEventListener('hashchange', onHash);
  });
</script>

<template>
  <header>
    <div>
      <h1>vaporfit</h1>
      <p
        v-if="report"
        class="meta"
      >
        {{ report.tool.version }}
      </p>
    </div>
    <button
      type="button"
      :aria-pressed="theme === 'dark'"
      @click="toggleTheme"
    >
      Theme
    </button>
  </header>
  <main>
    <nav
      class="nav"
      aria-label="Report"
    >
      <a
        href="#/"
        :aria-current="current('summary')"
        >Summary</a
      >
      <a
        href="#/components"
        :aria-current="current('components')"
        >Components</a
      >
      <a
        href="#/rankings"
        :aria-current="current('rankings')"
        >Rankings</a
      >
      <a
        href="#/libraries"
        :aria-current="current('libraries')"
        >Libraries</a
      >
    </nav>
    <p
      v-if="error"
      class="error"
    >
      {{ error }}
    </p>
    <p v-else-if="!report">The report is loading.</p>
    <template v-else>
      <section v-if="view === 'summary'">
        <h2>Summary</h2>
        <h3>Interop</h3>
        <dl class="counts card">
          <div>
            <dt>Components</dt>
            <dd data-count="components">{{ report.summary.components }}</dd>
          </div>
          <div>
            <dt>Ready</dt>
            <dd data-count="ready">{{ report.summary.interop.ready }}</dd>
          </div>
          <div>
            <dt>Blocked</dt>
            <dd data-count="blocked">{{ report.summary.interop.blocked }}</dd>
          </div>
          <div>
            <dt>Unknown</dt>
            <dd data-count="unknown">{{ report.summary.interop.unknown }}</dd>
          </div>
        </dl>
        <h3>Pure</h3>
        <dl class="counts card">
          <div>
            <dt>Ready</dt>
            <dd data-count="pure-ready">{{ report.summary.pure.ready }}</dd>
          </div>
          <div>
            <dt>Blocked</dt>
            <dd data-count="pure-blocked">{{ report.summary.pure.blocked }}</dd>
          </div>
          <div>
            <dt>Unknown</dt>
            <dd data-count="pure-unknown">{{ report.summary.pure.unknown }}</dd>
          </div>
        </dl>
        <ReadyNote />
        <section class="card">
          <h2>Plugin</h2>
          <p>
            plugin {{ report.project.interopPlugin.state }}
            <template v-if="report.project.interopPlugin.level">
              {{ report.project.interopPlugin.level }}
            </template>
          </p>
          <p
            v-for="line in pluginText(report)"
            :key="line"
          >
            {{ line }}
          </p>
          <p
            v-if="report.project.interopPlugin.location"
            class="meta"
          >
            {{ report.project.interopPlugin.location.file }}:{{
              report.project.interopPlugin.location.line
            }}:{{ report.project.interopPlugin.location.column }}
          </p>
        </section>
        <section class="card">
          <h2>Vue libraries with data: {{ report.project.coverage.withData.length }}</h2>
          <ul>
            <li
              v-for="name in report.project.coverage.withData"
              :key="name"
            >
              {{ name }}
            </li>
          </ul>
          <h2>Vue libraries with no data: {{ report.project.coverage.withoutData.length }}</h2>
          <ul>
            <li
              v-for="name in report.project.coverage.withoutData"
              :key="name"
            >
              {{ name }}
            </li>
          </ul>
        </section>
      </section>

      <section v-else-if="view === 'components'">
        <h2>Components</h2>
        <div class="filters">
          <button
            v-for="name in ['all', 'ready', 'blocked', 'unknown']"
            :key="name"
            type="button"
            :aria-pressed="filter === name"
            @click="filter = name"
          >
            {{ name }}
          </button>
        </div>
        <ReadyNote />
        <div class="card">
          <div
            v-for="component in rows"
            :key="component.id"
            class="row"
          >
            <a :href="`#/component/${encodeURIComponent(component.id)}`">{{ component.file }}</a>
            <span :class="['verdict', component.interop]">interop {{ component.interop }}</span>
            <span :class="['verdict', component.pure]">pure {{ component.pure }}</span>
          </div>
        </div>
      </section>

      <section v-else-if="view === 'detail'">
        <p v-if="!detail">This component is not in the report.</p>
        <template v-else>
          <h2>{{ detail.file }}</h2>
          <p :class="['verdict', detail.interop]">interop {{ detail.interop }}</p>
          <p :class="['verdict', detail.pure]">pure {{ detail.pure }}</p>
          <p class="meta">vapor {{ detail.vapor ? 'yes' : 'no' }}</p>
          <ReadyNote />
          <article
            v-for="(finding, index) in detail.findings"
            :key="`${finding.rule}-${index}`"
            class="finding"
          >
            <h3>{{ finding.level }} {{ finding.failure }} {{ finding.rule }}</h3>
            <p>{{ finding.message }}</p>
            <p class="meta">{{ place(finding) }}</p>
            <p
              v-if="finding.chain && finding.chain.length > 0"
              class="meta"
            >
              chain {{ finding.chain.join(' > ') }}
            </p>
            <p
              v-if="packageLine(finding)"
              class="meta"
            >
              {{ packageLine(finding) }}
            </p>
            <p
              v-for="url in evidenceUrls(finding.evidence)"
              :key="url"
            >
              <a
                :href="url"
                rel="noopener"
                >Evidence</a
              >
            </p>
          </article>
        </template>
      </section>

      <section v-else-if="view === 'rankings'">
        <h2>Holds back the most components</h2>
        <div class="card">
          <div
            v-for="group in report.groups"
            :key="group.rule"
            class="row"
          >
            <span>{{ group.rule }}</span>
            <span>{{ group.components }}</span>
          </div>
        </div>
      </section>

      <section v-else>
        <h2>Libraries</h2>
        <section class="card">
          <h2>Vue libraries with data</h2>
          <ul>
            <li
              v-for="name in report.project.coverage.withData"
              :key="name"
              data-library="with-data"
            >
              {{ name }}
            </li>
          </ul>
          <h2>Vue libraries with no data</h2>
          <ul>
            <li
              v-for="name in report.project.coverage.withoutData"
              :key="name"
              data-library="without-data"
            >
              {{ name }}
            </li>
          </ul>
        </section>
      </section>
    </template>
  </main>
</template>
