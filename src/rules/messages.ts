export const RULE = {
  options: 'vapor/options-api',
  object: 'vapor/object-directive',
  unknown: 'vapor/unknown-directive',
  hook: 'vapor/vnode-hook',
  memo: 'vapor/v-memo',
  instance: 'vapor/get-current-instance',
  slot: 'vapor/slot-dry-run',
  ref: 'vapor/component-ref-instance',
  global: 'vapor/global-property',
  compiler: 'vue/compiler',
  vdom: 'vapor/vdom-component',
  asyncSetup: 'vapor/async-setup',
  nuxt: 'vapor/nuxt-interop-only',
} as const;

export const TEXT = {
  options: 'A component with a normal script and no script setup cannot be a Vapor component.',
  object: 'An object directive is skipped in a Vapor template.',
  hook: 'A @vue event on an element does not run in Vapor.',
  memo: 'v-memo is ignored in Vapor. The behavior does not change.',
  instance: 'getCurrentInstance() does not return the instance of a Vapor component.',
  slot: 'A call of a slot function renders the slot.',
  ref: 'A template ref to a component in this file has no $el, $props, $attrs, $slots, or $refs.',
  refOther:
    'A template ref to a component in another file has no $el, $props, $attrs, $slots, or $refs.',
  refTarget:
    'Another file reads $el, $props, $attrs, $slots, or $refs from a template ref to this component.',
  refUsers: 'The tool cannot find all users of this component.',
  sharedCompiler:
    'The compiler reports this error without Vapor too. The tool cannot tell if Vapor is the cause.',
  pluginUnknown: 'The tool cannot tell if vaporInteropPlugin is installed.',
  vdom: 'A VDOM component renders nothing in createVaporApp().',
  convert: 'Convert this component first.',
  asyncSetup: 'A top-level await in script setup throws in createVaporApp().',
  nuxt: 'A Nuxt project supports interop mode only.',
} as const;

export function unboundName(name: string): string {
  return `The name ${name} is not a binding of this file. The tool cannot tell what the name is.`;
}

export function unreadDirective(name: string, reason: 'data' | 'file' | 'value'): string {
  const directive = `v-${name}`;
  if (reason === 'file') {
    return `The tool cannot read the directive ${directive}. The directive is in a local file.`;
  }
  if (reason === 'data') {
    return `The tool cannot read the directive ${directive}. The directive is not in the data.`;
  }
  return `The tool cannot read the directive ${directive}.`;
}

export function versionNote(verified: string, installed: string): string {
  return ` The data was verified for version ${verified}. The project has version ${installed}.`;
}
