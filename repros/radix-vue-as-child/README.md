# radix-vue: `as-child` in a Vapor component

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

## Actual

With `vue` 3.6.0-rc.15 and later, the Vapor component gives the same result as the VDOM component.

With `vue` 3.6.0-rc.14 and older, the result is different. The button has no `aria-haspopup`, and a click opens no dialog. The console is empty.

## Versions

- `vue` 3.6.0-rc.15
- `radix-vue` 1.9.17
- `@vitejs/plugin-vue` 6.0.10
- `vite` 8.3.7
