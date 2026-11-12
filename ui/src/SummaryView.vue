<script setup lang="ts">
  import { computed } from 'vue';

  import FilePath from './FilePath.vue';
  import { pluginText, pluginTitle, pluginTone, type ViewReport } from './report';
  import VerdictBadge from './VerdictBadge.vue';
  import { componentHash, componentsHash, listComponents, percent, VERDICT_LABEL } from './view';

  const props = defineProps<{ report: ViewReport }>();

  const total = computed(() => props.report.summary.components);

  const tiers = computed(() => [
    {
      counts: props.report.summary.interop,
      key: 'interop' as const,
      prefix: '',
      text: 'createApp() with vaporInteropPlugin. Vapor and VDOM components work together.',
      title: 'Interop',
    },
    {
      counts: props.report.summary.pure,
      key: 'pure' as const,
      prefix: 'pure-',
      text: 'createVaporApp(). Each component in the tree must be Vapor.',
      title: 'Pure',
    },
  ]);

  const blocked = computed(() =>
    listComponents(props.report.components, {
      query: '',
      rule: '',
      tier: 'interop',
      verdict: 'blocked',
    }).slice(0, 6),
  );

  const blockers = computed(() => props.report.groups.slice(0, 5));

  const plugin = computed(() => props.report.project.interopPlugin);
</script>

<template>
  <div class="stack">
    <div class="tier-grid">
      <section
        v-for="tier in tiers"
        :key="tier.key"
        class="panel tier"
        :aria-labelledby="`tier-${tier.key}`"
      >
        <header class="tier-head">
          <h2 :id="`tier-${tier.key}`">{{ tier.title }}</h2>
          <p class="muted small">{{ tier.text }}</p>
        </header>
        <p class="headline">
          <span class="headline-number">{{ tier.counts.ready }}</span>
          <span class="muted">of {{ total }} ready</span>
        </p>
        <div
          class="meter"
          role="img"
          :aria-label="`${tier.counts.ready} ready, ${tier.counts.blocked} blocked, ${tier.counts.unknown} unknown`"
        >
          <span
            class="meter-part tone-ready"
            :style="{ width: `${percent(tier.counts.ready, total)}%` }"
          />
          <span
            class="meter-part tone-unknown"
            :style="{ width: `${percent(tier.counts.unknown, total)}%` }"
          />
          <span
            class="meter-part tone-blocked"
            :style="{ width: `${percent(tier.counts.blocked, total)}%` }"
          />
        </div>
        <dl class="counts">
          <div v-if="tier.key === 'interop'">
            <dt>Components</dt>
            <dd>
              <a
                class="count-link"
                :href="componentsHash({})"
                ><span data-count="components">{{ total }}</span></a
              >
            </dd>
          </div>
          <div
            v-for="verdict in ['ready', 'blocked', 'unknown'] as const"
            :key="verdict"
          >
            <dt>
              <span
                :class="['dot', `tone-${verdict}`]"
                aria-hidden="true"
              />
              {{ VERDICT_LABEL[verdict] }}
            </dt>
            <dd>
              <a
                class="count-link"
                :href="componentsHash({ tier: tier.key, verdict })"
                ><span :data-count="`${tier.prefix}${verdict}`">{{ tier.counts[verdict] }}</span></a
              >
            </dd>
          </div>
        </dl>
      </section>
    </div>

    <section
      :class="['callout', `tone-${pluginTone(report)}`]"
      aria-labelledby="plugin-title"
    >
      <h2
        id="plugin-title"
        class="callout-title"
      >
        {{ pluginTitle(report) }}
      </h2>
      <p
        v-for="line in pluginText(report)"
        :key="line"
      >
        {{ line }}
      </p>
      <p
        v-if="plugin.location"
        class="mono small muted"
      >
        {{ plugin.location.file }}:{{ plugin.location.line }}:{{ plugin.location.column }}
      </p>
    </section>

    <div class="two-col">
      <section
        class="panel"
        aria-labelledby="blockers-title"
      >
        <div class="panel-head">
          <h2 id="blockers-title">Top blockers</h2>
          <a
            class="text-link small"
            href="#/rankings"
            >All rules</a
          >
        </div>
        <p
          v-if="blockers.length === 0"
          class="empty"
        >
          No rule holds back a component.
        </p>
        <ol
          v-else
          class="plain-list"
        >
          <li
            v-for="group in blockers"
            :key="group.rule"
          >
            <a
              class="list-row"
              :href="componentsHash({ rule: group.rule })"
            >
              <span class="mono truncate">{{ group.rule }}</span>
              <span class="pill">{{ group.components }}</span>
            </a>
          </li>
        </ol>
      </section>

      <section
        class="panel"
        aria-labelledby="blocked-title"
      >
        <div class="panel-head">
          <h2 id="blocked-title">Blocked for interop</h2>
          <a
            class="text-link small"
            :href="componentsHash({ verdict: 'blocked' })"
            >All {{ report.summary.interop.blocked }}</a
          >
        </div>
        <p
          v-if="blocked.length === 0"
          class="empty"
        >
          No component is blocked for interop.
        </p>
        <ul
          v-else
          class="plain-list"
        >
          <li
            v-for="component in blocked"
            :key="component.id"
          >
            <a
              class="list-row"
              :href="componentHash(component.id)"
            >
              <FilePath :file="component.file" />
              <VerdictBadge verdict="blocked" />
            </a>
          </li>
        </ul>
      </section>
    </div>

    <section
      class="panel"
      aria-labelledby="libraries-title"
    >
      <div class="panel-head">
        <h2 id="libraries-title">Vue libraries</h2>
        <a
          class="text-link small"
          href="#/libraries"
          >Details</a
        >
      </div>
      <p class="small muted">
        With data: {{ report.project.coverage.withData.length }} · No data:
        {{ report.project.coverage.withoutData.length }}
      </p>
      <ul class="chips">
        <li
          v-for="name in report.project.coverage.withData"
          :key="name"
          class="chip"
        >
          {{ name }}
        </li>
        <li
          v-for="name in report.project.coverage.withoutData"
          :key="name"
          class="chip chip-quiet"
        >
          {{ name }}
        </li>
      </ul>
    </section>
  </div>
</template>
