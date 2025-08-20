import type TelegramBot from 'node-telegram-bot-api';
import type { nanoid } from 'nanoid';

export type CardId = ReturnType<typeof nanoid>;
export type UserId = TelegramBot.User['id'];
export type GameId = ReturnType<typeof nanoid>;

export type Card = {
	id: CardId;
	name: string;
	value: number;
	suit: string;
};

export type User = {
	id: UserId;
	username: TelegramBot.User['username'];
	name: string;
};

export type Game = {
	id: GameId;
	queue: UserId[];
	decks: Record<UserId, CardId[]>;
	athanasiuses: Record<UserId, Card['name'][]>;
};
