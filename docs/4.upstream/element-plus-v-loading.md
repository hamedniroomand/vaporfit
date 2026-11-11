---
navigation:
  title: 'Element Plus: v-loading'
description: 'A report for Element Plus. In a Vapor component, `v-loading` shows no loading mask and the console is empty.'
---

# Element Plus: `v-loading` does nothing in a Vapor component

Tracker search on 2026-11-10: no open `element-plus/element-plus` issue describes `v-loading` in a Vapor component. https://github.com/element-plus/element-plus/issues/21886 is closed, and it asks about a Vapor plan in general. https://github.com/element-plus/element-plus/issues/6706 is open, and it is about `v-loading` with `el-dialog`, not Vapor.

## Versions

- `vue` 3.6.0-rc.14
- `element-plus` 2.14.8
- `@vitejs/plugin-vue` 6.0.10
- `vite` 8.3.7

## Probe

`repros/element-plus-v-loading`

## Steps

`src/VaporCase.vue` and `src/VdomCase.vue` use `v-loading`. The only difference is the `vapor` attribute. The app uses `createApp()` with `vaporInteropPlugin`.

```sh
pnpm install
pnpm build
pnpm preview
```

Open the page and compare the loading mask on the two components.

## Expected

The loading mask shows on the element.

## Actual

The Vapor component has no loading mask. The console is empty.

## Cause

`vLoading` is an object directive. At tag `2.14.8`, line 77 starts the object and line 78 is the `mounted` hook:

https://github.com/element-plus/element-plus/blob/2.14.8/packages/components/loading/src/directive.ts#L77-L78

Vapor skips that object. I read Vue `packages/runtime-vapor/src/directives/custom.ts` at tag `v3.6.0-rc.14`. Line 207 requires a function. Line 209 warns only inside `if (__DEV__)`. Line 218 is `continue`, so production skips the directive and prints nothing:

https://github.com/vuejs/core/blob/v3.6.0-rc.14/packages/runtime-vapor/src/directives/custom.ts#L207-L218
