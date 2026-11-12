# vaporfit

## 0.2.0

### Minor Changes

- [#17](https://github.com/hamedniroomand/vaporfit/pull/17) [`a687a18`](https://github.com/hamedniroomand/vaporfit/commit/a687a18dffffc00b728d072d8ff8058655b2306e) - The page of `vaporfit ui` and `vaporfit report` has a new design. The summary shows each tier with a bar, the plugin state, the top blockers and the blocked components. The component list puts blocked components first, and you can search it and filter it by tier, verdict and rule. The page of one component groups the findings by rule and shows the chain and the links to the probes, issues and sources. The page uses the fonts and the colors of the docs site, and the filters are in the address of the page.

- [#14](https://github.com/hamedniroomand/vaporfit/pull/14) [`6b2dfd9`](https://github.com/hamedniroomand/vaporfit/commit/6b2dfd93ba529815c4b32a87c8c8b31d824e852c) - A library feature in the data can have `fixedInVue`, the first Vue version that fixes it. A project with that Vue version or a later one gets no finding for the feature. A project with an older Vue version keeps the finding, and the message adds a sentence such as "Vue `3.6.0-rc.15` fixes this." When vaporfit cannot read the Vue version of the project, it keeps the finding. The library table on the docs site shows the fix version. A note after a data message, also the existing note about a newer library version, now comes after a period.

- [#15](https://github.com/hamedniroomand/vaporfit/pull/15) [`1ee39d7`](https://github.com/hamedniroomand/vaporfit/commit/1ee39d79f779d0f8fa7fae80294879830f6e34f7) - Use Vue 3.6.0-rc.15. Vue 3.6.0-rc.15 fixes `as-child` in a Vapor component, so `reka-ui/as-child`, `reka-ui/as-child-other` and `radix-vue/as-child` give no finding for a project with Vue 3.6.0-rc.15 or later. A project with an older Vue version keeps the finding. Two new probes check `as-child` through a VDOM wrapper and on `TabsTrigger`. The 16 library rows that have probes, and the 10 rules with a probe or a source check, are verified with Vue 3.6.0-rc.15. The other rows and rules keep Vue 3.6.0-rc.14.

## 0.1.1

### Patch Changes

- [#9](https://github.com/hamedniroomand/vaporfit/pull/9) [`a4fcd1a`](https://github.com/hamedniroomand/vaporfit/commit/a4fcd1a620f5d4ac92822f52514160ca8d6fd5e1) - Read the `app.component()` registrations one time in each run, and parse only the files that can have them. A project with large generated or vendor files is faster to check.

- [#9](https://github.com/hamedniroomand/vaporfit/pull/9) [`a4fcd1a`](https://github.com/hamedniroomand/vaporfit/commit/a4fcd1a620f5d4ac92822f52514160ca8d6fd5e1) - The `vapor/async-setup` message now says `createVaporApp()` in place of Vapor. The probe shows the failure only in `createVaporApp()`, and the rule is for the pure tier only.

- [#9](https://github.com/hamedniroomand/vaporfit/pull/9) [`a4fcd1a`](https://github.com/hamedniroomand/vaporfit/commit/a4fcd1a620f5d4ac92822f52514160ca8d6fd5e1) - In a Nuxt project, do not examine the children and the top-level `await` of a component for the pure tier, because Nuxt supports interop mode only. The text report shows the Nuxt finding one time. The JSON report still has this finding for each component.

- [#9](https://github.com/hamedniroomand/vaporfit/pull/9) [`a4fcd1a`](https://github.com/hamedniroomand/vaporfit/commit/a4fcd1a620f5d4ac92822f52514160ca8d6fd5e1) - Read a props type that a component imports with a relative path. Before, the tool reported a compile error and the verdict `unknown` for this component. A props type from a path alias or a package still gives a compile error. In a long run, such as `vaporfit ui`, a changed type file is read again.

## 0.1.0

### Minor Changes

- [`f6bfc9b`](https://github.com/hamedniroomand/vaporfit/commit/f6bfc9bae0c7fa7816fed05970afe404270c68ec) - First release of the interop check, the router and i18n codemods, the read-only MCP server, the local UI, the static report, the Vite DevTools panel, and the pure Vapor tier.
