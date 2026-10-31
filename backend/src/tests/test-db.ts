import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

export const TEST_DB_NAME = process.env.PG_TEST_DATABASE || 'bika_wunguke_test';

function quoteIdent(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe database identifier: ${value}`);
  }
  return `"${value}"`;
}

function makeClient(database: string): Client {
  return new Client({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database,
    ssl:
      (process.env.PGSSLMODE || 'prefer').toLowerCase() === 'disable'
        ? undefined
        : { rejectUnauthorized: false },
  });
}

async function ensureTestDatabase(): Promise<void> {
  const baseDatabase = process.env.PG_BASE_DATABASE || 'bika_wunguke';
  const client = makeClient(baseDatabase);
  await client.connect();
  try {
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      TEST_DB_NAME,
    ]);
    if (exists.rowCount === 0) {
      await client.query(`CREATE DATABASE ${quoteIdent(TEST_DB_NAME)}`);
    }
  } finally {
    await client.end();
  }
}

/**
 * Recreates the dedicated test database's public schema from
 * database/schema.sql + database/migrations/*.sql (all idempotent).
 * The development database is never touched.
 */
export async function resetTestDatabase(): Promise<void> {
  await ensureTestDatabase();

  const client = makeClient(TEST_DB_NAME);
  await client.connect();

  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');

    const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
    await client.query(fs.readFileSync(schemaPath, 'utf8'));

    const migrationsDir = path.resolve(__dirname, '../../database/migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();
      for (const file of files) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await client.query(sql);
      }
    }
  } finally {
    await client.end();
  }
}
