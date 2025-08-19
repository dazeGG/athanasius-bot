import { registerGlobalKeyboard } from '~/lib';

import registerGame from './game';
import registerReg from './reg';
import registerSettings from './settings';
import registerStart from './start';

const registerModules = () => {
	registerGlobalKeyboard();

	registerGame();
	registerReg();
	registerSettings();
	registerStart();
};

export default registerModules;
