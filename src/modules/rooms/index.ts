import { BOT } from '~/core';

import * as handlers from './handlers';

const registerRooms = () => {
	BOT.registerMessageHandler(handlers.roomsMessageHandler, { exact: 'Комнаты' });
	BOT.registerCallbackHandler(handlers.createRoomCallbackHandler, { module: 'rooms', action: 'create' });
	BOT.registerMessageHandler(handlers.createRoomNameMessageHandler, { state: 'ROOMS_CREATE' });
	BOT.registerCallbackHandler(handlers.openRoomCallbackHandler, { module: 'rooms', action: 'open' });
	BOT.registerCallbackHandler(handlers.backToRoomsListCallbackHandler, { module: 'rooms', back: true });
};

export default registerRooms;
