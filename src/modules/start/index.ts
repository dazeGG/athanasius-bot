import { BOT } from '~/core';

import * as handlers from './handlers';

const registerStart = () => {
	BOT.registerCommand('/start', handlers.start);
};

export default registerStart;
