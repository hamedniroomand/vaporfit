# A VDOM component inside createVaporApp()

`src/VdomCase.vue` has no `vapor` attribute.
`src/VaporCase.vue` has the same template and the `vapor` attribute.
`src/App.vue` is a Vapor component.
The app uses `createVaporApp()`.

## Steps

```sh
pnpm install
pnpm build
pnpm preview
```

Open the page and compare the two components.

## Expected

The Vapor component shows "child text".
The VDOM component shows the same text, or the build gives a warning.

## Actual, in Chrome 156

`vite build` succeeds.
The Vapor component shows "child text".
The VDOM component renders nothing.
The production console is empty.

## Versions

- `vue` 3.6.0-rc.15
- `@vitejs/plugin-vue` 6.0.10
- `vite` 8.3.7
