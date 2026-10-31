import 'dotenv/config';
import { afterAll } from 'vitest';

/**
 * Runs before any test module is imported.
 * Points the application at a dedicated test database so the development
 * database is never touched by the test suite.
 * (dotenv does not override variables that are already set, and these
 * assignments run before the test file imports src/app.)
 */
const baseDatabase = process.env.PGDATABASE || 'bika_wunguke';
process.env.PG_BASE_DATABASE = process.env.PG_BASE_DATABASE || baseDatabase;
process.env.PGDATABASE = process.env.PG_TEST_DATABASE || 'bika_wunguke_test';
process.env.PGSCHEMA = 'public';
process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_only_secret_value';

afterAll(async () => {
  const { pool } = await import('../config/database');
  await pool.end();
});
