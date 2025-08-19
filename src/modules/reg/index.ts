import { BOT } from '~/core';

import * as handlers from './handlers';

const registerReg = () => {
	BOT.registerMessageHandler(handlers.regStartMessageHandler, { startsWith: '/reg ' });
};

export default registerReg;
