# vue-router: $route in a Vapor component

`src/VdomCase.vue` and `src/VaporCase.vue` have the same content. The only difference is the `vapor` attribute on `<script setup>`.
The app uses `createApp()` with `vaporInteropPlugin` and `vue-router`.

## Steps

```sh
pnpm install
pnpm build
pnpm preview
```

Open the page and compare the two components.

## Expected

The element shows `/`.

## Actual

The Vapor component throws `Cannot read properties of undefined (reading 'path')`. The element is absent. The VDOM component shows `/`.

## Versions

- `vue` 3.6.0-rc.14
- `vue-router` 5.4.0
- `@vitejs/plugin-vue` 6.0.10
- `vite` 8.3.7
