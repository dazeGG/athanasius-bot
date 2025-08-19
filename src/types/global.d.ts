import type { Buttons } from '~/core';

declare global {
	type ModuleKeyboards = Record<string, Buttons>
	type ModuleGenerableKeyboards = Record<string, (any) => Buttons>
}
