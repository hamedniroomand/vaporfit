import type { CompiledFile } from '#compiler/vue-compiler.ts';
import type { Project } from '#project/project.ts';
import type { SourceLocation } from '#report/types.ts';
import { locationAt } from '#syntax/position.ts';
import type { ScriptFacts } from '#syntax/script.ts';
import type { TemplateFacts } from '#syntax/template.ts';

export interface FileContext {
  project: Project;
  id: string;
  source: string;
  compiled: CompiledFile;
  facts: ScriptFacts;
  template: TemplateFacts;
}

export function locate(file: Pick<FileContext, 'id' | 'source'>, offset: number): SourceLocation {
  return locationAt(file.id, file.source, offset);
}
