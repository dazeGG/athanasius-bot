import { InlineKeyboard } from 'grammy';

import { ORM } from '~/db';
import type { UserId, GameSchema, RoomSchema } from '~/db';
import { Deck, DeckConfig } from '@athanasius/shared';
import type { CardName, DeckType } from '@athanasius/shared';
import { stringifyCallbackData, getCallbackMeta } from '~/core/lib';
import type { CallbackCtx, AppContext } from '~/core';

import * as ui from './ui';

const SUITS = ['♥️', '♦️', '♠️', '♣️'] as const;
const JOKER_COLUMNS = ['🔴', '⚫'] as const;
const RANKS_PER_ROW = 5;

function cellKey (rank: string, deckIdx: number, suitIdx: number): string {
	return `${rank}_${deckIdx}_${suitIdx}`;
}

function getCellDisplay (val: UserId | null | undefined, selfId: UserId): string {
	if (val === undefined || val === null) {
		return '-';
	}
	if (val === selfId) {
		return 'я';
	}
	try {
		return ORM.Users.get(val).name;
	} catch {
		return '-';
	}
}

function getNextInCycle (current: UserId | null | undefined, selfId: UserId, otherPlayers: UserId[]): UserId | null {
	const cycle: (UserId | null)[] = [selfId, ...otherPlayers, null];
	if (current === undefined || current === null) {
		return selfId;
	}
	const idx = cycle.indexOf(current);
	const nextIdx = (idx === -1 ? 0 : idx + 1) % cycle.length;
	return cycle[nextIdx];
}

function getGameListKeyboard (games: GameSchema[]): InlineKeyboard {
	const kb = new InlineKeyboard();
	for (const game of games) {
		const room = ORM.Rooms.getById(game.roomId);
		kb.text(room.name, stringifyCallbackData({ module: 'notes', action: 'rank', meta: game.id })).row();
	}
	kb.text('Выход', stringifyCallbackData({ module: 'notes', action: 'exit' }));
	return kb;
}

function getRoomDeckType (room: RoomSchema): DeckType {
	return room.settings.deckType ?? 52;
}

function getRankLabel (rank: CardName): string {
	return DeckConfig.CARDS_VIEW_MAP[rank];
}

function getRanksForDeckType (deckType: DeckType): CardName[] {
	const ranks = Array.from(new Set(Deck.getDeck(deckType).map(card => card.name)));
	return ranks.sort((a, b) => DeckConfig.RANKS_MAP[a] - DeckConfig.RANKS_MAP[b]);
}

function getColumnLabels (rank: string): readonly string[] {
	return rank === 'Joker' ? JOKER_COLUMNS : SUITS;
}

function getRankKeyboard (gameId: string, deckType: DeckType, showBack: boolean): InlineKeyboard {
	const kb = new InlineKeyboard();
	getRanksForDeckType(deckType).forEach((rank, i) => {
		kb.text(getRankLabel(rank), stringifyCallbackData({ module: 'notes', action: 'grid', meta: `${gameId}:${rank}` }));
		if ((i + 1) % RANKS_PER_ROW === 0) {
			kb.row();
		}
	});
	kb.row();
	if (showBack) {
		kb.text('Назад', stringifyCallbackData({ module: 'notes', action: 'games' }));
	}
	kb.text('Выход', stringifyCallbackData({ module: 'notes', action: 'exit' }));
	return kb;
}

function getGridKeyboard (
	gameId: string,
	rank: string,
	decksCount: number,
	noteMap: Record<string, UserId | null>,
	selfId: UserId,
): InlineKeyboard {
	const kb = new InlineKeyboard();
	const columns = getColumnLabels(rank);

	columns.forEach(column => {
		kb.text(column, stringifyCallbackData({ module: 'notes', action: 'suit' }));
	});
	kb.row();

	for (let di = 0; di < decksCount; di++) {
		for (let si = 0; si < columns.length; si++) {
			const key = cellKey(rank, di, si);
			const val = Object.prototype.hasOwnProperty.call(noteMap, key) ? noteMap[key] : undefined;
			const display = getCellDisplay(val, selfId);
			kb.text(display, stringifyCallbackData({ module: 'notes', action: 'cycle', meta: `${gameId}:${rank}:${di}:${si}` }));
		}
		kb.row();
	}

	kb.text('Назад', stringifyCallbackData({ module: 'notes', action: 'rank', meta: gameId }));
	kb.text('Выход', stringifyCallbackData({ module: 'notes', action: 'exit' }));
	return kb;
}

async function renderGrid (ctx: CallbackCtx, gameId: string, rank: string): Promise<void> {
	const game = ORM.Games.getById(gameId);
	const room = ORM.Rooms.getById(game.roomId);
	const decksCount = rank === 'Joker'
		? (game.utils.jokerCardsToAthanasius || room.settings.decksCount * 2) / 2
		: game.utils.cardsToAthanasius / 4;
	const selfId = ctx.from.id;
	const noteMap = ORM.Games.getNote(gameId, selfId);

	await ctx.editMessageText(ui.txt.grid(room.name, rank), {
		reply_markup: getGridKeyboard(gameId, rank, decksCount, noteMap, selfId),
		parse_mode: 'HTML',
	});
}

export const notesMessageHandler = async (ctx: AppContext) => {
	await ctx.deleteMessage();
	const gamesWithMe = ORM.Games.getActiveWithMe(ctx.from!.id);

	if (gamesWithMe.length === 0) {
		await ctx.reply(ui.txt.noActiveGames);
		return;
	}

	if (gamesWithMe.length === 1) {
		const game = gamesWithMe[0];
		const room = ORM.Rooms.getById(game.roomId);
		await ctx.reply(ui.txt.chooseRank(room.name), {
			reply_markup: getRankKeyboard(game.id, getRoomDeckType(room), false),
			parse_mode: 'HTML',
		});
		return;
	}

	await ctx.reply(ui.txt.chooseGame, { reply_markup: getGameListKeyboard(gamesWithMe) });
};

export const notesGamesCallbackHandler = async (ctx: CallbackCtx) => {
	await ctx.answerCallbackQuery();
	const gamesWithMe = ORM.Games.getActiveWithMe(ctx.from.id);

	if (gamesWithMe.length === 0) {
		await ctx.editMessageText(ui.txt.noActiveGames);
		return;
	}

	await ctx.editMessageText(ui.txt.chooseGame, { reply_markup: getGameListKeyboard(gamesWithMe) });
};

export const notesRankCallbackHandler = async (ctx: CallbackCtx) => {
	await ctx.answerCallbackQuery();
	const gameId = getCallbackMeta(ctx.callbackQuery.data);
	if (!gameId) {
		return;
	}

	const game = ORM.Games.getById(gameId);
	const room = ORM.Rooms.getById(game.roomId);
	const gamesWithMe = ORM.Games.getActiveWithMe(ctx.from.id);
	const showBack = gamesWithMe.length > 1;

	await ctx.editMessageText(ui.txt.chooseRank(room.name), {
		reply_markup: getRankKeyboard(gameId, getRoomDeckType(room), showBack),
		parse_mode: 'HTML',
	});
};

export const notesGridCallbackHandler = async (ctx: CallbackCtx) => {
	await ctx.answerCallbackQuery();
	const meta = getCallbackMeta(ctx.callbackQuery.data);
	if (!meta) {
		return;
	}

	const colonIdx = meta.indexOf(':');
	const gameId = meta.slice(0, colonIdx);
	const rank = meta.slice(colonIdx + 1);

	await renderGrid(ctx, gameId, rank);
};

export const notesCycleCallbackHandler = async (ctx: CallbackCtx) => {
	await ctx.answerCallbackQuery();
	const meta = getCallbackMeta(ctx.callbackQuery.data);
	if (!meta) {
		return;
	}

	const parts = meta.split(':');
	const gameId = parts[0];
	const rank = parts[1];
	const di = Number(parts[2]);
	const si = Number(parts[3]);

	const game = ORM.Games.getById(gameId);
	const selfId = ctx.from.id;
	const otherPlayers = game.players.filter(id => id !== selfId);
	const noteMap = ORM.Games.getNote(gameId, selfId);
	const key = cellKey(rank, di, si);
	const current = Object.prototype.hasOwnProperty.call(noteMap, key) ? noteMap[key] : undefined;
	const next = getNextInCycle(current, selfId, otherPlayers);

	await ORM.Games.setNoteCell(gameId, selfId, key, next);
	await renderGrid(ctx, gameId, rank);
};

export const notesSuitCallbackHandler = async (ctx: CallbackCtx) => {
	await ctx.answerCallbackQuery({ text: 'Это заголовок масти' });
};

export const notesExitCallbackHandler = async (ctx: CallbackCtx) => {
	await ctx.deleteMessage();
};
