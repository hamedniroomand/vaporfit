---
'vaporfit': minor
---

A library feature in the data can have `fixedInVue`, the first Vue version that fixes it. A project with that Vue version or a later one gets no finding for the feature. A project with an older Vue version keeps the finding, and the message adds a sentence such as "Vue `3.6.0-rc.15` fixes this." When vaporfit cannot read the Vue version of the project, it keeps the finding. The library table on the docs site shows the fix version. A note after a data message, also the existing note about a newer library version, now comes after a period.
