import { BOT } from '~/core';

import { commands } from './commands';
import createModulesComposer from './modules/register-modules';

BOT.use(createModulesComposer());

BOT.init(commands)
	.then(() => {
		console.log('Bot started!');
	})
	.catch((error) => {
		console.log('Failed to start bot.', error);
	});
