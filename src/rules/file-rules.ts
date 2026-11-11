import type { Finding } from '#report/types.ts';

import { compilerFindings } from './compiler-diagnostics.ts';
import type { FileContext } from './context.ts';
import { directiveFindings } from './directives.ts';
import { nameFindings } from './global-names.ts';
import { importFindings, propFindings } from './library-features.ts';
import { localRefFindings } from './local-refs.ts';
import { callFindings } from './script-calls.ts';

export type FileRule = (file: FileContext) => Finding[];

/** Each rule that reads one file. To add a rule, write the function and add it to this list. */
export const FILE_RULES: readonly FileRule[] = [
  compilerFindings,
  directiveFindings,
  propFindings,
  importFindings,
  nameFindings,
  callFindings,
  localRefFindings,
];
