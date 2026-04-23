/**
 * Game simulator — uses db.mock.json as a real database, mocks only the BOT.
 * All DB writes happen for real so you can inspect db.mock.json after the run.
 *
 * Run: pnpm tsx scripts/simulate.ts
 *
 * Scenario:
 *   - 3 players: Alice, Bob, Carol  (all instant updatesView)
 *   - 1 deck (cardsToAthanasius = 4)
 *   - Carol gets 4 Queens at deal → initial Athanasius, hand immediately empty
 *   - Turn order: Alice → Bob → Carol (Carol skipped, has no cards)
 *
 *   Turn 1 — Alice attacks Bob for Aces, FAILS at count (declares 1, actual 2)
 *             Turn passes to Bob.
 *   Turn 2 — Bob attacks Alice for Aces, SUCCEEDS (♥=1 ♦=1, count=2, red=2)
 *             Bob forms Athanasius for Aces. Bob's hand empties → turn to Alice.
 *             Alice has J♥ but no valid targets (known edge case, shown in output).
 */

import type { CallbackContext } from '~/core/bot/types/context';
import type {
	PlayerStageMeta,
	CardStageMeta,
	CountStageMeta,
	ColorsStageMeta,
	SuitsStageMeta,
} from '~/entities/game/types';
import type { UserSchema } from '~/db/schemas';

// ─── MUST come before any project module loads ─────────────────────────────
process.env.BOT_TOKEN = '__simulate__';
process.env.DB_FILE   = 'db.mock.json';

// ─── Dynamic imports (env is set before these modules evaluate) ─────────────
const { BOT } = await import('~/core');
const { DB } = await import('~/db');
const { Game, TurnStage, sendFirstMessage, notifyInitialAthanasiuses } = await import('~/entities/game');
const { processTurn } = await import('~/entities/game/services');

// ─── Silence polling errors from the fake token ──────────────────────────────
(BOT as any).bot.on('polling_error', () => {});
(BOT as any).bot.stopPolling().catch(() => {});

// ─── Message capture ─────────────────────────────────────────────────────────
interface Captured {
	type: 'send' | 'edit';
	to: number;
	toName: string;
	text: string;
}

const log: Captured[] = [];
const nameOf = (id: number): string => DB.data.users.find(u => u.id === id)?.name ?? `user#${id}`;

function capture (type: 'send' | 'edit', to: number, text: string): void {
	log.push({ type, to, toName: nameOf(to), text: text.replace(/\n/g, ' ↵ ') });
}

// ─── Mock BOT methods (DB stays real) ────────────────────────────────────────
(BOT as any).sendMessageByChatId = async ({ chatId, text }: { chatId: number; text: string }) => {
	capture('send', chatId, text);
};
(BOT as any).sendMessage = async ({ ctx, text }: { ctx: { chatId: number }; text: string }) => {
	capture('send', ctx.chatId, text);
};
(BOT as any).editMessage = async ({ ctx, text }: { ctx: { chatId: number }; text: string }) => {
	capture('edit', ctx.chatId, text);
};
(BOT as any).answerCallbackQuery = async () => {};

// ─── Test players ─────────────────────────────────────────────────────────────
// Card IDs (1-deck, suits order: Hearts, Diamonds, Spades, Clubs; ranks 2..A):
//   Hearts  1-13   (J♥=10, Q♥=11, K♥=12, A♥=13)
//   Diamonds 14-26 (Q♦=24, A♦=26)
//   Spades  27-39  (Q♠=37, A♠=39)
//   Clubs   40-52  (Q♣=50, A♣=52)

const ALICE_ID = 1001;
const BOB_ID   = 1002;
const CAROL_ID = 1003;
const ROOM_ID  = 'simroom';
const GAME_ID  = 'simgame';

const alice: UserSchema = { id: ALICE_ID, username: 'alice', name: 'Alice', settings: { updatesView: 'instant' }, achievements: [] };
const bob:   UserSchema = { id: BOB_ID,   username: 'bob',   name: 'Bob',   settings: { updatesView: 'instant' }, achievements: [] };
const carol: UserSchema = { id: CAROL_ID, username: 'carol', name: 'Carol', settings: { updatesView: 'instant' }, achievements: [] };

// ─── Seed db.mock.json ────────────────────────────────────────────────────────
DB.data = {
	users: [alice, bob, carol],
	rooms: [{
		id: ROOM_ID,
		name: 'SimRoom',
		owner: ALICE_ID,
		players: [ALICE_ID, BOB_ID, CAROL_ID],
		settings: {
			joinCode: 'SIM-CODE',
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
			// Alice: A♥(13), A♦(26), J♥(10)
			[ALICE_ID]: [13, 26, 10],
			// Bob: A♠(39), A♣(52)
			[BOB_ID]: [39, 52],
			// Carol: empty — initial Athanasius for Q already applied
			[CAROL_ID]: [],
		},
		athanasiuses: {
			[ALICE_ID]: [],
			[BOB_ID]: [],
			[CAROL_ID]: ['Q'],
		},
		utils: { cardsToAthanasius: 4, logs: [] },
	}],
};
await DB.write(); // persist initial state to db.mock.json

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeCtx (playerId: number): CallbackContext {
	return {
		chatId: playerId,
		callback: {
			id: `cb-${playerId}`,
			from: { id: playerId, is_bot: false, first_name: 'Sim' },
			message: { message_id: 1, chat: { id: playerId, type: 'private' }, date: 0 },
			data: { module: 'game', meta: '' },
		},
	} as unknown as CallbackContext;
}

function separator (label: string): void {
	console.log(`\n${'─'.repeat(60)}`);
	console.log(`  ${label}`);
	console.log('─'.repeat(60));
}

// ─── Run scenario ─────────────────────────────────────────────────────────────

separator('PRE-GAME — Initial Athanasius notification + first turn');

{
	const game = new Game({ id: GAME_ID });
	await notifyInitialAthanasiuses(game);
	await sendFirstMessage(game, true);
}

separator('TURN 1 — Alice attacks Bob for Aces | FAIL at count (declares 1, actual 2)');

{
	const playerMeta: PlayerStageMeta = { gameId: GAME_ID, player: bob, stage: TurnStage.player };
	const cardMeta: CardStageMeta     = { gameId: GAME_ID, player: bob, stage: TurnStage.card, cardName: 'A' };
	const countMeta: CountStageMeta   = { gameId: GAME_ID, player: bob, stage: TurnStage.count, cardName: 'A', count: 1, countAction: 'select' };

	const ctx = makeCtx(ALICE_ID);

	await processTurn({ ctx, game: new Game({ id: GAME_ID }), me: alice, turnMeta: playerMeta });
	await processTurn({ ctx, game: new Game({ id: GAME_ID }), me: alice, turnMeta: cardMeta });
	await processTurn({ ctx, game: new Game({ id: GAME_ID }), me: alice, turnMeta: countMeta });
}

separator('TURN 2 — Bob attacks Alice for Aces | SUCCESS (♥=1 ♦=1)');

{
	const playerMeta: PlayerStageMeta  = { gameId: GAME_ID, player: alice, stage: TurnStage.player };
	const cardMeta: CardStageMeta      = { gameId: GAME_ID, player: alice, stage: TurnStage.card, cardName: 'A' };
	const countMeta: CountStageMeta    = { gameId: GAME_ID, player: alice, stage: TurnStage.count, cardName: 'A', count: 2, countAction: 'select' };
	// Alice: A♥(red) + A♦(red) → red=2, black=0
	const colorsMeta: ColorsStageMeta  = { gameId: GAME_ID, player: alice, stage: TurnStage.colors, cardName: 'A', count: 2, redCount: 2, blackCount: 0, redCountAction: 'select' };
	// Suits: ♥=1, ♦=1, ♠=0, ♣=0
	const suitsMeta: SuitsStageMeta    = {
		gameId: GAME_ID,
		player: alice,
		stage: TurnStage.suits,
		cardName: 'A',
		count: 2,
		redCount: 2,
		blackCount: 0,
		suits: { hearts: 1, diamonds: 1, spades: 0, clubs: 0, mode: '+', action: 'select' },
	};

	const ctx = makeCtx(BOB_ID);

	await processTurn({ ctx, game: new Game({ id: GAME_ID }), me: bob, turnMeta: playerMeta });
	await processTurn({ ctx, game: new Game({ id: GAME_ID }), me: bob, turnMeta: cardMeta });
	await processTurn({ ctx, game: new Game({ id: GAME_ID }), me: bob, turnMeta: countMeta });
	await processTurn({ ctx, game: new Game({ id: GAME_ID }), me: bob, turnMeta: colorsMeta });
	await processTurn({ ctx, game: new Game({ id: GAME_ID }), me: bob, turnMeta: suitsMeta });
}

// ─── Report ───────────────────────────────────────────────────────────────────
separator('CAPTURED MESSAGES');

log.forEach((m, i) => {
	const tag = m.type === 'edit' ? 'EDIT' : 'SEND';
	console.log(`#${String(i + 1).padStart(2, '0')} [${tag} → ${m.toName}(${m.to})]\n     ${m.text}\n`);
});

separator('FINAL STATE (from db.mock.json)');

const game = new Game({ id: GAME_ID });
console.log('Active player :', game.activePlayer.name);
console.log('Athanasiuses  :');
Object.entries(game.getAthanasiuses()).forEach(([id, cards]) => {
	console.log(`  ${nameOf(Number(id))}: [${cards.join(', ')}]`);
});
console.log('Hands:');
[ALICE_ID, BOB_ID, CAROL_ID].forEach(id => {
	const cards = game.getHand(id)?.cardsInHand.map(c => c.displayName) ?? [];
	console.log(`  ${nameOf(id)}: [${cards.join(', ')}]`);
});

console.log('\n✓ Simulation complete. Final state written to db.mock.json\n');
process.exit(0);
