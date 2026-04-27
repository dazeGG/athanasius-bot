import { logGameEvent } from '~/core/lib';
import type { UserSchema } from '~/db';
import type { Game, TurnMeta } from '~/entities/game';
import { TurnStage } from '~/entities/game';

export const STALE_GAME_MESSAGE_TEXT = 'Игровое сообщение устарело, открой комнату заново';

export class InvalidGameFlowError extends Error {}

export const isInvalidGameFlowError = (error: unknown): error is InvalidGameFlowError => {
	return error instanceof InvalidGameFlowError;
};

const throwInvalidGameFlow = (): never => {
	throw new InvalidGameFlowError(STALE_GAME_MESSAGE_TEXT);
};

const validateCount = (count: number, maxCount: number): void => {
	if (!Number.isInteger(count) || count < 1 || count > maxCount) {
		throwInvalidGameFlow();
	}
};

export const validateTurnMeta = ({
	game,
	me,
	turnMeta,
}: {
	game: Game;
	me: UserSchema;
	turnMeta: TurnMeta;
}): void => {
	if (game.isEnded) {
		logGameEvent({
			type: 'ACTION_ON_ENDED_GAME',
			gameId: game.gameId,
			playerId: me.id,
		});
		throwInvalidGameFlow();
	}

	if (game.activePlayer.id !== me.id) {
		throwInvalidGameFlow();
	}

	if (!game.allPlayers.includes(me.id) || !game.allPlayers.includes(turnMeta.player.id)) {
		throwInvalidGameFlow();
	}

	if (turnMeta.player.id === me.id) {
		throwInvalidGameFlow();
	}

	if (!game.playersWithCards.includes(turnMeta.player.id)) {
		throwInvalidGameFlow();
	}

	if (turnMeta.stage === TurnStage.player) {
		return;
	}

	const myHand = game.getHand(me.id);

	if (!myHand || !myHand.has({ cardName: turnMeta.cardName })) {
		throwInvalidGameFlow();
	}

	const maxCount = game.getCardsToAthanasiusForRank(turnMeta.cardName) - 1;

	switch (turnMeta.stage) {
	case TurnStage.card:
		return;

	case TurnStage.count:
		validateCount(turnMeta.count, maxCount);
		return;

	case TurnStage.colors:
		validateCount(turnMeta.count, maxCount);

		if (!Number.isInteger(turnMeta.redCount) || turnMeta.redCount < 0 || turnMeta.redCount > turnMeta.count) {
			throwInvalidGameFlow();
		}

		if (turnMeta.blackCount !== turnMeta.count - turnMeta.redCount) {
			throwInvalidGameFlow();
		}

		return;

	case TurnStage.suits: {
		validateCount(turnMeta.count, maxCount);

		const { hearts, diamonds, spades, clubs, mode, action } = turnMeta.suits;
		const suitCounts = [hearts, diamonds, spades, clubs];

		if (suitCounts.some(count => !Number.isInteger(count) || count < 0)) {
			throwInvalidGameFlow();
		}

		if (mode !== '+' && mode !== '-') {
			throwInvalidGameFlow();
		}

		if (!action || !['h', 'd', 's', 'c', 'm', 'select'].includes(action)) {
			throwInvalidGameFlow();
		}

		const redCount = hearts + diamonds;
		const blackCount = spades + clubs;
		const totalCount = redCount + blackCount;

		if (action === 'select') {
			if (redCount !== turnMeta.redCount || blackCount !== turnMeta.blackCount || totalCount !== turnMeta.count) {
				throwInvalidGameFlow();
			}
		}

		return;
	}
	}
};
