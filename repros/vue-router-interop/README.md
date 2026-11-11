# vue-router: navigation in a Vapor component

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

A click on Go sets the path to `/next` and the view to `next`.
A click on the link sets the path to `/link` and the view to `link`.

## Actual

The Vapor component does the same navigation as the VDOM component.

## Versions

- `vue` 3.6.0-rc.14
- `vue-router` 5.4.0
- `@vitejs/plugin-vue` 6.0.10
- `vite` 8.3.7
