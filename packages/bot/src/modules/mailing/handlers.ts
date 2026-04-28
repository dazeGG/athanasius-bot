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
		const sent = await ctx.reply(ui.txt.sendMessagePrompt(room.name), { reply_markup: ui.cancelKeyboard() });
		ctx.session.flow = { name: 'GAME_MAILING', roomId, promptMessageId: sent.message_id };
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

	const edited = await ctx.editMessageText(ui.txt.sendMessagePrompt(room.name), { reply_markup: ui.cancelKeyboard() });
	const promptMessageId = typeof edited !== 'boolean' ? edited.message_id : undefined;
	ctx.session.flow = { name: 'GAME_MAILING', roomId, promptMessageId };
};

export const mailingCancelCallbackHandler = async (ctx: CallbackCtx) => {
	await ctx.answerCallbackQuery();
	ctx.session.flow = {};
	await ctx.editMessageText(ui.txt.sendMessageCancelled);
};

export const mailingTextHandler = async (ctx: MessageCtx) => {
	if (ctx.session.flow.name !== 'GAME_MAILING') {
		ctx.session.flow = {};
		return;
	}

	const { roomId, promptMessageId } = ctx.session.flow;

	const text = ctx.message.text.trim();

	if (text.length < 1 || text.length > 300) {
		const room = ORM.Rooms.getById(roomId);
		if (promptMessageId) {
			await ctx.api.deleteMessage(ctx.chat.id, promptMessageId);
		}
		const sent = await ctx.reply(ui.txt.sendMessagePrompt(room.name), { reply_markup: ui.cancelKeyboard() });
		ctx.session.flow = { name: 'GAME_MAILING', roomId, promptMessageId: sent.message_id };
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
	if (promptMessageId) {
		await ctx.api.deleteMessage(ctx.chat.id, promptMessageId);
	}
	await ctx.reply(ui.txt.sendMessageSuccess);
};
