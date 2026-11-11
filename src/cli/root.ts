import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

import { VaporfitError } from '#errors.ts';

export function resolveRoot(cwd: string, root: string | undefined): string {
  const full = path.resolve(cwd, root ?? '.');
  if (!existsSync(full) || !statSync(full).isDirectory()) {
    throw new VaporfitError('The root is missing.');
  }
  if (!existsSync(path.join(full, 'package.json'))) {
    throw new VaporfitError('package.json is missing.');
  }
  return full;
}
