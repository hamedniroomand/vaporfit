# Reka UI: `as-child` through a VDOM wrapper in a Vapor component

`src/VdomCase.vue` and `src/VaporCase.vue` have the same content. The only difference is the `vapor` attribute on `<script setup>`.
The two components use `src/DialogWrapper.vue`. That wrapper is a VDOM component. It passes `as-child` to the Reka UI `DialogTrigger`, as a shadcn-vue `ui/` wrapper does.
The app uses `createApp()` with `vaporInteropPlugin`.

## Steps

```sh
pnpm install
pnpm build
pnpm preview
```

Open the page and compare the two components.

## Expected

The button gets `aria-haspopup="dialog"`, and a click opens the dialog.

## Actual

With `vue` 3.6.0-rc.15 and later, the Vapor component gives the same result as the VDOM component.

With `vue` 3.6.0-rc.14 and older, the result is different. The button gets no attributes and no listener. A click does nothing. The console is empty.

## Versions

- `vue` 3.6.0-rc.15
- `reka-ui` 2.11.0
- `@vitejs/plugin-vue` 6.0.10
- `vite` 8.3.7
