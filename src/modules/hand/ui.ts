import { ORM } from '~/db';
import type { RawButtons } from '~/core';
import type { GameSchema } from '~/db';

/* TEXTS */
export const txt = {
	noActiveGames: 'У тебя пока нет запущенных игр',
	chooseGame: 'Выбери игру, руку в которой хочешь посмотреть',
} as const;

/* KEYBOARDS */
export const kb: ModuleKeyboards = {
	handBack: [
		[{ text: 'Назад', callback_data: { module: 'hand', back: true } }],
	],
} as const;

/* GENERABLE KEYBOARDS */
export const gkb = {
	roomsList: (games: GameSchema[]): RawButtons => {
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
