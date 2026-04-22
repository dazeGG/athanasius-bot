import { BOT } from '~/core';
import { isRegistered } from '~/shared/lib';

import * as handlers from './handlers';
import { SettingsHandlers } from './settings.handlers';

const registerRooms = () => {
	BOT.registerMessageHandler(handlers.roomsMessageHandler, { exact: 'Комнаты' }, isRegistered);

	/**
	 *  JOIN ROOM
	 */
	BOT.registerCallbackHandler(handlers.joinRoomCallbackHandler, { module: 'rooms', action: 'join' }, isRegistered);
	BOT.registerMessageHandler(handlers.joinRoomCodeMessageHandler, { state: 'ROOMS_JOIN' }, isRegistered);

	/**
	 *  KICK AND LEAVE FROM ROOM
	 */
	BOT.registerCallbackHandler(handlers.kickCallbackHandler, { module: 'room', action: 'kick' }, isRegistered);
	BOT.registerCallbackHandler(handlers.leaveRoomCallbackHandler, { module: 'room', action: 'leave' }, isRegistered);

	/**
	 *  CREATE ROOM
	 */
	BOT.registerCallbackHandler(handlers.createRoomCallbackHandler, { module: 'rooms', action: 'create' }, isRegistered);
	BOT.registerMessageHandler(handlers.createRoomNameMessageHandler, { state: 'ROOMS_CREATE' }, isRegistered);

	/**
	 *  ROOM
	 */
	BOT.registerCallbackHandler(handlers.openRoomCallbackHandler, { module: 'rooms', action: 'open' }, isRegistered);

	/**
	 *  GAME START
	 */
	BOT.registerCallbackHandler(handlers.gameStartCallbackHandler, { module: 'room', action: 'start' }, isRegistered);

	/**
	 *  GET ATHANASIUSES
	 */
	BOT.registerCallbackHandler(handlers.gameGetAthanasiusesCallbackHandler, { module: 'room', action: 'getath' }, isRegistered);

	/**
	 *  WHOSE TURN
	 */
	BOT.registerCallbackHandler(handlers.gameWhoseTurnCallbackHandler, { module: 'room', action: 'whoseturn' }, isRegistered);

	/**
	 *  RESEND TURN MESSAGE
	 */
	BOT.registerCallbackHandler(handlers.gameSendTurnMessageCallbackHandler, { module: 'room', action: 'sendturnmsg' }, isRegistered);

	/**
	 *  BACK
	 */
	BOT.registerCallbackHandler(handlers.backCallbackHandler, { module: 'rooms', back: true }, isRegistered);

	/**
	 *  SETTINGS
	 */
	BOT.registerCallbackHandler(SettingsHandlers.start, { module: 'room', action: 'settings' }, isRegistered);
	BOT.registerCallbackHandler(SettingsHandlers.changeJoinCode, { module: 'room', action: 'cjc' }, isRegistered);
	BOT.registerCallbackHandler(SettingsHandlers.changeDecksCount, { module: 'room', action: 'cdc' }, isRegistered);
	BOT.registerMessageHandler(SettingsHandlers.changeDecksCountMessage, { state: 'ROOM_CDC' }, isRegistered);
};

export default registerRooms;
