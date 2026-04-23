import type { ModuleTools } from '../../runner';

import { runAthanasiusLayer } from './layers/athanasius';
import { runFailuresLayer } from './layers/failures';
import { runGuardsLayer } from './layers/guards';
import { runNotificationsLayer } from './layers/notifications';
import { runProgressionLayer } from './layers/progression';
import { runStartupLayer } from './layers/startup';

export async function gameFlow (tools: ModuleTools): Promise<void> {
	await tools.runLayer('Startup', runStartupLayer);
	await tools.runLayer('Guards', runGuardsLayer);
	await tools.runLayer('Progression', runProgressionLayer);
	await tools.runLayer('Failures', runFailuresLayer);
	await tools.runLayer('Athanasius', runAthanasiusLayer);
	await tools.runLayer('Notifications', runNotificationsLayer);
}
