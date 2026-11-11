# Contributing

## Add a library

Add one JSON file under `data/libraries/`. The fields are listed in `data/README.md`. Use `__` in the file name where the package name has a `/`.

A maintainer statement needs a link. Put it in `declared`. The table shows that the row is declared, not tested. The statement does not set `works` by itself.

## Add a probe

Add a folder under `repros/`. The folder has `probe.mjs`. That file exports `check` and `expected`. `expected` is `breaks` or `works`.

`breaks` means the Vapor result and the VDOM result are different. `works` means the two results are equal. Each probe keeps a VDOM component that must work.

Point the `tested` evidence `probe` field at the folder, for example `repros/my-library-case`.

`vp run repros` installs each probe, builds it, and opens the build in Chrome. Pass folder names to run only those probes:

```sh
node repros/check.mjs my-library-case
```

## Source layout

Each folder in `src/` has one job. A folder imports only from the folders above it in this table. `test/layout.test.ts` checks this rule. The files in `src/` itself are the public entry and small shared helpers.

| Folder      | Job                                                                             |
| ----------- | ------------------------------------------------------------------------------- |
| `data/`     | Load and check the JSON files in `data/`                                        |
| `report/`   | The report types, the verdict and the summary                                   |
| `compiler/` | Load the Vue compiler of the project, or the compiler of the tool               |
| `syntax/`   | Read a script and a template into facts                                         |
| `project/`  | Read the project: manifest, Vue files, registries, plugin, coverage             |
| `rules/`    | The rules that need one file. `file-rules.ts` has the list                      |
| `link/`     | The rules that need more than one file, and the pure tier                       |
| `analyze/`  | Run the steps and build the report                                              |
| `format/`   | Print a report as text or JSON                                                  |
| `fix/`      | The codemods of `vaporfit fix`                                                  |
| `devframe/` | The UI, the static report and the MCP server. Only this folder imports Devframe |
| `cli/`      | The commands                                                                    |
| `site/`     | The rows of the tables on the docs site                                         |
| `upkeep/`   | The data checks and the weekly update                                           |

Import a file in the same folder with `./name.ts`. Import a file in a different folder with `#folder/name.ts`. A test imports a test helper with `#test/name.ts`.

A function has no more than four parameters. Put values that go together in one object, as `Project`, `FileContext` and `LinkContext` do.

### Add a rule

A rule that needs one file is a function `(file: FileContext) => Finding[]` in `src/rules/`. Add the function to the list in `src/rules/file-rules.ts`. A rule that needs more than one file is a function `(link: LinkContext, file: FileAnalysis) => PlacedFinding[]` in `src/link/`. Add it to the list in `src/link/link.ts`. Add the rule data in `data/rules/` and a test that fails without the rule.

## Run the tests

The tests read the installed packages of `test/fixtures/shadcn` and of each probe. Install them before the first run:

```sh
vp -C test/fixtures/shadcn install --frozen-lockfile -- --ignore-workspace
vp run repros
vp test
```

## Evidence for each status

`works`, `partial`, and `broken` need evidence in the same change. Evidence is a probe in `repros/`, a maintainer statement with a link, or an issue link.

A `works` status with an empty evidence list fails the data check:

```sh
vpx scripts/check-data.ts
```

`unknown` may have an empty evidence list.

## Correct a row

Each row of the library table has a link, "edit this row". That link opens the JSON file. You can also open an issue with the template "Correct the row of my library". The fields are package, version, statement, and link.

A pull request that changes `data/` runs the loader checks and the probes of the libraries in that change. The result is added to the pull request.

## Build the docs site

The site in `docs/` uses [VitePress](https://vitepress.dev). `vp run docs:dev` starts the site on your machine. `vp run docs:build` writes it to `docs/.vitepress/dist`.

Both commands first run `scripts/docs-data.ts`. That script writes the library table and the rule table into `docs/2.libraries.md` and `docs/3.rules.md` from the files in `data/`. Do not edit the tables by hand.

The demo in the README is `docs/public/demo.gif`. To make it again, install [vhs](https://github.com/charmbracelet/vhs) and run `vp run build && vhs docs/demo.tape`.
