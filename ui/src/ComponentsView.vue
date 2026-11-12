<script setup lang="ts">
  import { computed, ref, watch } from 'vue';

  import { browserPage } from './browser';
  import FilePath from './FilePath.vue';
  import type { ViewReport } from './report';
  import VerdictBadge from './VerdictBadge.vue';
  import {
    componentHash,
    componentsHash,
    countVerdicts,
    listComponents,
    VERDICT_LABEL,
    VERDICTS,
    type Route,
  } from './view';

  const props = defineProps<{ report: ViewReport; route: Route }>();

  const query = ref(props.route.query);
  watch(
    () => props.route.query,
    value => {
      if (value !== query.value) query.value = value;
    },
  );

  // The search box writes the hash in place, so each key press does not add a history entry.
  watch(query, value => {
    browserPage().location.replace(componentsHash({ ...props.route, query: value }));
  });

  const base = computed(() =>
    listComponents(props.report.components, { ...props.route, verdict: 'all' }),
  );
  const counts = computed(() => countVerdicts(base.value, props.route.tier));
  const rows = computed(() => listComponents(props.report.components, props.route));

  function link(change: Partial<Route>): string {
    return componentsHash({ ...props.route, ...change });
  }
</script>

<template>
  <section
    class="stack"
    aria-labelledby="components-title"
  >
    <div class="page-head">
      <h2 id="components-title">Components</h2>
      <p class="small muted">
        {{ rows.length }} of {{ report.components.length }} shown. Blocked comes first.
      </p>
    </div>

    <div class="toolbar">
      <label class="search">
        <span class="sr-only">Search the component paths</span>
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <circle
            cx="9"
            cy="9"
            r="5.5"
          />
          <path d="m13.5 13.5 3.5 3.5" />
        </svg>
        <input
          v-model="query"
          type="search"
          placeholder="Search paths"
          autocomplete="off"
          spellcheck="false"
        />
      </label>

      <div
        class="segmented"
        role="group"
        aria-label="Tier"
      >
        <a
          v-for="tier in ['interop', 'pure'] as const"
          :key="tier"
          :href="link({ tier })"
          :aria-current="route.tier === tier ? 'true' : undefined"
          >{{ tier === 'interop' ? 'Interop' : 'Pure' }}</a
        >
      </div>
    </div>

    <div
      class="segmented segmented-wide"
      role="group"
      aria-label="Verdict"
    >
      <a
        :href="link({ verdict: 'all' })"
        :aria-current="route.verdict === 'all' ? 'true' : undefined"
        >All <span class="seg-count">{{ base.length }}</span></a
      >
      <a
        v-for="verdict in VERDICTS"
        :key="verdict"
        :href="link({ verdict })"
        :aria-current="route.verdict === verdict ? 'true' : undefined"
      >
        <span
          :class="['dot', `tone-${verdict}`]"
          aria-hidden="true"
        />
        {{ VERDICT_LABEL[verdict] }} <span class="seg-count">{{ counts[verdict] }}</span>
      </a>
    </div>

    <p
      v-if="route.rule"
      class="filter-note"
    >
      Rule <code>{{ route.rule }}</code>
      <a
        class="text-link"
        :href="link({ rule: '' })"
        >Clear</a
      >
    </p>

    <div class="panel flush">
      <div
        class="table-head"
        aria-hidden="true"
      >
        <span>Component</span>
        <span>Interop</span>
        <span>Pure</span>
        <span class="num">Findings</span>
      </div>
      <p
        v-if="rows.length === 0"
        class="empty pad"
      >
        No component matches the filter.
      </p>
      <ul
        v-else
        class="table"
      >
        <li
          v-for="component in rows"
          :key="component.id"
        >
          <a
            class="table-row"
            :href="componentHash(component.id)"
          >
            <FilePath
              :file="component.file"
              :vapor="component.vapor"
            />
            <VerdictBadge
              :verdict="component.interop"
              label="Interop"
            />
            <VerdictBadge
              :verdict="component.pure"
              label="Pure"
            />
            <span class="num muted"
              >{{ component.findings.length
              }}<span class="num-label">
                {{ component.findings.length === 1 ? 'finding' : 'findings' }}</span
              ></span
            >
          </a>
        </li>
      </ul>
    </div>
  </section>
</template>
