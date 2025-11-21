/**
 * YouTube downloader module using yt-dlp and ffmpeg
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DownloadOptions, VideoQuality } from './types';
import { logger } from './logger';
import { config } from './config';

// Ensure temp directory exists
const ensureTempDir = async () => {
  try {
    await fs.mkdir(config.TEMP_DIR, { recursive: true });
  } catch (error) {
    logger.error('Failed to create temp directory', { error });
  }
};

// Convert time string to seconds
const timeToSeconds = (timeStr: string): number => {
  const parts = timeStr.split(':').reverse();
  let seconds = 0;
  for (let i = 0; i < parts.length; i++) {
    seconds += parseInt(parts[i]) * Math.pow(60, i);
  }
  return seconds;
};

// Get video info using yt-dlp
export const getVideoInfo = async (url: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const args = [
      '--dump-json',
      '--no-warnings',
      '--no-playlist',
      url,
    ];

    const ytdlp = spawn('yt-dlp', args);
    let output = '';
    let error = '';

    ytdlp.stdout.on('data', (data) => {
      output += data.toString();
    });

    ytdlp.stderr.on('data', (data) => {
      error += data.toString();
    });

    ytdlp.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`yt-dlp failed: ${error}`));
      } else {
        try {
          const info = JSON.parse(output);
          resolve(info);
        } catch (e) {
          reject(new Error('Failed to parse video info'));
        }
      }
    });
  });
};

// Download video using yt-dlp
export const downloadVideo = async (options: DownloadOptions): Promise<string> => {
  await ensureTempDir();
  
  const tempId = uuidv4();
  const tempVideoPath = path.join(config.TEMP_DIR, `${tempId}_video.mp4`);
  const finalPath = options.outputPath;

  // Build yt-dlp arguments
  const format = getFormatString(options.quality);
  const ffmpegPath = 'C:\\Users\\tanay\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0-full_build\\bin';
  const ytdlpArgs = [
    '--ffmpeg-location', ffmpegPath,  // Specify ffmpeg location
    '-f', format,
    '--merge-output-format', 'mp4',  // Force merge to mp4
    '--no-playlist',
    '--no-warnings',
    '--extractor-args', 'youtube:player_client=android,player_skip=webpage',  // Use Android client
    '--user-agent', 'com.google.android.youtube/19.02.39 (Linux; U; Android 13) gzip',
    '--no-check-certificate',  // Skip certificate checks
    '--prefer-free-formats',  // Prefer free formats
    '-o', tempVideoPath,
    options.url,
  ];

  logger.info('Starting download', { format, url: options.url });

  // Download video
  await runCommand('yt-dlp', ytdlpArgs);

  // Process video (trim and/or convert)
  if (options.startTime || options.endTime || options.format === 'mp3') {
    await processVideo(tempVideoPath, finalPath, options);
    // Clean up temp video
    await fs.unlink(tempVideoPath).catch(() => {});
  } else {
    // Just move the file
    await fs.rename(tempVideoPath, finalPath);
  }

  return finalPath;
};

// Get format string for yt-dlp based on quality
const getFormatString = (quality?: VideoQuality): string => {
  // Use format selection that ensures video+audio
  if (!quality || quality === 'best') {
    // Try multiple fallback options
    return 'bestvideo+bestaudio/best';
  }
  if (quality === 'worst') {
    return 'worstvideo+worstaudio/worst';
  }
  // Specific quality with fallbacks
  return `bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]/best`;
};

// Process video with ffmpeg (trim and/or convert)
const processVideo = async (
  inputPath: string,
  outputPath: string,
  options: DownloadOptions
): Promise<void> => {
  const ffmpegArgs: string[] = [];

  // Input file
  ffmpegArgs.push('-i', inputPath);

  // Trim options
  if (options.startTime) {
    ffmpegArgs.push('-ss', options.startTime);
  }
  if (options.endTime) {
    const startSeconds = options.startTime ? timeToSeconds(options.startTime) : 0;
    const endSeconds = timeToSeconds(options.endTime);
    const duration = endSeconds - startSeconds;
    ffmpegArgs.push('-t', duration.toString());
  }

  // Format-specific options
  if (options.format === 'mp3') {
    ffmpegArgs.push(
      '-vn', // No video
      '-acodec', 'libmp3lame',
      '-b:a', '192k'
    );
  } else {
    // Try to copy codecs first (faster)
    if (options.startTime || options.endTime) {
      ffmpegArgs.push('-c', 'copy');
    } else {
      ffmpegArgs.push('-c:v', 'copy', '-c:a', 'copy');
    }
  }

  // Output file
  ffmpegArgs.push('-y', outputPath); // Overwrite output

  // Run ffmpeg
  try {
    await runCommand('ffmpeg', ffmpegArgs);
  } catch (error) {
    // If copy codec fails, try re-encoding
    if (options.format !== 'mp3' && (options.startTime || options.endTime)) {
      logger.warn('Copy codec failed, trying re-encode', { error });
      const reencodeArgs = ffmpegArgs.filter(arg => arg !== 'copy' && arg !== '-c');
      reencodeArgs.splice(reencodeArgs.indexOf('-y'), 0, '-c:v', 'libx264', '-c:a', 'aac');
      await runCommand('ffmpeg', reencodeArgs);
    } else {
      throw error;
    }
  }
};

// Run command helper
const runCommand = (command: string, args: string[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    logger.debug(`Running command: ${command} ${args.join(' ')}`);
    
    // Use full path for ffmpeg if needed
    let execCommand = command;
    if (command === 'ffmpeg' && process.platform === 'win32') {
      const ffmpegPath = 'C:\\Users\\tanay\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0-full_build\\bin\\ffmpeg.exe';
      if (require('fs').existsSync(ffmpegPath)) {
        execCommand = ffmpegPath;
      }
    }
    
    const proc = spawn(execCommand, args);
    let stderr = '';

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${command} failed: ${stderr}`));
      } else {
        resolve();
      }
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
};

// Clean up temp files
export const cleanupTempFiles = async (pattern?: string) => {
  try {
    const files = await fs.readdir(config.TEMP_DIR);
    const filesToDelete = pattern
      ? files.filter(f => f.includes(pattern))
      : files;

    await Promise.all(
      filesToDelete.map(file =>
        fs.unlink(path.join(config.TEMP_DIR, file)).catch(() => {})
      )
    );

    logger.debug('Cleaned up temp files', { count: filesToDelete.length });
  } catch (error) {
    logger.error('Failed to cleanup temp files', { error });
  }
};

// Validate URL
export const isValidYouTubeUrl = (url: string): boolean => {
  const patterns = [
    /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/,
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
    /^https?:\/\/youtu\.be\/[\w-]+/,
    /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/,
    /^https?:\/\/(www\.)?youtube\.com\/v\/[\w-]+/,
  ];
  
  return patterns.some(pattern => pattern.test(url));
};
