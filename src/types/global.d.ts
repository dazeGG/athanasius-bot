import type { Buttons } from '~/types/base';

declare global {
	type ModuleKeyboards = Record<string, Buttons>
	type ModuleGenerableKeyboards = Record<string, (any) => Buttons>
}
