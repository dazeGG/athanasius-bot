import type TelegramBot from 'node-telegram-bot-api';

export type Card = {
	id: string;
	name: string;
	value: number;
	suit: string;
};

export type User = {
	id: TelegramBot.User['id'];
	username: TelegramBot.User['username'];
	name: string;
};

export type Game = {
	id: string;
	queue: number[];
	decks: Record<number, string[]>;
	athanasiuses: Record<number, string[]>;
};
