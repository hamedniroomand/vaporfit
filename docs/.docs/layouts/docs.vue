<script setup lang="ts">
  // The docs layout of undocs, with three additions: a canonical link and a breadcrumb list for
  // search engines, a line that shows the scroll position, and a short move when the page changes.
  import { useAppConfig } from 'undocs/src/app/composables/useAppConfig';
  import DocsLayout from 'undocs/src/app/layouts/docs.vue';
  import { useRoute } from 'undocs/src/app/router';
  import { inject, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';

  import { useStructuredHead } from '../utils/seo';

  import '../theme.css';

  interface NavItem {
    title: string;
    path: string;
    children?: NavItem[];
  }

  const { site } = useAppConfig();
  const navigation = inject<Ref<NavItem[]>>('navigation');

  function trail(items: NavItem[] | undefined, path: string, parents: NavItem[] = []): NavItem[] {
    for (const item of items ?? []) {
      const chain = [...parents, item];
      if (item.path === path && !item.children?.length) {
        return chain;
      }
      const found = trail(item.children, path, chain);
      if (found.length > 0) {
        return found;
      }
    }
    return [];
  }

  useStructuredHead(url => {
    const path = new URL(url).pathname;
    // A section and its index page have the same address. Keep the section.
    const items = trail(navigation?.value, path).filter(
      (item, index, list) => list.findIndex(other => other.path === item.path) === index,
    );
    return {
      '@type': 'BreadcrumbList',
      itemListElement: [{ title: site.name, path: '/' }, ...items].map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.title,
        item: new URL(item.path, url).href,
      })),
    };
  });

  const route = useRoute();
  const content = ref<HTMLElement | null>(null);
  const bar = ref<HTMLElement | null>(null);
  let observer: MutationObserver | undefined;
  // True from a route change until the content of the new page is in the document.
  let pending = false;
  let frame = 0;

  function progress(): void {
    if (frame !== 0) {
      return;
    }
    frame = requestAnimationFrame(() => {
      frame = 0;
      const range = document.documentElement.scrollHeight - innerHeight;
      bar.value?.style.setProperty('--vf-progress', String(range > 0 ? scrollY / range : 0));
    });
  }

  watch(
    () => route.path,
    () => {
      pending = true;
    },
  );

  onMounted(() => {
    addEventListener('scroll', progress, { passive: true });
    if (!content.value || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    // The page content changes a short time after the route changes. The new content comes into
    // view with a short move, one time for each route change.
    observer = new MutationObserver(() => {
      if (!pending) {
        return;
      }
      pending = false;
      progress();
      content.value?.animate(
        [
          { opacity: 0, transform: 'translateY(10px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 380, easing: 'cubic-bezier(0.2, 0.7, 0.1, 1)' },
      );
    });
    observer.observe(content.value, { childList: true, subtree: true });
  });

  onBeforeUnmount(() => {
    removeEventListener('scroll', progress);
    cancelAnimationFrame(frame);
    observer?.disconnect();
  });
</script>

<template>
  <div
    ref="bar"
    class="vf-progress"
    aria-hidden="true"
  />
  <DocsLayout>
    <div ref="content">
      <slot />
    </div>
  </DocsLayout>
</template>
