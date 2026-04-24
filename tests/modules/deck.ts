/**
 * deck.ts — unit tests for Deck and DeckConfig covering new 36/52/54 deck types and joker mechanics.
 */
import { Deck, DeckConfig } from '../../src/entities/deck';

import { assert } from '../runner';
import type { ModuleTools } from '../runner';

export async function deckModule ({ runCase }: ModuleTools): Promise<void> {
	/* ─── DeckConfig ─────────────────────────────────────────────────────────── */

	await runCase('DeckConfig.isCardName accepts all ranks including Joker', () => {
		assert(DeckConfig.isCardName('Joker'), 'Joker should be a valid card name');
		assert(DeckConfig.isCardName('A'), '"A" should be a valid card name');
		assert(DeckConfig.isCardName('2'), '"2" should be a valid card name');
		assert(!DeckConfig.isCardName('X'), '"X" should not be a valid card name');
		assert(!DeckConfig.isCardName(''), 'empty string should not be a valid card name');
		assert(!DeckConfig.isCardName('joker'), 'lowercase "joker" should not match');
	});

	await runCase('DeckConfig.BLACK_SUITS contains Spades and Clubs only', () => {
		const bs = DeckConfig.BLACK_SUITS;
		assert(bs.includes('Spades'), 'BLACK_SUITS should include Spades');
		assert(bs.includes('Clubs'), 'BLACK_SUITS should include Clubs');
		assert(!bs.includes('Hearts' as never), 'BLACK_SUITS must not include Hearts');
		assert(!bs.includes('Diamonds' as never), 'BLACK_SUITS must not include Diamonds');
	});

	await runCase('DeckConfig.RANKS_36 has exactly 9 ranks starting from 6', () => {
		const names = DeckConfig.RANKS_36.map(r => r.name);
		assert(names.length === 9, `RANKS_36 should have 9 ranks, got ${names.length}`);
		assert(names[0] === '6', `First rank should be 6, got ${names[0]}`);
		assert(names[names.length - 1] === 'A', `Last rank should be A, got ${names[names.length - 1]}`);
		const forbidden = ['2', '3', '4', '5'];
		forbidden.forEach(r => {
			assert(!names.includes(r as never), `RANKS_36 must not include rank ${r}`);
		});
	});

	await runCase('DeckConfig.RANKS_MAP has Joker with value 15', () => {
		assert(DeckConfig.RANKS_MAP['Joker'] === 15, 'Joker rank value should be 15');
		assert(DeckConfig.RANKS_MAP['A'] === 14, 'A rank value should be 14');
	});

	await runCase('DeckConfig.CARDS_VIEW_MAP maps Joker to the joker emoji', () => {
		assert(DeckConfig.CARDS_VIEW_MAP['Joker'] === '🃏', 'Joker view should be 🃏');
	});

	/* ─── getDeck sizes ──────────────────────────────────────────────────────── */

	await runCase('getDeck(52) returns 52 unique non-joker cards', () => {
		const deck = Deck.getDeck(52);
		assert(deck.length === 52, `Expected 52 cards, got ${deck.length}`);
		assert(!deck.some(c => c.name === 'Joker'), '52-deck must not contain jokers');
		const ids = new Set(deck.map(c => c.id));
		assert(ids.size === 52, 'All IDs in 52-deck must be unique');
	});

	await runCase('getDeck(36) returns 36 unique non-joker cards with ranks 6–A only', () => {
		const deck = Deck.getDeck(36);
		assert(deck.length === 36, `Expected 36 cards, got ${deck.length}`);
		assert(!deck.some(c => c.name === 'Joker'), '36-deck must not contain jokers');
		const forbidden = ['2', '3', '4', '5'];
		forbidden.forEach(rank => {
			assert(!deck.some(c => c.name === rank), `36-deck must not contain rank ${rank}`);
		});
		const ids = new Set(deck.map(c => c.id));
		assert(ids.size === 36, 'All IDs in 36-deck must be unique');
	});

	await runCase('getDeck(36) uses globally resolvable standard card IDs', () => {
		const deck = Deck.getDeck(36);
		for (const card of deck) {
			const resolved = Deck.getCardById(card.id);
			assert(resolved !== undefined, `Card ID ${card.id} must resolve globally`);
			assert(resolved.name === card.name, `Card ID ${card.id} should resolve to ${card.name}, got ${resolved.name}`);
			assert(resolved.suit === card.suit, `Card ID ${card.id} should resolve to ${card.suit}, got ${resolved.suit}`);
		}
	});

	await runCase('getDeck(54) returns 54 cards including exactly 2 jokers', () => {
		const deck = Deck.getDeck(54);
		assert(deck.length === 54, `Expected 54 cards, got ${deck.length}`);
		const jokers = deck.filter(c => c.name === 'Joker');
		assert(jokers.length === 2, `Expected 2 jokers, got ${jokers.length}`);
		const ids = new Set(deck.map(c => c.id));
		assert(ids.size === 54, 'All IDs in 54-deck must be unique');
	});

	await runCase('getDeck() without arguments defaults to the 52-card deck', () => {
		const deck = Deck.getDeck();
		assert(deck.length === 52, `getDeck() default should be 52, got ${deck.length}`);
	});

	await runCase('getDeckSize returns 36, 52, and 54 for each deck type', () => {
		assert(Deck.getDeckSize(36) === 36, 'getDeckSize(36) should be 36');
		assert(Deck.getDeckSize(52) === 52, 'getDeckSize(52) should be 52');
		assert(Deck.getDeckSize(54) === 54, 'getDeckSize(54) should be 54');
	});

	await runCase('getDeck returns a fresh clone each call (not a shared reference)', () => {
		const d1 = Deck.getDeck(52);
		const d2 = Deck.getDeck(52);
		d1[0].name = 'A';
		assert(d2[0].name === '2', 'getDeck must return a deep clone, not a shared reference');
	});

	/* ─── Joker card properties ───────────────────────────────────────────────── */

	await runCase('Jokers have null suit and symbol, value 15, and IDs 53/54', () => {
		const deck = Deck.getDeck(54);
		const jokers = deck.filter(c => c.name === 'Joker');
		assert(jokers.length === 2, 'Should be exactly 2 jokers in 54-deck');

		for (const j of jokers) {
			assert(j.suit === null, `Joker suit must be null, got ${j.suit}`);
			assert(j.symbol === null, `Joker symbol must be null, got ${j.symbol}`);
			assert(j.value === 15, `Joker value must be 15, got ${j.value}`);
		}

		const colors = jokers.map(j => j.color);
		assert(colors.includes('red'), 'Should have a red joker');
		assert(colors.includes('black'), 'Should have a black joker');

		const jokerIds = jokers.map(j => j.id).sort((a, b) => a - b);
		assert(jokerIds[0] === 53 && jokerIds[1] === 54, `Joker IDs should be 53 and 54, got ${jokerIds}`);
	});

	/* ─── getCardById ─────────────────────────────────────────────────────────── */

	await runCase('getCardById resolves regular card IDs', () => {
		const card = Deck.getCardById(1);
		assert(card !== undefined, 'Card ID 1 should exist');
		assert(card!.id === 1, 'getCardById(1).id must equal 1');
	});

	await runCase('getCardById resolves joker IDs 53 (red) and 54 (black)', () => {
		const red = Deck.getCardById(53);
		const black = Deck.getCardById(54);
		assert(red !== undefined, 'Card ID 53 (red joker) must be found');
		assert(black !== undefined, 'Card ID 54 (black joker) must be found');
		assert(red!.name === 'Joker', 'ID 53 must be Joker');
		assert(black!.name === 'Joker', 'ID 54 must be Joker');
		assert(red!.color === 'red', 'ID 53 must be the red joker');
		assert(black!.color === 'black', 'ID 54 must be the black joker');
	});

	await runCase('getCardById returns undefined for a non-existent ID', () => {
		assert(Deck.getCardById(9999) === undefined, 'ID 9999 must return undefined');
		assert(Deck.getCardById(0) === undefined, 'ID 0 must return undefined');
	});

	/* ─── getCacheForDeckType ─────────────────────────────────────────────────── */

	await runCase('getCacheForDeckType returns the cache of the correct size', () => {
		assert(Deck.getCacheForDeckType(36).size === 36, '36-cache size must be 36');
		assert(Deck.getCacheForDeckType(52).size === 52, '52-cache size must be 52');
		assert(Deck.getCacheForDeckType(54).size === 54, '54-cache size must be 54');
	});

	await runCase('getCacheForDeckType(36) contains only ranks 6–A cards', () => {
		const cache36 = Deck.getCacheForDeckType(36);
		for (const card of cache36.values()) {
			const forbidden = ['2', '3', '4', '5'];
			assert(!forbidden.includes(card.name), `36-cache must not contain rank ${card.name}`);
		}
	});

	await runCase('getCacheForDeckType(54) contains red and black jokers', () => {
		const cache54 = Deck.getCacheForDeckType(54);
		const jokers = [...cache54.values()].filter(c => c.name === 'Joker');
		assert(jokers.length === 2, `54-cache must have 2 jokers, got ${jokers.length}`);
		assert(jokers.some(j => j.color === 'red'), '54-cache must have a red joker');
		assert(jokers.some(j => j.color === 'black'), '54-cache must have a black joker');
	});

	/* ─── sortByValue ─────────────────────────────────────────────────────────── */

	await runCase('sortByValue handles jokers without throwing', () => {
		const deck = Deck.getDeck(54);
		let threw = false;
		try {
			Deck.sortByValue(deck);
		} catch {
			threw = true;
		}
		assert(!threw, 'sortByValue must not throw when deck contains jokers');
	});

	await runCase('sortByValue places jokers last in ascending order (highest value 15)', () => {
		const deck = Deck.getDeck(54);
		const sorted = Deck.sortByValue(deck, 'asc');
		const lastTwo = sorted.slice(-2);
		assert(lastTwo.every(c => c.name === 'Joker'), 'The last 2 cards in ascending sort must be jokers');
	});

	await runCase('sortByValue places jokers first in descending order', () => {
		const deck = Deck.getDeck(54);
		const sorted = Deck.sortByValue(deck, 'desc');
		const firstTwo = sorted.slice(0, 2);
		assert(firstTwo.every(c => c.name === 'Joker'), 'The first 2 cards in descending sort must be jokers');
	});

	/* ─── getMyHandView ───────────────────────────────────────────────────────── */

	await runCase('getMyHandView returns the empty-hand message for an empty array', () => {
		const view = Deck.getMyHandView([]);
		assert(view.includes('закончились'), 'Empty hand must show the "cards ended" message');
	});

	await runCase('getMyHandView shows a joker section with red joker', () => {
		const redJoker = Deck.getCardById(53)!;
		const view = Deck.getMyHandView([redJoker]);
		assert(view.includes('🃏'), 'Hand view with joker must contain 🃏');
		assert(view.includes('🔴'), 'Hand view with red joker must contain 🔴');
	});

	await runCase('getMyHandView shows separate red and black joker counts', () => {
		const redJoker = Deck.getCardById(53)!;
		const blackJoker = Deck.getCardById(54)!;
		const view = Deck.getMyHandView([redJoker, blackJoker]);
		assert(view.includes('🔴 1'), 'Must show 1 red joker');
		assert(view.includes('⚫ 1'), 'Must show 1 black joker');
	});

	await runCase('getMyHandView shows only black joker section when no red jokers present', () => {
		const blackJoker = Deck.getCardById(54)!;
		const view = Deck.getMyHandView([blackJoker]);
		assert(view.includes('⚫ 1'), 'Must show 1 black joker');
		assert(!view.includes('🔴'), 'Must not show 🔴 when no red jokers');
	});

	await runCase('getMyHandView does not include joker line for a regular-card hand', () => {
		const regularCard = Deck.getCardById(1)!;
		const view = Deck.getMyHandView([regularCard]);
		assert(!view.includes('🃏'), 'Hand without jokers must not include joker line');
	});

	await runCase('getMyHandView renders jokers alongside regular cards without errors', () => {
		const regular = Deck.getCardById(1)!;
		const joker = Deck.getCardById(53)!;
		let threw = false;
		try {
			Deck.getMyHandView([regular, joker]);
		} catch {
			threw = true;
		}
		assert(!threw, 'getMyHandView must not throw for a mixed regular+joker hand');
	});

	/* ─── Card color correctness ──────────────────────────────────────────────── */

	await runCase('All cards in the 52-deck have correct color based on suit', () => {
		const deck52 = Deck.getDeck(52);
		for (const card of deck52) {
			const expectRed = card.suit === 'Hearts' || card.suit === 'Diamonds';
			const expectBlack = card.suit === 'Spades' || card.suit === 'Clubs';
			if (expectRed) {
				assert(card.color === 'red', `${card.displayName} should be red`);
			} else if (expectBlack) {
				assert(card.color === 'black', `${card.displayName} should be black`);
			}
		}
	});

	await runCase('All cards in the 36-deck have correct color based on suit', () => {
		const deck36 = Deck.getDeck(36);
		for (const card of deck36) {
			const expectRed = card.suit === 'Hearts' || card.suit === 'Diamonds';
			if (expectRed) {
				assert(card.color === 'red', `${card.displayName} should be red`);
			} else {
				assert(card.color === 'black', `${card.displayName} should be black`);
			}
		}
	});

	/* ─── getSortedDeck ──────────────────────────────────────────────────────── */

	await runCase('getSortedDeck(36) returns a 36-card sorted deck', () => {
		const sorted = Deck.getSortedDeck(36);
		assert(sorted.length === 36, `getSortedDeck(36) should return 36 cards, got ${sorted.length}`);
		for (let i = 1; i < sorted.length; i++) {
			assert(sorted[i].value >= sorted[i - 1].value, 'Cards must be in ascending order');
		}
	});

	await runCase('getSortedDeck(54) returns 54 cards with jokers at the end', () => {
		const sorted = Deck.getSortedDeck(54);
		assert(sorted.length === 54, `getSortedDeck(54) should return 54 cards, got ${sorted.length}`);
		const lastTwo = sorted.slice(-2);
		assert(lastTwo.every(c => c.name === 'Joker'), 'Jokers must be at the end of the sorted 54-deck');
	});
}
