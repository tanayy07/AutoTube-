/**
 * Shared TypeScript interfaces and types for the YouTube downloader bot
 */

// Job status enum
export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// Video quality options
export type VideoQuality = '144' | '240' | '360' | '480' | '720' | '1080' | '1440' | '2160' | 'best' | 'worst';

// Job data interface for BullMQ
export interface JobData {
  id: string;
  userId: number;
  chatId: number;
  messageId: number;
  url: string;
  startTime?: string; // Format: "0:30" or "1:20:30"
  endTime?: string;   // Format: "1:10" or "1:30:00"
  quality?: VideoQuality;
  convertToMp3?: boolean;
  createdAt: Date;
}

// Job result interface
export interface JobResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  error?: string;
}

// Telegram update types
export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
      language_code?: string;
    };
    chat: {
      id: number;
      first_name?: string;
      username?: string;
      type: string;
    };
    date: number;
    text?: string;
    entities?: Array<{
      offset: number;
      length: number;
      type: string;
    }>;
  };
}

// Download options interface
export interface DownloadOptions {
  url: string;
  quality?: VideoQuality;
  startTime?: string;
  endTime?: string;
  outputPath: string;
  format?: 'mp4' | 'mp3';
}

// User command parsed data
export interface ParsedCommand {
  url: string;
  startTime?: string;
  endTime?: string;
  quality?: VideoQuality;
  mp3?: boolean;
}

// Database job record
export interface DbJob {
  id: string;
  userId: number;
  chatId: number;
  messageId: number;
  url: string;
  status: JobStatus;
  startTime?: string;
  endTime?: string;
  quality?: string;
  convertToMp3: boolean;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// Database user record
export interface DbUser {
  id: number;
  telegramId: number;
  username?: string;
  firstName: string;
  languageCode?: string;
  totalDownloads: number;
  createdAt: Date;
  updatedAt: Date;
}
