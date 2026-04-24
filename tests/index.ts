/**
 * tests/index.ts — top-level tests entrypoint.
 *
 * Loads the tests environment, runs feature modules first, then executes
 * broader cross-module flows such as the staged game flow.
 *
 * Run all checks: `pnpm test`
 * Show help: `pnpm test --help`
 */

import { config } from 'dotenv';
import { unlink } from 'fs/promises';

const args = process.argv.slice(2);
const showHelp = args.includes('--help') || args.includes('-h');

if (showHelp) {
	console.log(`
🎮  Athanasius simulator

Usage:
  pnpm test
  pnpm test --help
  pnpm test --full-logs
  pnpm test --save-db

Flags:
  --full-logs  Show detailed case-level logs for every module.
  --save-db    Keep db.test.json after the run for inspection.
`);
	process.exit(0);
}

// ─── Load tests env BEFORE any project code is imported ───────────────────────
config({ path: '.env.test', override: true });
process.env.BOT_TOKEN ??= '__simulate__';
process.env.DB_FILE ??= 'db.test.json';

if (process.env.DB_FILE === 'db.json') {
	throw new Error('Refusing to run tests against db.json. Set DB_FILE to a dedicated test database.');
}

// ─── Project code via dynamic imports (env is now set) ───────────────────────
await import('./bootstrap');

const { run, printSummary, setRunnerOptions } = await import('./runner');
const { coreModule }          = await import('./modules/core');
const { registrationModule }  = await import('./modules/registration');
const { roomsModule }         = await import('./modules/rooms');
const { settingsModule }      = await import('./modules/settings');
const { confirmModeSettingsModule } = await import('./modules/confirm-mode-settings');
const { handModule }          = await import('./modules/hand');
const { notesModule }         = await import('./modules/notes');
const { startModule }         = await import('./modules/start');
const { deckModule }          = await import('./modules/deck');
const { deckTypeSettingsModule } = await import('./modules/deck-type-settings');
const { gameFlow }            = await import('./flow/game');
const { deck36Flow }          = await import('./flow/game/36-deck');
const { deck54Flow }          = await import('./flow/game/54-deck');

// ─── Run all modules ──────────────────────────────────────────────────────────
const fullLogs = args.includes('--full-logs');

setRunnerOptions({ fullLogs });

console.log('\n🎮  Athanasius tests\n');
console.log('Modules:\n');

await run('Core', coreModule);
await run('Registration', registrationModule);
await run('Rooms', roomsModule);
await run('Settings', settingsModule);
await run('Confirm Mode Settings', confirmModeSettingsModule);
await run('Hand', handModule);
await run('Notes', notesModule);
await run('Start', startModule);
await run('Deck', deckModule);
await run('Deck Type Settings', deckTypeSettingsModule);
console.log('\nFlows:\n');
await run('Game Flow', gameFlow, { kind: 'flow' });
await run('36-Card Deck Flow', deck36Flow, { kind: 'flow' });
await run('54-Card Deck Flow (Jokers)', deck54Flow, { kind: 'flow' });

const dbg = args.includes('--debug');
if (dbg) {
	const { DB } = await import('../src/db');
	const { getLog } = await import('./bootstrap');
	const log = getLog();
	console.log('\n--- DEBUG MESSAGES ---');
	log.forEach(m => console.log(`  [${m.type}] to ${m.to}: ${m.text.slice(0, 120)}`));
	console.log('\n--- DEBUG DB ROOMS ---');
	DB.data.rooms.forEach(r => {
		console.log(`  Room "${r.name}" (${r.id}): owner=${r.owner}, players=${r.players}, code=${r.settings.joinCode}`);
	});
}

// ─── Summary ─────────────────────────────────────────────────────────────────
printSummary();

// ─── Cleanup ─────────────────────────────────────────────────────────────────
const dbFile = process.env.DB_FILE ?? 'db.test.json';
const saveDb = args.includes('--save-db');

if (saveDb) {
	console.log(`\n  💾  ${dbFile} kept\n`);
} else {
	await unlink(dbFile).catch(() => {});
	console.log(`\n  🗑   ${dbFile} deleted\n`);
}
