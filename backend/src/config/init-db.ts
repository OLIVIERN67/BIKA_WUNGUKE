import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import { env } from './env';

/**
 * Applies database/schema.sql and then runs every file in
 * database/migrations/ (all migration scripts are idempotent).
 * Usage: npm run db:init
 * Migrations only: npm run db:migrate
 */
function quoteIdent(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

async function connect(): Promise<Client> {
  const client = new Client({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
    ssl: env.db.sslMode === 'disable' ? undefined : { rejectUnauthorized: false },
  });
  await client.connect();
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdent(env.db.schema)}`);
  await client.query(`SET search_path TO ${quoteIdent(env.db.schema)}, public`);
  return client;
}

async function applySchema(client: Client) {
  const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log(`Applying schema to ${env.db.host}:${env.db.port}/${env.db.name} (${env.db.schema}) ...`);
  await client.query(sql);
  console.log('Schema applied successfully.');
}

async function applyMigrations(client: Client) {
  const migrationsDir = path.resolve(__dirname, '../../database/migrations');
  if (!fs.existsSync(migrationsDir)) return;

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  if (files.length === 0) return;

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Applying migration ${file} ...`);
    await client.query(sql);
  }
  console.log('Migrations applied successfully.');
}

async function init() {
  let client: Client | undefined;
  try {
    const mode = process.argv[2] ?? 'init';
    client = await connect();
    if (mode === 'init') {
      await applySchema(client);
    }
    await applyMigrations(client);
    console.log('Database initialised successfully.');
  } catch (error) {
    console.error('Failed to initialise database:', error);
    process.exitCode = 1;
  } finally {
    await client?.end().catch(() => undefined);
  }
}

init();
