import type TelegramBot from 'node-telegram-bot-api';

import { BOT } from '~/core';
import { ORM } from '~/db';
import { Game } from '~/entities/game';
import { playersList } from '~/shared/ui';
import { txt } from '~/shared/ui/game';
import type { CallbackContext, MessageContext } from '~/core';
import type { RoomSchema, RoomId } from '~/db';
import type { PlayerId } from '~/entities/game';

import * as ui from './ui';

class RoomTexts {
	private readonly room: RoomSchema;
	private readonly gameStarted: boolean;

	constructor (room: RoomSchema, gameStarted?: boolean) {
		this.room = room;
		this.gameStarted = gameStarted ?? false;
	}

	private header (): string {
		return `Комната ${this.room.name}`;
	}

	private gameStatus (): string {
		return this.gameStarted ? txt.ongoing : txt.notStarted;
	}

	private joinCode (): string {
		return `Код подключения: <code>${this.room.settings.joinCode}</code>`;
	}

	private players (): string {
		return `Список игроков:\n${playersList(this.room.players)}`;
	}

	private settings (): string {
		return 'Настройки игры:\n' +
			`Количество колод: ${this.room.settings.decksCount}`;
	}

	public roomBaseText (): string {
		return this.header() + '\n' +
			this.gameStatus() + '\n\n' +
			this.joinCode() + '\n\n' +
			this.players() + '\n\n' +
			this.settings();
	}
}

export const mailing = async (text: string, room: RoomSchema, exclude: PlayerId[] = []) => {
	const playersToMailing = room.players.filter(playerId => !exclude.includes(playerId));

	for (const playerId of playersToMailing) {
		await BOT.sendMessageByChatId({ chatId: playerId, text: text });
	}
};

export const getRoomsListOptions = (me: TelegramBot.User) => {
	return { text: ui.txt.roomsList, keyboard: ui.gkb.roomsList(ORM.Rooms.getWithMe(me.id)) };
};

export const getRoomBaseText = (room: RoomSchema, gameStarted?: boolean): string => {
	const roomTexts = new RoomTexts(room, gameStarted);
	return roomTexts.roomBaseText();
};

export const getRoomOptions = (me: TelegramBot.User, room: RoomSchema) => {
	const gameStarted = !!ORM.Games.getActive(room.id);
	return {
		text: getRoomBaseText(room, gameStarted),
		keyboard: gameStarted ? ui.gkb.roomOngoing(me.id, room) : ui.gkb.room(me.id, room),
	};
};

export const getRoomIdFromMeta = (ctx: CallbackContext): RoomId => {
	const { data: { meta: roomId } } = ctx.callback;

	if (!roomId) {
		throw new Error('Room id required');
	}

	return roomId;
};

export const getRoomFromMeta = (ctx: CallbackContext): RoomSchema => {
	return ORM.Rooms.getById(getRoomIdFromMeta(ctx));
};

export const getGameFromMeta = (ctx: CallbackContext): Game => {
	const roomId = getRoomIdFromMeta(ctx);

	const gameId = ORM.Games.getActive(roomId)?.id;

	if (!gameId) {
		throw new Error('Game not found');
	}

	const game = gameId ? new Game({ id: gameId }) : null;

	if (!game) {
		throw new Error('Game not found');
	}

	return game;
};

export const getSettingsStartOptions = (ctx: MessageContext | CallbackContext, room: RoomSchema) => {
	return {
		ctx,
		text: getRoomBaseText(room) + '\n\nВыбери что хочешь изменить',
		keyboard: ui.gkb.settings(room),
	};
};
