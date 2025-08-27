import { nanoid } from 'nanoid';
import type { Dayjs } from 'dayjs';

import { BOT } from '~/core';
import { DB, ORM } from '~/db';
import type { GameId, GameLog, GameSchema, GameUtils } from '~/db';
import { dayjs } from '~/shared/plugins';

import { Queue } from './queue';
import { Hands } from './hands';
import type { Hand } from './hand';

import type {
	CardStageMeta,
	ColorsStageMeta,
	CountStageMeta,
	MailingOptions,
	PlayerId,
	SuitsStageMeta,
	HandHasOptions,
} from '../types';
import { TurnStage } from '../types';
import { CARDS_VIEW_MAP } from '~/entities/deck';

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

type ConstructorOptions = ConstructorOptionsById | ConstructorOptionsInit;

interface TurnOptions {
	me: PlayerId;
	turnMeta: CardStageMeta | CountStageMeta | ColorsStageMeta | SuitsStageMeta;
	options: HandHasOptions;
}

interface TurnReturn {
	success: boolean;
	composeAthanasius?: boolean;
	gameEnded?: boolean;
}

const getStealData = (turnMeta: TurnOptions['turnMeta']): GameLog['stealData'] => {
	switch (turnMeta.stage) {
	case TurnStage.count:
		return [turnMeta.count];
	case TurnStage.colors:
		return [turnMeta.redCount, turnMeta.blackCount];
	case TurnStage.suits:
		return [turnMeta.suits.hearts, turnMeta.suits.diamonds, turnMeta.suits.spades, turnMeta.suits.clubs];
	}
};

export class Game {
	private readonly id: GameId;
	private readonly started: Dayjs;
	private ended?: Dayjs;
	private readonly queue: Queue;
	private readonly hands: Hands;
	private readonly athanasiuses: GameSchema['athanasiuses'];
	private readonly utils: GameUtils;

	constructor ({ id, players, decksCount }: ConstructorOptions) {
		if (id) {
			const game = DB.data.games.find(game => game.id === id);

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
		} else if (players && decksCount) {
			this.id = nanoid(6);
			this.started = dayjs();
			this.queue = new Queue(players, true);
			this.hands = new Hands({ players, decksCount, queue: this.queue });
			this.athanasiuses = {};
			players.forEach(playerId => {
				this.athanasiuses[playerId] = [];
			});
			this.utils = { cardsToAthanasius: decksCount * 4, logs: [] };
		} else {
			throw new Error('Game options error');
		}
	}

	get gameId (): GameId {
		return this.id;
	}

	get activePlayer (): PlayerId {
		return this.queue.activePlayer;
	}

	get allPlayers (): PlayerId[] {
		return this.queue.allPlayers;
	}

	get playersWithComposedUpdated (): PlayerId[] {
		const players = DB.data.users.filter(u => this.allPlayers.includes(u.id));
		return players.filter(p => p.settings.updatedView === 'composed').map(p => p.id);
	}

	public getHand (playerId: PlayerId): Hand | undefined {
		return this.hands.getHand(playerId);
	}

	private getLogMessage (log: GameLog): string {
		const from = ORM.Users.get(log.from);
		const to = ORM.Users.get(log.to);

		let logMessage = `<b>${from.name} -> ${to.name}</b> | ${CARDS_VIEW_MAP[log.cardName]}`;

		if (!log.steal && log.stealData?.length) {
			logMessage += ' | Не ';

			switch (log.stealData.length) {
			case 1:
				logMessage += `${log.stealData[0]}`;
				break;
			case 2:
				logMessage += `🔴: ${log.stealData[0]} ⚫: ${log.stealData[1]}`;
				break;
			case 4:
				logMessage += `♥️: ${log.stealData[0]} ♦️: ${log.stealData[1]} ♠️: ${log.stealData[2]} ♣️: ${log.stealData[3]}`;
				break;
			}
		}

		return logMessage;
	}

	public getLastTurnLogs (): string {
		const logsMessages: string[] = [];
		let i = 0;

		while (true) {
			const log = this.utils.logs[this.utils.logs.length - i - 1];

			if (log.from === this.activePlayer) {
				break;
			}

			logsMessages.push(this.getLogMessage(log));
			++i;
		}

		return logsMessages.reverse().join('\n');
	}

	public async mailing (options: MailingOptions, exclude: PlayerId[] = []): Promise<void> {
		const actualPlayers = this.allPlayers.filter(playerId => !exclude.includes(playerId));
		const methods = actualPlayers.map(playerId => BOT.sendMessageByChatId({ ...options, chatId: playerId }));

		await Promise.all(methods);
	}

	public async save (): Promise<void> {
		const game = DB.data.games.find(game => game.id === this.id);

		if (game) {
			game.players = this.queue.allPlayers;
			game.hands = this.hands.allHands;
			game.athanasiuses = this.athanasiuses;

			await DB.write();
		} else {
			await DB.update(({ games }) => {
				games.push({
					id: this.id,
					started: this.started.valueOf(),
					ended: this.ended ? this.ended.valueOf() : this.ended,
					players: this.queue.allPlayers,
					hands: this.hands.allHands,
					athanasiuses: this.athanasiuses,
					utils: this.utils,
				});

				return { games };
			});
		}
	}

	public async turn ({ me, turnMeta, options }: TurnOptions): Promise<TurnReturn> {
		if (this.hands.hand(turnMeta.player.id).has(options)) {
			if (turnMeta.stage === TurnStage.suits) {
				const newAthanasiuses = this.hands.moveCards(me, turnMeta.player.id, turnMeta.cardName, this.utils);

				if (newAthanasiuses.length > 0) {
					this.athanasiuses[me].push(...newAthanasiuses);
					this.utils.logs.push({ from: me, to: turnMeta.player.id, cardName: turnMeta.cardName, steal: true });
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
			} else {
				await this.save();
				return { success: true };
			}
		} else {
			this.queue.next();

			this.utils.logs.push({
				from: me,
				to: turnMeta.player.id,
				cardName: turnMeta.cardName,
				steal: false,
				stealData: getStealData(turnMeta),
			});

			await this.save();
			return { success: false };
		}
	}
}
