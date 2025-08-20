import { BOT } from '~/core';

import * as handlers from './handlers';

const registerSettings = () => {
	BOT.registerMessageHandler(handlers.settingsStartMessageHandler, { exact: 'Настройки' });
	BOT.registerMessageHandler(handlers.settingsChangeNameStateMessageHandler, { state: 'SETTINGS_CHANGE_NAME' });

	BOT.registerCallbackHandler(handlers.settingsChangeNameCallbackHandler, { module: 'settings', action: 'changeName' });
};

export default registerSettings;
