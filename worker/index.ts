/**
 * BullMQ Worker for processing download jobs
 */

import 'dotenv/config';  // Load environment variables first
import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import path from 'path';
import fs from 'fs/promises';
import { eq, sql } from 'drizzle-orm';
import { db, schema } from '../db';
import { downloadVideo, cleanupTempFiles, getVideoInfo } from '../lib/downloader';
import { sendMessage, sendVideo, sendAudio, sendFile, editMessageText } from '../lib/telegram-client';
import { logger, logJobStart, logJobComplete, logJobError } from '../lib/logger';
import { JobData, JobResult, JobStatus } from '../lib/types';
import { config } from '../lib/config';

// Create Redis connection for worker
const connection = new IORedis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Process download job
const processDownloadJob = async (job: Job<JobData>): Promise<JobResult> => {
  const { id, chatId, messageId, url, startTime, endTime, quality, convertToMp3 } = job.data;
  
  logJobStart(id, job.data);
  
  try {
    // Update job status to processing
    await db
      .update(schema.jobs)
      .set({ status: JobStatus.PROCESSING, updatedAt: new Date() })
      .where(eq(schema.jobs.id, id));
    
    // Update Telegram message
    await editMessageText(
      `⏳ Processing your download...\n\n` +
      `🆔 Job ID: \`${id}\`\n` +
      `📊 Status: Processing`,
      {
        chat_id: chatId,
        message_id: messageId,
      }
    );
    
    // Get video info first
    const videoInfo = await getVideoInfo(url);
    const videoTitle = videoInfo.title || 'video';
    const videoDuration = videoInfo.duration || 0;
    
    // Prepare output filename
    const extension = convertToMp3 ? 'mp3' : 'mp4';
    const safeTitle = videoTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
    const outputFileName = `${safeTitle}_${id}.${extension}`;
    const outputPath = path.join(config.TEMP_DIR, outputFileName);
    
    // Download and process video
    await downloadVideo({
      url,
      quality,
      startTime,
      endTime,
      outputPath,
      format: convertToMp3 ? 'mp3' : 'mp4',
    });
    
    // Get file stats
    const stats = await fs.stat(outputPath);
    const fileSizeMB = stats.size / (1024 * 1024);
    
    // Check file size
    if (fileSizeMB > config.MAX_FILE_SIZE_MB) {
      throw new Error(`File too large: ${fileSizeMB.toFixed(2)}MB (max: ${config.MAX_FILE_SIZE_MB}MB)`);
    }
    
    // Send file to user
    const caption = 
      `✅ *Download Complete!*\n\n` +
      `📹 Title: ${videoTitle}\n` +
      `📦 Size: ${fileSizeMB.toFixed(2)}MB\n` +
      `⏱ Duration: ${Math.floor(videoDuration / 60)}:${(videoDuration % 60).toString().padStart(2, '0')}\n` +
      (quality ? `📺 Quality: ${quality}\n` : '') +
      (startTime || endTime ? `✂️ Trimmed: ${startTime || '0:00'} - ${endTime || 'end'}\n` : '') +
      `\n🤖 @openmind1_bot`;
    
    if (convertToMp3) {
      await sendAudio(chatId, outputPath, caption);
    } else {
      await sendVideo(chatId, outputPath, caption);
    }
    
    // Update job as completed
    await db
      .update(schema.jobs)
      .set({
        status: JobStatus.COMPLETED,
        filePath: outputPath,
        fileName: outputFileName,
        fileSize: stats.size,
        updatedAt: new Date(),
        completedAt: new Date(),
      })
      .where(eq(schema.jobs.id, id));
    
    // Update user download count
    await db
      .update(schema.users)
      .set({
        totalDownloads: sql`${schema.users.totalDownloads} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, job.data.userId));
    
    // Clean up temp file
    await fs.unlink(outputPath).catch(() => {});
    
    const result: JobResult = {
      success: true,
      filePath: outputPath,
      fileName: outputFileName,
      fileSize: stats.size,
      duration: videoDuration,
    };
    
    logJobComplete(id, result);
    return result;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logJobError(id, error as Error);
    
    // Update job as failed
    await db
      .update(schema.jobs)
      .set({
        status: JobStatus.FAILED,
        error: errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(schema.jobs.id, id));
    
    // Notify user of failure
    await sendMessage(
      chatId,
      `❌ *Download Failed*\n\n` +
      `🆔 Job ID: \`${id}\`\n` +
      `📛 Error: ${errorMessage}\n\n` +
      `Please check the URL and try again.`,
      { reply_to_message_id: messageId }
    );
    
    // Clean up any temp files
    await cleanupTempFiles(id);
    
    const result: JobResult = {
      success: false,
      error: errorMessage,
    };
    
    return result;
  }
};

// Create worker
const worker = new Worker<JobData, JobResult>(
  'downloads',
  processDownloadJob,
  {
    connection,
    concurrency: config.WORKER_CONCURRENCY,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
  }
);

// Worker event handlers
worker.on('completed', (job) => {
  logger.info('Job completed', { jobId: job.id });
});

worker.on('failed', (job, err) => {
  logger.error('Job failed', { jobId: job?.id, error: err.message });
});

worker.on('error', (err) => {
  logger.error('Worker error', { error: err.message });
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Worker shutting down...');
  await worker.close();
  await connection.quit();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start worker
logger.info('Worker started', {
  concurrency: config.WORKER_CONCURRENCY,
  redis: config.REDIS_URL.split('@')[1], // Hide password
});
