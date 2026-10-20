import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { env } from './env';

/**
 * Creates the database, applies database/schema.sql and then runs every
 * file in database/migrations/ (all migration scripts are idempotent).
 * Usage: npm run db:init
 * Migrations only: npm run db:migrate
 */
async function connect() {
  return mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true,
  });
}

async function applySchema() {
  const connection = await connect();
  const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log(`Applying schema to ${env.db.host}:${env.db.port} ...`);
  await connection.query(sql);
  await connection.end();
  console.log('Schema applied successfully.');
}

async function applyMigrations() {
  const migrationsDir = path.resolve(__dirname, '../../database/migrations');
  if (!fs.existsSync(migrationsDir)) return;

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  if (files.length === 0) return;

  const connection = await connect();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Applying migration ${file} ...`);
    await connection.query(sql);
  }
  await connection.end();
  console.log('Migrations applied successfully.');
}

async function init() {
  try {
    const mode = process.argv[2] ?? 'init';
    if (mode === 'init') {
      await applySchema();
    }
    await applyMigrations();
    console.log('Database initialised successfully.');
  } catch (error) {
    console.error('Failed to initialise database:', error);
    process.exit(1);
  }
}

init();
