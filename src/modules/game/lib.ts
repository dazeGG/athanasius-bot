/* TEXTS */
export const txt = {
	notStarted: '<b>Игра ещё не начата</b>',
	ongoing: '<b>Игра уже идет</b>',
	players: 'Список игроков',
	gameSettings: 'Настройки игры',
	decksCount: 'Количество колод',
	playersCountError: '<b>Чтобы начать игру, необходимо как минимум 3 игрока!</b>',
} as const;

/* KEYBOARDS */
export const kb: ModuleKeyboards = {
	start: [
		[{ text: 'Начать игру', callback_data: { module: 'game', action: 'start' } }],
	],
} as const;
