---
navigation:
  title: 'floating-vue: v-tooltip'
description: 'A report for floating-vue. In a Vapor component, `v-tooltip` shows no tooltip and the console is empty.'
---

# floating-vue: `v-tooltip` does nothing in a Vapor component

Tracker search on 2026-11-10: no open `Akryum/floating-vue` issue describes `v-tooltip` in a Vapor component. The open tooltip issues there are about placement, overflow, and hover state.

## Versions

- `vue` 3.6.0-rc.14
- `floating-vue` 5.4.0
- `@vitejs/plugin-vue` 6.0.10
- `vite` 8.3.7

## Probe

`repros/floating-vue-v-tooltip`

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

The Vapor component shows no tooltip. The console is empty.

## Cause

`vTooltip` is an object directive. At tag `v5.4.0`, lines 151 to 157 are the object, and line 152 is `beforeMount: bind`:

https://github.com/Akryum/floating-vue/blob/v5.4.0/packages/floating-vue/src/directives/v-tooltip.ts#L151-L157

Vapor skips that object. I read Vue `packages/runtime-vapor/src/directives/custom.ts` at tag `v3.6.0-rc.14`. Line 207 requires a function. Line 209 warns only inside `if (__DEV__)`. Line 218 is `continue`:

https://github.com/vuejs/core/blob/v3.6.0-rc.14/packages/runtime-vapor/src/directives/custom.ts#L207-L218
