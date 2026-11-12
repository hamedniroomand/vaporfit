---
'vaporfit': patch
---

Read a props type that a component imports with a relative path. Before, the tool reported a compile error and the verdict `unknown` for this component. A props type from a path alias or a package still gives a compile error. In a long run, such as `vaporfit ui`, a changed type file is read again.
