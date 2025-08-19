import { BOT } from '~/core';

import * as handlers from './handlers';

const registerSettings = () => {
	BOT.registerMessageHandler(handlers.settingsStartMessageHandler, { exact: 'Настройки' });
};

export default registerSettings;
