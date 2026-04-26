import { InlineKeyboard } from 'grammy';

import { ORM } from '~/db';
import { Deck } from '~/entities/deck';
import { Game } from '~/entities/game';
import { escapeHtml } from '~/shared/lib';
import { stringifyCallbackData, getCallbackMeta } from '~/core/lib';
import type { CallbackCtx, AppContext } from '~/core';

import * as ui from './ui';

const getHandInlineKeyboard = (games: { id: string; roomId: string }[]) => {
	const keyboard = new InlineKeyboard();
	games.forEach(game => {
		const room = ORM.Rooms.getById(game.roomId);
		keyboard.text(room.name, stringifyCallbackData({ module: 'hand', action: 'show', meta: game.id }));
		keyboard.row();
	});
	return keyboard;
};

const getHandShowInlineKeyboard = (gameId: string) => {
	return new InlineKeyboard()
		.text('Обновить', stringifyCallbackData({ module: 'hand', action: 'show', meta: gameId }))
		.text('Закрыть', stringifyCallbackData({ module: 'hand', action: 'close', meta: gameId }));
};

const getHandShowText = (ctx: CallbackCtx) => {
	const gameId = getCallbackMeta(ctx.callbackQuery.data);

	if (!gameId) {
		throw new Error('Game id required');
	}

	const game = new Game({ id: gameId });
	const room = ORM.Rooms.getById(game.getRoomId());
	const hand = game.getHand(ctx.from.id);

	if (!hand) {
		throw new Error('Hand not found');
	}

	return `Комната ${escapeHtml(room.name)}\n\n${Deck.getMyHandView(hand.cardsInHand)}`;
};

export const handMessageHandler = async (ctx: AppContext) => {
	await ctx.deleteMessage();

	const gamesWithMe = ORM.Games.getActiveWithMe(ctx.from!.id);

	if (gamesWithMe.length === 0) {
		await ctx.reply(ui.txt.noActiveGames);
	} else {
		await ctx.reply(ui.txt.chooseGame, { reply_markup: getHandInlineKeyboard(gamesWithMe) });
	}
};

export const handShowCallbackHandler = async (ctx: CallbackCtx) => {
	await ctx.answerCallbackQuery();
	const gameId = getCallbackMeta(ctx.callbackQuery.data);
	await ctx.editMessageText(getHandShowText(ctx), { reply_markup: getHandShowInlineKeyboard(gameId!) });
};

export const handCloseCallbackHandler = async (ctx: CallbackCtx) => {
	await ctx.deleteMessage();
};

export const handBackCallbackHandler = async (ctx: CallbackCtx) => {
	await ctx.answerCallbackQuery();

	const gamesWithMe = ORM.Games.getActiveWithMe(ctx.from.id);

	if (gamesWithMe.length === 0) {
		await ctx.editMessageText(ui.txt.noActiveGames);
	} else {
		await ctx.editMessageText(ui.txt.chooseGame, { reply_markup: getHandInlineKeyboard(gamesWithMe) });
	}
};
