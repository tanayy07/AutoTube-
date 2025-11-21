/**
 * Database connection and client setup
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { config } from '../lib/config';
import { logger } from '../lib/logger';

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Create Drizzle instance
export const db = drizzle(pool, { schema });

// Test database connection
export const testConnection = async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    logger.info('Database connected', { time: result.rows[0].now });
    return true;
  } catch (error) {
    logger.error('Database connection failed', { error });
    return false;
  }
};

// Close database connection
export const closeConnection = async () => {
  await pool.end();
  logger.info('Database connection closed');
};

// Export schema for use in other modules
export { schema };
