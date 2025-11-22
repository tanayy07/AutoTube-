/**
 * BullMQ queue setup for job processing
 */

import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { config } from './config';
import { JobData, JobResult } from './types';
import { logger } from './logger';

// Create Redis connection only if REDIS_URL is provided
const connection = config.REDIS_URL ? new IORedis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
}) : null;

// Create download queue
export const downloadQueue = new Queue<JobData, JobResult>('downloads', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 100,     // Keep last 100 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

// Queue events for monitoring
export const queueEvents = new QueueEvents('downloads', {
  connection: connection.duplicate(),
});

// Add job to queue
export const addDownloadJob = async (data: JobData) => {
  try {
    const job = await downloadQueue.add('download', data, {
      jobId: data.id,
    });
    logger.info('Job added to queue', { jobId: job.id, data });
    return job;
  } catch (error) {
    logger.error('Failed to add job to queue', { error, data });
    throw error;
  }
};

// Get job by ID
export const getJob = async (jobId: string) => {
  return downloadQueue.getJob(jobId);
};

// Get queue metrics
export const getQueueMetrics = async () => {
  const [waiting, active, completed, failed] = await Promise.all([
    downloadQueue.getWaitingCount(),
    downloadQueue.getActiveCount(),
    downloadQueue.getCompletedCount(),
    downloadQueue.getFailedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    total: waiting + active + completed + failed,
  };
};

// Clean old jobs
export const cleanOldJobs = async () => {
  const [completed, failed] = await Promise.all([
    downloadQueue.clean(1000, 7 * 24 * 3600 * 1000, 'completed'),
    downloadQueue.clean(1000, 30 * 24 * 3600 * 1000, 'failed'),
  ]);

  logger.info('Cleaned old jobs', { completed, failed });
  return { completed, failed };
};

// Graceful shutdown
export const closeQueue = async () => {
  await downloadQueue.close();
  await queueEvents.close();
  await connection.quit();
};
