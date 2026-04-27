import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	resolve: {
		alias: {
			'~': resolve(__dirname, 'src'),
		},
	},
	test: {
		environment: 'node',
		globals: true,
		setupFiles: ['./tests/setup.ts'],
		include: [
			'tests/modules/**/*.ts',
			'tests/flow/game/index.ts',
			'tests/flow/game/36-deck.ts',
			'tests/flow/game/54-deck.ts',
		],
		singleFork: true,
	},
});
