/* TEXTS */
export const txt = {
	start: 'Нажми, чтобы начать',
	ongoing: 'Игра уже идет',
} as const;

/* KEYBOARDS */
export const kb: ModuleKeyboards = {
	start: [
		[{text: 'Начать игру', callback_data: {module: 'game', action: 'start'}}]
	],
} as const;