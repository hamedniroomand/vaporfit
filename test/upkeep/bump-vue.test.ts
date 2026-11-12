import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import {
  bumpFiles,
  pruneReleaseAgeExclude,
  replacePins,
  replaceReadmeVersion,
  replaceReportVersion,
  TOOL_PACKAGES,
} from '#upkeep/bump-vue.ts';

const from = '3.6.0-rc.14';
const to = '3.6.0-rc.15';

function write(root: string, relative: string, text: string): void {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text);
}

function read(root: string, relative: string): string {
  return readFileSync(path.join(root, relative), 'utf8');
}

function toolManifest(version: string): string {
  const pins = TOOL_PACKAGES.map(name => `    "${name}": "${version}"`).join(',\n');
  return `{\n  "name": "vaporfit",\n  "dependencies": {\n${pins},\n    "oxc-parser": "^0.158.0"\n  },\n  "devDependencies": {\n    "vue": "^3.5.45"\n  }\n}\n`;
}

function probeManifest(vue: string): string {
  return `{\n  "dependencies": {\n    "vue": "${vue}",\n    "reka-ui": "2.11.0"\n  }\n}\n`;
}

function repo(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'vaporfit-bump-'));
  write(root, 'package.json', toolManifest(from));
  write(
    root,
    'pnpm-workspace.yaml',
    `packages:\n  - .\nminimumReleaseAgeExclude:\n  - vite-plus@1.6.0\n  - '@vue/shared@${from}'\n`,
  );
  write(root, 'README.md', `\`\`\`text\nvaporfit 0.0.0\nvue ${from}\ndata 2026-11-10\n\`\`\`\n`);
  write(root, 'repros/a-case/package.json', probeManifest(from));
  write(
    root,
    'repros/a-case/README.md',
    `## Versions\n\n- \`vue\` ${from}\n- \`reka-ui\` 2.11.0\n`,
  );
  write(
    root,
    'repros/a-case/pnpm-workspace.yaml',
    `minimumReleaseAgeExclude:\n  - vue@${from}\n  - '@vue/runtime-vapor@${from}'\n`,
  );
  write(root, 'repros/b-old/package.json', probeManifest('3.6.0-rc.10'));
  write(root, 'repros/c-no-vue/package.json', '{\n  "dependencies": {}\n}\n');
  write(root, 'repros/notes.md', 'not a folder\n');
  return root;
}

describe('replacePins', () => {
  it('changes only the named pins that have the old version', () => {
    const text = toolManifest(from);
    const result = replacePins(text, TOOL_PACKAGES, from, to);
    expect(result).toBe(toolManifest(to));
    expect(result).toContain('"vue": "^3.5.45"');
  });

  it('does not change a pin with a longer version that starts with the old version', () => {
    const text = '{ "vue": "3.6.0-rc.140" }';
    expect(replacePins(text, ['vue'], from, to)).toBe(text);
  });

  it('reads the dots of a version as text, not as a regex wildcard', () => {
    const text = '{ "vue": "3x6x0-rc.14" }';
    expect(replacePins(text, ['vue'], from, to)).toBe(text);
  });
});

describe('replaceReadmeVersion', () => {
  it('changes the vue line of the Versions list only', () => {
    const text = `- \`vue\` ${from}\n- \`vue-router\` ${from}\nVue ${from} is in the text.\n`;
    expect(replaceReadmeVersion(text, from, to)).toBe(
      `- \`vue\` ${to}\n- \`vue-router\` ${from}\nVue ${from} is in the text.\n`,
    );
  });
});

describe('replaceReportVersion', () => {
  it('changes only a whole vue line of a sample report', () => {
    const text = `vue ${from}\nvue ${from}0\nThe vue ${from} line.\n`;
    expect(replaceReportVersion(text, from, to)).toBe(
      `vue ${to}\nvue ${from}0\nThe vue ${from} line.\n`,
    );
  });
});

describe('pruneReleaseAgeExclude', () => {
  it('removes the vue packages of the old version and keeps the other entries', () => {
    const text = `minimumReleaseAgeExclude:\n  - vite@8.3.7\n  - vue@${from}\n  - '@vue/shared@${from}'\n  - "@vue/compiler-sfc@${from}"\n  - '@vue/shared@${to}'\n  - vue-router@${from}\n`;
    expect(pruneReleaseAgeExclude(text, from)).toBe(
      `minimumReleaseAgeExclude:\n  - vite@8.3.7\n  - '@vue/shared@${to}'\n  - vue-router@${from}\n`,
    );
  });

  it('removes the key when no entry is left', () => {
    const text = `packages:\n  - .\nminimumReleaseAgeExclude:\n  - vue@${from}\ncatalog:\n  vite: 1.0.0\n`;
    expect(pruneReleaseAgeExclude(text, from)).toBe('packages:\n  - .\ncatalog:\n  vite: 1.0.0\n');
  });
});

describe('bumpFiles', () => {
  it('changes the tool pins, the probe pins and the probe READMEs, and skips other pins', () => {
    const root = repo();
    const plan = bumpFiles(root, to);
    expect(plan.from).toBe(from);
    expect(plan.to).toBe(to);
    expect(plan.probes).toEqual(['repros/a-case']);
    expect(plan.skipped).toEqual(['repros/b-old (vue 3.6.0-rc.10)']);
    expect(plan.changed).toEqual([
      'package.json',
      'pnpm-workspace.yaml',
      'README.md',
      'repros/a-case/package.json',
      'repros/a-case/README.md',
      'repros/a-case/pnpm-workspace.yaml',
    ]);
    expect(read(root, 'package.json')).toBe(toolManifest(to));
    expect(read(root, 'pnpm-workspace.yaml')).toBe(
      'packages:\n  - .\nminimumReleaseAgeExclude:\n  - vite-plus@1.6.0\n',
    );
    expect(read(root, 'README.md')).toContain(`\nvue ${to}\ndata 2026-11-10\n`);
    expect(read(root, 'repros/a-case/package.json')).toBe(probeManifest(to));
    expect(read(root, 'repros/a-case/README.md')).toContain(`- \`vue\` ${to}\n`);
    expect(read(root, 'repros/a-case/pnpm-workspace.yaml')).toBe('');
    expect(read(root, 'repros/b-old/package.json')).toBe(probeManifest('3.6.0-rc.10'));
  });

  it('refuses the same version, a range and a version older than 3.6', () => {
    const root = repo();
    expect(() => bumpFiles(root, from)).toThrow('already pins Vue 3.6.0-rc.14');
    expect(() => bumpFiles(root, '^3.6.0')).toThrow('not an exact version');
    expect(() => bumpFiles(root, '3.5.45')).toThrow('older than Vue 3.6');
    expect(read(root, 'package.json')).toBe(toolManifest(from));
  });
});
