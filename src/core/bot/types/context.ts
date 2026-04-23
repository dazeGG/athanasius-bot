import type { Context, Filter, SessionFlavor } from 'grammy';

import type { RoomId } from '~/db';

export interface CallbackData {
	module: string;
	action?: string;
	back?: boolean;
	meta?: string;
}

export type AppFlowState =
	| { name?: undefined }
	| { name: 'REGISTRATION' | 'ROOMS_JOIN' | 'ROOMS_CREATE' | 'SETTINGS_CHANGE_NAME' }
	| { name: 'ROOM_CDC'; roomId: RoomId };

export interface AppSession {
	flow: AppFlowState;
}

export const createInitialSessionData = (): AppSession => ({
	flow: {},
});

export type AppContext = Context & SessionFlavor<AppSession> & {
	callbackData?: CallbackData;
};

export type MessageCtx = Filter<AppContext, 'message:text'>;
export type CallbackCtx = Filter<AppContext, 'callback_query:data'>;
