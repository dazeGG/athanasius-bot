import { ORM } from '~/db';
import type { RawButtons } from '~/core';
import type { GameSchema } from '~/db';
import type { Game } from '~/entities/game';

/* TEXTS */
export const txt = {
	noActiveGames: 'У тебя пока нет запущенных игр',
	chooseGame: 'Выбери игру, руку в которой хочешь посмотреть',
} as const;

/* GENERABLE KEYBOARDS */
export const gkb = {
	hand: (game: Game): RawButtons => {
		return [
			[{ text: 'Обновить', callback_data: { module: 'hand', action: 'show', meta: game.gameId } }],
			[{ text: 'Назад', callback_data: { module: 'hand', back: true } }],
		];
	},

	gamesList: (games: GameSchema[]): RawButtons => {
		return [
			...games.map(g => {
				return [{
					text: ORM.Rooms.getById(g.roomId).name,
					callback_data: { module: 'hand', action: 'show', meta: g.id },
				}];
			}),
			[{ text: 'Выйти', callback_data: { module: 'hand', action: 'close' } }],
		];
	},
} as const;
