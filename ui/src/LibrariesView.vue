<script setup lang="ts">
  import { computed } from 'vue';

  import type { ViewReport } from './report';

  const props = defineProps<{ report: ViewReport }>();

  const stale = computed(() => new Set(props.report.project.coverage.stale ?? []));
</script>

<template>
  <section
    class="stack"
    aria-labelledby="libraries-page-title"
  >
    <div class="page-head">
      <h2 id="libraries-page-title">Libraries</h2>
      <p class="small muted">
        The Vue libraries in the dependencies of the project.
        <a
          class="text-link"
          href="https://vaporfit.kitdev.space/libraries"
          target="_blank"
          rel="noopener"
          >See the library table</a
        >
      </p>
    </div>
    <div class="two-col">
      <section
        class="panel"
        aria-labelledby="with-data-title"
      >
        <h3 id="with-data-title">
          Vue libraries with data
          <span class="pill">{{ report.project.coverage.withData.length }}</span>
        </h3>
        <p class="small muted">vaporfit has data for these libraries.</p>
        <p
          v-if="report.project.coverage.withData.length === 0"
          class="empty"
        >
          None.
        </p>
        <ul
          v-else
          class="chips"
        >
          <li
            v-for="name in report.project.coverage.withData"
            :key="name"
            class="chip"
            data-library="with-data"
          >
            {{ name }}
            <span
              v-if="stale.has(name)"
              class="tag tone-unknown"
              title="The data is more than 30 days old."
              >stale</span
            >
          </li>
        </ul>
      </section>
      <section
        class="panel"
        aria-labelledby="no-data-title"
      >
        <h3 id="no-data-title">
          Vue libraries with no data
          <span class="pill">{{ report.project.coverage.withoutData.length }}</span>
        </h3>
        <p class="small muted">vaporfit has no data for these libraries.</p>
        <p
          v-if="report.project.coverage.withoutData.length === 0"
          class="empty"
        >
          None.
        </p>
        <ul
          v-else
          class="chips"
        >
          <li
            v-for="name in report.project.coverage.withoutData"
            :key="name"
            class="chip chip-quiet"
            data-library="without-data"
          >
            {{ name }}
          </li>
        </ul>
      </section>
    </div>
  </section>
</template>
