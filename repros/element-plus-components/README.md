# Element Plus: ElButton and ElInput in a Vapor component

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

A click adds 1.
The input value `hi` shows in the text.

## Actual

The Vapor component does the same work as the VDOM component.

## Versions

- `vue` 3.6.0-rc.14
- `element-plus` 2.14.8
- `@vitejs/plugin-vue` 6.0.10
- `vite` 8.3.7
