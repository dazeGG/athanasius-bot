/**
 * game-flow.ts — covers the main game loop:
 *   - initial Athanasius detection at deal
 *   - deal_athanasius achievement awarded
 *   - failed turn (wrong count declared)
 *   - successful steal + Athanasius formation
 *   - all mailing (instant updatesView)
 *
 * Card IDs (1 deck, suits order Hearts/Diamonds/Spades/Clubs, ranks 2..A):
 *   Hearts 1-13  · Diamonds 14-26  · Spades 27-39  · Clubs 40-52
 *   J♥=10  A♥=13  A♦=26  A♠=39  A♣=52
 *   Q♥=11  Q♦=24  Q♠=37  Q♣=50
 */

import type {
	PlayerStageMeta,
	CardStageMeta,
	CountStageMeta,
	SuitsStageMeta,
	ColorsStageMeta,
} from '~/entities/game/types';
import type { UserSchema } from '~/db/schemas';

import {
	DB,
	Game,
	TurnStage,
	processTurn,
	sendFirstMessage,
	notifyInitialAthanasiuses,
	resetLog,
	getLog,
	seedDB,
} from '../bootstrap';
import { assert, assertSent, assertNotSent, makeCtx } from '../runner';

// ─── Fixture IDs ──────────────────────────────────────────────────────────────
const ALICE_ID = 1001;
const BOB_ID   = 1002;
const CAROL_ID = 1003;
const ROOM_ID  = 'sim-room';
const GAME_ID  = 'sim-game';

// ─── Users ────────────────────────────────────────────────────────────────────
const alice: UserSchema = { id: ALICE_ID, username: 'alice', name: 'Alice', settings: { updatesView: 'instant' }, achievements: [] };
const bob:   UserSchema = { id: BOB_ID,   username: 'bob',   name: 'Bob',   settings: { updatesView: 'instant' }, achievements: [] };
const carol: UserSchema = { id: CAROL_ID, username: 'carol', name: 'Carol', settings: { updatesView: 'instant' }, achievements: [] };

// ─── Seed ─────────────────────────────────────────────────────────────────────
async function seed (): Promise<void> {
	await seedDB({
		users: [alice, bob, carol],
		rooms: [{
			id: ROOM_ID,
			name: 'SimRoom',
			owner: ALICE_ID,
			players: [ALICE_ID, BOB_ID, CAROL_ID],
			settings: {
				joinCode: 'SIM-0001',
				deckType: 52,
				decksCount: 1,
				towHands: false,
				allowMailing: false,
				allowMailingAtTurn: false,
			},
		}],
		games: [{
			id: GAME_ID,
			roomId: ROOM_ID,
			started: Date.now(),
			ended: undefined,
			players: [ALICE_ID, BOB_ID, CAROL_ID],
			hands: {
				// Alice: A♥(13) A♦(26) J♥(10)
				[ALICE_ID]: [13, 26, 10],
				// Bob: A♠(39) A♣(52)
				[BOB_ID]: [39, 52],
				// Carol: empty — 4 Queens were Athanasius at deal, already applied
				[CAROL_ID]: [],
			},
			athanasiuses: {
				[ALICE_ID]: [],
				[BOB_ID]: [],
				[CAROL_ID]: ['Q'],
			},
			utils: { cardsToAthanasius: 4, logs: [] },
		}],
	});
}

// ─── Scenario ─────────────────────────────────────────────────────────────────
export async function scenarioGameFlow (): Promise<void> {
	resetLog();
	await seed();

	// ── PRE-GAME: initial Athanasius + first turn ──────────────────────────────
	{
		const game = new Game({ id: GAME_ID });
		await notifyInitialAthanasiuses(game);
		await sendFirstMessage(game, true);
	}

	const preLog = getLog();

	// Carol gets personal deal message
	assertSent(preLog, CAROL_ID, 'Стоп');
	assertSent(preLog, CAROL_ID, 'тебе выпал Афанасий Q');
	// Others get broadcast
	assertSent(preLog, ALICE_ID, 'у Carol выпал Афанасий Q');
	assertSent(preLog, BOB_ID,   'у Carol выпал Афанасий Q');
	// Alice gets first-turn prompt
	assertSent(preLog, ALICE_ID, 'Ты ходишь первым');
	// Carol's achievement must be recorded
	const carolUser = DB.data.users.find(u => u.id === CAROL_ID);
	assert(carolUser?.achievements?.includes('deal_athanasius') === true, 'Carol should have deal_athanasius achievement');

	// ── TURN 1: Alice → Bob, Aces, wrong count (declares 1, actual 2) ──────────
	resetLog();
	{
		const ctx = makeCtx(ALICE_ID);
		const base = { gameId: GAME_ID, player: bob };

		const playerMeta: PlayerStageMeta = { ...base, stage: TurnStage.player };
		const cardMeta:   CardStageMeta   = { ...base, stage: TurnStage.card,  cardName: 'A' };
		const countMeta:  CountStageMeta  = { ...base, stage: TurnStage.count, cardName: 'A', count: 1, countAction: 'select' };

		await processTurn({ ctx, game: new Game({ id: GAME_ID }), me: alice, turnMeta: playerMeta });
		await processTurn({ ctx, game: new Game({ id: GAME_ID }), me: alice, turnMeta: cardMeta });
		await processTurn({ ctx, game: new Game({ id: GAME_ID }), me: alice, turnMeta: countMeta });
	}

	const turn1Log = getLog();

	// Alice gets her own fail message
	assertSent(turn1Log, ALICE_ID, 'не угадал');
	assertSent(turn1Log, ALICE_ID, 'Количество не 1');
	// Others get mailing
	assertSent(turn1Log, BOB_ID,   'Количество не 1');
	assertSent(turn1Log, CAROL_ID, 'Количество не 1');
	// Bob receives his turn prompt
	assertSent(turn1Log, BOB_ID, 'Твой ход');
	// Alice should NOT receive Bob's turn prompt
	assertNotSent(turn1Log, ALICE_ID, 'Твой ход');

	// ── TURN 2: Bob → Alice, Aces, correct (♥=1 ♦=1, red=2) ──────────────────
	resetLog();
	{
		const ctx = makeCtx(BOB_ID);
		const base = { gameId: GAME_ID, player: alice };

		const playerMeta: PlayerStageMeta  = { ...base, stage: TurnStage.player };
		const cardMeta:   CardStageMeta    = { ...base, stage: TurnStage.card,   cardName: 'A' };
		const countMeta:  CountStageMeta   = { ...base, stage: TurnStage.count,  cardName: 'A', count: 2, countAction: 'select' };
		// Alice has A♥(red) + A♦(red) → red=2, black=0
		const colorsMeta: ColorsStageMeta  = { ...base, stage: TurnStage.colors, cardName: 'A', count: 2, redCount: 2, blackCount: 0, redCountAction: 'select' };
		// Suits: ♥=1 ♦=1 ♠=0 ♣=0
		const suitsMeta: SuitsStageMeta    = {
			...base,
			stage: TurnStage.suits,
			cardName: 'A',
			count: 2,
			redCount: 2,
			blackCount: 0,
			suits: { hearts: 1, diamonds: 1, spades: 0, clubs: 0, mode: '+', action: 'select' },
		};

		await processTurn({ ctx, game: new Game({ id: GAME_ID }), me: bob, turnMeta: playerMeta });
		await processTurn({ ctx, game: new Game({ id: GAME_ID }), me: bob, turnMeta: cardMeta });
		await processTurn({ ctx, game: new Game({ id: GAME_ID }), me: bob, turnMeta: countMeta });
		await processTurn({ ctx, game: new Game({ id: GAME_ID }), me: bob, turnMeta: colorsMeta });
		await processTurn({ ctx, game: new Game({ id: GAME_ID }), me: bob, turnMeta: suitsMeta });
	}

	const turn2Log = getLog();

	// Bob sees his steal confirmation
	assertSent(turn2Log, BOB_ID,   'украл');
	// Steal mailing
	assertSent(turn2Log, ALICE_ID, 'Украл');
	assertSent(turn2Log, CAROL_ID, 'Украл');
	// Bob gets Athanasius personal message
	assertSent(turn2Log, BOB_ID,   'новый Афанасий');
	// Athanasius mailing
	assertSent(turn2Log, ALICE_ID, 'Bob');
	assertSent(turn2Log, CAROL_ID, 'Bob');

	// ── Final DB state assertions ──────────────────────────────────────────────
	const game = new Game({ id: GAME_ID });

	// Hands
	const aliceCards = game.getHand(ALICE_ID)?.cardsInHand ?? [];
	const bobCards   = game.getHand(BOB_ID)?.cardsInHand ?? [];
	const carolCards = game.getHand(CAROL_ID)?.cardsInHand ?? [];

	assert(aliceCards.length === 1,          'Alice should have 1 card left (J♥)');
	assert(aliceCards[0].name === 'J',       'Alice remaining card should be J');
	assert(bobCards.length === 0,            'Bob hand should be empty after Athanasius');
	assert(carolCards.length === 0,          'Carol hand should be empty');

	// Athanasiuses
	const aths = game.getAthanasiuses();
	assert(aths[BOB_ID].includes('A'),       'Bob should have Athanasius A');
	assert(aths[CAROL_ID].includes('Q'),     'Carol should still have Athanasius Q');
	assert(aths[ALICE_ID].length === 0,      'Alice should have no Athanasiuses');

	// Logs (1 failed + 1 successful steal)
	const gameSchema = DB.data.games.find(g => g.id === GAME_ID);
	assert(gameSchema?.utils.logs.length === 2, 'Game should have 2 log entries');
}
