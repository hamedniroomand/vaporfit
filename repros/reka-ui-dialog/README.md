# Reka UI: a dialog without as-child in a Vapor component

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

The trigger has `aria-haspopup="dialog"`.
A click opens one dialog.

## Actual

The Vapor component opens the dialog the same way as the VDOM component.

## Versions

- `vue` 3.6.0-rc.15
- `reka-ui` 2.11.0
- `@vitejs/plugin-vue` 6.0.10
- `vite` 8.3.7
