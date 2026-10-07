import { Pool, type PoolClient } from 'pg';

const globalForDatabase = globalThis as typeof globalThis & { civicResolvePool?: Pool };

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDatabasePool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured.');
  }

  if (!globalForDatabase.civicResolvePool) {
    globalForDatabase.civicResolvePool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  return globalForDatabase.civicResolvePool;
}

export async function withDatabaseTransaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getDatabasePool().connect();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}