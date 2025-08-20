const NAME_RULES = 'Правила для имени:\n' +
	'• Имя не должно быть короче 4 символов\n' +
	'• Имя не должно быть длиннее 16 символов';

/* TEXTS */
export const txt = {
	yourSettings: 'Твои настройки',
	name: 'Имя',
	chooseWhatToChange: 'Выбери что ты хочешь изменить',
	changeName: 'Отлично, напиши мне новое имя в следующем сообщении\n' +
		'\n' +
		NAME_RULES,
	success: '<b>Применил изменения!</b>',
} as const;

/* KEYBOARDS */
export const kb: ModuleKeyboards = {
	baseSettings: [
		[{ text: 'Имя', callback_data: { module: 'settings', action: 'changeName' } }],
	],
} as const;
