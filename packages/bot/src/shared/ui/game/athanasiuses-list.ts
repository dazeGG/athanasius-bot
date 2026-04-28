import { ORM } from '~/db';
import { DeckConfig } from '@athanasius/shared';
import { escapeHtml } from '~/shared/lib';
import type { CardName } from '@athanasius/shared';
import type { Game } from '~/entities/game';

export const athanasiusesList = (game: Game): string => {
	return game
		.allPlayers
		.map(playerId => {
			const player = ORM.Users.get(playerId);
			return '• ' + escapeHtml(player.name) + ': ' + game.getAthanasiuses()[playerId].map(athanasius => DeckConfig.CARDS_VIEW_MAP[athanasius as CardName]).join(' ');
		})
		.join('\n');
};

export const getAthanasiusesListText = (game: Game, roomName: string): string => {
	const athanasiuses = game.getAthanasiuses();
	const overallAthanasiusesCount = Object.values(athanasiuses).reduce((acc, current) => acc + current.length, 0);

	let text = `Комната ${escapeHtml(roomName)}\n\n`;

	if (overallAthanasiusesCount === 0) {
		text += 'Афанасиев пока ни у кого нет';
	} else {
		text += '<b>Собранные Афанасии:</b>\n\n' + athanasiusesList(game);
	}

	return text;
};
