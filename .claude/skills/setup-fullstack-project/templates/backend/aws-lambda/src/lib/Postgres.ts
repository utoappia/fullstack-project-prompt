import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { config } from '../config.js';

let client: pg.Pool | null = null;

export function getDb() {
  if (!client) {
    client = new pg.Pool({
      connectionString: config.databaseUrl,
      max: 1, // Lambda: single connection per invocation
    });
  }
  return drizzle(client);
}

export async function closeDb() {
  if (client) {
    await client.end();
    client = null;
  }
}
