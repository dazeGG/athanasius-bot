import { escapeHtml } from '~/shared/lib';

export const txt = {
	noActiveGames: 'У тебя нет активных игр.',
	chooseGame: 'Выбери игру:',
	chooseRank: (roomName: string) => `Игра: <b>${escapeHtml(roomName)}</b>\n\nВыбери карту:`,
	grid: (roomName: string, rank: string) => `Игра: <b>${escapeHtml(roomName)}</b> | Карта: <b>${rank}</b>`,
};
