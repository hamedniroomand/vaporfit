import path from 'node:path';

import { packageRoot } from '#package-root.ts';

export function uiDirectory(): string {
  return path.join(packageRoot(), 'dist/ui');
}
