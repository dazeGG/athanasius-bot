import { ORM } from '~/db';
import { Game } from '~/entities/game';
import { escapeHtml } from '~/shared/lib';
import { getCallbackMeta } from '~/core/lib';
import type { AppContext, CallbackCtx, MessageCtx } from '~/core';

import * as ui from './ui';

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

export const mailingMessageHandler = async (ctx: AppContext) => {
	await ctx.deleteMessage();

	const games = getAvailableGames(ctx.from!.id);

	if (games.length === 0) {
		await ctx.reply(ui.txt.noAvailableGames);
		return;
	}

	if (games.length === 1) {
		const roomId = games[0].roomId;
		const room = ORM.Rooms.getById(roomId);
		ctx.session.flow = { name: 'GAME_MAILING', roomId };
		await ctx.reply(ui.txt.sendMessagePrompt(room.name), { reply_markup: ui.cancelKeyboard() });
		return;
	}

	await ctx.reply(ui.txt.selectGame, { reply_markup: ui.gamesListKeyboard(games) });
};

export const mailingSelectCallbackHandler = async (ctx: CallbackCtx) => {
	await ctx.answerCallbackQuery();

	const roomId = getCallbackMeta(ctx.callbackQuery.data);
	if (!roomId) {
		return;
	}

	const gameSchema = ORM.Games.getActive(roomId);
	if (!gameSchema) {
		await ctx.editMessageText(ui.txt.noAvailableGames);
		return;
	}

	const room = ORM.Rooms.getById(roomId);
	const game = new Game({ id: gameSchema.id });

	if (!room.settings.allowMailing || !game.allPlayers.includes(ctx.from.id) || game.hasMailedThisTurn(ctx.from.id)) {
		await ctx.editMessageText(ui.txt.noAvailableGames);
		return;
	}

	ctx.session.flow = { name: 'GAME_MAILING', roomId };
	await ctx.editMessageText(ui.txt.sendMessagePrompt(room.name), { reply_markup: ui.cancelKeyboard() });
};

export const mailingCancelCallbackHandler = async (ctx: CallbackCtx) => {
	await ctx.answerCallbackQuery();
	ctx.session.flow = {};
	await ctx.editMessageText(ui.txt.sendMessageCancelled);
};

export const mailingTextHandler = async (ctx: MessageCtx) => {
	const roomId = ctx.session.flow.name === 'GAME_MAILING' ? ctx.session.flow.roomId : undefined;

	if (!roomId) {
		ctx.session.flow = {};
		return;
	}

	const text = ctx.message.text.trim();

	if (text.length < 1 || text.length > 300) {
		const room = ORM.Rooms.getById(roomId);
		await ctx.reply(ui.txt.sendMessagePrompt(room.name), { reply_markup: ui.cancelKeyboard() });
		return;
	}

	const room = ORM.Rooms.getById(roomId);
	const activeGameSchema = ORM.Games.getActive(roomId);

	if (!activeGameSchema) {
		ctx.session.flow = {};
		return;
	}

	const game = new Game({ id: activeGameSchema.id });

	if (!room.settings.allowMailing) {
		ctx.session.flow = {};
		await ctx.reply(ui.txt.mailingDisabled);
		return;
	}

	if (!game.allPlayers.includes(ctx.from.id) || game.hasMailedThisTurn(ctx.from.id)) {
		ctx.session.flow = {};
		return;
	}

	const sender = ORM.Users.get(ctx.from.id);
	const header = `${escapeHtml(room.name)} | ${escapeHtml(sender.name)}`;

	await game.mailing({ text: `${header}\n\n${escapeHtml(text)}` }, [ctx.from.id]);
	await game.markMailedThisTurn(ctx.from.id);

	ctx.session.flow = {};
	await ctx.reply(ui.txt.sendMessageSuccess);
};
