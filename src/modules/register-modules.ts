import { registerGlobalKeyboard } from '~/lib';

import registerReg from './reg';
import registerSettings from './settings';
import registerStart from './start';

const registerModules = () => {
	registerGlobalKeyboard();

	registerReg();
	registerSettings();
	registerStart();
};

export default registerModules;
