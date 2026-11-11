# radix-vue: `as-child` does nothing in a Vapor component

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

The button has `aria-haspopup="dialog"`, and a click opens the dialog.

## Actual, in the Vapor component

The button has no `aria-haspopup`, and a click opens no dialog. The console is empty.

## Versions

- `vue` 3.6.0-rc.14
- `radix-vue` 1.9.17
- `@vitejs/plugin-vue` 6.0.10
- `vite` 8.3.7
