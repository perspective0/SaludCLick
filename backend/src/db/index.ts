import { Pool, PoolClient } from 'pg';
import { appConfig } from '../config/appConfig';

const pool = new Pool({
  connectionString: appConfig.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
});

/**
 * Get a connection from the pool
 */
export async function getConnection(): Promise<PoolClient> {
  return pool.connect();
}

/**
 * Execute a query
 */
export async function query(text: string, params?: any[]) {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Get a single row
 */
export async function queryOne(text: string, params?: any[]) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

/**
 * Get multiple rows
 */
export async function queryMany(text: string, params?: any[]) {
  const result = await query(text, params);
  return result.rows || [];
}

/**
 * Execute in transaction
 */
export async function transaction(
  callback: (client: PoolClient) => Promise<any>
): Promise<any> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export default pool;
