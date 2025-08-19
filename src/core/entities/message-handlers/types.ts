import type TelegramBot from 'node-telegram-bot-api';

export type MessageHandlerOptions = {
	state?: string;
	startsWith?: string;
	userId?: TelegramBot.User['id'];
};
