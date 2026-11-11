---
navigation:
  title: 'vue-i18n: v-t'
description: 'A report for vue-i18n. In a Vapor component, `v-t` leaves the element empty and the console is empty.'
---

# vue-i18n: `v-t` renders nothing in a Vapor component

Tracker search on 2026-11-10: no open `intlify/vue-i18n` issue describes `v-t` in a Vapor component. These closed issues are about other Vapor behavior: https://github.com/intlify/vue-i18n/issues/2234 and https://github.com/intlify/vue-i18n/issues/2573.

## Versions

- `vue` 3.6.0-rc.14
- `vue-i18n` 11.4.18
- `@vitejs/plugin-vue` 6.0.10
- `vite` 8.3.7

## Probe

`repros/vue-i18n-v-t`

## Steps

`src/VaporCase.vue` and `src/VdomCase.vue` use `v-t`. The only difference is the `vapor` attribute. The app uses `createApp()` with `vaporInteropPlugin`.

```sh
pnpm install
pnpm build
pnpm preview
```

Open the page and compare the text of the two elements.

## Expected

The text is "Hello".

## Actual

The Vapor element is empty. The console is empty.

## Cause

`vTDirective` returns an object directive. The function is marked deprecated and scheduled for removal in vue-i18n v12. At tag `v11.4.18`, lines 155 to 158 return `created`, `unmounted`, and `beforeUpdate`:

https://github.com/intlify/vue-i18n/blob/v11.4.18/packages/vue-i18n-core/src/directive.ts#L155-L158

Vapor skips that object. I read Vue `packages/runtime-vapor/src/directives/custom.ts` at tag `v3.6.0-rc.14`. Line 207 requires a function. Line 209 warns only inside `if (__DEV__)`. Line 218 is `continue`:

https://github.com/vuejs/core/blob/v3.6.0-rc.14/packages/runtime-vapor/src/directives/custom.ts#L207-L218
