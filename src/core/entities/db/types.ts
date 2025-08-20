import type TelegramBot from 'node-telegram-bot-api';
import type { nanoid } from 'nanoid';

import type { CardId, Card } from '~/core';

export type UserId = TelegramBot.User['id'];
export type GameId = ReturnType<typeof nanoid>;

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
