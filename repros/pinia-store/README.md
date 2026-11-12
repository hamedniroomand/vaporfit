# pinia: a store in a Vapor component

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

Reset sets the count to 0.
The action adds 1.
`storeToRefs` and the getter show the same count.

## Actual

The Vapor component updates the store the same way as the VDOM component.

## Versions

- `vue` 3.6.0-rc.15
- `pinia` 4.1.0
- `@vitejs/plugin-vue` 6.0.10
- `vite` 8.3.7
