---
navigation:
  title: 'PrimeVue: v-tooltip'
description: 'A report for PrimeVue. In a Vapor component, `v-tooltip` shows no tooltip and the console has no directive warning.'
---

# PrimeVue: `v-tooltip` does nothing in a Vapor component

Tracker search on 2026-11-10: no open `primefaces/primevue` issue describes `v-tooltip` in a Vapor component. The open tooltip issues there are about other tooltip behavior.

## Versions

- `vue` 3.6.0-rc.14
- `primevue` 5.0.4
- `@vitejs/plugin-vue` 6.0.10
- `vite` 8.3.7

## Probe

`repros/primevue-v-tooltip`

## Steps

`src/VaporCase.vue` and `src/VdomCase.vue` use `v-tooltip`. The only difference is the `vapor` attribute. The app uses `createApp()` with `vaporInteropPlugin`.

```sh
pnpm install
pnpm build
pnpm preview
```

Open the page. Hover each target.

## Expected

The tooltip shows on hover.

## Actual

The Vapor component shows no tooltip. The console has the PrimeVue license warning and no directive warning.

## Cause

`primevue@5.0.4` publishes `tooltip/index.mjs`. I read that file. Line 23 is `var Tooltip = BaseTooltip.extend('tooltip', {` and line 24 is `beforeMount`. That is an object directive.

The package metadata points at `primefaces/primevue-nextchapter`. That tag was not available when this file was written, so the line citation is the published file:

`primevue@5.0.4` `tooltip/index.mjs` line 24.

Vapor skips the object. I read Vue `packages/runtime-vapor/src/directives/custom.ts` at tag `v3.6.0-rc.14`. Line 207 requires a function. Line 209 warns only inside `if (__DEV__)`. Line 218 is `continue`:

https://github.com/vuejs/core/blob/v3.6.0-rc.14/packages/runtime-vapor/src/directives/custom.ts#L207-L218
