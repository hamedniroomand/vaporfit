# Quasar: `$q` throws in a Vapor component

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

The text is `2.35.3`.

## Actual, in the Vapor component

The element is missing. The console reports `TypeError: Cannot read properties of undefined (reading 'version')`.

## Versions

- `vue` 3.6.0-rc.15
- `quasar` 2.35.3
- `@vitejs/plugin-vue` 6.0.10
- `vite` 8.3.7
