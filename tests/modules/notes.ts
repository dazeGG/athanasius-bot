/**
 * notes.ts — comprehensive coverage for the notes module.
 */

import { clearDB, getLog, resetLog, seedDB, withCallbackMethods, withMessageMethods, DB } from '../bootstrap';
import { assert, assertDeleted, assertNotSent, assertSent } from '../runner';
import type { ModuleTools } from '../runner';

const PLAYERS = [
	{ id: 3001, username: 'alice_notes', name: 'Алиса' },
	{ id: 3002, username: 'bob_notes', name: 'Борис' },
	{ id: 3003, username: 'carol_notes', name: 'Каролина' },
] as const;

const [ALICE, BOB, CAROL] = PLAYERS;
type PlayerFixture = (typeof PLAYERS)[number];

const USERS = PLAYERS.map(p => ({
	id: p.id,
	username: p.username,
	name: p.name,
	settings: { updatesView: 'instant' as const },
	achievements: [],
}));

const ROOM = {
	id: 'nroom1',
	name: 'Заметочная',
	owner: ALICE.id,
	players: [ALICE.id, BOB.id, CAROL.id],
	settings: {
		joinCode: 'AAAA-0001',
		deckType: 52 as const,
		decksCount: 4,
		towHands: false,
		allowMailing: false,
		allowMailingAtTurn: false,
	},
};

const ROOM_TWO = {
	id: 'nroom2',
	name: 'Вторая комната',
	owner: BOB.id,
	players: [ALICE.id, BOB.id, CAROL.id],
	settings: {
		joinCode: 'BBBB-0002',
		deckType: 52 as const,
		decksCount: 2,
		towHands: false,
		allowMailing: false,
		allowMailingAtTurn: false,
	},
};

const makeGame = (id: string, roomId: string, decksCount: number, extra: Record<string, unknown> = {}) => ({
	id,
	roomId,
	name: roomId === ROOM.id ? ROOM.name : ROOM_TWO.name,
	started: Date.now(),
	players: [ALICE.id, BOB.id, CAROL.id],
	hands: { [ALICE.id]: [], [BOB.id]: [], [CAROL.id]: [] },
	athanasiuses: { [ALICE.id]: [], [BOB.id]: [], [CAROL.id]: [] },
	utils: { cardsToAthanasius: decksCount * 4, logs: [] },
	...extra,
});

const makeMessageCtx = (player: PlayerFixture, text: string) => withMessageMethods({
	chat: { id: player.id, type: 'private' as const },
	from: { id: player.id, is_bot: false, first_name: player.name, username: player.username },
	message: {
		message_id: 10,
		chat: { id: player.id, type: 'private' as const },
		date: Math.floor(Date.now() / 1000),
		text,
		from: { id: player.id, is_bot: false, first_name: player.name, username: player.username },
	},
});

const makeCallbackCtx = (player: PlayerFixture, data: string, messageId = 10) => withCallbackMethods({
	chat: { id: player.id, type: 'private' as const },
	from: { id: player.id, is_bot: false, first_name: player.name, username: player.username },
	callbackQuery: {
		id: `cb-${player.id}`,
		from: { id: player.id, is_bot: false, first_name: player.name, username: player.username },
		message: {
			message_id: messageId,
			chat: { id: player.id, type: 'private' as const },
			date: Math.floor(Date.now() / 1000),
		},
		chat_instance: '',
		data,
	},
});

const reset = async () => {
	resetLog();
	await clearDB();
};

const seedOneGame = async (extra: Record<string, unknown> = {}) => {
	await seedDB({ users: USERS, rooms: [ROOM], games: [makeGame('ng1', ROOM.id, 4, extra)] });
	resetLog();
};

const seedTwoGames = async () => {
	await seedDB({
		users: USERS,
		rooms: [ROOM, ROOM_TWO],
		games: [
			makeGame('ng1', ROOM.id, 4),
			makeGame('ng2', ROOM_TWO.id, 2),
		],
	});
	resetLog();
};

export async function notesModule ({ runLayer }: ModuleTools): Promise<void> {
	const handlers = await import('../../src/modules/notes/handlers');
	const { ORM } = await import('../../src/db');
	const { Game } = await import('../../src/entities/game');

	// ─── ORM ─────────────────────────────────────────────────────────────────────

	await runLayer('ORM — getNote / setNoteCell', async ({ runCase }) => {
		await runCase('getNote returns empty object when no notes exist', async () => {
			await reset();
			await seedOneGame();
			const notes = ORM.Games.getNote('ng1', ALICE.id);
			assert(Object.keys(notes).length === 0, 'Expected empty notes map');
		});

		await runCase('setNoteCell stores a UserId value', async () => {
			await reset();
			await seedOneGame();
			await ORM.Games.setNoteCell('ng1', ALICE.id, 'A_0_0', BOB.id);
			const notes = ORM.Games.getNote('ng1', ALICE.id);
			assert(notes['A_0_0'] === BOB.id, 'Expected BOB.id in cell A_0_0');
		});

		await runCase('setNoteCell stores null (unassigned)', async () => {
			await reset();
			await seedOneGame();
			await ORM.Games.setNoteCell('ng1', ALICE.id, 'K_1_2', null);
			const notes = ORM.Games.getNote('ng1', ALICE.id);
			assert(Object.prototype.hasOwnProperty.call(notes, 'K_1_2'), 'Key must exist after setting null');
			assert(notes['K_1_2'] === null, 'Expected null value');
		});

		await runCase('setNoteCell overwrites an existing cell', async () => {
			await reset();
			await seedOneGame();
			await ORM.Games.setNoteCell('ng1', ALICE.id, 'Q_0_1', BOB.id);
			await ORM.Games.setNoteCell('ng1', ALICE.id, 'Q_0_1', CAROL.id);
			const notes = ORM.Games.getNote('ng1', ALICE.id);
			assert(notes['Q_0_1'] === CAROL.id, 'Expected overwritten CAROL.id');
		});

		await runCase('getNote is isolated per player', async () => {
			await reset();
			await seedOneGame();
			await ORM.Games.setNoteCell('ng1', ALICE.id, 'J_0_0', BOB.id);
			const aliceNotes = ORM.Games.getNote('ng1', ALICE.id);
			const bobNotes = ORM.Games.getNote('ng1', BOB.id);
			assert(aliceNotes['J_0_0'] === BOB.id, 'Alice note should be present');
			assert(Object.keys(bobNotes).length === 0, 'Bob notes should be empty');
		});

		await runCase('multiple independent cells can be set', async () => {
			await reset();
			await seedOneGame();
			await ORM.Games.setNoteCell('ng1', ALICE.id, '2_0_0', BOB.id);
			await ORM.Games.setNoteCell('ng1', ALICE.id, '2_0_1', CAROL.id);
			await ORM.Games.setNoteCell('ng1', ALICE.id, '2_1_0', ALICE.id);
			const notes = ORM.Games.getNote('ng1', ALICE.id);
			assert(notes['2_0_0'] === BOB.id, 'Cell (2,0,0)');
			assert(notes['2_0_1'] === CAROL.id, 'Cell (2,0,1)');
			assert(notes['2_1_0'] === ALICE.id, 'Cell (2,1,0)');
		});
	});

	// ─── Notes lifetime ───────────────────────────────────────────────────────────

	await runLayer('Notes lifetime — persistence through Game.save()', async ({ runCase }) => {
		await runCase('Notes survive Game.save() when game is active', async () => {
			await reset();
			await seedOneGame({ notes: { [ALICE.id]: { 'A_0_0': BOB.id } } });
			const game = new Game({ id: 'ng1' });
			await game.save();
			const notes = ORM.Games.getNote('ng1', ALICE.id);
			assert(notes['A_0_0'] === BOB.id, 'Notes should be preserved after save()');
		});

		await runCase('Notes of multiple players survive Game.save()', async () => {
			await reset();
			await seedOneGame({
				notes: {
					[ALICE.id]: { 'K_0_0': BOB.id },
					[BOB.id]: { 'K_0_1': CAROL.id },
				},
			});
			const game = new Game({ id: 'ng1' });
			await game.save();
			assert(ORM.Games.getNote('ng1', ALICE.id)['K_0_0'] === BOB.id, 'Alice notes preserved');
			assert(ORM.Games.getNote('ng1', BOB.id)['K_0_1'] === CAROL.id, 'Bob notes preserved');
		});

		await runCase('Notes are cleared when game ends (ended is set)', async () => {
			await reset();
			await seedOneGame({
				ended: Date.now(),
				notes: { [ALICE.id]: { 'A_0_0': BOB.id } },
			});
			const game = new Game({ id: 'ng1' });
			await game.save();
			const stored = DB.data.games.find(g => g.id === 'ng1');
			assert(stored !== undefined, 'Game must exist in DB');
			assert(stored!.notes === undefined, 'Notes must be absent after game ended');
		});
	});

	// ─── notesMessageHandler ─────────────────────────────────────────────────────

	await runLayer('notesMessageHandler — entry point', async ({ runCase }) => {
		await runCase('No active games → shows error, deletes trigger message', async () => {
			await reset();
			await seedDB({ users: USERS, rooms: [], games: [] });
			resetLog();
			await handlers.notesMessageHandler(makeMessageCtx(ALICE, 'Заметки'));
			const log = getLog();
			assertDeleted(log, ALICE.id, 10);
			assertSent(log, ALICE.id, 'нет активных игр');
		});

		await runCase('Ended game is treated as absent', async () => {
			await reset();
			await seedDB({
				users: USERS,
				rooms: [ROOM],
				games: [makeGame('ng1', ROOM.id, 4, { ended: Date.now() })],
			});
			resetLog();
			await handlers.notesMessageHandler(makeMessageCtx(ALICE, 'Заметки'));
			assertSent(getLog(), ALICE.id, 'нет активных игр');
		});

		await runCase('1 active game → shows rank keyboard, deletes message', async () => {
			await reset();
			await seedOneGame();
			await handlers.notesMessageHandler(makeMessageCtx(ALICE, 'Заметки'));
			const log = getLog();
			assertDeleted(log, ALICE.id, 10);
			assertSent(log, ALICE.id, ROOM.name);
			assertSent(log, ALICE.id, 'Выбери карту');
		});

		await runCase('1 active game → rank keyboard has no "Назад"', async () => {
			await reset();
			await seedOneGame();
			await handlers.notesMessageHandler(makeMessageCtx(ALICE, 'Заметки'));
			assertNotSent(getLog(), ALICE.id, 'Назад');
		});

		await runCase('1 active game → rank keyboard has "Выход"', async () => {
			await reset();
			await seedOneGame();
			await handlers.notesMessageHandler(makeMessageCtx(ALICE, 'Заметки'));
			assertSent(getLog(), ALICE.id, 'Выход');
		});

		await runCase('>1 active games → shows game list with room names', async () => {
			await reset();
			await seedTwoGames();
			await handlers.notesMessageHandler(makeMessageCtx(ALICE, 'Заметки'));
			const log = getLog();
			assertDeleted(log, ALICE.id, 10);
			assertSent(log, ALICE.id, ROOM.name);
			assertSent(log, ALICE.id, ROOM_TWO.name);
		});

		await runCase('>1 active games → game list has "Выход"', async () => {
			await reset();
			await seedTwoGames();
			await handlers.notesMessageHandler(makeMessageCtx(ALICE, 'Заметки'));
			assertSent(getLog(), ALICE.id, 'Выход');
		});
	});

	// ─── notesGamesCallbackHandler ───────────────────────────────────────────────

	await runLayer('notesGamesCallbackHandler — game list callback', async ({ runCase }) => {
		await runCase('Shows both room names', async () => {
			await reset();
			await seedTwoGames();
			await handlers.notesGamesCallbackHandler(makeCallbackCtx(ALICE, 'notes:games:'));
			const log = getLog();
			assertSent(log, ALICE.id, ROOM.name);
			assertSent(log, ALICE.id, ROOM_TWO.name);
		});

		await runCase('Has "Выход" button', async () => {
			await reset();
			await seedTwoGames();
			await handlers.notesGamesCallbackHandler(makeCallbackCtx(ALICE, 'notes:games:'));
			assertSent(getLog(), ALICE.id, 'Выход');
		});

		await runCase('Shows "нет активных игр" when all games ended', async () => {
			await reset();
			await seedDB({
				users: USERS,
				rooms: [ROOM],
				games: [makeGame('ng1', ROOM.id, 4, { ended: Date.now() })],
			});
			resetLog();
			await handlers.notesGamesCallbackHandler(makeCallbackCtx(ALICE, 'notes:games:'));
			assertSent(getLog(), ALICE.id, 'нет активных игр');
		});
	});

	// ─── notesRankCallbackHandler ────────────────────────────────────────────────

	await runLayer('notesRankCallbackHandler — rank selection', async ({ runCase }) => {
		await runCase('Shows room name in header text', async () => {
			await reset();
			await seedOneGame();
			await handlers.notesRankCallbackHandler(makeCallbackCtx(ALICE, 'notes:rank:ng1'));
			assertSent(getLog(), ALICE.id, ROOM.name);
		});

		await runCase('Shows all 13 ranks as buttons', async () => {
			await reset();
			await seedOneGame();
			await handlers.notesRankCallbackHandler(makeCallbackCtx(ALICE, 'notes:rank:ng1'));
			const log = getLog();
			for (const rank of ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']) {
				assertSent(log, ALICE.id, rank);
			}
		});

		await runCase('With 1 game → no "Назад" button', async () => {
			await reset();
			await seedOneGame();
			await handlers.notesRankCallbackHandler(makeCallbackCtx(ALICE, 'notes:rank:ng1'));
			assertNotSent(getLog(), ALICE.id, 'Назад');
		});

		await runCase('With >1 games → has "Назад" button', async () => {
			await reset();
			await seedTwoGames();
			await handlers.notesRankCallbackHandler(makeCallbackCtx(ALICE, 'notes:rank:ng1'));
			assertSent(getLog(), ALICE.id, 'Назад');
		});

		await runCase('Always has "Выход" button', async () => {
			await reset();
			await seedOneGame();
			await handlers.notesRankCallbackHandler(makeCallbackCtx(ALICE, 'notes:rank:ng1'));
			assertSent(getLog(), ALICE.id, 'Выход');
		});
	});

	// ─── notesGridCallbackHandler ────────────────────────────────────────────────

	await runLayer('notesGridCallbackHandler — grid rendering', async ({ runCase }) => {
		await runCase('Shows room name and rank in text', async () => {
			await reset();
			await seedOneGame();
			await handlers.notesGridCallbackHandler(makeCallbackCtx(ALICE, 'notes:grid:ng1:A'));
			const log = getLog();
			assertSent(log, ALICE.id, ROOM.name);
			assertSent(log, ALICE.id, 'A');
		});

		await runCase('Shows all 4 suit buttons', async () => {
			await reset();
			await seedOneGame();
			await handlers.notesGridCallbackHandler(makeCallbackCtx(ALICE, 'notes:grid:ng1:K'));
			const log = getLog();
			for (const suit of ['♥️', '♦️', '♠️', '♣️']) {
				assertSent(log, ALICE.id, suit);
			}
		});

		await runCase('Unset cells render as "-"', async () => {
			await reset();
			await seedOneGame();
			await handlers.notesGridCallbackHandler(makeCallbackCtx(ALICE, 'notes:grid:ng1:2'));
			assertSent(getLog(), ALICE.id, '-');
		});

		await runCase('Has "Назад" button', async () => {
			await reset();
			await seedOneGame();
			await handlers.notesGridCallbackHandler(makeCallbackCtx(ALICE, 'notes:grid:ng1:Q'));
			assertSent(getLog(), ALICE.id, 'Назад');
		});

		await runCase('Has "Выход" button', async () => {
			await reset();
			await seedOneGame();
			await handlers.notesGridCallbackHandler(makeCallbackCtx(ALICE, 'notes:grid:ng1:Q'));
			assertSent(getLog(), ALICE.id, 'Выход');
		});

		await runCase('Pre-set cell renders other player name', async () => {
			await reset();
			await seedOneGame({ notes: { [ALICE.id]: { 'J_0_0': BOB.id } } });
			await handlers.notesGridCallbackHandler(makeCallbackCtx(ALICE, 'notes:grid:ng1:J'));
			assertSent(getLog(), ALICE.id, BOB.name);
		});

		await runCase('Self-assigned cell renders "я"', async () => {
			await reset();
			await seedOneGame({ notes: { [ALICE.id]: { 'J_0_1': ALICE.id } } });
			await handlers.notesGridCallbackHandler(makeCallbackCtx(ALICE, 'notes:grid:ng1:J'));
			assertSent(getLog(), ALICE.id, 'я');
		});

		await runCase('Null cell renders "-"', async () => {
			await reset();
			await seedOneGame({ notes: { [ALICE.id]: { '5_0_0': null } } });
			await handlers.notesGridCallbackHandler(makeCallbackCtx(ALICE, 'notes:grid:ng1:5'));
			assertSent(getLog(), ALICE.id, '-');
		});

		await runCase('Different players see their own grid (isolation)', async () => {
			await reset();
			await seedOneGame({
				notes: {
					[ALICE.id]: { 'Q_0_0': BOB.id },
					[BOB.id]: { 'Q_0_0': CAROL.id },
				},
			});

			resetLog();
			await handlers.notesGridCallbackHandler(makeCallbackCtx(ALICE, 'notes:grid:ng1:Q'));
			assertSent(getLog(), ALICE.id, BOB.name);

			resetLog();
			await handlers.notesGridCallbackHandler(makeCallbackCtx(BOB, 'notes:grid:ng1:Q'));
			assertSent(getLog(), BOB.id, CAROL.name);
		});

		await runCase('Grid for second game uses that game room name', async () => {
			await reset();
			await seedTwoGames();
			await handlers.notesGridCallbackHandler(makeCallbackCtx(ALICE, 'notes:grid:ng2:5'));
			assertSent(getLog(), ALICE.id, ROOM_TWO.name);
		});
	});

	// ─── notesCycleCallbackHandler ───────────────────────────────────────────────

	await runLayer('notesCycleCallbackHandler — player cycling', async ({ runCase }) => {
		await runCase('Unset cell → first click → assigns self', async () => {
			await reset();
			await seedOneGame();
			await handlers.notesCycleCallbackHandler(makeCallbackCtx(ALICE, 'notes:cycle:ng1:A:0:0'));
			assert(ORM.Games.getNote('ng1', ALICE.id)['A_0_0'] === ALICE.id, 'Expected self after first click');
		});

		await runCase('Unset cell → first click → renders "я"', async () => {
			await reset();
			await seedOneGame();
			await handlers.notesCycleCallbackHandler(makeCallbackCtx(ALICE, 'notes:cycle:ng1:A:0:0'));
			assertSent(getLog(), ALICE.id, 'я');
		});

		await runCase('Self → second click → first other player (BOB)', async () => {
			await reset();
			await seedOneGame({ notes: { [ALICE.id]: { 'A_0_0': ALICE.id } } });
			await handlers.notesCycleCallbackHandler(makeCallbackCtx(ALICE, 'notes:cycle:ng1:A:0:0'));
			assert(ORM.Games.getNote('ng1', ALICE.id)['A_0_0'] === BOB.id, 'Expected BOB after self');
		});

		await runCase('Self → second click → renders first other player name', async () => {
			await reset();
			await seedOneGame({ notes: { [ALICE.id]: { 'A_0_0': ALICE.id } } });
			await handlers.notesCycleCallbackHandler(makeCallbackCtx(ALICE, 'notes:cycle:ng1:A:0:0'));
			assertSent(getLog(), ALICE.id, BOB.name);
		});

		await runCase('First other player → third click → second other player (CAROL)', async () => {
			await reset();
			await seedOneGame({ notes: { [ALICE.id]: { 'A_0_0': BOB.id } } });
			await handlers.notesCycleCallbackHandler(makeCallbackCtx(ALICE, 'notes:cycle:ng1:A:0:0'));
			assert(ORM.Games.getNote('ng1', ALICE.id)['A_0_0'] === CAROL.id, 'Expected CAROL after BOB');
		});

		await runCase('Second other player → fourth click → null ("-")', async () => {
			await reset();
			await seedOneGame({ notes: { [ALICE.id]: { 'A_0_0': CAROL.id } } });
			await handlers.notesCycleCallbackHandler(makeCallbackCtx(ALICE, 'notes:cycle:ng1:A:0:0'));
			assert(ORM.Games.getNote('ng1', ALICE.id)['A_0_0'] === null, 'Expected null after last player');
		});

		await runCase('Null ("-") → fifth click → wraps back to self', async () => {
			await reset();
			await seedOneGame({ notes: { [ALICE.id]: { 'A_0_0': null } } });
			await handlers.notesCycleCallbackHandler(makeCallbackCtx(ALICE, 'notes:cycle:ng1:A:0:0'));
			assert(ORM.Games.getNote('ng1', ALICE.id)['A_0_0'] === ALICE.id, 'Expected self after full cycle');
		});

		await runCase('Cycling one cell does not affect sibling cells', async () => {
			await reset();
			await seedOneGame({ notes: { [ALICE.id]: { 'A_0_1': BOB.id } } });
			await handlers.notesCycleCallbackHandler(makeCallbackCtx(ALICE, 'notes:cycle:ng1:A:0:0'));
			assert(ORM.Games.getNote('ng1', ALICE.id)['A_0_1'] === BOB.id, 'Sibling cell must be unchanged');
		});

		await runCase('Cycling is isolated per player (Bob notes untouched)', async () => {
			await reset();
			await seedOneGame();
			await handlers.notesCycleCallbackHandler(makeCallbackCtx(ALICE, 'notes:cycle:ng1:A:0:0'));
			assert(Object.keys(ORM.Games.getNote('ng1', BOB.id)).length === 0, 'Bob notes must stay empty');
		});

		await runCase('Different ranks tracked independently', async () => {
			await reset();
			await seedOneGame();
			// K_0_0: click 1 → self, click 2 → BOB
			await handlers.notesCycleCallbackHandler(makeCallbackCtx(ALICE, 'notes:cycle:ng1:K:0:0'));
			await handlers.notesCycleCallbackHandler(makeCallbackCtx(ALICE, 'notes:cycle:ng1:K:0:0'));
			// A_0_0: click 1 → self
			await handlers.notesCycleCallbackHandler(makeCallbackCtx(ALICE, 'notes:cycle:ng1:A:0:0'));
			const notes = ORM.Games.getNote('ng1', ALICE.id);
			assert(notes['K_0_0'] === BOB.id, 'K cell should be at BOB');
			assert(notes['A_0_0'] === ALICE.id, 'A cell should be at self');
		});

		await runCase('Different suit indices tracked independently', async () => {
			await reset();
			await seedOneGame({ notes: { [ALICE.id]: { 'Q_0_0': BOB.id, 'Q_0_2': CAROL.id } } });
			await handlers.notesCycleCallbackHandler(makeCallbackCtx(ALICE, 'notes:cycle:ng1:Q:0:0'));
			const notes = ORM.Games.getNote('ng1', ALICE.id);
			assert(notes['Q_0_0'] === CAROL.id, 'Suit 0 should advance to CAROL');
			assert(notes['Q_0_2'] === CAROL.id, 'Suit 2 must be unaffected');
		});

		await runCase('Different deck indices tracked independently', async () => {
			await reset();
			await seedOneGame({ notes: { [ALICE.id]: { 'J_0_0': BOB.id, 'J_2_0': CAROL.id } } });
			await handlers.notesCycleCallbackHandler(makeCallbackCtx(ALICE, 'notes:cycle:ng1:J:0:0'));
			const notes = ORM.Games.getNote('ng1', ALICE.id);
			assert(notes['J_0_0'] === CAROL.id, 'Deck 0 should advance to CAROL');
			assert(notes['J_2_0'] === CAROL.id, 'Deck 2 must be unaffected');
		});

		await runCase('Grid is re-rendered after cycle (edit captured)', async () => {
			await reset();
			await seedOneGame();
			await handlers.notesCycleCallbackHandler(makeCallbackCtx(ALICE, 'notes:cycle:ng1:A:0:0'));
			const edits = getLog().filter(m => m.type === 'edit' && m.to === ALICE.id);
			assert(edits.length > 0, 'Expected at least one editMessageText call');
		});
	});

	// ─── notesSuitCallbackHandler ────────────────────────────────────────────────

	await runLayer('notesSuitCallbackHandler — inactive suit buttons', async ({ runCase }) => {
		await runCase('Does not send or edit any message', async () => {
			await reset();
			await seedOneGame();
			await handlers.notesSuitCallbackHandler(makeCallbackCtx(ALICE, 'notes:suit:'));
			const log = getLog();
			const visible = log.filter(m => m.to === ALICE.id && (m.type === 'send' || m.type === 'edit'));
			assert(visible.length === 0, 'Suit button must produce no visible message');
		});

		await runCase('Does not delete any message', async () => {
			await reset();
			await seedOneGame();
			await handlers.notesSuitCallbackHandler(makeCallbackCtx(ALICE, 'notes:suit:'));
			const deletions = getLog().filter(m => m.to === ALICE.id && m.type === 'delete');
			assert(deletions.length === 0, 'Suit button must not delete any message');
		});
	});

	// ─── notesExitCallbackHandler ─────────────────────────────────────────────────

	await runLayer('notesExitCallbackHandler — exit/close', async ({ runCase }) => {
		await runCase('Deletes the message by id', async () => {
			await reset();
			await seedOneGame();
			await handlers.notesExitCallbackHandler(makeCallbackCtx(ALICE, 'notes:exit:', 42));
			assertDeleted(getLog(), ALICE.id, 42);
		});

		await runCase('Does not send or edit any message', async () => {
			await reset();
			await seedOneGame();
			await handlers.notesExitCallbackHandler(makeCallbackCtx(ALICE, 'notes:exit:'));
			const log = getLog();
			const visible = log.filter(m => m.to === ALICE.id && (m.type === 'send' || m.type === 'edit'));
			assert(visible.length === 0, 'Exit must only delete, not send or edit');
		});
	});
}
