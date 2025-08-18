import type { Buttons } from '~/core/types';

declare global {
	type ModuleKeyboards = Record<string, Buttons>
	type ModuleGenerableKeyboards = Record<string, (any) => Buttons>
}
