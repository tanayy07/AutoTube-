/**
 * Configuration module - loads and validates environment variables
 */

import 'dotenv/config';
import { z } from 'zod';

// Environment variable schema
const envSchema = z.object({
  // Telegram Bot
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_WEBHOOK_URL: z.string().url().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(1).optional(),
  
  // Database
  DATABASE_URL: z.string().min(1),
  
  // Redis
  REDIS_URL: z.string().min(1),
  
  // Worker
  WORKER_CONCURRENCY: z.string().transform(Number).default('2'),
  MAX_FILE_SIZE_MB: z.string().transform(Number).default('50'),
  TEMP_DIR: z.string().default('/tmp/ytdl'),
  
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  
  // Optional features
  ENABLE_ANALYTICS: z.string().transform(v => v === 'true').default('false'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
};

// Export validated config
export const config = parseEnv();

// Helper functions
export const isDevelopment = () => config.NODE_ENV === 'development';
export const isProduction = () => config.NODE_ENV === 'production';

// Telegram helpers
export const getTelegramWebhookUrl = () => {
  if (config.TELEGRAM_WEBHOOK_URL) {
    return config.TELEGRAM_WEBHOOK_URL;
  }
  // Auto-generate webhook URL for Vercel deployments
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/telegram/webhook`;
  }
  return null;
};

// File size helpers
export const getMaxFileSizeBytes = () => config.MAX_FILE_SIZE_MB * 1024 * 1024;

// Export types
export type Config = z.infer<typeof envSchema>;
