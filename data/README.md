# Data files

Schema version 0 is unstable.

Each file is JSON.
Each file has the field `schemaVersion`.
The value of `schemaVersion` is `0`.
The directory `rules` has one file for each rule.
The directory `libraries` has one file for each library.
The loader rejects a file when a field is missing.
The loader rejects a file when a field has the wrong type.

## Rule file

| Field           | Content                                                    |
| --------------- | ---------------------------------------------------------- |
| `schemaVersion` | `0`                                                        |
| `id`            | A string. The id is stable.                                |
| `title`         | A string.                                                  |
| `tiers`         | A list. Each item is `interop` or `pure`.                  |
| `failure`       | `compile`, `runtime-error`, `silent`, or `none`.           |
| `detection`     | `static`, `data`, or `none`.                               |
| `fix`           | A string or `null`. `null` means that the rule has no fix. |
| `verified.vue`  | A string. The string is the Vue version of the check.      |
| `verified.date` | A string. The string is the date of the check.             |
| `sources`       | A list of strings. Each string is a URL.                   |

A rule file has no field `verified.version`.

## Library file

| Field              | Content                                                                   |
| ------------------ | ------------------------------------------------------------------------- |
| `schemaVersion`    | `0`                                                                       |
| `package`          | A string. The string is the package name.                                 |
| `repository`       | A string. The string is the repository URL.                               |
| `verified.version` | A string. The string is the library version of the check.                 |
| `verified.vue`     | A string. The string is the Vue version of the check.                     |
| `verified.date`    | A string. The string is the date of the check.                            |
| `declared`         | An object or `null`. `null` means that the maintainers made no statement. |
| `interop.status`   | `works`, `partial`, `broken`, or `unknown`.                               |
| `interop.evidence` | A list of evidence objects.                                               |
| `pure`             | An object or absent. The object has the same fields as `interop`.         |
| `features`         | A list of feature objects.                                                |
| `notes`            | A string. This field can be absent.                                       |

### Maintainer statement

The field `declared` has these fields.

| Field   | Content                                                               |
| ------- | --------------------------------------------------------------------- |
| `scope` | `full`, `partial`, or `interop-only`.                                 |
| `since` | A string or `null`. The string is the first version in the statement. |
| `url`   | A string. The string is the URL of the statement.                     |
| `quote` | A string. The string is the maintainer text.                          |

`full` means that the statement covers the library.
`partial` means that the statement covers only some parts.
`interop-only` means that the statement covers only the interop tier.

### Pure object

The field `pure` can be absent.
When `pure` is present, it has the field `status`.
The value is `works`, `partial`, `broken`, or `unknown`.
When `pure` is present, it has the field `evidence`.
`evidence` is a list of evidence objects.
The two fields use the same values as `interop.status` and `interop.evidence`.

### Feature

| Field        | Content                                                     |
| ------------ | ----------------------------------------------------------- |
| `id`         | A string.                                                   |
| `status`     | `works`, `partial`, `broken`, or `unknown`.                 |
| `failure`    | `compile`, `runtime-error`, `silent`, or `none`.            |
| `message`    | A string.                                                   |
| `evidence`   | A list of evidence objects.                                 |
| `fixedIn`    | A string or `null`. `null` means that no version has a fix. |
| `match.kind` | `directive`, `globalProperty`, `prop`, or `import`.         |

`directive` has the fields `name`, `export`, and `from`.
`name` is a string.
`export` is a string or `null`.
`from` is a string.
The string is the package name.

`globalProperty` has the field `names`.
`names` is a list of strings.

`prop` has the fields `name` and `from`.
`prop` can have the field `components`.
`components` is a list of strings.
This field can be absent.
Each string is a component name.

`import` has the fields `names` and `from`.
`names` is a list of strings.
`from` is a string.

## Evidence

Each evidence object has the field `level`.
The value of `level` is `declared`, `tested`, `issue`, or `source`.

### tested

| Field         | Content                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| `depth`       | `D0`, `D1`, `D2`, or `D3`.                                                                             |
| `environment` | A string. The string names the place of the test.                                                      |
| `probe`       | A string or `null`. The string is the path of the probe. `null` means that the test has no probe file. |
| `what`        | A string. This field can be absent. The string says what the test did.                                 |

### issue

| Field   | Content                                |
| ------- | -------------------------------------- |
| `url`   | A string. The string is the issue URL. |
| `state` | A string. The files use `open`.        |

### source

| Field | Content                                 |
| ----- | --------------------------------------- |
| `url` | A string. The string is the source URL. |

### declared

No file uses the level `declared`.
The loader requires no other field for this level.
The library field `declared` holds the maintainer statement.

## Depth scale

`D0` means that the behavior is not tested.
`D1` means one mount and one interaction.
`D2` means a feature matrix in a browser.
The matrix has props, events, and `v-model`.
The matrix has slots and scoped slots.
The matrix has provide and inject.
The matrix has teleport and transition.
The matrix has template refs and directives.
`D3` means the `D2` tests.
`D3` also means SSR with hydration.
`D3` also means a production build.
The field `environment` names the place of the test.
The place is not part of the depth value.
