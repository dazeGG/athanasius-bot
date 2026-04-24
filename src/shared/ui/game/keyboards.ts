import { InlineKeyboard } from 'grammy';

import { DB } from '~/db';
import { DeckConfig } from '~/entities/deck';
import { TurnStage } from '~/entities/game';
import type { GameId } from '~/db';
import type { CardName } from '~/entities/deck';
import type { Game, PlayerId, CardStageMeta, CountStageMeta, ColorsStageMeta, SuitsStageMeta, Suits } from '~/entities/game';
import { stringifyCallbackData } from '~/core/lib';

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

const gameTurnCallback = (meta: string) => stringifyCallbackData({ module: 'g', action: 't', meta });
const gameTurnConfirmCallback = (meta: string) => stringifyCallbackData({ module: 'g', action: 'tc', meta });
const gameTurnBackCallback = (meta: string) => stringifyCallbackData({ module: 'g', action: 'tb', meta });

export const gkb = {
	playersSelect: ({ me, gameId, playerIds }: PlayersSelectGKBOptions): InlineKeyboard => {
		const playersExceptMe = playerIds.filter(playerId => playerId !== me);
		const players = DB.data.users.filter(user => playersExceptMe.includes(user.id));

		const keyboard = new InlineKeyboard();
		players.forEach(player => {
			keyboard.text(
				player.name,
				gameTurnCallback(`${TurnStage.player}#${gameId}#${player.id}`),
			);
			keyboard.row();
		});
		return keyboard;
	},

	cardSelect: ({ me, game, playerId }: CardSelectGKBOptions): InlineKeyboard => {
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

		const keyboard = new InlineKeyboard();
		distributedCardNames.forEach(row => {
			row.forEach(cardName => {
				keyboard.text(
					DeckConfig.CARDS_VIEW_MAP[cardName],
					gameTurnCallback(`${TurnStage.card}#${game.gameId}#${playerId}#${cardName}`),
				);
			});
			keyboard.row();
		});
		keyboard.text('Назад', gameTurnBackCallback(`p#${game.gameId}`));
		return keyboard;
	},

	countSelect: ({ game, turnMeta, count }: CountSelectGKBOptions): InlineKeyboard => {
		const baseMeta = `${TurnStage.count}#${game.gameId}#${turnMeta.player.id}#${turnMeta.cardName}#${count}`;
		return buildSelectKeyboard(baseMeta, count > 1, count < game.cardsToAthanasius - 1);
	},

	colorsSelect: ({ game, turnMeta, redCount }: ColorsSelectGKBOptions): InlineKeyboard => {
		const baseMeta = `${TurnStage.colors}#${game.gameId}#${turnMeta.player.id}#${turnMeta.cardName}#${turnMeta.count}#${redCount}`;
		return buildSelectKeyboard(baseMeta, redCount > 0, redCount < turnMeta.count);
	},

	suitsSelect: ({ game, turnMeta, suits }: SuitsSelectGKBOptions): InlineKeyboard => {
		const actionButtons: string[] = [];
		const baseMeta = `${TurnStage.suits}#${game.gameId}#${turnMeta.player.id}#${turnMeta.cardName}#${turnMeta.count}#${turnMeta.redCount}#${suits.hearts}!${suits.diamonds}!${suits.spades}!${suits.clubs}!${suits.mode}`;

		if (turnMeta.redCount > 0) {
			if (suits.mode === '+' || (suits.mode === '-' && suits.hearts !== 0)) {
				actionButtons.push('♥️');
			}

			if (suits.mode === '+' || (suits.mode === '-' && suits.diamonds !== 0)) {
				actionButtons.push('♦️');
			}
		}

		if (turnMeta.redCount !== turnMeta.count) {
			if (suits.mode === '+' || (suits.mode === '-' && suits.spades !== 0)) {
				actionButtons.push('♠️');
			}

			if (suits.mode === '+' || (suits.mode === '-' && suits.clubs !== 0)) {
				actionButtons.push('♣️');
			}
		}

		const keyboard = new InlineKeyboard();

		actionButtons.forEach(button => {
			const suitChar = button === '♥️' ? 'h' : button === '♦️' ? 'd' : button === '♠️' ? 's' : 'c';
			keyboard.text(button, gameTurnCallback(baseMeta + '!' + suitChar));
		});
		keyboard.row();

		keyboard.text(suits.mode === '+' ? '➕ Добавить' : '➖ Убрать', gameTurnCallback(baseMeta + '!m'));
		keyboard.row();

		if (
			suits.hearts + suits.diamonds + suits.spades + suits.clubs === turnMeta.count
			&& suits.hearts + suits.diamonds === turnMeta.redCount
			&& suits.spades + suits.clubs === turnMeta.count - turnMeta.redCount
		) {
			keyboard.text('Выбрать', gameTurnCallback(baseMeta + '!select'));
		}

		return keyboard;
	},
} as const;

interface ConfirmSelectGKBOptions {
	yesMeta: string;
	noMeta: string;
}

export function buildConfirmKeyboard ({ yesMeta, noMeta }: ConfirmSelectGKBOptions): InlineKeyboard {
	return new InlineKeyboard()
		.text('Да', gameTurnConfirmCallback(yesMeta))
		.text('Нет', gameTurnBackCallback(noMeta));
}

function buildSelectKeyboard (baseMeta: string, canDecrement: boolean, canIncrement: boolean): InlineKeyboard {
	const keyboard = new InlineKeyboard();

	if (canDecrement) {
		keyboard.text('-', gameTurnCallback(baseMeta + '-'));
	}

	if (canIncrement) {
		keyboard.text('+', gameTurnCallback(baseMeta + '+'));
	}

	keyboard.row();
	keyboard.text('Выбрать', gameTurnCallback(baseMeta + 'select'));

	return keyboard;
}
