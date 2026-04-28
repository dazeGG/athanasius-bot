import { Deck } from '../../deck/deck';
import type { DeckType } from '../../deck/config';
import type { CardId, CardName } from '../../deck/types';
import { shuffleArray } from '../../lib/shuffle-array';
import type { GameUtilsParsed, PlayerId } from '../types';

import { Hand } from './hand';
import type { Queue } from './queue';

interface ConstructorOptionsInit {
	hands?: never;
	players: PlayerId[];
	decksCount: number;
	deckType: DeckType;
	queue: Queue;
}

interface ConstructorOptionsByHands {
	hands: Record<PlayerId, CardId[]>;
	players?: never;
	decksCount?: never;
	deckType?: never;
	queue?: never;
}

export class Hands {
	private readonly hands: Map<PlayerId, Hand>;

	constructor ({ hands, players, decksCount, deckType, queue }: ConstructorOptionsInit | ConstructorOptionsByHands) {
		if (hands) {
			this.hands = new Map();

			Object.keys(hands).map(Number).forEach(playerId => {
				this.hands.set(playerId, new Hand(hands[playerId]));
			});
		} else if (players && decksCount && deckType && queue) {
			const cardsIds = Deck.getDeck(deckType).map(card => card.id);
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

		return hand;
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

	public get allHands (): Record<PlayerId, CardId[]> {
		const result: Record<PlayerId, CardId[]> = {};
		this.hands.forEach((hand, playerId) => {
			result[playerId] = hand.cardIds;
		});
		return result;
	}

	public getHand (playerId: PlayerId): Hand | undefined {
		return this.hand(playerId);
	}

	public moveCards (me: PlayerId, playerId: PlayerId, cardName: CardName, utils: GameUtilsParsed): CardName[] {
		const cardIds = this.hand(playerId).getCardsByName(cardName).map(card => card.id);

		this.hand(playerId).removeCards(cardIds);
		this.hand(me).pushCards(cardIds);
		return this.hand(me).handleAthanasiuses(utils);
	}

	public collectInitialAthanasiuses (utils: GameUtilsParsed): Record<PlayerId, CardName[]> {
		const result: Record<PlayerId, CardName[]> = {};
		this.hands.forEach((hand, playerId) => {
			const athanasiuses = hand.handleAthanasiuses(utils);
			if (athanasiuses.length > 0) {
				result[playerId] = athanasiuses;
			}
		});
		return result;
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
