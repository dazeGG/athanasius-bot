import { registerGlobalKeyboard } from '~/shared/lib';

import registerGame from './game';
import registerHand from './hand';
import registerReg from './reg';
import registerRooms from './rooms';
import registerSettings from './settings';
import registerStart from './start';

const registerModules = () => {
	registerGlobalKeyboard();

	registerGame();
	registerHand();
	registerReg();
	registerRooms();
	registerSettings();
	registerStart();
};

export default registerModules;
