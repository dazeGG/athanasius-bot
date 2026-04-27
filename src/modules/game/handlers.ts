import { DB } from '~/db';
import type { ConfirmModeSettings, UserSchema } from '~/db';
import { BOT, logGameEvent } from '~/core';
import { Game, processTurn, TurnStage } from '~/entities/game';
import type { TurnMeta, CountStageMeta, ColorsStageMeta, SuitsStageMeta } from '~/entities/game';
import { getCallbackMeta } from '~/core/lib';
import { GameMessage, gkb, buildConfirmKeyboard } from '~/shared/ui/game';
import type { CallbackCtx } from '~/core';

import * as lib from './lib';

const SLOW_OPERATION_THRESHOLD_MS = 5000;

const logSlowOperation = (startTime: number): void => {
	const duration = Date.now() - startTime;
	if (duration > SLOW_OPERATION_THRESHOLD_MS) {
		logGameEvent({
			type: 'SLOW_OPERATION',
			operation: 'processTurn',
			durationMs: duration,
			thresholdMs: SLOW_OPERATION_THRESHOLD_MS,
		});
	}
};

function isConfirmEnabledForStage (confirmMode: ConfirmModeSettings | undefined, turnMeta: TurnMeta): boolean {
	if (!confirmMode) {
		return false;
	}

	switch (turnMeta.stage) {
	case TurnStage.card: return confirmMode.card;
	case TurnStage.count: return confirmMode.count;
	case TurnStage.colors: return confirmMode.colors;
	case TurnStage.suits: return confirmMode.suits;
	default: return false;
	}
}

function isConfirmTrigger (turnMeta: TurnMeta): boolean {
	switch (turnMeta.stage) {
	case TurnStage.player:
		return false;
	case TurnStage.card:
		return true;
	case TurnStage.count:
		return turnMeta.countAction === 'select';
	case TurnStage.colors:
		return turnMeta.redCountAction === 'select';
	case TurnStage.suits:
		return turnMeta.suits.action === 'select';
	}
}

function buildNoMeta (turnMeta: TurnMeta): string {
	switch (turnMeta.stage) {
	case TurnStage.player:
		// unreachable: isConfirmTrigger returns false for player stage
		return `p#${turnMeta.gameId}`;
	case TurnStage.card:
		return `c#${turnMeta.gameId}#${turnMeta.player.id}`;
	case TurnStage.count: {
		const meta = turnMeta as CountStageMeta;
		return `${TurnStage.count}#${meta.gameId}#${meta.player.id}#${meta.cardName}#${meta.count}+`;
	}
	case TurnStage.colors: {
		const meta = turnMeta as ColorsStageMeta;
		return `${TurnStage.colors}#${meta.gameId}#${meta.player.id}#${meta.cardName}#${meta.count}#${meta.redCount}+`;
	}
	case TurnStage.suits: {
		const meta = turnMeta as SuitsStageMeta;
		const { hearts, diamonds, spades, clubs, mode } = meta.suits;
		// "!m" is a valid suits action (toggle mode); back-handler ignores the action and just re-renders the keyboard
		return `${TurnStage.suits}#${meta.gameId}#${meta.player.id}#${meta.cardName}#${meta.count}#${meta.redCount}#${hearts}!${diamonds}!${spades}!${clubs}!${mode}!m`;
	}
	}
}

async function showConfirm (ctx: CallbackCtx, turnMeta: TurnMeta, callbackMeta: string): Promise<void> {
	const noMeta = buildNoMeta(turnMeta);
	const keyboard = buildConfirmKeyboard({ yesMeta: callbackMeta, noMeta });
	await ctx.editMessageText(GameMessage.getConfirmMessage(turnMeta), { reply_markup: keyboard, parse_mode: 'HTML' });
}

async function resolveTurnContext (ctx: CallbackCtx, callbackMeta: string): Promise<{ turnMeta: TurnMeta; game: Game; me: UserSchema } | null> {
	const turnMeta = lib.parseTurnMeta(callbackMeta);
	const game = new Game({ id: turnMeta.gameId });
	const me = DB.data.users.find(u => u.id === ctx.from.id);
	if (!me) {
		await ctx.reply(lib.STALE_GAME_MESSAGE_TEXT);
		return null;
	}
	lib.validateTurnMeta({ game, me, turnMeta });
	return { turnMeta, game, me };
}

export const gameTurnCallbackHandler = async (ctx: CallbackCtx) => {
	await ctx.answerCallbackQuery();

	const callbackMeta = getCallbackMeta(ctx.callbackQuery.data);

	if (!callbackMeta) {
		await ctx.reply(lib.STALE_GAME_MESSAGE_TEXT);
		return;
	}

	const startTime = Date.now();

	try {
		const resolved = await resolveTurnContext(ctx, callbackMeta);
		if (!resolved) {
			return;
		}

		const { turnMeta, game, me } = resolved;

		if (isConfirmEnabledForStage(me.settings.confirmMode, turnMeta) && isConfirmTrigger(turnMeta)) {
			await showConfirm(ctx, turnMeta, callbackMeta);
			return;
		}

		await processTurn({ ctx, game, me, turnMeta, sender: BOT.api.sendMessage.bind(BOT.api) });
	} catch (error) {
		if (lib.isInvalidGameFlowError(error) || (error instanceof Error && error.message === 'Game not found')) {
			await ctx.reply(lib.STALE_GAME_MESSAGE_TEXT);
			return;
		}

		throw error;
	} finally {
		logSlowOperation(startTime);
	}
};

export const gameTurnConfirmCallbackHandler = async (ctx: CallbackCtx) => {
	await ctx.answerCallbackQuery();

	const callbackMeta = getCallbackMeta(ctx.callbackQuery.data);

	if (!callbackMeta) {
		await ctx.reply(lib.STALE_GAME_MESSAGE_TEXT);
		return;
	}

	const startTime = Date.now();

	try {
		const resolved = await resolveTurnContext(ctx, callbackMeta);
		if (!resolved) {
			return;
		}

		const { turnMeta, game, me } = resolved;

		await processTurn({ ctx, game, me, turnMeta, sender: BOT.api.sendMessage.bind(BOT.api) });
	} catch (error) {
		if (lib.isInvalidGameFlowError(error) || (error instanceof Error && error.message === 'Game not found')) {
			await ctx.reply(lib.STALE_GAME_MESSAGE_TEXT);
			return;
		}

		throw error;
	} finally {
		logSlowOperation(startTime);
	}
};

async function resolveActivePlayerForGame (ctx: CallbackCtx, gameId: string): Promise<{ game: Game; me: ReturnType<typeof DB.data.users.find> & object } | null> {
	const game = new Game({ id: gameId });
	const me = DB.data.users.find(u => u.id === ctx.from.id);
	if (!me) {
		await ctx.reply(lib.STALE_GAME_MESSAGE_TEXT);
		return null;
	}
	if (game.activePlayer.id !== me.id) {
		await ctx.reply(lib.STALE_GAME_MESSAGE_TEXT);
		return null;
	}
	return { game, me };
}

export const gameTurnBackCallbackHandler = async (ctx: CallbackCtx) => {
	await ctx.answerCallbackQuery();

	const callbackMeta = getCallbackMeta(ctx.callbackQuery.data);

	if (!callbackMeta) {
		await ctx.reply(lib.STALE_GAME_MESSAGE_TEXT);
		return;
	}

	try {
		const [prefix, ...rest] = callbackMeta.split('#');

		if (prefix === 'p') {
			const [gameId] = rest;
			const resolved = await resolveActivePlayerForGame(ctx, gameId);
			if (!resolved) {
				return;
			}

			const { game, me } = resolved;

			await ctx.editMessageText(
				'<b>Твой ход!</b>\n\nВыбери у кого хочешь спросить карту',
				{
					reply_markup: gkb.playersSelect({ me: me.id, gameId, playerIds: game.playersWithCards }),
					parse_mode: 'HTML',
				},
			);
			return;
		}

		if (prefix === 'c') {
			const [gameId, playerIdStr] = rest;
			const resolved = await resolveActivePlayerForGame(ctx, gameId);
			if (!resolved) {
				return;
			}

			const { game, me } = resolved;

			const turnMeta = lib.parseTurnMeta(`${TurnStage.player}#${gameId}#${playerIdStr}`);
			await ctx.editMessageText(
				GameMessage.getCardSelectMessage(turnMeta),
				{
					reply_markup: gkb.cardSelect({ me: me.id, game, playerId: Number(playerIdStr) }),
					parse_mode: 'HTML',
				},
			);
			return;
		}

		const resolved = await resolveTurnContext(ctx, callbackMeta);
		if (!resolved) {
			return;
		}

		const { turnMeta, game } = resolved;

		switch (turnMeta.stage) {
		case TurnStage.count: {
			const meta = turnMeta as CountStageMeta;
			await ctx.editMessageText(
				GameMessage.getCountSelectMessage(meta, meta.count),
				{
					reply_markup: gkb.countSelect({ game, turnMeta: meta, count: meta.count }),
					parse_mode: 'HTML',
				},
			);
			break;
		}
		case TurnStage.colors: {
			const meta = turnMeta as ColorsStageMeta;
			await ctx.editMessageText(
				GameMessage.getColorsSelectMessage(meta, meta.redCount),
				{
					reply_markup: gkb.colorsSelect({ game, turnMeta: meta, redCount: meta.redCount }),
					parse_mode: 'HTML',
				},
			);
			break;
		}
		case TurnStage.suits: {
			const meta = turnMeta as SuitsStageMeta;
			await ctx.editMessageText(
				GameMessage.getSuitsSelectMessage(meta, meta.suits),
				{
					reply_markup: gkb.suitsSelect({ game, turnMeta: meta, suits: meta.suits }),
					parse_mode: 'HTML',
				},
			);
			break;
		}
		default:
			await ctx.reply(lib.STALE_GAME_MESSAGE_TEXT);
		}
	} catch (error) {
		if (lib.isInvalidGameFlowError(error) || (error instanceof Error && error.message === 'Game not found')) {
			await ctx.reply(lib.STALE_GAME_MESSAGE_TEXT);
			return;
		}

		throw error;
	}
};
