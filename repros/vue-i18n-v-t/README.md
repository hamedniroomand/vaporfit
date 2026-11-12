# vue-i18n: `v-t` renders nothing in a Vapor component

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

The text is "Hello".

## Actual, in the Vapor component

The element is empty. The console is empty.

## Versions

- `vue` 3.6.0-rc.15
- `vue-i18n` 11.4.18
- `@vitejs/plugin-vue` 6.0.10
- `vite` 8.3.7
