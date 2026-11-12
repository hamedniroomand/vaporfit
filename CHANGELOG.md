# vaporfit

## 0.1.1

### Patch Changes

- [#9](https://github.com/hamedniroomand/vaporfit/pull/9) [`a4fcd1a`](https://github.com/hamedniroomand/vaporfit/commit/a4fcd1a620f5d4ac92822f52514160ca8d6fd5e1) - Read the `app.component()` registrations one time in each run, and parse only the files that can have them. A project with large generated or vendor files is faster to check.

- [#9](https://github.com/hamedniroomand/vaporfit/pull/9) [`a4fcd1a`](https://github.com/hamedniroomand/vaporfit/commit/a4fcd1a620f5d4ac92822f52514160ca8d6fd5e1) - The `vapor/async-setup` message now says `createVaporApp()` in place of Vapor. The probe shows the failure only in `createVaporApp()`, and the rule is for the pure tier only.

- [#9](https://github.com/hamedniroomand/vaporfit/pull/9) [`a4fcd1a`](https://github.com/hamedniroomand/vaporfit/commit/a4fcd1a620f5d4ac92822f52514160ca8d6fd5e1) - In a Nuxt project, do not examine the children and the top-level `await` of a component for the pure tier, because Nuxt supports interop mode only. The text report shows the Nuxt finding one time. The JSON report still has this finding for each component.

- [#9](https://github.com/hamedniroomand/vaporfit/pull/9) [`a4fcd1a`](https://github.com/hamedniroomand/vaporfit/commit/a4fcd1a620f5d4ac92822f52514160ca8d6fd5e1) - Read a props type that a component imports with a relative path. Before, the tool reported a compile error and the verdict `unknown` for this component. A props type from a path alias or a package still gives a compile error. In a long run, such as `vaporfit ui`, a changed type file is read again.

## 0.1.0

### Minor Changes

- [`f6bfc9b`](https://github.com/hamedniroomand/vaporfit/commit/f6bfc9bae0c7fa7816fed05970afe404270c68ec) - First release of the interop check, the router and i18n codemods, the read-only MCP server, the local UI, the static report, the Vite DevTools panel, and the pure Vapor tier.
