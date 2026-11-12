import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { loadData } from '#data/load.ts';

const dataDirectory = path.join(import.meta.dirname, '../../data');

function evidenceByLevel(value: Record<string, unknown>, level: string): Record<string, unknown> {
  const groups: Record<string, unknown>[][] = [];
  const interop = value.interop as { evidence?: Record<string, unknown>[] };
  if (Array.isArray(interop.evidence)) groups.push(interop.evidence);
  const features = value.features as { evidence: Record<string, unknown>[] }[] | undefined;
  if (Array.isArray(features)) {
    for (const feature of features) groups.push(feature.evidence);
  }
  for (const group of groups) {
    const item = group.find(entry => entry.level === level);
    if (item) return item;
  }
  throw new Error(`no ${level} evidence`);
}

function copyWith(file: string, edit: (value: Record<string, unknown>) => void): string {
  const copy = mkdtempSync(path.join(tmpdir(), 'vaporfit-data-'));
  cpSync(dataDirectory, copy, { recursive: true });
  const target = path.join(copy, file);
  const value = JSON.parse(readFileSync(target, 'utf8')) as Record<string, unknown>;
  edit(value);
  writeFileSync(target, JSON.stringify(value));
  return copy;
}

describe('loadData', () => {
  it('reads each rule file and each library file of the repository', () => {
    const data = loadData(dataDirectory);

    expect(data.rules.map(rule => rule.id)).toContain('vapor/object-directive');
    expect(data.libraries.map(library => library.package)).toContain('reka-ui');
  });

  it('never gives a library a status other than "unknown" without evidence', () => {
    const { libraries } = loadData(dataDirectory);
    const withoutEvidence = [
      ...libraries
        .filter(library => library.interop.status !== 'unknown')
        .filter(library => library.interop.evidence.length === 0)
        .map(library => library.package),
      ...libraries
        .flatMap(library => library.features)
        .filter(feature => feature.evidence.length === 0)
        .map(feature => feature.id),
    ];

    expect(withoutEvidence).toStrictEqual([]);
  });
});

describe('loadData with a bad file', () => {
  it('rejects a status that is not in the format', () => {
    const copy = copyWith('libraries/reka-ui.json', value => {
      (value.interop as Record<string, unknown>).status = 'fine';
    });

    expect(() => loadData(copy)).toThrow('"interop.status" is missing or has the wrong type');
  });

  it('rejects a match without a name', () => {
    const copy = copyWith('libraries/element-plus.json', value => {
      const features = value.features as { match: Record<string, unknown> }[];
      for (const feature of features) {
        Reflect.deleteProperty(feature.match, 'name');
      }
    });

    expect(() => loadData(copy)).toThrow('"features[].match.name"');
  });

  it('rejects a pure status that is not in the format', () => {
    const copy = copyWith('libraries/reka-ui.json', value => {
      value.pure = { evidence: [], status: 'fine' };
    });

    expect(() => loadData(copy)).toThrow('"pure.status" is missing or has the wrong type');
  });

  it('reads an optional pure object with the interop fields', () => {
    const copy = copyWith('libraries/reka-ui.json', value => {
      value.pure = { evidence: [], status: 'unknown' };
    });
    const data = loadData(copy);
    const library = data.libraries.find(item => item.package === 'reka-ui');

    expect(library?.pure).toEqual({ evidence: [], status: 'unknown' });
  });

  it('rejects a file with a different schema version', () => {
    const copy = copyWith('rules/v-memo.json', value => {
      value.schemaVersion = 1;
    });

    expect(() => loadData(copy)).toThrow('"schemaVersion"');
  });
});

describe('loadData JSON', () => {
  it('rejects a file that is not valid JSON', () => {
    const copy = mkdtempSync(path.join(tmpdir(), 'vaporfit-data-'));
    cpSync(dataDirectory, copy, { recursive: true });
    writeFileSync(path.join(copy, 'rules/v-memo.json'), '{');

    expect(() => loadData(copy)).toThrow('not valid JSON');
  });
});

describe('loadData tested evidence', () => {
  it('rejects a tested evidence without a depth', () => {
    const copy = copyWith('libraries/element-plus.json', value => {
      Reflect.deleteProperty(evidenceByLevel(value, 'tested'), 'depth');
    });

    expect(() => loadData(copy)).toThrow('"interop.evidence[].depth"');
  });

  it('rejects a tested evidence with a depth that is not in the scale', () => {
    const copy = copyWith('libraries/element-plus.json', value => {
      evidenceByLevel(value, 'tested').depth = 'D9';
    });

    expect(() => loadData(copy)).toThrow('"interop.evidence[].depth"');
  });

  it('rejects a tested evidence without an environment', () => {
    const copy = copyWith('libraries/element-plus.json', value => {
      Reflect.deleteProperty(evidenceByLevel(value, 'tested'), 'environment');
    });

    expect(() => loadData(copy)).toThrow('"interop.evidence[].environment"');
  });

  it('rejects a tested evidence without a probe', () => {
    const copy = copyWith('libraries/pinia.json', value => {
      Reflect.deleteProperty(evidenceByLevel(value, 'tested'), 'probe');
    });

    expect(() => loadData(copy)).toThrow('"interop.evidence[].probe"');
  });

  it('rejects a tested evidence when the probe is not a string and not null', () => {
    const copy = copyWith('libraries/pinia.json', value => {
      evidenceByLevel(value, 'tested').probe = 1;
    });

    expect(() => loadData(copy)).toThrow('"interop.evidence[].probe"');
  });

  it('rejects a tested evidence when what is not a string', () => {
    const copy = copyWith('libraries/pinia.json', value => {
      evidenceByLevel(value, 'tested').what = 1;
    });

    expect(() => loadData(copy)).toThrow('"interop.evidence[].what"');
  });
});

describe('loadData issue and source evidence', () => {
  it('rejects an issue evidence without a url', () => {
    const copy = copyWith('libraries/reka-ui.json', value => {
      Reflect.deleteProperty(evidenceByLevel(value, 'issue'), 'url');
    });

    expect(() => loadData(copy)).toThrow('"features[].evidence[].url"');
  });

  it('rejects an issue evidence without a state', () => {
    const copy = copyWith('libraries/reka-ui.json', value => {
      Reflect.deleteProperty(evidenceByLevel(value, 'issue'), 'state');
    });

    expect(() => loadData(copy)).toThrow('"features[].evidence[].state"');
  });

  it('rejects a source evidence without a url', () => {
    const copy = copyWith('libraries/vue-router.json', value => {
      Reflect.deleteProperty(evidenceByLevel(value, 'source'), 'url');
    });

    expect(() => loadData(copy)).toThrow('"features[].evidence[].url"');
  });
});

describe('loadData declared scope', () => {
  it('rejects a declared scope that is not in the format', () => {
    const copy = copyWith('libraries/vue-i18n.json', value => {
      (value.declared as Record<string, unknown>).scope = 'everything';
    });

    expect(() => loadData(copy)).toThrow('"declared.scope"');
  });
});
