<script setup lang="ts">
  import { computed } from 'vue';

  import type { ViewComponent } from './report';
  import VerdictBadge from './VerdictBadge.vue';
  import {
    componentsHash,
    evidenceLinks,
    FAILURE_LABEL,
    groupFindings,
    splitPath,
    type EvidenceLink,
  } from './view';

  const props = defineProps<{ component: ViewComponent | undefined }>();

  // A long list of places hides the next rule, so the page shows the first ones.
  const FIRST_PLACES = 3;

  const groups = computed(() => groupFindings(props.component?.findings ?? []));
  const path = computed(() => splitPath(props.component?.file ?? ''));

  // Many probes can test one rule. The page shows the first ones and keeps the rest one click away.
  const FIRST_PROBES = 2;

  function linksOf(evidence: unknown): { shown: EvidenceLink[]; hidden: EvidenceLink[] } {
    const links = evidenceLinks(evidence);
    const probes = links.filter(link => link.kind === 'probe');
    const others = links.filter(link => link.kind !== 'probe');
    return {
      hidden: probes.slice(FIRST_PROBES),
      shown: [...probes.slice(0, FIRST_PROBES), ...others],
    };
  }

  const KIND_LABEL: Record<string, string> = {
    issue: 'Issue',
    link: 'Link',
    probe: 'Probe',
    source: 'Source',
  };

  function place(location: { file: string; line: number; column: number }): string {
    return `${location.file}:${location.line}:${location.column}`;
  }
</script>

<template>
  <section class="stack">
    <a
      class="back-link"
      :href="componentsHash({})"
    >
      <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path d="M12 5 7 10l5 5" />
      </svg>
      Components
    </a>

    <div
      v-if="!component"
      class="panel empty"
    >
      This component is not in the report.
    </div>

    <template v-else>
      <header class="detail-head">
        <p class="mono small muted break">{{ path.folder }}</p>
        <h2 class="detail-title break">{{ path.name }}</h2>
        <div class="badge-row">
          <VerdictBadge
            :verdict="component.interop"
            label="Interop"
          />
          <VerdictBadge
            :verdict="component.pure"
            label="Pure"
          />
          <span class="tag">{{ component.vapor ? 'has vapor' : 'no vapor attribute' }}</span>
        </div>
        <p class="small muted">
          {{ component.findings.length }}
          {{ component.findings.length === 1 ? 'finding' : 'findings' }} in {{ groups.length }}
          {{ groups.length === 1 ? 'rule' : 'rules' }}
        </p>
      </header>

      <p
        v-if="groups.length === 0"
        class="panel empty"
      >
        vaporfit found no known problem in this component.
      </p>

      <article
        v-for="group in groups"
        :key="`${group.rule}-${group.message}`"
        :class="['finding', `level-${group.level}`]"
      >
        <div class="finding-tags">
          <span :class="['level', `level-${group.level}`]">{{ group.level }}</span>
          <span class="tag">{{ FAILURE_LABEL[group.failure] ?? group.failure }}</span>
          <span
            v-if="group.places.length > 1"
            class="tag"
            >{{ group.places.length }} places</span
          >
        </div>
        <h3 class="mono finding-rule">{{ group.rule }}</h3>
        <p class="finding-message">{{ group.message }}</p>

        <ol class="places">
          <li
            v-for="(item, index) in group.places.slice(0, FIRST_PLACES)"
            :key="index"
            class="place"
          >
            <code class="break">{{ place(item.location) }}</code>
            <ol
              v-if="item.chain.length > 1"
              class="chain"
              aria-label="Chain"
            >
              <li
                v-for="step in item.chain"
                :key="step"
                class="mono"
              >
                {{ step }}
              </li>
            </ol>
            <p
              v-if="item.package"
              class="small muted"
            >
              Package {{ item.package }}
            </p>
          </li>
        </ol>
        <details
          v-if="group.places.length > FIRST_PLACES"
          class="more"
        >
          <summary>
            {{ group.places.length - FIRST_PLACES }} more
            {{ group.places.length - FIRST_PLACES === 1 ? 'place' : 'places' }}
          </summary>
          <ol class="places">
            <li
              v-for="(item, index) in group.places.slice(FIRST_PLACES)"
              :key="index"
              class="place"
            >
              <code class="break">{{ place(item.location) }}</code>
              <ol
                v-if="item.chain.length > 1"
                class="chain"
                aria-label="Chain"
              >
                <li
                  v-for="step in item.chain"
                  :key="step"
                  class="mono"
                >
                  {{ step }}
                </li>
              </ol>
            </li>
          </ol>
        </details>

        <div
          v-if="evidenceLinks(group.evidence).length > 0"
          class="evidence-block"
        >
          <ul
            class="evidence"
            aria-label="Evidence"
          >
            <li
              v-for="link in linksOf(group.evidence).shown"
              :key="link.url"
            >
              <a
                :href="link.url"
                target="_blank"
                rel="noopener"
              >
                <span class="evidence-kind">{{ KIND_LABEL[link.kind] }}</span>
                <span class="break">{{ link.label }}</span>
                <span
                  v-if="link.detail"
                  class="muted small"
                  >{{ link.detail }}</span
                >
              </a>
            </li>
          </ul>
          <details
            v-if="linksOf(group.evidence).hidden.length > 0"
            class="more"
          >
            <summary>
              {{ linksOf(group.evidence).hidden.length }} more
              {{ linksOf(group.evidence).hidden.length === 1 ? 'probe' : 'probes' }}
            </summary>
            <ul class="evidence">
              <li
                v-for="link in linksOf(group.evidence).hidden"
                :key="link.url"
              >
                <a
                  :href="link.url"
                  target="_blank"
                  rel="noopener"
                >
                  <span class="evidence-kind">{{ KIND_LABEL[link.kind] }}</span>
                  <span class="break">{{ link.label }}</span>
                  <span
                    v-if="link.detail"
                    class="muted small"
                    >{{ link.detail }}</span
                  >
                </a>
              </li>
            </ul>
          </details>
        </div>
      </article>
    </template>
  </section>
</template>
