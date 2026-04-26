import { InlineKeyboard } from 'grammy';

import { ORM } from '~/db';
import { Game } from '~/entities/game';
import { stringifyCallbackData, getCallbackMeta } from '~/core/lib';
import type { AppContext, CallbackCtx } from '~/core';

import * as roomsUi from '../rooms/ui';

const noAvailableGames = 'Нет игр, в которых можно отправить сообщение';

function getAvailableGames (meId: number) {
	return ORM.Games.getActiveWithMe(meId).filter(gameSchema => {
		const room = ORM.Rooms.getById(gameSchema.roomId);
		if (!room.settings.allowMailing) {
			return false;
		}
		const game = new Game({ id: gameSchema.id });
		return game.allPlayers.includes(meId) && !game.hasMailedThisTurn(meId);
	});
}

function getGamesListKeyboard (meId: number): InlineKeyboard {
	const games = getAvailableGames(meId);
	const kb = new InlineKeyboard();
	for (const gameSchema of games) {
		const room = ORM.Rooms.getById(gameSchema.roomId);
		kb.text(room.name, stringifyCallbackData({ module: 'mailing', action: 'select', meta: gameSchema.roomId })).row();
	}
	return kb;
}

export const mailingMessageHandler = async (ctx: AppContext) => {
	await ctx.deleteMessage();

	const games = getAvailableGames(ctx.from!.id);

	if (games.length === 0) {
		await ctx.reply(noAvailableGames);
		return;
	}

	if (games.length === 1) {
		const roomId = games[0].roomId;
		ctx.session.flow = { name: 'GAME_MAILING', roomId };
		await ctx.reply(roomsUi.txt.sendMessagePrompt);
		return;
	}

	await ctx.reply('Выбери игру', { reply_markup: getGamesListKeyboard(ctx.from!.id) });
};

export const mailingSelectCallbackHandler = async (ctx: CallbackCtx) => {
	await ctx.answerCallbackQuery();

	const roomId = getCallbackMeta(ctx.callbackQuery.data);
	if (!roomId) {
		return;
	}

	const gameSchema = ORM.Games.getActive(roomId);
	if (!gameSchema) {
		await ctx.editMessageText(noAvailableGames);
		return;
	}

	const room = ORM.Rooms.getById(roomId);
	const game = new Game({ id: gameSchema.id });

	if (!room.settings.allowMailing || !game.allPlayers.includes(ctx.from.id) || game.hasMailedThisTurn(ctx.from.id)) {
		await ctx.editMessageText(noAvailableGames);
		return;
	}

	ctx.session.flow = { name: 'GAME_MAILING', roomId };
	await ctx.editMessageText(roomsUi.txt.sendMessagePrompt);
};
