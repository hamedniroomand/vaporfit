---
description: Reports for the trackers of Vue libraries. Each report shows one feature that stops in a Vapor component, with the versions, the probe and the cause.
---

# Upstream reports

Each page is a report for the tracker of one library.
Each report shows one feature that stops in a Vapor component.

Each report has these sections:

- the versions of the packages
- the probe in `repros/`
- the steps
- the expected result
- the actual result
- the cause, with a link to the source

A probe has a Vapor component and a VDOM component.
The only difference is the `vapor` attribute.

| Report                                                           | Library      |
| ---------------------------------------------------------------- | ------------ |
| [`v-loading` does nothing](/upstream/element-plus-v-loading)     | Element Plus |
| [`v-tooltip` does nothing](/upstream/floating-vue-v-tooltip)     | floating-vue |
| [`v-tooltip` does nothing](/upstream/primevue-v-tooltip)         | PrimeVue     |
| [`as-child` does nothing](/upstream/reka-ui-as-child)            | Reka UI      |
| [`v-t` renders nothing](/upstream/vue-i18n-v-t)                  | vue-i18n     |
| [An object directive is skipped](/upstream/vue-object-directive) | Vue          |
