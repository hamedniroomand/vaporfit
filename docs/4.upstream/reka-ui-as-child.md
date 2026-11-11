---
navigation:
  title: 'Reka UI: as-child'
description: 'A report for Reka UI. With `as-child`, the Vapor button has no attributes and no listener, and there is no Vue warning.'
---

# Reka UI: `as-child` does nothing in a Vapor component

Tracker search on 2026-11-10: no open `unovue/reka-ui` issue describes `as-child` in a Vapor component. The open Vapor issue there is about bundle size, not this behavior: https://github.com/unovue/reka-ui/issues/3018. The same symptom is already open in other repositories: https://github.com/nuxt/ui/issues/6395 and https://github.com/unovue/shadcn-vue/issues/2006. This draft is a new report for Reka UI.

## Versions

- `vue` 3.6.0-rc.14
- `reka-ui` 2.11.0
- `@vitejs/plugin-vue` 6.0.10
- `vite` 8.3.7

## Probe

`repros/reka-ui-as-child`

## Steps

The folder has two components with the same content. The only difference is the `vapor` attribute on `<script setup>`. The app uses `createApp()` with `vaporInteropPlugin`.

```sh
pnpm install
pnpm build
pnpm preview
```

Open the page. Compare the VDOM button and the Vapor button. Click each one.

## Expected

The button has `aria-haspopup="dialog"`, and a click opens the dialog.

## Actual

The Vapor button has no attributes and no listener. A click does nothing. The console is empty. There is no Vue warning.

## Cause

The cause is in Reka UI `Slot`, not in a Vue warning. `Slot` merges props and then copies the child vnode:

https://github.com/unovue/reka-ui/blob/v2.11.0/packages/core/src/Primitive/Slot.ts#L29

Line 29 at tag `v2.11.0` is `const cloned = cloneVNode({ ...firstNonCommentChildren, props: {} }, mergedProps)`. Lines 26 to 28 build `mergedProps` with `mergeProps`. That path uses VDOM vnodes. The probe shows that a Vapor child does not receive the attributes or the listener.
