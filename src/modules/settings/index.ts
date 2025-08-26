import { BOT } from '~/core';
import { isRegistered } from '~/shared/lib';

import * as handlers from './handlers';

const registerSettings = () => {
	BOT.registerMessageHandler(handlers.settingsStartMessageHandler, { exact: 'Настройки' }, isRegistered);
	BOT.registerMessageHandler(handlers.settingsChangeNameStateMessageHandler, { state: 'SETTINGS_CHANGE_NAME' }, isRegistered);

	BOT.registerCallbackHandler(handlers.settingsChangeNameCallbackHandler, { module: 'settings', action: 'changeName' }, isRegistered);
};

export default registerSettings;
