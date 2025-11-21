import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default {
  schema: './db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://ytbot:ytbotpass@localhost:5432/ytbot',
  },
  verbose: true,
  strict: true,
} satisfies Config;
