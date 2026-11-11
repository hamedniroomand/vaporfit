# Vuetify: `v-ripple` does nothing in a Vapor component

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

A click adds a ripple element.

## Actual, in the Vapor component

No ripple. The console is empty.

## Versions

- `vue` 3.6.0-rc.14
- `vuetify` 4.3.3
- `@vitejs/plugin-vue` 6.0.10
- `vite` 8.3.7
