# Top-level await in a Vapor component

`src/VdomInner.vue` has top-level `await` in `<script setup>`.
`src/VdomCase.vue` renders that component inside `<Suspense>`.
The VDOM app uses `createApp()`.
`src/VaporCase.vue` has the same `await` and the `vapor` attribute.
The Vapor app uses `createVaporApp()`.

## Steps

```sh
pnpm install
pnpm build
pnpm preview
```

Open the page and compare the two components.

## Expected

Both components show "ready", or the build gives a warning.

## Actual, in Chrome 156

`vite build` succeeds.
The VDOM component shows "ready".
The Vapor component renders nothing.
The page error is `Cannot read properties of null (reading 'anchor')`.

## Versions

- `vue` 3.6.0-rc.14
- `@vitejs/plugin-vue` 6.0.10
- `vite` 8.3.7
