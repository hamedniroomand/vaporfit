---
'vaporfit': minor
---

Use Vue 3.6.0-rc.15. Vue 3.6.0-rc.15 fixes `as-child` in a Vapor component, so `reka-ui/as-child`, `reka-ui/as-child-other` and `radix-vue/as-child` give no finding for a project with Vue 3.6.0-rc.15 or later. A project with an older Vue version keeps the finding. Two new probes check `as-child` through a VDOM wrapper and on `TabsTrigger`. The 16 library rows that have probes, and the 10 rules with a probe or a source check, are verified with Vue 3.6.0-rc.15. The other rows and rules keep Vue 3.6.0-rc.14.
