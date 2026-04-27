import { ORM } from '~/db';
import { Achievements, escapeHtml } from '~/shared/lib';
import { TurnStage } from '~/entities/game';
import { txt, gkb, InfoMessage, GameMessage } from '~/shared/ui/game';
import type { GameSchema } from '~/db';
import type { Game, Sender } from '~/entities/game';

import { SERVICES_CONFIG } from './config';
import type { GameServiceOptions, GameServiceOptionsStage, UpdateMessageOptionsStage } from './types';

export async function notifyInitialAthanasiuses (game: Game, sender: Sender): Promise<void> {
	for (const [playerIdStr, cardNames] of Object.entries(game.getAthanasiuses())) {
		if (cardNames.length === 0) {
			continue;
		}

		const playerId = Number(playerIdStr);
		await ORM.Users.awardAchievement(playerId, Achievements.DEAL_ATHANASIUS);
		await sender(playerId, InfoMessage.dealAthanasiusMe(cardNames));
		await game.mailing(
			{ text: InfoMessage.dealAthanasiusMailing(ORM.Users.get(playerId), cardNames) },
			[playerId],
			sender,
		);
	}
}

export async function sendFirstMessage (game: Game, sender: Sender, initial: boolean = false) {
	const canSendTurnMessage = await game.ensureActivePlayerHasCards();

	if (!canSendTurnMessage) {
		return;
	}

	let text: string;

	const gamePrefix = `${escapeHtml(game.gameName)}\n\n`;

	if (initial) {
		text = gamePrefix + txt.firstTurnMessage;
	} else {
		text = gamePrefix + txt.turnMessage;

		if (game.activePlayer.settings.updatesView === 'composed') {
			const lastRoundLogs = game.getLastRoundLogs();
			if (lastRoundLogs) {
				await sender(game.activePlayer.id, `${gamePrefix}Вот что было за последний круг:\n\n${lastRoundLogs}`);
			}
		}
	}

	await sender(game.activePlayer.id, text, {
		reply_markup: gkb.playersSelect({
			me: game.activePlayer.id,
			gameId: game.gameId,
			playerIds: game.playersWithCards,
		}),
	});
}

export async function notifyNextStage ({ ctx, game, turnMeta }: GameServiceOptions) {
	switch (turnMeta.stage) {
	case TurnStage.player:
		await ctx.editMessageText(
			withGameName(game, GameMessage.getCardSelectMessage(turnMeta)),
			{ reply_markup: gkb.cardSelect({ me: ctx.from.id, game, playerId: turnMeta.player.id }) },
		);
		break;
	case TurnStage.card:
		await ctx.editMessageText(
			withGameName(game, GameMessage.getCountSelectMessage(turnMeta, SERVICES_CONFIG.INITIAL_COUNT)),
			{ reply_markup: gkb.countSelect({ game, turnMeta, count: SERVICES_CONFIG.INITIAL_COUNT }) },
		);
		break;
	case TurnStage.count:
		await ctx.editMessageText(
			withGameName(game, GameMessage.getColorsSelectMessage(turnMeta, SERVICES_CONFIG.INITIAL_RED_COUNT)),
			{ reply_markup: gkb.colorsSelect({ game, turnMeta, redCount: SERVICES_CONFIG.INITIAL_RED_COUNT }) },
		);
		break;
	case TurnStage.colors:
		// Defensive guard for direct service calls; processTurn handles Joker colors as the final stage.
		if (turnMeta.cardName !== 'Joker') {
			await ctx.editMessageText(
				withGameName(game, GameMessage.getSuitsSelectMessage(turnMeta, SERVICES_CONFIG.INITIAL_SUITS)),
				{ reply_markup: gkb.suitsSelect({ game, turnMeta, suits: SERVICES_CONFIG.INITIAL_SUITS }) },
			);
		}
		break;
	}
}

export async function updateCountMessage ({ ctx, game, turnMeta, newCount }: UpdateMessageOptionsStage['Count']) {
	await ctx.editMessageText(
		withGameName(game, GameMessage.getCountSelectMessage(turnMeta, newCount)),
		{ reply_markup: gkb.countSelect({ game, turnMeta, count: newCount }) },
	);
}

export async function updateColorsMessage ({ ctx, game, turnMeta, newRedCount }: UpdateMessageOptionsStage['Colors']) {
	await ctx.editMessageText(
		withGameName(game, GameMessage.getColorsSelectMessage(turnMeta, newRedCount)),
		{ reply_markup: gkb.colorsSelect({ game, turnMeta, redCount: newRedCount }) },
	);
}

export async function updateSuitsMessage ({ ctx, game, turnMeta, newSuits }: UpdateMessageOptionsStage['Suits']) {
	await ctx.editMessageText(
		withGameName(game, GameMessage.getSuitsSelectMessage(turnMeta, newSuits)),
		{ reply_markup: gkb.suitsSelect({ game, turnMeta, suits: newSuits }) },
	);
}

function withGameName (game: Game, text: string): string {
	return `${escapeHtml(game.gameName)}\n\n${text}`;
}

async function notifyWrongTurn ({ ctx, game, me, sender }: Pick<GameServiceOptions, 'ctx' | 'game' | 'me' | 'sender'>, meText: string, mailingText: string): Promise<void> {
	await ctx.editMessageText(withGameName(game, meText));
	await game.realtimeMailing({ text: withGameName(game, mailingText) }, [me.id], sender);
	await sendFirstMessage(game, sender);
}

export async function notifyWrongCardMessage ({ ctx, game, me, turnMeta, sender }: GameServiceOptionsStage['Card']) {
	await notifyWrongTurn({ ctx, game, me, sender }, InfoMessage.wrongCardMe(turnMeta, me), InfoMessage.wrongCardMailing(turnMeta, me));
}

export async function notifyWrongCountMessage ({ ctx, game, me, turnMeta, sender }: GameServiceOptionsStage['Count']) {
	await notifyWrongTurn({ ctx, game, me, sender }, InfoMessage.wrongCountMe(turnMeta, me), InfoMessage.wrongCountMailing(turnMeta, me));
}

export async function notifyWrongColorsMessage ({ ctx, game, me, turnMeta, sender }: GameServiceOptionsStage['Colors']) {
	await notifyWrongTurn({ ctx, game, me, sender }, InfoMessage.wrongColorsMe(turnMeta, me), InfoMessage.wrongColorsMailing(turnMeta, me));
}

export async function notifyWrongSuitsMessage ({ ctx, game, me, turnMeta, sender }: GameServiceOptionsStage['Suits']) {
	await notifyWrongTurn({ ctx, game, me, sender }, InfoMessage.wrongSuitsMe(turnMeta, me), InfoMessage.wrongSuitsMailing(turnMeta, me));
}

export async function notifyStealMessage (
	{ ctx, game, me, turnMeta, sender }: GameServiceOptionsStage['Suits'],
	composeAthanasius: boolean,
) {
	await ctx.editMessageText(withGameName(game, GameMessage.getCardsStealMessage(turnMeta, me, composeAthanasius)));
	const mailingText = composeAthanasius
		? InfoMessage.stealWithAthanasiusMailing(turnMeta, me)
		: InfoMessage.stealCardsMailing(turnMeta, me);
	await game.realtimeMailing({ text: withGameName(game, mailingText) }, [me.id, turnMeta.player.id], sender);
	await sender(turnMeta.player.id, withGameName(game, InfoMessage.stealVictimMessage(turnMeta, me)));
}

export async function notifyJokerStealMessage (
	{ ctx, game, me, turnMeta, sender }: GameServiceOptionsStage['Colors'],
	composeAthanasius: boolean,
) {
	await ctx.editMessageText(withGameName(game, GameMessage.getJokerStealMessage(turnMeta, me, composeAthanasius)));
	const mailingText = composeAthanasius
		? InfoMessage.jokerStealWithAthanasiusMailing(turnMeta, me)
		: InfoMessage.jokerStealMailing(turnMeta, me);
	await game.realtimeMailing({ text: withGameName(game, mailingText) }, [me.id, turnMeta.player.id], sender);
	await sender(turnMeta.player.id, withGameName(game, InfoMessage.jokerStealVictimMessage(turnMeta, me)));
}

function getSortedAthanasiusesMap (athanasiuses: GameSchema['athanasiuses']): [string, number][] {
	const athanasiusesMap: [string, number][] = [];

	Object.entries(athanasiuses).forEach(([playerId, cardNames]) => {
		const player = ORM.Users.get(Number(playerId));
		athanasiusesMap.push([player.name, cardNames.length]);
	});

	return athanasiusesMap.sort((a, b) => b[1] - a[1]);
}

export async function notifyEndGameMessage (game: Game, sender: Sender) {
	await game.mailing({ text: InfoMessage.gameEndedMailing(getSortedAthanasiusesMap(game.getAthanasiuses())) }, [], sender);
}
