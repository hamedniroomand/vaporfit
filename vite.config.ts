import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: [
    {
      deps: {
        // tsdown <0.23 compatibility: resolve external dependency subpaths.
        // Remove to preserve subpath imports as written (the new default).
        // https://tsdown.dev/options/dependencies#deps-resolvedepsubpath
        resolveDepSubpath: true,
        // Subpaths stay external too. `npx vaporfit` does not download the MCP packages.
        neverBundle: [
          /^devframe(\/|$)/,
          /^@devframes\//,
          /^@modelcontextprotocol\//,
          /^@vitejs\/devtools-kit(\/|$)/,
        ],
      },
      entry: ['src/index.ts', 'src/cli/main.ts', 'src/devtools.ts'],
      format: ['esm'],
      dts: true,
      platform: 'node',
    },
    // The host of the local report. It has devframe inside, because the main build keeps
    // devframe external. The packages in `dependencies` stay external.
    {
      entry: ['src/devframe/host.ts'],
      outDir: 'dist/host',
      format: ['esm'],
      dts: false,
      platform: 'node',
    },
  ],
  staged: {
    '*': 'vp check --fix',
  },
  fmt: {
    arrowParens: 'avoid',
    sortTailwindcss: true,
    experimentalOperatorPosition: 'end',
    bracketSameLine: false,
    bracketSpacing: true,
    embeddedLanguageFormatting: 'auto',
    endOfLine: 'lf',
    // The first slash keeps a pattern at the repository root. `apps` alone also hides `test/apps`.
    ignorePatterns: ['/apps', '/repros', 'test/fixtures'],
    insertFinalNewline: true,
    jsxSingleQuote: false,
    objectWrap: 'preserve',
    printWidth: 100,
    proseWrap: 'preserve',
    quoteProps: 'as-needed',
    semi: true,
    singleAttributePerLine: true,
    singleQuote: true,
    sortImports: {
      internalPattern: ['#'],
    },
    sortPackageJson: true,
    tabWidth: 2,
    trailingComma: 'all',
    useTabs: false,
    vueIndentScriptAndStyle: true,
  },
  lint: {
    ignorePatterns: [
      'commitlint.config.js',
      'vite.config.ts',
      // The first slash keeps a pattern at the repository root. `apps` alone also hides `test/apps`.
      '/apps',
      '/repros',
      'test/fixtures',
      'ui',
      'ui/vite.config.ts',
      'docs/.docs',
    ],
    categories: {
      correctness: 'error',
      perf: 'error',
      restriction: 'error',
      nursery: 'error',
      pedantic: 'error',
    },
    jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    options: { typeAware: true, typeCheck: true },
    plugins: ['vue', 'import', 'oxc', 'promise', 'unicorn', 'typescript', 'eslint', 'vitest'],
    rules: {
      'vitest/no-conditional-in-test': 'off',
      'vitest/require-test-timeout': 'off',
      'vite-plus/prefer-vite-plus-imports': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],
      'prefer-template': 'error',
      'object-shorthand': 'error',
      'typescript/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      'import/first': 'error',
      'import/no-duplicates': 'error',
      'import/no-mutable-exports': 'error',
      'unicorn/prefer-includes': 'error',
      'unicorn/prefer-string-starts-ends-with': 'error',
      'unicorn/throw-new-error': 'error',
      'unicorn/error-message': 'error',
      'oxc/no-optional-chaining': 'off',
      'oxc/no-async-await': 'off',
      'oxc/no-rest-spread-properties': 'off',
      'no-undefined': 'off',
      'typescript/prefer-readonly-parameter-types': 'off',
      unambiguous: 'off',
      'max-params': ['error', { max: 4 }],
      'no-use-before-define': ['error', { functions: false, classes: true, variables: true }],
    },
  },
  run: {
    cache: true,
    tasks: {
      'docs:install': { command: 'vp -C docs install', cache: false },
      'docs:dev': { command: 'vpx scripts/docs-dev.ts', cache: false },
      'docs:build': {
        command: [
          'vpx scripts/docs-data.ts',
          'vp -C docs exec undocs build',
          'vpx scripts/docs-sitemap.ts',
        ],
        cache: false,
      },
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
  },
});
