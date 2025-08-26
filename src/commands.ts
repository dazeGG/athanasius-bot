import type TelegramBot from 'node-telegram-bot-api';

export const commands: TelegramBot.BotCommand[] = [
	{ command: '/addglobalkeyboard', description: 'Добавить клавиатуру' },
	{ command: '/removeglobalkeyboard', description: 'Убрать клавиатуру' },
	{ command: '/updateglobalkeyboard', description: 'Обновить клавиатуру' },
];
