import type TelegramBot from 'node-telegram-bot-api';

export type MessageHandlerOptions = {
	state?: string;
	startsWith?: string;
	exact?: string;
	userId?: TelegramBot.User['id'];
};
