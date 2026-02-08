import { DB } from '~/db';

import type { PlayerId } from '~/entities/game';

export const playersList = (players: PlayerId[]): string => {
	return players.map(playerId => {
		const user = DB.data.users.find(user => user.id === playerId);
		return '• ' + (user ? user.name : `Игрок не найден (id: ${playerId})`);
	}).join('\n');
};
