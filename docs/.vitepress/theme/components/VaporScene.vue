<script setup lang="ts">
  // The sky and the vapor behind the hero. It is decoration only.
  import { onBeforeUnmount, onMounted, ref } from 'vue';

  const scene = ref<HTMLElement | null>(null);
  let frame = 0;

  function move(event: PointerEvent): void {
    if (frame !== 0) {
      return;
    }
    frame = requestAnimationFrame(() => {
      frame = 0;
      scene.value?.style.setProperty('--px', String(event.clientX / innerWidth - 0.5));
      scene.value?.style.setProperty('--py', String(event.clientY / innerHeight - 0.5));
    });
  }

  onMounted(() => {
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      addEventListener('pointermove', move, { passive: true });
    }
  });

  onBeforeUnmount(() => {
    removeEventListener('pointermove', move);
    cancelAnimationFrame(frame);
  });
</script>

<template>
  <div
    ref="scene"
    class="scene"
    aria-hidden="true"
  >
    <div class="stars" />
    <div class="glow" />
    <div class="shift far"><div class="fog fog-far" /></div>
    <div class="shift mid">
      <span
        v-for="index in 7"
        :key="index"
        class="wisp"
        :style="{ '--n': index }"
      />
    </div>
    <div class="shift near"><div class="fog fog-near" /></div>
    <div class="fade" />
  </div>
</template>

<style scoped>
  .scene {
    position: absolute;
    inset: 0;
    z-index: -1;
    overflow: hidden;
    background: linear-gradient(
      180deg,
      #0d1030 0%,
      #272450 34%,
      #5f3a6c 58%,
      #a8506a 76%,
      #ea8a4c 88%,
      #f5a623 100%
    );
  }

  /* Small stars in the dark part of the sky. */
  .stars {
    position: absolute;
    inset: 0 0 45%;
    background-image:
      radial-gradient(1.2px 1.2px at 12% 22%, #fff, transparent),
      radial-gradient(1px 1px at 27% 58%, rgb(255 255 255 / 0.8), transparent),
      radial-gradient(1.4px 1.4px at 41% 14%, #fff, transparent),
      radial-gradient(1px 1px at 56% 40%, rgb(255 255 255 / 0.7), transparent),
      radial-gradient(1.3px 1.3px at 68% 9%, #fff, transparent),
      radial-gradient(1px 1px at 79% 52%, rgb(255 255 255 / 0.8), transparent),
      radial-gradient(1.2px 1.2px at 91% 27%, #fff, transparent),
      radial-gradient(1px 1px at 5% 70%, rgb(255 255 255 / 0.6), transparent);
    background-size: 37rem 23rem;
    -webkit-mask-image: linear-gradient(to bottom, #000 30%, transparent);
    mask-image: linear-gradient(to bottom, #000 30%, transparent);
    animation: twinkle 6s ease-in-out infinite alternate;
  }

  @keyframes twinkle {
    to {
      opacity: 0.55;
    }
  }

  /* The heat at the bottom of the sky. */
  .glow {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 80% 26% at 50% 98%, rgb(255 222 150 / 0.9), transparent 70%),
      radial-gradient(ellipse 40% 30% at 82% 18%, rgb(120 130 255 / 0.22), transparent 70%);
  }

  .shift {
    position: absolute;
    inset: 0;
    transition: transform 0.6s ease-out;
  }

  .far {
    transform: translate3d(calc(var(--px, 0) * -18px), calc(var(--py, 0) * -8px), 0);
  }

  .mid {
    transform: translate3d(calc(var(--px, 0) * -34px), calc(var(--py, 0) * -14px), 0);
  }

  .near {
    transform: translate3d(calc(var(--px, 0) * -60px), calc(var(--py, 0) * -24px), 0);
  }

  /* A fog layer has the same pattern two times, so the loop has no seam. */
  .fog {
    position: absolute;
    inset: 0 auto 0 0;
    width: 200%;
    background-repeat: repeat-x;
    background-size: 50% 100%;
    filter: blur(28px);
    animation: drift linear infinite;
  }

  .fog-far {
    background-image:
      radial-gradient(ellipse 22% 16% at 14% 38%, rgb(255 255 255 / 0.2), transparent 70%),
      radial-gradient(ellipse 30% 14% at 58% 52%, rgb(255 255 255 / 0.16), transparent 70%),
      radial-gradient(ellipse 18% 12% at 88% 30%, rgb(255 255 255 / 0.18), transparent 70%);
    animation-duration: 90s;
  }

  .fog-near {
    background-image:
      radial-gradient(ellipse 34% 14% at 22% 88%, rgb(255 255 255 / 0.45), transparent 70%),
      radial-gradient(ellipse 28% 12% at 70% 93%, rgb(255 240 222 / 0.5), transparent 70%),
      radial-gradient(ellipse 20% 9% at 46% 82%, rgb(255 255 255 / 0.28), transparent 70%);
    animation-duration: 46s;
  }

  @keyframes drift {
    to {
      transform: translate3d(-50%, 0, 0);
    }
  }

  /* A column of vapor that goes up from the heat. */
  .wisp {
    position: absolute;
    bottom: -6%;
    left: calc(var(--n) * 13% - 4%);
    width: clamp(5rem, 9vw, 9rem);
    height: 62%;
    background: linear-gradient(to top, rgb(255 246 232 / 0.85), rgb(255 255 255 / 0));
    border-radius: 50%;
    filter: blur(18px);
    opacity: 0;
    transform-origin: bottom;
    animation: rise calc(9s + var(--n) * 1.7s) ease-in-out calc(var(--n) * -2.3s) infinite;
  }

  @keyframes rise {
    0% {
      opacity: 0;
      transform: translate3d(0, 12%, 0) scaleX(0.7) skewX(0deg);
    }
    30% {
      opacity: 0.75;
    }
    60% {
      transform: translate3d(3vw, -22%, 0) scaleX(1.4) skewX(-6deg);
    }
    100% {
      opacity: 0;
      transform: translate3d(-2vw, -48%, 0) scaleX(2.1) skewX(5deg);
    }
  }

  /* The scene goes into the page color at its lower edge. */
  .fade {
    position: absolute;
    inset: auto 0 0;
    height: 14rem;
    background: linear-gradient(
      to bottom,
      transparent,
      color-mix(in oklab, var(--background) 22%, transparent) 35%,
      color-mix(in oklab, var(--background) 68%, transparent) 70%,
      var(--background)
    );
  }

  @media (prefers-reduced-motion: reduce) {
    .fog,
    .wisp,
    .stars {
      animation: none;
    }

    .wisp {
      opacity: 0.45;
    }
  }
</style>
