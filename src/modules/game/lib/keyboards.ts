/* KEYBOARDS */
export const kb: ModuleKeyboards = {
	start: [
		[{ text: 'Начать игру', callback_data: { module: 'game', action: 'start' } }],
	],
} as const;
