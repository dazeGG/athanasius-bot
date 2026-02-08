import { BOT } from '~/core';
import { isRegistered } from '~/shared/lib';

import * as handlers from './handlers';
import { SettingsHandlers } from './settings.handlers';

const registerRooms = () => {
	BOT.registerMessageHandler(handlers.roomsMessageHandler, { exact: 'Комнаты' }, isRegistered);

	BOT.registerCallbackHandler(handlers.joinRoomCallbackHandler, { module: 'rooms', action: 'join' }, isRegistered);
	BOT.registerMessageHandler(handlers.joinRoomCodeMessageHandler, { state: 'ROOMS_JOIN' }, isRegistered);

	BOT.registerCallbackHandler(handlers.kickCallbackHandler, { module: 'room', action: 'kick' }, isRegistered);
	BOT.registerCallbackHandler(handlers.leaveRoomCallbackHandler, { module: 'room', action: 'leave' }, isRegistered);

	BOT.registerCallbackHandler(handlers.createRoomCallbackHandler, { module: 'rooms', action: 'create' }, isRegistered);
	BOT.registerMessageHandler(handlers.createRoomNameMessageHandler, { state: 'ROOMS_CREATE' }, isRegistered);

	BOT.registerCallbackHandler(handlers.openRoomCallbackHandler, { module: 'rooms', action: 'open' }, isRegistered);

	BOT.registerCallbackHandler(SettingsHandlers.start, { module: 'room', action: 'settings' }, isRegistered);
	BOT.registerCallbackHandler(SettingsHandlers.changeJoinCode, { module: 'room', action: 'cjc' }, isRegistered);
	BOT.registerCallbackHandler(SettingsHandlers.changeDecksCount, { module: 'room', action: 'cdc' }, isRegistered);
	BOT.registerMessageHandler(SettingsHandlers.changeDecksCountMessage, { state: 'ROOM_CDC' }, isRegistered);

	BOT.registerCallbackHandler(handlers.backToRoomsListCallbackHandler, { module: 'rooms', back: true }, isRegistered);
};

export default registerRooms;
