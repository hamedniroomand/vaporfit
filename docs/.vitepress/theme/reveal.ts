import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';

/**
 * - `ssr`: the content shows with no animation. The server and a browser with no script use it.
 * - `out`: the content is hidden until the element is in view.
 * - `in`: the element is in view and the animation runs.
 */
export type RevealState = 'ssr' | 'out' | 'in';

/** Gives the reveal state of an element. A reader who asks for less motion keeps `ssr`. */
export function useReveal(target: Ref<HTMLElement | null>): Ref<RevealState> {
  const state = ref<RevealState>('ssr');
  let observer: IntersectionObserver | undefined;

  onMounted(() => {
    const element = target.value;
    if (!element || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    state.value = 'out';
    observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          state.value = 'in';
          observer?.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(element);
  });

  onBeforeUnmount(() => observer?.disconnect());

  return state;
}
