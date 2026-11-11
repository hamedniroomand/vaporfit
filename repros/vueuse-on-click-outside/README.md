# VueUse: `v-on-click-outside` does nothing in a Vapor component

`src/VdomCase.vue` and `src/VaporCase.vue` have the same content. The only difference is the `vapor` attribute on `<script setup>`.
The app uses `createApp()` with `vaporInteropPlugin`.

## Steps

```sh
pnpm install
pnpm build
pnpm preview
```

Open the page and compare the two components.

## Expected

A click outside the element increases the count.

## Actual, in the Vapor component

The count stays 0. The console is empty.

## Versions

- `vue` 3.6.0-rc.14
- `@vueuse/components` 15.0.0
- `@vueuse/core` 15.0.0
- `@vitejs/plugin-vue` 6.0.10
- `vite` 8.3.7
