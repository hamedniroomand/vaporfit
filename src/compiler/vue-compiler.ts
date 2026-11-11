import * as toolCore from '@vue/compiler-core';
import * as toolSfc from '@vue/compiler-sfc';
import * as toolVapor from '@vue/compiler-vapor';

import type { CompilerSource } from '#report/types.ts';
import { isVue36OrLater } from '#semver.ts';

import {
  diagnosticText,
  loadProjectModules,
  loadToolShared,
  packageVersion,
  probeOptionsMessage,
  readVueVersion,
} from './host.ts';

export interface SourcePoint {
  line: number;
  column: number;
  offset: number;
}

export interface ScriptBlock {
  content: string;
  loc: { start: SourcePoint };
}

interface TemplateNode {
  type: number;
  tag?: string;
  tagType?: number;
  loc: { start: SourcePoint; source?: string };
  props?: TemplateNode[];
  children?: TemplateNode[];
  name?: string;
  content?: string;
  isStatic?: boolean;
  exp?: TemplateNode | null;
  arg?: TemplateNode | null;
  modifiers?: TemplateNode[];
  value?: { content: string; loc: { start: SourcePoint } } | null;
}

interface Descriptor {
  vapor?: boolean;
  template: (ScriptBlock & { ast?: TemplateNode; content: string }) | null;
  script: ScriptBlock | null;
  scriptSetup: ScriptBlock | null;
  styles: { module?: boolean | string }[];
}

export interface SfcModule {
  parse: (
    source: string,
    options?: { filename?: string },
  ) => {
    descriptor: Descriptor;
    errors: unknown[];
  };
  compileScript: (
    descriptor: Descriptor,
    options: { id: string; vapor?: boolean; inlineTemplate?: boolean },
  ) => { bindings?: Record<string, string> };
  compileTemplate: (options: {
    source: string;
    filename: string;
    id: string;
    vapor?: boolean;
    ast?: TemplateNode;
    compilerOptions?: { bindingMetadata?: Record<string, string> };
  }) => { code: string; tips: string[]; errors: unknown[] };
}

export interface VaporModule {
  VaporErrorCodes?: { X_V_MEMO_NOT_SUPPORTED?: number; X_VNODE_HOOKS_NOT_SUPPORTED?: number };
  VaporErrorMessages?: Record<number, string>;
}

export interface SharedModule {
  isGloballyAllowed: (name: string) => boolean;
  isBuiltInDirective: (name: string) => boolean;
  isHTMLTag: (name: string) => boolean;
  isSVGTag: (name: string) => boolean;
  isMathMLTag: (name: string) => boolean;
  isBuiltInTag: (name: string) => boolean;
  camelize: (value: string) => string;
  capitalize: (value: string) => string;
}

export interface CoreModule {
  NodeTypes: {
    ELEMENT: number;
    INTERPOLATION: number;
    ATTRIBUTE: number;
    DIRECTIVE: number;
    SIMPLE_EXPRESSION: number;
  };
  ElementTypes: { ELEMENT: number; COMPONENT: number };
}

export interface TextDiagnostic {
  message: string;
  line: number;
  column: number;
}

export interface CompiledFile {
  vapor: boolean;
  script: { content: string; offset: number } | null;
  setup: { content: string; offset: number } | null;
  template: TemplateNode | null;
  moduleStyle: boolean;
  bindings: Record<string, string>;
  code: string;
  vaporTips: string[];
  baselineTips: string[];
  vaporErrors: TextDiagnostic[];
  baselineErrors: TextDiagnostic[];
  parseErrors: TextDiagnostic[];
}

export interface VueCompiler {
  source: CompilerSource;
  version: string;
  vue: string | null;
  optionsMessage: string;
  memoMessage: string | null;
  hookMessage: string | null;
  isGloballyAllowed: (name: string) => boolean;
  isBuiltInDirective: (name: string) => boolean;
  isHTMLTag: (name: string) => boolean;
  isSVGTag: (name: string) => boolean;
  isMathMLTag: (name: string) => boolean;
  isBuiltInTag: (name: string) => boolean;
  camelize: (value: string) => string;
  capitalize: (value: string) => string;
  node: {
    element: number;
    interpolation: number;
    attribute: number;
    directive: number;
    simple: number;
  };
  element: { element: number; component: number };
  compile: (source: string, filename: string, id: string) => CompiledFile;
}

export type { TemplateNode };

export function loadCompiler(root: string): VueCompiler {
  const vue = readVueVersion(root);
  if (vue !== null && vue.length > 0 && isVue36OrLater(vue)) {
    const project = loadProjectModules(root);
    if (project) return buildCompiler('project', vue, vue, project);
  }
  return buildCompiler('tool', packageVersion('@vue/compiler-sfc'), vue, {
    core: toolCore as unknown as CoreModule,
    sfc: toolSfc as unknown as SfcModule,
    shared: loadToolShared(),
    vapor: toolVapor as unknown as VaporModule,
  });
}

function buildCompiler(
  source: CompilerSource,
  version: string,
  vue: string | null,
  modules: { sfc: SfcModule; vapor: VaporModule; shared: SharedModule; core: CoreModule },
): VueCompiler {
  const memoCode = modules.vapor.VaporErrorCodes?.X_V_MEMO_NOT_SUPPORTED;
  const hookCode = modules.vapor.VaporErrorCodes?.X_VNODE_HOOKS_NOT_SUPPORTED;
  const messages = modules.vapor.VaporErrorMessages ?? {};
  return {
    camelize: modules.shared.camelize,
    capitalize: modules.shared.capitalize,
    compile: (fileSource, filename, id) => compileFile(modules.sfc, fileSource, filename, id),
    element: {
      component: modules.core.ElementTypes.COMPONENT,
      element: modules.core.ElementTypes.ELEMENT,
    },
    hookMessage: hookCode === undefined ? null : (messages[hookCode] ?? null),
    isBuiltInDirective: modules.shared.isBuiltInDirective,
    isBuiltInTag: modules.shared.isBuiltInTag,
    isGloballyAllowed: modules.shared.isGloballyAllowed,
    isHTMLTag: modules.shared.isHTMLTag,
    isMathMLTag: modules.shared.isMathMLTag,
    isSVGTag: modules.shared.isSVGTag,
    memoMessage: memoCode === undefined ? null : (messages[memoCode] ?? null),
    node: {
      attribute: modules.core.NodeTypes.ATTRIBUTE,
      directive: modules.core.NodeTypes.DIRECTIVE,
      element: modules.core.NodeTypes.ELEMENT,
      interpolation: modules.core.NodeTypes.INTERPOLATION,
      simple: modules.core.NodeTypes.SIMPLE_EXPRESSION,
    },
    optionsMessage: probeOptionsMessage(modules.sfc),
    source,
    version,
    vue,
  };
}

function compileFile(sfc: SfcModule, source: string, filename: string, id: string): CompiledFile {
  const parsed = sfc.parse(source, { filename });
  const { descriptor } = parsed;
  const markedVapor = Boolean(descriptor.vapor);
  descriptor.vapor = false;
  const baseline = compileScript(sfc, descriptor, id, false);
  descriptor.vapor = markedVapor;
  const vapor = compileScript(sfc, descriptor, id, true);
  const bindings = vapor.bindings ?? baseline.bindings ?? {};
  const template = descriptor.template;
  const input = template ? { bindings, filename, id, template } : null;
  const vaporTemplate = input ? compileTemplate(sfc, input, true) : emptyTemplate();
  const baselineTemplate = input ? compileTemplate(sfc, input, false) : emptyTemplate();
  return {
    baselineErrors: [...baseline.errors, ...baselineTemplate.errors],
    baselineTips: baselineTemplate.tips,
    bindings,
    code: vaporTemplate.code,
    moduleStyle: descriptor.styles.some(style => Boolean(style.module)),
    parseErrors: parsed.errors.map(diagnosticText),
    script: blockOf(descriptor.script),
    setup: blockOf(descriptor.scriptSetup),
    template: template?.ast ?? null,
    vapor: markedVapor,
    vaporErrors: [...vapor.errors, ...vaporTemplate.errors],
    vaporTips: vaporTemplate.tips,
  };
}

function compileScript(
  sfc: SfcModule,
  descriptor: Descriptor,
  id: string,
  vapor: boolean,
): { bindings?: Record<string, string>; errors: TextDiagnostic[] } {
  if (!descriptor.script && !descriptor.scriptSetup) return { errors: [] };
  try {
    const result = sfc.compileScript(descriptor, { id, inlineTemplate: false, vapor });
    return { bindings: result.bindings, errors: [] };
  } catch (error) {
    const block = descriptor.scriptSetup ?? descriptor.script;
    const message = error instanceof Error ? error.message : 'The compiler failed.';
    return {
      errors: [
        {
          column: block?.loc.start.column ?? 1,
          line: block?.loc.start.line ?? 1,
          message,
        },
      ],
    };
  }
}

interface TemplateInput {
  template: NonNullable<Descriptor['template']>;
  filename: string;
  id: string;
  bindings: Record<string, string>;
}

function compileTemplate(
  sfc: SfcModule,
  input: TemplateInput,
  vapor: boolean,
): { code: string; tips: string[]; errors: TextDiagnostic[] } {
  const { bindings, filename, id, template } = input;
  try {
    const result = sfc.compileTemplate({
      ast: template.ast,
      compilerOptions: { bindingMetadata: bindings },
      filename,
      id,
      source: template.content,
      vapor,
    });
    return {
      code: result.code,
      errors: result.errors.map(diagnosticText),
      tips: result.tips,
    };
  } catch (error) {
    return {
      code: '',
      errors: [diagnosticText(error)],
      tips: [],
    };
  }
}

function emptyTemplate(): { code: string; tips: string[]; errors: TextDiagnostic[] } {
  return { code: '', errors: [], tips: [] };
}

function blockOf(block: ScriptBlock | null): { content: string; offset: number } | null {
  if (block === null) return null;
  return { content: block.content, offset: block.loc.start.offset };
}
