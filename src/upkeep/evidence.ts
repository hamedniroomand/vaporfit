import { VaporfitError } from '#errors.ts';

import { readLibraries } from './probes.ts';

export function worksWithoutEvidence(dataDirectory: string): string[] {
  const problems: string[] = [];
  for (const row of readLibraries(dataDirectory)) {
    if (row.library.interop.status === 'works' && row.library.interop.evidence.length === 0) {
      problems.push(`${row.file}: interop.status is works and evidence is empty`);
    }
    for (const feature of row.library.features) {
      if (feature.status === 'works' && feature.evidence.length === 0) {
        problems.push(`${row.file}: ${feature.id} status is works and evidence is empty`);
      }
    }
  }
  return problems;
}

export function assertWorksHasEvidence(dataDirectory: string): void {
  const problems = worksWithoutEvidence(dataDirectory);
  if (problems.length === 0) return;
  throw new VaporfitError(problems.join('\n'));
}
