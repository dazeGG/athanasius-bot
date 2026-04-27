import type { Context, Filter, SessionFlavor } from 'grammy';

import type { RoomId } from '~/db';

export type AppFlowState =
	| { name?: undefined }
	| { name: 'REGISTRATION' | 'ROOMS_JOIN' | 'ROOMS_CREATE' | 'SETTINGS_CHANGE_NAME' }
	| { name: 'ROOM_CDC'; roomId: RoomId }
	| { name: 'GAME_MAILING'; roomId: RoomId; promptMessageId?: number };

export interface AppSession {
	flow: AppFlowState;
}

export const createInitialSessionData = (): AppSession => ({
	flow: {},
});

export type AppContext = Context & SessionFlavor<AppSession>;

export type MessageCtx = Filter<AppContext, 'message:text'>;
export type CallbackCtx = Filter<AppContext, 'callback_query:data'>;
