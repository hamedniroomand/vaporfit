# @vueuse/motion: `v-motion` does nothing in a Vapor component

`src/VdomCase.vue` and `src/VaporCase.vue` have the same content. The only difference is the `vapor` attribute on `<script setup>`.
The app uses `createApp()` with `vaporInteropPlugin`.
The app also installs `MotionPlugin`, which registers `v-motion`.

## Steps

```sh
pnpm install
pnpm build
pnpm preview
```

Open the page and compare the two components.

## Expected

The paragraph opacity settles at `0.4`.

## Actual, in the Vapor component

The paragraph stays at opacity `1`. The console has no message from the directive.

## Versions

- `vue` 3.6.0-rc.15
- `@vueuse/motion` 3.0.3
- `@vitejs/plugin-vue` 6.0.10
- `vite` 8.3.7
