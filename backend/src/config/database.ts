import { Pool, types } from 'pg';
import { env } from './env';

// Keep DATE columns as plain YYYY-MM-DD strings (as the MySQL driver did).
types.setTypeParser(1082, (value) => value);
// DECIMAL/NUMERIC columns come back as numbers, matching the old driver config.
types.setTypeParser(1700, (value) => (value === null ? null : Number(value)));
// BIGINT (e.g. COUNT(*)) as numbers - all values in this app are safely sized.
types.setTypeParser(20, (value) => (value === null ? null : Number(value)));

export type RowDataPacket = Record<string, any>;

export interface ResultSetHeader {
  insertId: number;
  affectedRows: number;
  rows: RowDataPacket[];
}

/**
 * Rewrites MySQL-style `?` placeholders to PostgreSQL `$1, $2, ...` while
 * leaving question marks inside quoted strings untouched. This keeps the
 * existing service queries readable and portable.
 */
function toPgPlaceholders(sql: string): string {
  let index = 0;
  let result = '';
  let quote: string | null = null;

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];

    if (quote) {
      result += char;
      if (char === quote) {
        if (sql[i + 1] === quote) {
          result += sql[i + 1];
          i += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      result += char;
      continue;
    }

    if (char === '?') {
      index += 1;
      result += `$${index}`;
      continue;
    }

    result += char;
  }

  return result;
}

interface Executor {
  query: (text: string, values?: unknown[]) => Promise<any>;
}

async function runQuery(
  executor: Executor,
  text: string,
  params: unknown[] = [],
): Promise<[any, any]> {
  const result = await executor.query(toPgPlaceholders(text), params);
  const command = String(result.command ?? '').toUpperCase();

  if (command === 'SELECT' || command === 'SHOW' || command === 'EXPLAIN' || command === 'WITH') {
    return [result.rows, result.fields];
  }

  const first = result.rows?.[0];
  const rawInsertId = Number(first?.id ?? first?.insertid ?? 0);
  return [
    {
      insertId: Number.isFinite(rawInsertId) ? rawInsertId : 0,
      affectedRows: result.rowCount ?? 0,
      rows: result.rows ?? [],
    },
    result.fields,
  ];
}

const useSsl = env.db.sslMode !== 'disable';

export const pgPool = new Pool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
});

pgPool.on('error', (error) => {
  console.error('[db] unexpected idle client error:', error.message);
});

/**
 * Thin adapter that preserves the mysql2-style `[rows]` / `{ insertId }`
 * result shape used throughout the services, backed by node-postgres.
 */
export const pool = {
  query<T = any>(text: string, params?: unknown[]): Promise<[T, any]> {
    return runQuery(pgPool as unknown as Executor, text, params) as Promise<[T, any]>;
  },

  async getConnection() {
    const client = await pgPool.connect();
    return {
      query<T = any>(text: string, params?: unknown[]): Promise<[T, any]> {
        return runQuery(client as unknown as Executor, text, params) as Promise<[T, any]>;
      },
      beginTransaction: () => client.query('BEGIN'),
      commit: () => client.query('COMMIT'),
      rollback: () => client.query('ROLLBACK'),
      release: () => client.release(),
    };
  },

  end: () => pgPool.end(),
};

export async function testConnection(): Promise<void> {
  const client = await pgPool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}
