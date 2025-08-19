import { JSONFilePreset } from 'lowdb/node';

type DatabaseSchema = {
};

const DB = await JSONFilePreset<DatabaseSchema>('db.json', {});

export default DB;
