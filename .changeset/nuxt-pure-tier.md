---
'vaporfit': patch
---

In a Nuxt project, do not examine the children and the top-level `await` of a component for the pure tier, because Nuxt supports interop mode only. The text report shows the Nuxt finding one time. The JSON report still has this finding for each component.
