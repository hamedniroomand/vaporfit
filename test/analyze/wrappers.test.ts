import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { analyze, getComponent } from '#index.ts';

import { described, must } from './assert.ts';

function writeProject(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), 'vaporfit-wp4-'));
  const entries = {
    'package.json': '{"name":"vaporfit-wp4","private":true}\n',
    ...files,
  };
  for (const [name, content] of Object.entries(entries)) {
    const full = path.join(root, name);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

describe('local wrappers', () => {
  it('follows a wrapper of a wrapper', () => {
    const root = writeProject({
      'src/Page.vue': `<script setup>
import Outer from './Outer.vue';
</script>
<template>
  <Outer as-child />
</template>
`,
      'src/Outer.vue': `<script setup>
import Inner from './Inner.vue';
const props = defineProps({ asChild: Boolean });
</script>
<template>
  <Inner v-bind="props" />
</template>
`,
      'src/Inner.vue': `<script setup>
import { DialogTrigger } from 'reka-ui';
const props = defineProps({ asChild: Boolean });
</script>
<template>
  <DialogTrigger v-bind="props" />
</template>
`,
    });
    const report = analyze(root);
    const finding = must(
      getComponent(report, 'src/Page.vue')?.findings.find(item => item.rule === 'reka-ui/as-child'),
      described(report, 'src/Page.vue'),
    );
    expect(getComponent(report, 'src/Page.vue')?.interop).toBe('blocked');
    expect(finding.level).toBe('error');
    expect(finding.chain).toEqual(['src/Page.vue', 'src/Outer.vue', 'src/Inner.vue', 'reka-ui']);
  });
});

describe('local wrappers', () => {
  it('uses unknown when a spread may not forward the prop', () => {
    const root = writeProject({
      'src/Page.vue': `<script setup>
import Wrap from './Wrap.vue';
</script>
<template>
  <Wrap as-child />
</template>
`,
      'src/Wrap.vue': `<script setup>
import { DialogTrigger } from 'reka-ui';
defineOptions({ inheritAttrs: false });
const data = { asChild: true };
</script>
<template>
  <DialogTrigger v-bind="data" />
</template>
`,
    });
    const report = analyze(root);
    const finding = must(
      getComponent(report, 'src/Page.vue')?.findings.find(item => item.rule === 'reka-ui/as-child'),
      described(report, 'src/Page.vue'),
    );
    expect(finding.level).toBe('unknown');
    expect(finding.chain).toEqual(['src/Page.vue', 'src/Wrap.vue', 'reka-ui']);
    expect(getComponent(report, 'src/Page.vue')?.interop).toBe('unknown');
  });
});

describe('local wrappers', () => {
  it('does not copy a directive finding onto the user of a wrapper', () => {
    const root = writeProject({
      'package.json':
        '{"name":"vaporfit-wp4","private":true,"dependencies":{"element-plus":"2.14.8"}}\n',
      'src/Page.vue': `<script setup>
import Wrap from './Wrap.vue';
</script>
<template>
  <Wrap />
</template>
`,
      'src/Wrap.vue': `<script setup>
import { ElButton } from 'element-plus';
</script>
<template>
  <ElButton v-loading="true" />
</template>
`,
    });
    const report = analyze(root);
    expect(
      getComponent(report, 'src/Wrap.vue')?.findings.some(
        item => item.rule === 'element-plus/v-loading',
      ),
    ).toBe(true);
    const page = getComponent(report, 'src/Page.vue');
    expect(page?.findings.filter(item => item.rule === 'element-plus/v-loading')).toEqual([]);
    expect(page?.interop).toBe('ready');
    expect(page?.pure).toBe('blocked');
    expect(page?.findings.some(item => item.rule === 'vapor/vdom-component')).toBe(true);
  });
});

describe('local wrappers', () => {
  it('follows attribute fallthrough onto a library root', () => {
    const root = writeProject({
      'src/Page.vue': `<script setup>
import Wrap from './Wrap.vue';
</script>
<template>
  <Wrap as-child />
</template>
`,
      'src/Wrap.vue': `<script setup>
import { DialogTrigger } from 'reka-ui';
</script>
<template>
  <DialogTrigger><slot /></DialogTrigger>
</template>
`,
    });
    const report = analyze(root);
    const finding = must(
      getComponent(report, 'src/Page.vue')?.findings.find(item => item.rule === 'reka-ui/as-child'),
      described(report, 'src/Page.vue'),
    );
    expect(finding.level).toBe('error');
    expect(finding.chain).toEqual(['src/Page.vue', 'src/Wrap.vue', 'reka-ui']);
  });
});

describe('local wrappers', () => {
  it('follows v-bind of $attrs', () => {
    const root = writeProject({
      'src/Page.vue': `<script setup>
import Wrap from './Wrap.vue';
</script>
<template>
  <Wrap as-child />
</template>
`,
      'src/Wrap.vue': `<script setup>
import { DialogTrigger } from 'reka-ui';
defineOptions({ inheritAttrs: false });
</script>
<template>
  <div>
    <DialogTrigger v-bind="$attrs" />
  </div>
</template>
`,
    });
    const report = analyze(root);
    const finding = must(
      getComponent(report, 'src/Page.vue')?.findings.find(item => item.rule === 'reka-ui/as-child'),
      described(report, 'src/Page.vue'),
    );
    expect(finding.level).toBe('error');
    expect(finding.chain).toEqual(['src/Page.vue', 'src/Wrap.vue', 'reka-ui']);
  });
});

describe('local wrappers', () => {
  it('follows useForwardProps', () => {
    const root = writeProject({
      'src/Page.vue': `<script setup>
import Wrap from './Wrap.vue';
</script>
<template>
  <Wrap as-child />
</template>
`,
      'src/Wrap.vue': `<script setup>
import { DialogTrigger, useForwardProps } from 'reka-ui';
const props = defineProps({ asChild: Boolean });
const forwarded = useForwardProps(props);
</script>
<template>
  <DialogTrigger v-bind="forwarded" />
</template>
`,
    });
    const report = analyze(root);
    const finding = must(
      getComponent(report, 'src/Page.vue')?.findings.find(item => item.rule === 'reka-ui/as-child'),
      described(report, 'src/Page.vue'),
    );
    expect(finding.level).toBe('error');
    expect(finding.chain).toEqual(['src/Page.vue', 'src/Wrap.vue', 'reka-ui']);
    expect(getComponent(report, 'src/Page.vue')?.interop).toBe('blocked');
  });
});

describe('local wrappers', () => {
  it('stops when wrappers form a cycle', () => {
    const root = writeProject({
      'src/Page.vue': `<script setup>
import First from './First.vue';
</script>
<template>
  <First as-child />
</template>
`,
      'src/First.vue': `<script setup>
import Second from './Second.vue';
const props = defineProps({ asChild: Boolean });
</script>
<template>
  <Second v-bind="props" />
</template>
`,
      'src/Second.vue': `<script setup>
import First from './First.vue';
const props = defineProps({ asChild: Boolean });
</script>
<template>
  <First v-bind="props" />
</template>
`,
    });
    const report = analyze(root);
    expect(getComponent(report, 'src/Page.vue')?.interop).toBe('ready');
  });
});

describe('a spread at the call site', () => {
  const page = (tag: string, bind: string, script: string): string => `<script setup>
${script}
const row = { asChild: true };
const props = defineProps({ label: String });
</script>
<template>
  <${tag} ${bind} />
</template>
`;
  const wrap = `<script setup>
import { DialogTrigger } from 'reka-ui';
const props = defineProps({ asChild: Boolean });
</script>
<template>
  <DialogTrigger v-bind="props" />
</template>
`;
  const verdict = (files: Record<string, string>): string | undefined => {
    const report = analyze(writeProject(files));
    const component = getComponent(report, 'src/Page.vue');
    const finding = component?.findings.find(item => item.rule === 'reka-ui/as-child');
    return finding === undefined ? component?.interop : `${component?.interop} ${finding.level}`;
  };
  const reka = "import { DialogTrigger } from 'reka-ui';";
  const local = "import Wrap from './Wrap.vue';";

  it('uses unknown for an imported library component', () => {
    expect(verdict({ 'src/Page.vue': page('DialogTrigger', 'v-bind="row"', reka) })).toBe(
      'unknown unknown',
    );
  });

  it('uses unknown for a local wrapper', () => {
    const files = { 'src/Page.vue': page('Wrap', 'v-bind="row"', local), 'src/Wrap.vue': wrap };
    expect(verdict(files)).toBe('unknown unknown');
  });

  it('gives no finding for a spread of the props of the file', () => {
    expect(verdict({ 'src/Page.vue': page('DialogTrigger', 'v-bind="props"', reka) })).toBe(
      'ready',
    );
  });
});
