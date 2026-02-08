import { DB } from '~/db';
import { DeckConfig } from '~/entities/deck';
import { TurnStage } from '~/entities/game';
import type { RawButtons } from '~/core';
import type { GameId } from '~/db';
import type { CardName } from '~/entities/deck';
import type { Game, PlayerId, CardStageMeta, CountStageMeta, ColorsStageMeta, SuitsStageMeta, Suits } from '~/entities/game';

/**
 *  GENERABLE KEYBOARDS
 *  */
interface PlayersSelectGKBOptions {
	me: PlayerId;
	gameId: GameId;
	playerIds: PlayerId[];
}

interface CardSelectGKBOptions {
	me: PlayerId;
	game: Game;
	playerId: PlayerId;
}

interface BaseStageOptions {
	game: Game;
}

interface CountSelectGKBOptions extends BaseStageOptions {
	turnMeta: CardStageMeta | CountStageMeta;
	count: number;
}

interface ColorsSelectGKBOptions extends BaseStageOptions {
	turnMeta: CountStageMeta | ColorsStageMeta;
	redCount: number;
}

interface SuitsSelectGKBOptions extends BaseStageOptions {
	turnMeta: ColorsStageMeta | SuitsStageMeta;
	suits: Suits;
}

export const gkb = {
	playersSelect: ({ me, gameId, playerIds }: PlayersSelectGKBOptions): RawButtons => {
		const playersExceptMe = playerIds.filter(playerId => playerId !== me);
		const players = DB.data.users.filter(user => playersExceptMe.includes(user.id));

		return players.map(player => [{
			text: player.name,
			callback_data: { module: 'g', action: 't', meta: `${TurnStage.player}#${gameId}#${player.id}` },
		}]);
	},

	cardSelect: ({ me, game, playerId }: CardSelectGKBOptions): RawButtons => {
		const myHand = game.getHand(me);

		if (!myHand) {
			throw new Error('Cannot get my hand');
		}

		const uniqueCardNames = Array.from(new Set(myHand.cardsInHand.map(card => card.name)));

		uniqueCardNames.sort((a, b) => DeckConfig.RANKS_MAP[a] - DeckConfig.RANKS_MAP[b]);

		const distributedCardNames = uniqueCardNames.reduce((acc: [CardName[]], cardName) => {
			if (acc[acc.length - 1].length === 4) {
				acc.push([]);
			}

			acc[acc.length - 1].push(cardName);

			return acc;
		}, [[]]);

		return distributedCardNames.map(row => row.map(cardName => ({
			text: DeckConfig.CARDS_VIEW_MAP[cardName],
			callback_data: { module: 'g', action: 't', meta: `${TurnStage.card}#${game.gameId}#${playerId}#${cardName}` },
		})));
	},

	countSelect: ({ game, turnMeta, count }: CountSelectGKBOptions): RawButtons => {
		const actionButtons = [];
		const baseMeta = `${TurnStage.count}#${game.gameId}#${turnMeta.player.id}#${turnMeta.cardName}#${count}`;

		if (count > 1) {
			actionButtons.push({ text: '-', callback_data: { module: 'g',action: 't',meta: baseMeta + '-' } });
		}

		if (count < game.cardsToAthanasius - 1) {
			actionButtons.push({ text: '+', callback_data: { module: 'g',action: 't',meta: baseMeta + '+' } });
		}

		return [
			actionButtons,
			[{ text: 'Выбрать', callback_data: { module: 'g',action: 't',meta: baseMeta + 'select' } }],
		];
	},

	colorsSelect: ({ game, turnMeta, redCount }: ColorsSelectGKBOptions): RawButtons => {
		const actionButtons = [];
		const baseMeta = `${TurnStage.colors}#${game.gameId}#${turnMeta.player.id}#${turnMeta.cardName}#${turnMeta.count}#${redCount}`;

		if (redCount > 0) {
			actionButtons.push({ text: '-', callback_data: { module: 'g', action: 't', meta: baseMeta + '-' } });
		}

		if (redCount < turnMeta.count) {
			actionButtons.push({ text: '+', callback_data: { module: 'g', action: 't', meta: baseMeta + '+' } });
		}

		return [
			actionButtons,
			[{ text: 'Выбрать', callback_data: { module: 'g', action: 't', meta: baseMeta + 'select' } }],
		];
	},

	suitsSelect: ({ game, turnMeta, suits }: SuitsSelectGKBOptions): RawButtons => {
		const actionButtons = [];
		const baseMeta = `${TurnStage.suits}#${game.gameId}#${turnMeta.player.id}#${turnMeta.cardName}#${turnMeta.count}#${turnMeta.redCount}#${suits.hearts}!${suits.diamonds}!${suits.spades}!${suits.clubs}!${suits.mode}`;

		if (turnMeta.redCount > 0) {
			if (suits.mode === '+' || (suits.mode === '-' && suits.hearts !== 0)) {
				actionButtons.push({
					text: '♥️',
					callback_data: {
						module: 'g',
						action: 't',
						meta: baseMeta + '!h',
					},
				});
			}

			if (suits.mode === '+' || (suits.mode === '-' && suits.diamonds !== 0)) {
				actionButtons.push({
					text: '♦️',
					callback_data: {
						module: 'g',
						action: 't',
						meta: baseMeta + '!d',
					},
				});
			}
		}

		if (turnMeta.redCount !== turnMeta.count) {
			if (suits.mode === '+' || (suits.mode === '-' && suits.spades !== 0)) {
				actionButtons.push({
					text: '♠️',
					callback_data: {
						module: 'g',
						action: 't',
						meta: baseMeta + '!s',
					},
				});
			}

			if (suits.mode === '+' || (suits.mode === '-' && suits.clubs !== 0)) {
				actionButtons.push({
					text: '♣️',
					callback_data: {
						module: 'g',
						action: 't',
						meta: baseMeta + '!c',
					},
				});
			}
		}

		const keyboard = [
			actionButtons,
			[{
				text: 'mode: ' + suits.mode,
				callback_data: { module: 'g', action: 't', meta: baseMeta + '!m' },
			}],
		];

		if (
			suits.hearts + suits.diamonds + suits.spades + suits.clubs === turnMeta.count
			&& suits.hearts + suits.diamonds === turnMeta.redCount
			&& suits.spades + suits.clubs === turnMeta.count - turnMeta.redCount
		) {
			keyboard.push([{ text: 'Выбрать', callback_data: { module: 'g', action: 't', meta: baseMeta + '!select' } }]);
		}

		return keyboard;
	},
} as const;
