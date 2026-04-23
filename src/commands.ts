import type { BotCommand } from 'grammy/types';

export const commands: BotCommand[] = [
	{ command: 'addglobalkeyboard', description: 'Добавить клавиатуру' },
	{ command: 'removeglobalkeyboard', description: 'Убрать клавиатуру' },
	{ command: 'updateglobalkeyboard', description: 'Обновить клавиатуру' },
];
