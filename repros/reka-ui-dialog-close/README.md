# Reka UI: DialogClose as-child in a Vapor component

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

The dialog opens.
A click on Close closes the dialog.

## Actual

The close button gets no listener. A click leaves the dialog open. The console is empty.

## Versions

- `vue` 3.6.0-rc.14
- `reka-ui` 2.11.0
- `@vitejs/plugin-vue` 6.0.10
- `vite` 8.3.7
