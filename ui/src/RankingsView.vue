<script setup lang="ts">
  import type { ViewReport } from './report';
  import { componentsHash, percent } from './view';

  defineProps<{ report: ViewReport }>();
</script>

<template>
  <section
    class="stack"
    aria-labelledby="rankings-title"
  >
    <div class="page-head">
      <h2 id="rankings-title">Holds back the most components</h2>
      <p class="small muted">
        Each rule, with the number of components that have an error or an unknown finding for it.
      </p>
    </div>
    <p
      v-if="report.groups.length === 0"
      class="panel empty"
    >
      No rule holds back a component.
    </p>
    <ol
      v-else
      class="panel flush plain-list"
    >
      <li
        v-for="group in report.groups"
        :key="group.rule"
      >
        <a
          class="rank-row"
          :href="componentsHash({ rule: group.rule })"
        >
          <span class="mono break">{{ group.rule }}</span>
          <span class="rank-bar">
            <span
              :style="{
                width: `${Math.max(percent(group.components, report.summary.components), 2)}%`,
              }"
            />
          </span>
          <span class="num">{{ group.components }}</span>
        </a>
      </li>
    </ol>
  </section>
</template>
