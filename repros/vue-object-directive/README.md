# Vue: an object directive is skipped in a Vapor component, with no message in production

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

The text is "directive ran", or the build gives a warning.

## Actual, in the Vapor component

The text is "directive did not run". The build and the production console are empty. Only the development build warns.

## Versions

- `vue` 3.6.0-rc.14
- `@vitejs/plugin-vue` 6.0.10
- `vite` 8.3.7
