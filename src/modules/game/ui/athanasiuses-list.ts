import type { Game } from '~/entities/game';
import { ORM } from '~/db';
import { CARDS_VIEW_MAP } from '~/entities/deck';

export const athanasiusesList = (game: Game): string => {
	return game.allPlayers.map(playerId => {
		const player = ORM.Users.get(playerId);
		return '• ' + player.name + ': ' + game.getAthanasiuses()[playerId].map(athanasius => CARDS_VIEW_MAP[athanasius]).join(' ');
	}).join('\n');
};
