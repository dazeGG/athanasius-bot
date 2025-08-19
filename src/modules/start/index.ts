import { BOT } from '~/core';

import * as handlers from './handlers';

const registerStart = () => {
	BOT.registerCommand('/start', handlers.startCommandHandler);
};

export default registerStart;
