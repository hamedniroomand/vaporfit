---
navigation:
  title: 'Vue: object directive'
description: 'A report for Vue. A Vapor template skips an object directive. A development build warns and a production build does not.'
---

# Vue: an object directive is skipped in a Vapor component, and production prints nothing

Tracker search on 2026-11-10: no open `vuejs/core` issue asks for a signal when Vapor skips an object directive. These closed issues are a different defect: https://github.com/vuejs/core/issues/15157 and https://github.com/vuejs/core/issues/15253. The open Vapor roadmap is https://github.com/vuejs/core/issues/13687.

## Versions

- `vue` 3.6.0-rc.14
- `@vitejs/plugin-vue` 6.0.10
- `vite` 8.3.7

## Probe

`repros/vue-object-directive`

## Steps

The folder defines a local object directive. `src/VaporCase.vue` and `src/VdomCase.vue` use it. The only difference is the `vapor` attribute. The app uses `createApp()` with `vaporInteropPlugin`.

```sh
pnpm install
pnpm build
pnpm preview
```

Open the built page. Compare the text of the two components. The build is a production build.

## Expected

The text is "directive ran", or the production build prints a warning that the directive was skipped.

## Actual

The Vapor text is "directive did not run". The build prints nothing. The production console is empty. A development build warns. A production build does not.

## Cause

The skip is in Vue. I read `packages/runtime-vapor/src/directives/custom.ts` at tag `v3.6.0-rc.14`.

https://github.com/vuejs/core/blob/v3.6.0-rc.14/packages/runtime-vapor/src/directives/custom.ts#L207-L218

Line 207 checks `isFunction(dir)`. An object directive fails that check. Line 209 calls `warn` with `Received a VDOM object directive`, and that call sits inside `if (__DEV__)`. Line 218 is `continue`, and that line runs in production too, so the directive is skipped and the production build prints nothing.
