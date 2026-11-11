export const Widget: typeof import('../src/Widget.vue')['default']
export const NuxtWelcome: typeof import('../node_modules/nuxt/dist/app/components/welcome.vue')['default']

declare module 'vue' {
	export interface GlobalComponents {
		Widget: typeof import('../src/Widget.vue')['default']
		NuxtWelcome: typeof import('../node_modules/nuxt/dist/app/components/welcome.vue')['default']
	}
}
