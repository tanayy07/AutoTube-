/**
 * Database migration runner
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './index';
import { logger } from '../lib/logger';

const runMigrations = async () => {
  try {
    logger.info('Running database migrations...');
    
    await migrate(db, { migrationsFolder: './drizzle' });
    
    logger.info('Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed', { error });
    process.exit(1);
  }
};

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}
