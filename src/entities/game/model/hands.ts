import { BaseDeck } from '~/entities/deck';
import type { CardId, CardName } from '~/entities/deck';
import type { GameUtils } from '~/db';
import { shuffleArray } from '~/shared/lib';

import { Hand } from './hand';
import type { Queue } from './queue';
import type { PlayerId } from '../types';

interface ConstructorOptionsInit {
	hands?: never;
	players: PlayerId[];
	decksCount: number;
	queue: Queue;
}

interface ConstructorOptionsByHands {
	hands: Record<PlayerId, CardId[]>;
	players?: never;
	decksCount?: never;
	queue?: never;
}

export class Hands {
	private readonly hands: Map<PlayerId, Hand>;

	constructor ({ hands, players, decksCount, queue }: ConstructorOptionsInit | ConstructorOptionsByHands) {
		if (hands) {
			this.hands = new Map();

			Object.keys(hands).map(Number).forEach(playerId => {
				this.hands.set(playerId, new Hand(hands[playerId]));
			});
		} else if (players && decksCount && queue) {
			const cardsIds = BaseDeck.getDeck().map(card => card.id);
			const mainDeck = shuffleArray<CardId>(Array(decksCount).fill(cardsIds).flat());

			this.hands = new Map();
			players.forEach(playerId => {
				this.hands.set(playerId, new Hand());
			});

			this.dealCards(mainDeck, players);
		} else {
			throw new Error('Hands options error');
		}
	}

	public hand (playerId: PlayerId): Hand {
		const hand = this.hands.get(playerId);

		if (!hand) {
			throw new Error(`No hand for player ${playerId}`);
		}

		return new Proxy(hand, {
			get (target, prop, receiver) {
				const value = Reflect.get(target, prop, receiver);
				return typeof value === 'function' ? value.bind(target) : value;
			},
		});
	}

	private dealCards (mainDeck: CardId[], players: PlayerId[]): void {
		let cardIndex = 0;

		while (cardIndex < mainDeck.length) {
			for (const playerId of players) {
				if (cardIndex >= mainDeck.length) {
					break;
				}

				const card = mainDeck[cardIndex];
				this.hand(playerId).pushCards([card]);
				cardIndex++;
			}
		}
	}

	get allHands (): Record<PlayerId, CardId[]> {
		const preResult = Object.fromEntries(this.hands);
		const result: Record<PlayerId, CardId[]> = {};

		Object.keys(preResult).map(Number).forEach(playerId => {
			result[playerId] = preResult[playerId.toString()].cardIds;
		});

		return result;
	}

	public getHand (playerId: PlayerId): Hand | undefined {
		return this.hand(playerId);
	}

	public moveCards (me: PlayerId, playerId: PlayerId, cardName: CardName, utils: GameUtils): CardName[] {
		const cardIds = this.hand(playerId).getCardsByName(cardName).map(card => card.id);

		this.hand(playerId).removeCards(cardIds);
		this.hand(me).pushCards(cardIds);
		return this.hand(me).handleAthanasiuses(utils);
	}

	public handleGameEnd (queue: PlayerId[]): boolean {
		for (const playerId of queue) {
			if (this.hand(playerId).cardsInHand.length > 0) {
				return false;
			}
		}
		return true;
	}
}
