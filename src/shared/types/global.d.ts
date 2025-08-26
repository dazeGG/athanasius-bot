import type { RawButtons } from '~/core';

declare global {
	type ModuleKeyboards = Record<string, RawButtons>;
}
