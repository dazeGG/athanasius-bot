import { BOT } from '~/core';

import * as handlers from './handlers';

const registerStart = () => {
	BOT.registerHandler('/start', handlers.start);
};

export default registerStart;
