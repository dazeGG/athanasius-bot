import { BOT } from '~/core';

import * as handlers from './handlers';

const registerReg = () => {
	BOT.registerCommand('/reg', handlers.regStartMessageHandler);
	BOT.registerMessageHandler(handlers.regNameStateMessageHandler, { state: 'REGISTRATION' });
};

export default registerReg;
