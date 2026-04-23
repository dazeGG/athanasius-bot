/**
 * simulator/index.ts — test entry point.
 *
 * Run all modules: pnpm test
 * Show help: pnpm test --help
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

// ─── Load test env BEFORE any project code is imported ───────────────────────
config({ path: '.env.test', override: true });

// ─── Project code via dynamic imports (env is now set) ───────────────────────
await import('./bootstrap');

const { run, printSummary, setRunnerOptions } = await import('./runner');
const { registrationModule }  = await import('./modules/registration');
const { roomsModule }         = await import('./modules/rooms');

// ─── Run all modules ──────────────────────────────────────────────────────────
const fullLogs = args.includes('--full-logs');

setRunnerOptions({ fullLogs });

console.log('\n🎮  Athanasius simulator\n');
console.log('Modules:\n');

await run('Registration', registrationModule);
await run('Rooms', roomsModule);

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
