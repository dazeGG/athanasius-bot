import { ORM } from '~/db';
import { Deck, DeckConfig } from '~/entities/deck';
import type { GameSchema, RoomSchema, UserSchema } from '~/db';
import type { CardName, SuitName } from '~/entities/deck';
import type { CallbackContext } from '~/core';

import {
	clearDB,
	DB,
	Game,
	getLog,
	notifyInitialAthanasiuses,
	resetLog,
	seedDB,
	sendFirstMessage,
} from '../../bootstrap';

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
}

interface RoomOptions {
	id?: string;
	name?: string;
	owner?: number;
	players?: readonly number[];
	decksCount?: number;
}

interface GameOptions {
	id?: string;
	roomId?: string;
	players?: readonly number[];
	hands?: Record<number, number[]>;
	athanasiuses?: Record<number, string[]>;
	cardsToAthanasius?: number;
	logs?: string[];
	started?: number;
	ended?: number;
}

export const STALE_GAME_MESSAGE_TEXT = 'Игровое сообщение устарело, открой комнату заново';

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

export const makeRoom = ({
	id = 'room-game',
	name = 'Игровая комната',
	owner = ALICE.id,
	players = [ALICE.id, BOB.id, CAROL.id],
	decksCount = 1,
}: RoomOptions = {}): RoomSchema => ({
	id,
	name,
	owner,
	players: [...players],
	settings: {
		joinCode: 'GAME-FLOW',
		deckType: 52,
		decksCount,
		towHands: false,
		allowMailing: false,
		allowMailingAtTurn: false,
	},
});

export const makeGameLog = ({ from, to, cardName, steal, stealData }: GameLogInput): string => {
	return `${from}:${to}:${cardName}:${steal ? 1 : 0}:${stealData ? stealData.join(',') : ''}`;
};

export const makeGame = ({
	id = 'game-flow',
	roomId = 'room-game',
	players = [ALICE.id, BOB.id, CAROL.id],
	hands,
	athanasiuses,
	cardsToAthanasius = 4,
	logs = [],
	started = Date.now(),
	ended,
}: GameOptions = {}): GameSchema => {
	const gamePlayers = [...players];
	const defaultHands = Object.fromEntries(gamePlayers.map(playerId => [playerId, [] as number[]]));
	const defaultAthanasiuses = Object.fromEntries(gamePlayers.map(playerId => [playerId, [] as string[]]));

	return {
		id,
		roomId,
		started,
		ended,
		players: gamePlayers,
		hands: { ...defaultHands, ...(hands ?? {}) },
		athanasiuses: { ...defaultAthanasiuses, ...(athanasiuses ?? {}) },
		utils: {
			cardsToAthanasius,
			logs,
		},
	};
};

export const cardIds = (cardName: CardName, suit: SuitName, count = 1): number[] => {
	const card = Deck.getDeck().find(item => item.name === cardName && item.suit === suit);

	if (!card) {
		throw new Error(`Card ${cardName} ${suit} not found`);
	}

	return Array.from({ length: count }, () => card.id);
};

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

export const resetGameFlowCase = async (): Promise<void> => {
	resetLog();
	await clearDB();
};

export const getGame = (gameId = 'game-flow'): Game => new Game({ id: gameId });

export const getRoom = (roomId = 'room-game'): RoomSchema => ORM.Rooms.getById(roomId);

export const makeTurnCallbackCtx = (player: PlayerFixture, meta?: string, messageId = 1): CallbackContext => ({
	chatId: player.id,
	callback: {
		id: `cb-${player.id}-${messageId}`,
		from: { id: player.id, is_bot: false, first_name: player.name, username: player.username },
		message: {
			message_id: messageId,
			chat: { id: player.id, type: 'private' as const },
			date: Math.floor(Date.now() / 1000),
		},
		data: { module: 'g', action: 't', meta },
	},
}) as unknown as CallbackContext;

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

export const runTurn = async (player: PlayerFixture, meta?: string, messageId = 1): Promise<void> => {
	const handlers = await import('~/modules/game/handlers');
	await handlers.gameTurnCallbackHandler(makeTurnCallbackCtx(player, meta, messageId));
};

export const getMessagesFor = (
	playerId: number,
	options: { type?: 'send' | 'edit' | 'delete' } = {},
): string[] => {
	const { type } = options;
	return getLog()
		.filter(entry => entry.to === playerId && (type ? entry.type === type : true))
		.map(entry => entry.text);
};

export const getLatestMessage = (
	playerId: number,
	options: { type?: 'send' | 'edit' } = {},
): string | undefined => {
	const { type } = options;
	const entries = getLog().filter(entry => entry.to === playerId && entry.type !== 'delete' && (type ? entry.type === type : true));
	return entries[entries.length - 1]?.text;
};

export const totalCardsInHands = (game: GameSchema): number => {
	return Object.values(game.hands).reduce((sum, hand) => sum + hand.length, 0);
};

export const totalAthanasiusCards = (game: GameSchema): number => {
	return Object.values(game.athanasiuses).reduce((sum, cardNames) => sum + cardNames.length * game.utils.cardsToAthanasius, 0);
};

export const allCurrentHands = (gameId = 'game-flow'): Record<number, number[]> => {
	return DB.data.games.find(game => game.id === gameId)?.hands ?? {};
};

export const allCurrentAthanasiuses = (gameId = 'game-flow'): Record<number, string[]> => {
	return DB.data.games.find(game => game.id === gameId)?.athanasiuses ?? {};
};

export const getPersistedGame = (gameId = 'game-flow'): GameSchema => {
	const game = DB.data.games.find(item => item.id === gameId);

	if (!game) {
		throw new Error(`Persisted game ${gameId} not found`);
	}

	return game;
};

export const notifySeededInitialAthanasiuses = async (gameId = 'game-flow'): Promise<void> => {
	await notifyInitialAthanasiuses(getGame(gameId));
};

export const sendSeededFirstMessage = async (gameId = 'game-flow', initial = false): Promise<void> => {
	await sendFirstMessage(getGame(gameId), initial);
};

export const cardLabel = (cardName: CardName): string => DeckConfig.CARDS_VIEW_MAP[cardName];
