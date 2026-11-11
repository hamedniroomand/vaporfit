export { analyze } from '#analyze/analyze.ts';
export { analyzeFiles } from '#analyze/incremental.ts';
export { listComponents, getComponent } from '#report/query.ts';
export type {
  AnalyzeOptions,
  ComponentReport,
  Finding,
  Report,
  SourceLocation,
} from '#report/types.ts';
export { loadData } from '#data/load.ts';
export { SCHEMA_VERSION } from '#data/types.ts';
export type * from '#data/types.ts';
export { VaporfitError } from './errors.ts';
