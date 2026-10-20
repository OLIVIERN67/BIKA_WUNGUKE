import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

export const TEST_DB_NAME = 'bika_wunguke_test';

/**
 * Drops and recreates the dedicated test database from
 * database/schema.sql + database/migrations/*.sql (all idempotent).
 * The development database is never touched.
 */
export async function resetTestDatabase(): Promise<void> {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${TEST_DB_NAME}\``);
    await connection.query(
      `CREATE DATABASE \`${TEST_DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await connection.query(`USE \`${TEST_DB_NAME}\``);

    const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
    // Strip the fixed CREATE DATABASE / USE statements - we already selected
    // the test database on this connection.
    const schema = fs
      .readFileSync(schemaPath, 'utf8')
      .replace(/CREATE DATABASE IF NOT EXISTS[\s\S]*?USE bika_wunguke\s*;/i, '');
    await connection.query(schema);

    const migrationsDir = path.resolve(__dirname, '../../database/migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();
      for (const file of files) {
        const sql = fs
          .readFileSync(path.join(migrationsDir, file), 'utf8')
          .replace(/USE bika_wunguke\s*;/gi, '');
        await connection.query(sql);
      }
    }
  } finally {
    await connection.end();
  }
}
