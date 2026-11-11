# Prepares the shell for docs/demo.tape. Source it from the repository root after `vp run build`.
# The demo runs this checkout on the project in test/fixtures/shadcn.

repo=$PWD
npx() {
  shift
  node "$repo/dist/cli/main.mjs" "$@"
}
cd test/fixtures/shadcn
PS1='❯ '
clear
