# maska: `v-maska` does not mask input in a Vapor component

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

Typing `12` becomes `1-2` for both the value binding and `data-maska`.

## Actual, in the Vapor component

Both inputs stay `12`. `data-maska` throws `TypeError: Cannot read properties of undefined (reading 'value')`.

## Versions

- `vue` 3.6.0-rc.14
- `maska` 3.2.2
- `@vitejs/plugin-vue` 6.0.10
- `vite` 8.3.7
