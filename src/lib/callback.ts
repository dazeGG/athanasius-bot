export const getCallbackState = (callbackData: string): string => callbackData.split('-')[1];
export const getCallbackBackState = (state: string): string => state.split('_')[1];
