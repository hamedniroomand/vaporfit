# Sample apps

These apps are the real projects for the CLI tests. The test runs `vaporfit` on each vendored tree. This folder is not a pnpm workspace package. `pnpm-workspace.yaml` does not list it. `node_modules` is not committed.

## Element Plus

Vendored from the Vite playground at `play/` in [element-plus/element-plus](https://github.com/element-plus/element-plus).

- URL: `https://github.com/element-plus/element-plus`
- Commit: `6e6f3149e23872ffb68e49babeef7a4cbb188dcf`
- Path in that commit: `play/`
- Pin file: `apps/element-plus-example/PIN`
- Source size: about 6 KB. The tree is small enough to commit.

`play/src/App.vue` is not in the commit. `scripts/init.mjs` copies `app.example.vue` to `src/App.vue` on install. The committed example is `app.example.vue`.

## PrimeVue

Not vendored.

- URL: `https://github.com/primefaces/primevue`
- Commit checked: `36965f13dc40597deeb16192a8568308cbeb70d9` (`master`, 2026-09-24)
- `apps/` contains `showcase` and `volt`. Both are Nuxt apps (`nuxt dev`, `nuxt build`).
- The repository has no `examples/` directory.
- The tree at that commit has no `vite.config.js`, `vite.config.mjs`, or `vite.config.ts`.

The task asks for a Vite Vue app under `apps/` or `examples/`. This commit does not have one, so there is no PrimeVue tree and no PrimeVue pin.
