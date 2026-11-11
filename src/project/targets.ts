import type { VueCompiler } from '#compiler/vue-compiler.ts';

export type TagTarget =
  | { kind: 'file'; file: string }
  | { kind: 'package'; imported: string; source: string };

/** Adds a target under its name and its PascalCase name. The first target of a name stays. */
export function remember(
  map: Map<string, TagTarget>,
  name: string,
  target: TagTarget,
  compiler: VueCompiler,
): void {
  const pascal = compiler.capitalize(compiler.camelize(name));
  if (!map.has(name)) map.set(name, target);
  if (!map.has(pascal)) map.set(pascal, target);
}
