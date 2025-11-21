/**
 * Logger module using Winston for structured logging
 */

import winston from 'winston';
import { config } from './config';

// Create logger instance
export const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ytbot' },
  transports: [
    // Console transport with pretty printing in development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Add file transport in production
if (config.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'error.log',
      level: 'error',
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'combined.log',
    })
  );
}

// Helper functions for common logging patterns
export const logJobStart = (jobId: string, data: any) => {
  logger.info('Job started', { jobId, data });
};

export const logJobComplete = (jobId: string, result: any) => {
  logger.info('Job completed', { jobId, result });
};

export const logJobError = (jobId: string, error: Error) => {
  logger.error('Job failed', { jobId, error: error.message, stack: error.stack });
};

export const logTelegramWebhook = (update: any) => {
  logger.debug('Telegram webhook received', { update });
};

export const logTelegramError = (error: Error, context?: any) => {
  logger.error('Telegram API error', { error: error.message, context });
};
