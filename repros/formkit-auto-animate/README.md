# @formkit/auto-animate: `v-auto-animate` does nothing in a Vapor component

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

The list renders and the directive attaches to the element.

## Actual, in the Vapor component

The list renders. The directive does not attach. The console has no message from the directive.

## Versions

- `vue` 3.6.0-rc.15
- `@formkit/auto-animate` 0.10.2
- `@vitejs/plugin-vue` 6.0.10
- `vite` 8.3.7
