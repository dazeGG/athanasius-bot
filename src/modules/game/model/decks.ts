import type { Card, CardId } from '~/core';
import { DB } from '~/core';
import { shuffleArray } from '~/lib';

import type { PlayerId } from '../types';
import type { Queue } from '.';

const getCard = (cardId: CardId): Card | undefined =>
	DB.data.cards.find(card => card.id === cardId);

const getPrettyCard = (card: Card): string => card.name + card.suit[0];

class Deck {
	private readonly deck: CardId[];

	constructor (deck?: CardId[]) {
		this.deck = deck ?? [];
	}

	pushCard (cardId: CardId): void {
		this.deck.push(cardId);
	}

	toString (): string {
		return `Deck(${this.deck.length} cards): [${this.deck.map(cardId => getPrettyCard(getCard(cardId))).join(', ')}]`;
	}

	[Symbol.for('nodejs.util.inspect.custom')] (): string {
		return this.toString();
	}
}

interface ConstructorOptionsInit {
	decks?: never;
	players: PlayerId[];
	decksCount: number;
	queue: Queue;
}

interface ConstructorOptionsByDecks {
	decks: Record<PlayerId, CardId[]>;
	players?: never;
	decksCount?: never;
	queue?: never;
}

export class Decks {
	private readonly decks: Record<PlayerId, Deck>;

	constructor ({ decks, players, decksCount, queue }: ConstructorOptionsInit | ConstructorOptionsByDecks) {
		if (decks) {
			this.decks = {};

			Object.keys(decks).forEach(playerId => {
				this.decks[+playerId as PlayerId] = new Deck(decks[+playerId as PlayerId]);
			});
		} else if (players && decksCount && queue) {
			const cardsIds = DB.data.cards.map(card => card.id);
			const mainDeck = shuffleArray<CardId>(Array(decksCount).fill(cardsIds).flat());

			this.decks = {};
			players.forEach(playerId => {
				this.decks[playerId] = new Deck();
			});

			this.dealCards(mainDeck, players);
		} else {
			throw new Error('Decks options error');
		}
	}

	private dealCards (mainDeck: CardId[], players: PlayerId[]): void {
		let cardIndex = 0;

		while (cardIndex < mainDeck.length) {
			for (const playerId of players) {
				if (cardIndex >= mainDeck.length) {
					break;
				}

				const card = mainDeck[cardIndex];
				this.decks[playerId].pushCard(card);
				cardIndex++;
			}
		}
	}
}
