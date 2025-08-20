import type { RawButtons } from '~/core';

declare global {
	type ModuleKeyboards = Record<string, RawButtons>
	type ModuleGenerableKeyboards = Record<string, (any) => RawButtons>
}
