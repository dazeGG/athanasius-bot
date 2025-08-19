import type TelegramBot from 'node-telegram-bot-api';

export type User = {
	id: TelegramBot.User['id'];
	username: TelegramBot.User['username'];
	name: string;
}
