import { InlineKeyboard } from 'grammy';

import { BOT } from '~/core';
import { ORM } from '~/db';
import { Game } from '~/entities/game';
import { escapeHtml } from '~/shared/lib';
import { playersList } from '~/shared/ui';
import { txt, MIN_PLAYERS_TO_START } from '~/shared/ui/game';
import { DeckConfig } from '~/entities/deck';
import { stringifyCallbackData, getCallbackMeta } from '~/core/lib';
import type { AppContext, CallbackCtx } from '~/core';
import type { RoomSchema, RoomId } from '~/db';
import type { PlayerId } from '~/entities/game';
import type { DeckType } from '~/entities/deck';

import * as ui from './ui';

class RoomTexts {
	private readonly room: RoomSchema;
	private readonly gameStarted: boolean;

	constructor (room: RoomSchema, gameStarted?: boolean) {
		this.room = room;
		this.gameStarted = gameStarted ?? false;
	}

	private header (): string {
		return `Комната ${escapeHtml(this.room.name)}`;
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
			`Количество колод: ${this.room.settings.decksCount}\n` +
			`Тип колоды: ${DeckConfig.getDeckTypeLabel(this.room.settings.deckType)}`;
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

	await Promise.allSettled(
		playersToMailing.map(playerId => BOT.api.sendMessage(playerId, text)),
	);
};

export const getRoomsListText = () => ui.txt.roomsList;

export const getRoomsInlineKeyboard = (rooms: RoomSchema[]) => {
	const keyboard = new InlineKeyboard();

	rooms.forEach(r => {
		keyboard.text(r.name, stringifyCallbackData({ module: 'rooms', action: 'open', meta: r.id }));
		keyboard.row();
	});

	keyboard.text('Зайти по коду', stringifyCallbackData({ module: 'rooms', action: 'join' }));
	keyboard.row();
	keyboard.text('Создать комнату', stringifyCallbackData({ module: 'rooms', action: 'create' }));

	return keyboard;
};

export const getRoomBaseText = (room: RoomSchema, gameStarted?: boolean): string => {
	const roomTexts = new RoomTexts(room, gameStarted);
	return roomTexts.roomBaseText();
};

export const getRoomInlineKeyboard = (meId: number, room: RoomSchema) => {
	const keyboard = new InlineKeyboard();
	const gameStarted = !!ORM.Games.getActive(room.id);

	if (gameStarted) {
		keyboard.text('Афанасии', stringifyCallbackData({ module: 'room', action: 'getath', meta: room.id }));
		keyboard.row();
		keyboard.text('Чей ход', stringifyCallbackData({ module: 'room', action: 'whoseturn', meta: room.id }));
		keyboard.row();

		if (room.owner === meId) {
			keyboard.text('Отправить сообщение хода', stringifyCallbackData({ module: 'room', action: 'sendturnmsg', meta: room.id }));
			keyboard.row();
		}
	} else {
		if (room.owner === meId) {
			keyboard.text('Настройки', stringifyCallbackData({ module: 'room', action: 'settings', meta: room.id }));
			keyboard.row();

			if (room.players.length > 1) {
				keyboard.text('Выгнать игроков', stringifyCallbackData({ module: 'room', action: 'kick', meta: `${room.id}:` }));
				keyboard.row();
			}

			if (room.players.length >= MIN_PLAYERS_TO_START) {
				keyboard.text('Начать игру', stringifyCallbackData({ module: 'room', action: 'start', meta: room.id }));
				keyboard.row();
			}

			keyboard.text('Удалить комнату', stringifyCallbackData({ module: 'room', action: 'delete', meta: room.id }));
			keyboard.row();
		} else {
			keyboard.text('Выйти', stringifyCallbackData({ module: 'room', action: 'leave', meta: room.id }));
			keyboard.row();
		}
	}

	keyboard.text('Назад', stringifyCallbackData({ module: 'rooms', back: true, meta: 'list' }));

	return keyboard;
};

export const getDeckTypeInlineKeyboard = (room: RoomSchema) => {
	const keyboard = new InlineKeyboard();
	const options: { label: string; value: DeckType }[] = [
		{ label: '36 карт', value: 36 },
		{ label: '52 карты', value: 52 },
		{ label: '54 карты (с джокерами)', value: 54 },
	];
	options.forEach(({ label, value }) => {
		const isCurrent = room.settings.deckType === value;
		keyboard.text((isCurrent ? '✅ ' : '') + label, stringifyCallbackData({ module: 'room', action: 'cdt', meta: `${room.id}:${value}` }));
		keyboard.row();
	});
	keyboard.text('Назад', stringifyCallbackData({ module: 'rooms', back: true, meta: `room:${room.id}` }));
	return keyboard;
};

export const getRoomIdFromMeta = (ctx: CallbackCtx): RoomId => {
	const roomId = getCallbackMeta(ctx.callbackQuery.data);

	if (!roomId) {
		throw new Error('Room id required');
	}

	return roomId;
};

export const getRoomFromMeta = (ctx: CallbackCtx): RoomSchema => {
	return ORM.Rooms.getById(getRoomIdFromMeta(ctx));
};

export const getGameFromMeta = (ctx: CallbackCtx): Game => {
	const roomId = getRoomIdFromMeta(ctx);

	const gameId = ORM.Games.getActive(roomId)?.id;

	if (!gameId) {
		throw new Error('Game not found');
	}

	return new Game({ id: gameId });
};

export const getSettingsStartText = (room: RoomSchema) => {
	return getRoomBaseText(room) + '\n\nВыбери что хочешь изменить';
};

export const getSettingsInlineKeyboard = (room: RoomSchema) => {
	const keyboard = new InlineKeyboard();
	keyboard.text('Код подключения', stringifyCallbackData({ module: 'room', action: 'cjc', meta: room.id }));
	keyboard.row();
	keyboard.text('Количество колод', stringifyCallbackData({ module: 'room', action: 'cdc', meta: room.id }));
	keyboard.row();
	keyboard.text('Тип колоды', stringifyCallbackData({ module: 'room', action: 'cdt', meta: room.id }));
	keyboard.row();
	keyboard.text('Назад', stringifyCallbackData({ module: 'rooms', back: true, meta: `room:${room.id}` }));
	return keyboard;
};

export const isRoomMember = (room: RoomSchema, userId: number): boolean => {
	return room.players.includes(userId);
};

export const isRoomOwner = (room: RoomSchema, userId: number): boolean => {
	return room.owner === userId;
};

export const ensureRoomMember = async (ctx: AppContext, room: RoomSchema): Promise<boolean> => {
	if (isRoomMember(room, ctx.from!.id)) {
		return true;
	}

	await ctx.reply(`Ты не в комнате ${escapeHtml(room.name)}`);
	return false;
};

export const ensureRoomOwner = async (ctx: AppContext, room: RoomSchema): Promise<boolean> => {
	if (isRoomOwner(room, ctx.from!.id)) {
		return true;
	}

	await ctx.reply(ui.txt.ownerOnly);
	return false;
};
