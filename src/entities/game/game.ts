import { nanoid } from 'nanoid';
import type { Dayjs } from 'dayjs';

import { DB, ORM } from '~/db';
import { dayjs } from '~/shared/plugins';
import { InfoMessage } from '~/shared/ui/game';
import { sendFirstMessage, notifyInitialAthanasiuses } from '~/entities/game/services';
import type { GameId, GameLog, GameSchema, UserSchema, GameUtilsParsed, RoomId, RoomSchema } from '~/db';

import { Queue } from './model/queue';
import { Hands } from './model/hands';
import { parseGameUtils, generateGameUtils } from './services';
import { getLastRoundLogs, mailing as gameMailing } from './utils';
import { TurnStage } from './types';
import type { Hand } from './model/hand';
import type { MailingOptions, PlayerId, TurnOptions, TurnReturn } from './types';

interface ConstructorOptionsById {
	id: string;
	room?: never;
}

interface ConstructorOptionsInit {
	id?: never;
	room: RoomSchema;
}

export class Game {
	private readonly id: GameId;
	private readonly roomId: RoomId;
	private readonly started: Dayjs;
	private ended?: Dayjs;
	private readonly queue: Queue;
	private readonly hands: Hands;
	private readonly athanasiuses: GameSchema['athanasiuses'];
	private readonly utils: GameUtilsParsed;

	constructor (options: ConstructorOptionsById | ConstructorOptionsInit) {
		if ('id' in options) {
			const game = ORM.Games.getById(options.id ?? '');

			this.id = game.id;
			this.roomId = game.roomId;
			this.started = dayjs(game.started);
			this.ended = game.ended ? dayjs(game.ended) : undefined;
			this.queue = new Queue(game.players, false);
			this.hands = new Hands({ hands: game.hands });
			this.athanasiuses = game.athanasiuses;
			this.utils = parseGameUtils(game.utils);
		} else {
			const { room } = options;
			const { id: roomId, players, settings } = room;

			this.id = nanoid(6);
			this.roomId = roomId;
			this.started = dayjs();
			this.queue = new Queue(players, true);
			this.hands = new Hands({ players, decksCount: settings.decksCount, queue: this.queue });
			this.athanasiuses = Object.fromEntries(players.map(p => [p, []]));
			this.utils = { cardsToAthanasius: settings.decksCount * 4, logs: [] };

			const initialAthanasiuses = this.hands.collectInitialAthanasiuses(this.utils);
			Object.entries(initialAthanasiuses).forEach(([playerIdStr, cardNames]) => {
				this.athanasiuses[Number(playerIdStr) as PlayerId].push(...cardNames);
			});
		}
	}

	public static async create (room: RoomSchema): Promise<Game> {
		const game = new Game({ room });
		await game.save();
		await game.mailing({ text: InfoMessage.gameStartedMailing(room) });
		await notifyInitialAthanasiuses(game);
		await sendFirstMessage(game, true);
		return game;
	}

	/* GETTERS */
	public get gameId (): GameId {
		return this.id;
	}

	public getRoomId (): RoomId {
		return this.roomId;
	}

	public get activePlayer (): UserSchema {
		return ORM.Users.get(this.queue.activePlayer);
	}

	public get isEnded (): boolean {
		return this.ended !== undefined;
	}

	public get allPlayers (): PlayerId[] {
		return this.queue.actualQueue;
	}

	public get playersWithCards (): PlayerId[] {
		return this.queue.actualQueue.filter(id => this.hands.hand(id).cardsInHand.length > 0);
	}

	public get playersWithComposedUpdated (): PlayerId[] {
		const players = DB.data.users.filter(u => this.allPlayers.includes(u.id));
		return players.filter(p => p.settings.updatesView === 'composed').map(p => p.id);
	}

	public get cardsToAthanasius (): number {
		return this.utils.cardsToAthanasius;
	}

	public getAthanasiuses (): GameSchema['athanasiuses'] {
		return this.athanasiuses;
	}

	public getHand (playerId: PlayerId): Hand | undefined {
		return this.hands.getHand(playerId);
	}

	public async ensureActivePlayerHasCards (): Promise<boolean> {
		if (this.hands.hand(this.queue.activePlayer).cardsInHand.length > 0) {
			return true;
		}

		if (this.hands.handleGameEnd(this.queue.actualQueue)) {
			return false;
		}

		this.shiftTurnToNextPlayerWithCards();
		await this.save();

		return true;
	}

	/* LOGS */
	public getLastRoundLogs (): string {
		return getLastRoundLogs(this.utils, this.activePlayer.id);
	}

	/* PERSISTENCE */
	private toSchema (): GameSchema {
		return {
			id: this.id,
			roomId: this.roomId,
			started: this.started.valueOf(),
			ended: this.ended?.valueOf(),
			players: this.queue.actualQueue,
			hands: this.hands.allHands,
			athanasiuses: this.athanasiuses,
			utils: generateGameUtils(this.utils),
		};
	}

	public async save (): Promise<void> {
		const index = DB.data.games.findIndex(g => g.id === this.id);

		if (index >= 0) {
			DB.data.games[index] = this.toSchema();
			await DB.write();
		} else {
			await DB.update(({ games }) => {
				games.push(this.toSchema());
				return { games };
			});
		}
	}

	/* MAILING */
	public async mailing (options: MailingOptions, exclude: PlayerId[] = []): Promise<void> {
		await gameMailing(options, this.allPlayers, exclude);
	}

	/* TURNS */
	public async turn ({ me, turnMeta, options }: TurnOptions): Promise<TurnReturn> {
		if (!this.hands.hand(me).has({ cardName: turnMeta.cardName })) {
			return this.handleFailedTurn({ me, turnMeta });
		}

		const hand = this.hands.hand(turnMeta.player.id);
		if (hand.has(options)) {
			return this.handleSuccessfulTurn({ me, turnMeta });
		} else {
			return this.handleFailedTurn({ me, turnMeta });
		}
	}

	private shiftTurnToNextPlayerWithCards (): void {
		do {
			this.queue.next();
		} while (this.hands.hand(this.queue.activePlayer).cardsInHand.length === 0);
	}

	private async handleSuccessfulTurn ({ me, turnMeta }: Omit<TurnOptions, 'options'>): Promise<TurnReturn> {
		if (turnMeta.stage !== TurnStage.suits) {
			return { success: true };
		}

		const newAthanasiuses = this.hands.moveCards(me, turnMeta.player.id, turnMeta.cardName, this.utils);

		if (newAthanasiuses.length > 0) {
			this.athanasiuses[me].push(...newAthanasiuses);
		}

		this.utils.logs.push({
			from: me,
			to: turnMeta.player.id,
			cardName: turnMeta.cardName,
			steal: true,
			stealData: this.getStealData(turnMeta),
		});

		const gameEnded = this.hands.handleGameEnd(this.queue.actualQueue);

		if (!gameEnded && this.hands.hand(this.queue.activePlayer).cardsInHand.length === 0) {
			this.shiftTurnToNextPlayerWithCards();
		}

		if (gameEnded) {
			this.ended = dayjs();
		}

		await this.save();

		return {
			success: true,
			composeAthanasius: newAthanasiuses.length > 0,
			gameEnded,
		};
	}

	private async handleFailedTurn ({ me, turnMeta }: Omit<TurnOptions, 'options'>): Promise<TurnReturn> {
		this.shiftTurnToNextPlayerWithCards();

		this.utils.logs.push({
			from: me,
			to: turnMeta.player.id,
			cardName: turnMeta.cardName,
			steal: false,
			stealData: this.getStealData(turnMeta),
		});

		await this.save();
		return { success: false };
	}

	private getStealData (turnMeta: TurnOptions['turnMeta']): GameLog['stealData'] {
		switch (turnMeta.stage) {
		case TurnStage.count:
			return [turnMeta.count];
		case TurnStage.colors:
			return [turnMeta.redCount, turnMeta.blackCount];
		case TurnStage.suits:
			return [
				turnMeta.suits.hearts,
				turnMeta.suits.diamonds,
				turnMeta.suits.spades,
				turnMeta.suits.clubs,
			];
		}
	}
}
