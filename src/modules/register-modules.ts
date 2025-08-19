import registerReg from './reg';
import registerSettings from './settings';
import registerStart from './start';

const registerModules = () => {
	registerReg();
	registerSettings();
	registerStart();
};

export default registerModules;
