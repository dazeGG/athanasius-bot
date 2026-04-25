/**
 * game/helpers.ts — shared fixtures, builders, and assertions for `Game Flow`.
 */
import { ORM } from '../../../src/db';
import { Deck, DeckConfig } from '../../../src/entities/deck';
import type { GameSchema, RoomSchema, UserSchema } from '../../../src/db';
import type { CardName, SuitName } from '../../../src/entities/deck';
import type { CallbackCtx } from '../../../src/core';

import {
	clearDB,
	BOT,
	DB,
	Game,
	getLog,
	notifyInitialAthanasiuses,
	resetLog,
	seedDB,
	sendFirstMessage,
	withCallbackMethods,
} from '../../bootstrap';

/**
 * Stable tests users reused across the layered game flow suites.
 */
export const PLAYERS = [
	{ id: 1001, username: 'alice_sim', name: 'Алиса' },
	{ id: 1002, username: 'bob_sim', name: 'Борис' },
	{ id: 1003, username: 'carol_sim', name: 'Каролина' },
	{ id: 1004, username: 'dave_sim', name: 'Давид' },
] as const;

export const [ALICE, BOB, CAROL, DAVE] = PLAYERS;

export type PlayerFixture = (typeof PLAYERS)[number];
export type UpdatesView = UserSchema['settings']['updatesView'];

interface GameLogInput {
	from: number;
	to: number;
	cardName: CardName;
	steal: boolean;
	stealData?: number[];
	athanasius?: boolean;
}

interface RoomOptions {
	id?: string;
	name?: string;
	owner?: number;
	players?: readonly number[];
	decksCount?: number;
	deckType?: 36 | 52 | 54;
}

interface GameOptions {
	id?: string;
	roomId?: string;
	name?: string;
	players?: readonly number[];
	hands?: Record<number, number[]>;
	athanasiuses?: Record<number, string[]>;
	cardsToAthanasius?: number;
	jokerCardsToAthanasius?: number;
	logs?: string[];
	mailedThisTurn?: number;
	started?: number;
	ended?: number;
}

/**
 * Expected fallback text for invalid or outdated game callbacks.
 */
export const STALE_GAME_MESSAGE_TEXT = 'Игровое сообщение устарело, открой комнату заново';

/**
 * Builds registered users with optional per-user `updatesView` overrides.
 */
export const createUsers = (views: Partial<Record<number, UpdatesView>> = {}): UserSchema[] => {
	return PLAYERS.map(player => ({
		id: player.id,
		username: player.username,
		name: player.name,
		settings: {
			updatesView: views[player.id] ?? 'instant',
		},
		achievements: [],
	}));
};

/**
 * Creates a room fixture with predictable defaults for flow tests.
 */
export const makeRoom = ({
	id = 'room-game',
	name = 'Игровая комната',
	owner = ALICE.id,
	players = [ALICE.id, BOB.id, CAROL.id],
	decksCount = 1,
	deckType = 52,
}: RoomOptions = {}): RoomSchema => ({
	id,
	name,
	owner,
	players: [...players],
	settings: {
		joinCode: 'GAME-FLOW',
		deckType,
		decksCount,
		towHands: false,
		allowMailing: false,
	},
});

/**
 * Builds one serialized game log entry matching the persisted lowdb format.
 */
export const makeGameLog = ({ from, to, cardName, steal, stealData, athanasius }: GameLogInput): string => {
	return `${from}:${to}:${cardName}:${steal ? 1 : 0}:${stealData ? stealData.join(',') : ''}:${athanasius ? 1 : 0}`;
};

/**
 * Creates a persisted `GameSchema` fixture with override-friendly defaults.
 */
export const makeGame = ({
	id = 'game-flow',
	roomId = 'room-game',
	name = 'Игровая комната',
	players = [ALICE.id, BOB.id, CAROL.id],
	hands,
	athanasiuses,
	cardsToAthanasius = 4,
	jokerCardsToAthanasius = 2,
	logs = [],
	mailedThisTurn,
	started = Date.now(),
	ended,
}: GameOptions = {}): GameSchema => {
	const gamePlayers = [...players];
	const defaultHands = Object.fromEntries(gamePlayers.map(playerId => [playerId, [] as number[]]));
	const defaultAthanasiuses = Object.fromEntries(gamePlayers.map(playerId => [playerId, [] as string[]]));

	return {
		id,
		roomId,
		name,
		started,
		ended,
		players: gamePlayers,
		hands: { ...defaultHands, ...(hands ?? {}) },
		athanasiuses: { ...defaultAthanasiuses, ...(athanasiuses ?? {}) },
		utils: {
			cardsToAthanasius,
			jokerCardsToAthanasius,
			logs,
			mailedThisTurn,
		},
	};
};

/**
 * Resolves one or more repeated deck ids for a specific rank and suit.
 */
export const cardIds = (cardName: CardName, suit: SuitName, count = 1): number[] => {
	const card = Deck.getDeck().find(item => item.name === cardName && item.suit === suit);

	if (!card) {
		throw new Error(`Card ${cardName} ${suit} not found`);
	}

	return Array.from({ length: count }, () => card.id);
};

/**
 * Seeds users, one room, and optionally one game for a single flow case.
 */
export const seedGameState = async ({
	users = createUsers(),
	room = makeRoom(),
	game,
}: {
	users?: UserSchema[];
	room?: RoomSchema;
	game?: GameSchema;
} = {}): Promise<void> => {
	await seedDB({
		users,
		rooms: [room],
		games: game ? [game] : [],
	});
	resetLog();
};

/**
 * Clears both captured messages and persisted game-flow data for a fresh case.
 */
export const resetGameFlowCase = async (): Promise<void> => {
	resetLog();
	await clearDB();
};

/**
 * Loads a `Game` aggregate from the current tests database.
 */
export const getGame = (gameId = 'game-flow'): InstanceType<typeof Game> => new Game({ id: gameId });

/**
 * Loads the seeded room fixture from the current tests database.
 */
export const getRoom = (roomId = 'room-game'): RoomSchema => ORM.Rooms.getById(roomId);

/**
 * Builds a callback context for the staged game callback handler.
 */
export const makeTurnCallbackCtx = (player: PlayerFixture, meta?: string, messageId = 1): CallbackCtx => withCallbackMethods({
	chat: { id: player.id, type: 'private' as const },
	from: { id: player.id, is_bot: false, first_name: player.name, username: player.username },
	callbackData: { module: 'g', action: 't', meta },
	callbackQuery: {
		id: `cb-${player.id}-${messageId}`,
		from: { id: player.id, is_bot: false, first_name: player.name, username: player.username },
		message: {
			message_id: messageId,
			chat: { id: player.id, type: 'private' as const },
			date: Math.floor(Date.now() / 1000),
		},
		chat_instance: '',
		data: `g:t:${meta ?? ''}`,
	},
}) as unknown as CallbackCtx;

/**
 * Generates callback payloads for every staged game interaction step.
 */
export const turnMeta = {
	player: (gameId: string, playerId: number): string => `0#${gameId}#${playerId}`,
	card: (gameId: string, playerId: number, cardName: CardName): string => `1#${gameId}#${playerId}#${cardName}`,
	count: (gameId: string, playerId: number, cardName: CardName, count: number, action: '+' | '-' | 'select'): string =>
		`2#${gameId}#${playerId}#${cardName}#${count}${action}`,
	colors: (
		gameId: string,
		playerId: number,
		cardName: CardName,
		count: number,
		redCount: number,
		action: '+' | '-' | 'select',
	): string => `3#${gameId}#${playerId}#${cardName}#${count}#${redCount}${action}`,
	suits: (
		gameId: string,
		playerId: number,
		cardName: CardName,
		count: number,
		redCount: number,
		options: {
			hearts: number;
			diamonds: number;
			spades: number;
			clubs: number;
			mode?: '+' | '-';
			action: 'h' | 'd' | 's' | 'c' | 'm' | 'select';
		},
	): string => {
		const {
			hearts,
			diamonds,
			spades,
			clubs,
			mode = '+',
			action,
		} = options;

		return `4#${gameId}#${playerId}#${cardName}#${count}#${redCount}#${hearts}!${diamonds}!${spades}!${clubs}!${mode}!${action}`;
	},
};

/**
 * Executes the real game callback handler with a staged tests payload.
 */
export const runTurn = async (player: PlayerFixture, meta?: string, messageId = 1): Promise<void> => {
	const handlers = await import('../../../src/modules/game/handlers');
	await handlers.gameTurnCallbackHandler(makeTurnCallbackCtx(player, meta, messageId));
};

/**
 * Returns all non-deleted messages for a user, optionally filtered by transport type.
 */
export const getMessagesFor = (
	playerId: number,
	options: { type?: 'send' | 'edit' | 'delete' } = {},
): string[] => {
	const { type } = options;
	return getLog()
		.filter(entry => entry.to === playerId && (type ? entry.type === type : true))
		.map(entry => entry.text);
};

/**
 * Returns the latest visible message for a user, optionally filtered by message type.
 */
export const getLatestMessage = (
	playerId: number,
	options: { type?: 'send' | 'edit' } = {},
): string | undefined => {
	const { type } = options;
	const entries = getLog().filter(entry => entry.to === playerId && entry.type !== 'delete' && (type ? entry.type === type : true));
	return entries[entries.length - 1]?.text;
};

/**
 * Counts how many raw card ids remain across every player hand.
 */
export const totalCardsInHands = (game: GameSchema): number => {
	return Object.values(game.hands).reduce((sum, hand) => sum + hand.length, 0);
};

/**
 * Counts how many physical cards are represented by all persisted Athanasiuses.
 */
export const totalAthanasiusCards = (game: GameSchema): number => {
	return Object.values(game.athanasiuses).reduce((sum, cardNames) => {
		const cardsCount = cardNames.reduce((rankSum, cardName) => {
			return rankSum + (cardName === 'Joker' ? game.utils.jokerCardsToAthanasius : game.utils.cardsToAthanasius);
		}, 0);

		return sum + cardsCount;
	}, 0);
};

/**
 * Returns the current persisted hands map for quick lowdb assertions.
 */
export const allCurrentHands = (gameId = 'game-flow'): Record<number, number[]> => {
	return DB.data.games.find(game => game.id === gameId)?.hands ?? {};
};

/**
 * Returns the current persisted Athanasiuses map for quick lowdb assertions.
 */
export const allCurrentAthanasiuses = (gameId = 'game-flow'): Record<number, string[]> => {
	return DB.data.games.find(game => game.id === gameId)?.athanasiuses ?? {};
};

/**
 * Returns the persisted game schema backing the current `Game` aggregate.
 */
export const getPersistedGame = (gameId = 'game-flow'): GameSchema => {
	const game = DB.data.games.find(item => item.id === gameId);

	if (!game) {
		throw new Error(`Persisted game ${gameId} not found`);
	}

	return game;
};

/**
 * Replays initial Athanasius notifications for an already seeded game fixture.
 */
export const notifySeededInitialAthanasiuses = async (gameId = 'game-flow'): Promise<void> => {
	await notifyInitialAthanasiuses(getGame(gameId), BOT.api.sendMessage.bind(BOT.api));
};

/**
 * Sends the next-turn message for a seeded game fixture.
 */
export const sendSeededFirstMessage = async (gameId = 'game-flow', initial = false): Promise<void> => {
	await sendFirstMessage(getGame(gameId), BOT.api.sendMessage.bind(BOT.api), initial);
};

/**
 * Returns the visible label used for a card rank in tests assertions.
 */
export const cardLabel = (cardName: CardName): string => DeckConfig.CARDS_VIEW_MAP[cardName];

/**
 * Resolves one or more repeated card ids from the 36-card deck for a specific rank and suit.
 */
export const cardIds36 = (cardName: CardName, suit: SuitName, count = 1): number[] => {
	const card = Deck.getDeck(36).find(item => item.name === cardName && item.suit === suit);

	if (!card) {
		throw new Error(`Card ${cardName} ${suit} not found in 36-deck`);
	}

	return Array.from({ length: count }, () => card.id);
};

/**
 * Resolves one or more repeated card ids from the 54-card deck for a specific rank and suit.
 * Use this for regular cards in 54-deck game tests (jokers have dedicated helpers).
 */
export const cardIds54 = (cardName: CardName, suit: SuitName, count = 1): number[] => {
	const card = Deck.getDeck(54).find(item => item.name === cardName && item.suit === suit);

	if (!card) {
		throw new Error(`Card ${cardName} ${suit} not found in 54-deck`);
	}

	return Array.from({ length: count }, () => card.id);
};

/**
 * Returns the card ID of the joker of the given color from the 54-card deck.
 */
export const jokerCardId = (color: 'red' | 'black'): number => {
	const card = Deck.getDeck(54).find(c => c.name === 'Joker' && c.color === color);

	if (!card) {
		throw new Error(`Joker (${color}) not found in 54-deck`);
	}

	return card.id;
};
