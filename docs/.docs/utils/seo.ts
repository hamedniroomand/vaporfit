import { useHead } from '@unhead/vue';
import { useAppConfig } from 'undocs/src/app/composables/useAppConfig';
import { useRoute } from 'undocs/src/app/router';
import { computed } from 'vue';

/**
 * Adds the canonical link, `og:url` and one JSON-LD block to the head of the page.
 * It does nothing when the docs config has no `url`.
 */
export function useStructuredHead(data: (url: string) => object): void {
  const { site } = useAppConfig();
  if (!site.url) {
    return;
  }
  const route = useRoute();
  // A page has one address: no slash at the end, but the root keeps its slash.
  const url = computed(() => new URL(route.path.replace(/(.)\/$/, '$1'), site.url).href);
  useHead({
    link: [{ rel: 'canonical', href: url }],
    meta: [{ property: 'og:url', content: url }],
    script: [
      {
        type: 'application/ld+json',
        innerHTML: computed(() =>
          JSON.stringify({ '@context': 'https://schema.org', ...data(url.value) }),
        ),
      },
    ],
  });
}
