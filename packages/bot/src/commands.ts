import type { BotCommand } from 'grammy/types';

export const commands: BotCommand[] = [
	{ command: 'start', description: 'Запустить бота' },
	{ command: 'reg', description: 'Зарегистрироваться в игре' },
	{ command: 'addglobalkeyboard', description: 'Добавить клавиатуру' },
	{ command: 'removeglobalkeyboard', description: 'Убрать клавиатуру' },
	{ command: 'updateglobalkeyboard', description: 'Обновить клавиатуру' },
];
