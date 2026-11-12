# Reka UI: DropdownMenuTrigger as-child in a Vapor component

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

The button has `aria-haspopup="menu"`.
A click opens the menu.

## Actual

With `vue` 3.6.0-rc.15 and later, the Vapor component gives the same result as the VDOM component.

With `vue` 3.6.0-rc.14 and older, the result is different. The button gets no attributes and no listener. A click does nothing. The console is empty.

## Versions

- `vue` 3.6.0-rc.15
- `reka-ui` 2.11.0
- `@vitejs/plugin-vue` 6.0.10
- `vite` 8.3.7
