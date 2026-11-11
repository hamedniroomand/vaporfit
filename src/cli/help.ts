export const helpText = `Usage: vaporfit [command] [options]

Check a Vue project before you add vapor.

Commands:
  check            Check the project. This is the default
  fix              Print the changes. Add --write to write the files
  ui               Open the local report
  report           Write a static report. Use --out
  mcp              Serve the report to an agent over stdio
  help             Show this help

Options:
  --i18n           Change $t, $d, $n, $te, and $tm to useI18n(). Use this option only with fix
  --json           Print the JSON report
  --out <dir>      Write the static report in this directory. Use this option only with report
  --root <dir>     Set the project root. The default is the current directory
  --router         Change $route and $router to useRoute() and useRouter(). Use this option only with fix
  --strict         Exit with 1 for each blocked component
  --write          Write the files. Use this option only with fix
  --version, -v    Print the version
  --help, -h       Show this help

Exit codes:
  0  No component that has vapor is blocked. The plugin finding is not an error
  1  A component that has vapor is blocked, or the plugin finding is an error, or --strict finds a blocked component
  2  The input is not valid
`;
