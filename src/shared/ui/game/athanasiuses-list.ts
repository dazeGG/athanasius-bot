import { ORM } from '~/db';
import { DeckConfig } from '~/entities/deck';
import type { Game } from '~/entities/game';

export const athanasiusesList = (game: Game): string => {
	return game
		.allPlayers
		.map(playerId => {
			const player = ORM.Users.get(playerId);
			return '• ' + player.name + ': ' + game.getAthanasiuses()[playerId].map(athanasius => DeckConfig.CARDS_VIEW_MAP[athanasius]).join(' ');
		})
		.join('\n');
};

export const getAthanasiusesListText = (game: Game): string => {
	const athanasiuses = game.getAthanasiuses();
	const overallAthanasiusesCount = Object.values(athanasiuses).reduce((acc, current) => acc + current.length, 0);

	if (overallAthanasiusesCount === 0) {
		return 'Афанасиев пока ни у кого нет';
	}

	return '<b>Собранные Афанасии:</b>\n\n' + athanasiusesList(game);
};
