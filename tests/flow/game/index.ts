/**
 * game/index.ts — layered tests coverage for the full staged game flow.
 */
import type { ModuleTools } from '../../runner';

import { runAthanasiusLayer } from './layers/athanasius';
import { runFailuresLayer } from './layers/failures';
import { runGuardsLayer } from './layers/guards';
import { runMailingModeLayer } from './layers/mailing-mode';
import { runNotificationsLayer } from './layers/notifications';
import { runConfirmModeLayer } from './layers/confirm-mode';
import { runProgressionLayer } from './layers/progression';
import { runStartupLayer } from './layers/startup';

/**
 * Runs the staged game flow by delegating execution to its logical tests layers.
 */
export async function gameFlow (tools: ModuleTools): Promise<void> {
	await tools.runLayer('Startup', runStartupLayer);
	await tools.runLayer('Guards', runGuardsLayer);
	await tools.runLayer('Progression', runProgressionLayer);
	await tools.runLayer('Failures', runFailuresLayer);
	await tools.runLayer('Athanasius', runAthanasiusLayer);
	await tools.runLayer('Notifications', runNotificationsLayer);
	await tools.runLayer('Mailing Mode', runMailingModeLayer);
	await tools.runLayer('Confirm Mode', runConfirmModeLayer);
}
