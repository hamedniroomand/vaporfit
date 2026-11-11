# VueUse: composables in a Vapor component

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

The input updates the model.
The toggle turns on.
A click outside the box adds 1.
The box reports its size.
The saved value is `saved`.

## Actual

The Vapor component does the same work as the VDOM component.

## Versions

- `vue` 3.6.0-rc.14
- `@vueuse/core` 15.0.0
- `@vitejs/plugin-vue` 6.0.10
- `vite` 8.3.7
