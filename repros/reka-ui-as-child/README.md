# Reka UI: `as-child` does nothing in a Vapor component

`src/VdomCase.vue` and `src/VaporCase.vue` have the same content. The only difference is the `vapor` attribute on `<script setup>`.
The app uses `createApp()` with `vaporInteropPlugin`.

## Steps

```sh
pnpm install
pnpm build
pnpm preview
```

Open the page and compare the two components.

## Expected

The button gets `aria-haspopup="dialog"` and `data-state`, and a click opens the dialog.

## Actual, in the Vapor component

The button gets no attributes and no listener. A click does nothing. The console is empty.

## Versions

- `vue` 3.6.0-rc.14
- `reka-ui` 2.11.0
- `@vitejs/plugin-vue` 6.0.10
- `vite` 8.3.7


1 → 2026-11-10-vaporfit-0.1-design.md (start now)

2 → 2026-11-10-vaporfit-release-and-launch-design.md (runs beside 0.1, not after it; the repository must be public before the table ships)

3 → 2026-11-10-vaporfit-data-upkeep-design.md (starts with the first public table; needs 0.1 WP1)

4 → 2026-11-10-vaporfit-0.2-codemods-mcp-design.md (after 0.1 is released). This replaces ...0.2-pure-tier-codemods-mcp-design.md, which I deleted when you moved the pure tier out.

Not in the sequence, each starts only on your decision:

- 2026-11-10-vaporfit-0.3-devframe-ui-design.md is parked until after real usage.
- 2026-11-10-vaporfit-pure-tier-design.md waits for a library that ships Vapor components.

