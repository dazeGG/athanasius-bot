import { config } from 'dotenv';
import { unlink } from 'fs/promises';
import { afterAll } from 'vitest';

config({ path: '.env.test', override: true });
process.env.BOT_TOKEN ??= '__simulate__';
process.env.DB_FILE ??= 'db.test.json';

if (process.env.DB_FILE === 'db.json') {
	throw new Error('Refusing to run tests against db.json. Set DB_FILE to a dedicated test database.');
}

await import('./bootstrap');

afterAll(async () => {
	if (process.env.SAVE_DB !== '1') {
		await unlink(process.env.DB_FILE!).catch(() => {});
	}
});
