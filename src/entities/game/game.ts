import { nanoid } from 'nanoid';
import type { Dayjs } from 'dayjs';

import { BOT } from '~/core';
import { DB, ORM } from '~/db';
import { dayjs } from '~/shared/plugins';
import { DeckConfig } from '~/entities/deck';

import { Queue } from './model/queue';
import { Hands } from './model/hands';
import type { Hand } from './model/hand';

import { TurnStage } from './types';
import type { GameId, GameLog, GameSchema, GameUtils, UserSchema } from '~/db';
import type { MailingOptions, PlayerId, TurnOptions, TurnReturn } from './types';

interface ConstructorOptionsById {
	id: string;
	players?: never;
	decksCount?: never;
}

interface ConstructorOptionsInit {
	id?: never;
	players: PlayerId[];
	decksCount: number;
}

export class Game {
	private readonly id: GameId;
	private readonly started: Dayjs;
	private ended?: Dayjs;
	private readonly queue: Queue;
	private readonly hands: Hands;
	private readonly athanasiuses: GameSchema['athanasiuses'];
	private readonly utils: GameUtils;

	constructor (options: ConstructorOptionsById | ConstructorOptionsInit) {
		if ('id' in options) {
			const game = DB.data.games.find(g => g.id === options.id);

			if (!game) {
				throw new Error('Game not found');
			}

			this.id = game.id;
			this.started = dayjs(game.started);
			this.ended = game.ended ? dayjs(game.ended) : undefined;
			this.queue = new Queue(game.players, false);
			this.hands = new Hands({ hands: game.hands });
			this.athanasiuses = game.athanasiuses;
			this.utils = game.utils;
		} else {
			const { players, decksCount } = options;

			this.id = nanoid(6);
			this.started = dayjs();
			this.queue = new Queue(options.players, true);
			this.hands = new Hands({ players: options.players, decksCount, queue: this.queue });
			this.athanasiuses = Object.fromEntries(players.map(p => [p, []]));
			this.utils = { cardsToAthanasius: decksCount * 4, logs: [] };
		}
	}

	/* GETTERS */
	public get gameId (): GameId {
		return this.id;
	}

	public get activePlayer (): UserSchema {
		return ORM.Users.get(this.queue.activePlayer);
	}

	public get allPlayers (): PlayerId[] {
		return this.queue.allPlayers;
	}

	public get playersWithComposedUpdated (): PlayerId[] {
		const players = DB.data.users.filter(u => this.allPlayers.includes(u.id));
		return players.filter(p => p.settings.updatesView === 'composed').map(p => p.id);
	}

	public getAthanasiuses (): GameSchema['athanasiuses'] {
		return this.athanasiuses;
	}

	public getHand (playerId: PlayerId): Hand | undefined {
		return this.hands.getHand(playerId);
	}

	public getCountAthanasiuses (playerId: PlayerId): number {
		return this.athanasiuses[playerId]?.length || 0;
	}

	/* LOGS */
	private formatStealData (stealData: number[]): string {
		switch (stealData.length) {
		case 1:
			return `${stealData[0]}`;
		case 2:
			return `🔴: ${stealData[0]} ⚫: ${stealData[1]}`;
		case 4:
			return `♥️: ${stealData[0]} ♦️: ${stealData[1]} ♠️: ${stealData[2]} ♣️: ${stealData[3]}`;
		default:
			throw new Error('Wrong stealData! Expected 1, 2 or 4 numbers!');
		}
	}

	private getLogMessage (log: GameLog): string {
		const from = ORM.Users.get(log.from);
		const to = ORM.Users.get(log.to);

		let msg = `<b>${from.name} -> ${to.name}</b> | ${DeckConfig.CARDS_VIEW_MAP[log.cardName]}`;

		if (log.stealData?.length) {
			if (log.steal) {
				msg += ' | ' + this.formatStealData(log.stealData);
			} else {
				msg += ` | Не ${this.formatStealData(log.stealData)}`;
			}
		}

		return msg;
	}

	public get hasLogs (): boolean {
		return this.utils.logs[this.utils.logs.length - 1].from !== this.activePlayer.id;
	}

	public getLastRoundLogs (): string {
		const result: string[] = [];

		for (let i = this.utils.logs.length - 1; i >= 0; i--) {
			const log = this.utils.logs[i];
			if (log.from === this.activePlayer.id) {
				break;
			}
			result.push(this.getLogMessage(log));
		}

		return result.reverse().join('\n');
	}

	/* PERSISTENCE */
	private toSchema (): GameSchema {
		return {
			id: this.id,
			started: this.started.valueOf(),
			ended: this.ended?.valueOf(),
			players: this.queue.allPlayers,
			hands: this.hands.allHands,
			athanasiuses: this.athanasiuses,
			utils: this.utils,
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
		const playersToMailing = this.allPlayers.filter(p => !exclude.includes(p));

		await Promise.allSettled(
			playersToMailing.map(playerId => BOT.sendMessageByChatId({ ...options, chatId: playerId })),
		);
	}

	/* TURNS */
	public async turn ({ me, turnMeta, options }: TurnOptions): Promise<TurnReturn> {
		const hand = this.hands.hand(turnMeta.player.id);
		if (hand.has(options)) {
			return this.handleSuccessfulTurn({ me, turnMeta });
		} else {
			return this.handleFailedTurn({ me, turnMeta });
		}
	}

	private async handleSuccessfulTurn ({ me, turnMeta }: Omit<TurnOptions, 'options'>): Promise<TurnReturn> {
		if (turnMeta.stage !== TurnStage.suits) {
			return { success: true };
		}

		const newAthanasiuses = this.hands.moveCards(me, turnMeta.player.id, turnMeta.cardName, this.utils);

		if (newAthanasiuses.length > 0) {
			this.athanasiuses[me].push(...newAthanasiuses);
			this.utils.logs.push({
				from: me,
				to: turnMeta.player.id,
				cardName: turnMeta.cardName,
				steal: true,
				stealData: this.getStealData(turnMeta),
			});
		}

		const gameEnded = this.hands.handleGameEnd(this.queue.allPlayers);

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
		do {
			this.queue.next();
		} while (this.hands.hand(this.activePlayer.id).cardsInHand.length === 0);

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
