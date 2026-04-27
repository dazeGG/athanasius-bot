import { InlineKeyboard } from 'grammy';

import { ORM } from '~/db';
import { stringifyCallbackData } from '~/core/lib';
import type { GameSchema } from '~/db';

export const txt = {
	noAvailableGames: 'Нет игр, в которых можно отправить сообщение',
	mailingDisabled: 'Отправка сообщений в ход была отключена',
	sendMessagePrompt: (roomName: string) => `${roomName}\n\nНапиши сообщение для игроков`,
	sendMessageSuccess: 'Сообщение отправлено',
	sendMessageCancelled: 'Отправка отменена',
	selectGame: 'Выбери игру',
} as const;

export const cancelKeyboard = (): InlineKeyboard =>
	new InlineKeyboard().text('Отмена', stringifyCallbackData({ module: 'mailing', action: 'cancel', meta: '' }));

export const gamesListKeyboard = (games: GameSchema[]): InlineKeyboard => {
	const kb = new InlineKeyboard();
	for (const gameSchema of games) {
		const room = ORM.Rooms.getById(gameSchema.roomId);
		kb.text(room.name, stringifyCallbackData({ module: 'mailing', action: 'select', meta: gameSchema.roomId })).row();
	}
	return kb;
};
