import { BOT } from '~/core';

import { commands } from './commands';
import registerModules from './modules/register-modules';

BOT.init(commands)
	.then(() => {
		console.log('Bot started!');
	})
	.catch((error) => {
		console.log('Failed to start bot.', error);
	});

registerModules();
