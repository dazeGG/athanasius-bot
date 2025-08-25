import { nanoid } from 'nanoid';
import type { Dayjs } from 'dayjs';

import { BOT, DB } from '~/core';
import type { CardName, GameSchema, GameId, GameUtils } from '~/core';
import { dayjs } from '~/plugins';

import type { MailingOptions, PlayerId } from '../types';
import { Hands, Queue } from '.';
import type { HandHasOptions } from './types';
import type { Hand } from './hand';

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
	private readonly ended?: Dayjs;
	private readonly queue: Queue;
	private readonly hands: Hands;
	private readonly athanasiuses: GameSchema['athanasiuses'];
	private readonly utils: GameUtils;

	constructor ({ id, players, decksCount }: ConstructorOptionsById | ConstructorOptionsInit) {
		if (id) {
			const game = DB.data.games.find(game => game.id === id);

			if (!game) {
				throw new Error('404: Game not found');
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

	public getHand (playerId: PlayerId): Hand | undefined {
		return this.hands.getHand(playerId);
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

				return {
					games,
				};
			});
		}
	}

	public async turn (playerId: PlayerId, options: HandHasOptions): Promise<{ success: boolean; }> {
		const right = this.hands.hand(playerId).has(options);

		if (right) {
			return { success: true };
		} else {
			this.queue.next();
			await this.save();
			return { success: false };
		}
	}

	public async moveCards (me: PlayerId, playerId: PlayerId, cardName: CardName): Promise<CardName[]> {
		const newAthanasiuses = this.hands.moveCards(me, playerId, cardName, this.utils);

		if (newAthanasiuses.length > 0) {
			this.athanasiuses[me].push(...newAthanasiuses);
		}

		await this.save();
		return newAthanasiuses;
	}
}
