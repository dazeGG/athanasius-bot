import { BOT } from '~/core';

import * as handlers from './handlers';

const registerRooms = () => {
	BOT.registerMessageHandler(handlers.roomsMessageHandler, { exact: 'Комнаты' });
	BOT.registerCallbackHandler(handlers.createRoomCallbackHandler, { module: 'rooms', action: 'create' });
	BOT.registerMessageHandler(handlers.createRoomNameMessageHandler, { state: 'ROOMS_CREATE' });
};

export default registerRooms;
