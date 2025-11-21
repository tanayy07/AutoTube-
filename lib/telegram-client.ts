/**
 * Telegram Bot API client wrapper
 */

import TelegramBot from 'node-telegram-bot-api';
import { config } from './config';
import { logger } from './logger';
import fs from 'fs/promises';
import path from 'path';

// Create bot instance (webhook mode only if webhook URL is set)
export const bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, {
  webHook: config.TELEGRAM_WEBHOOK_URL ? true : false,
});

// Send text message
export const sendMessage = async (chatId: number, text: string, options?: TelegramBot.SendMessageOptions) => {
  try {
    const result = await bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      ...options,
    });
    logger.debug('Message sent', { chatId, messageId: result.message_id });
    return result;
  } catch (error) {
    logger.error('Failed to send message', { chatId, error });
    throw error;
  }
};

// Send file
export const sendFile = async (
  chatId: number,
  filePath: string,
  caption?: string,
  options?: TelegramBot.SendDocumentOptions
) => {
  try {
    // Check file size
    const stats = await fs.stat(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    
    if (fileSizeMB > config.MAX_FILE_SIZE_MB) {
      throw new Error(`File too large: ${fileSizeMB.toFixed(2)}MB (max: ${config.MAX_FILE_SIZE_MB}MB)`);
    }

    // Send file
    const fileStream = await fs.readFile(filePath);
    const fileName = path.basename(filePath);
    
    const result = await bot.sendDocument(
      chatId,
      fileStream,
      {
        caption,
        parse_mode: 'Markdown',
        ...options,
      },
      {
        filename: fileName,
        contentType: 'application/octet-stream',
      }
    );
    
    logger.info('File sent', { chatId, fileName, fileSizeMB });
    return result;
  } catch (error) {
    logger.error('Failed to send file', { chatId, filePath, error });
    throw error;
  }
};

// Send video
export const sendVideo = async (
  chatId: number,
  filePath: string,
  caption?: string,
  options?: TelegramBot.SendVideoOptions
) => {
  try {
    const stats = await fs.stat(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    
    if (fileSizeMB > config.MAX_FILE_SIZE_MB) {
      throw new Error(`Video too large: ${fileSizeMB.toFixed(2)}MB (max: ${config.MAX_FILE_SIZE_MB}MB)`);
    }

    const fileStream = await fs.readFile(filePath);
    const fileName = path.basename(filePath);
    
    const result = await bot.sendVideo(
      chatId,
      fileStream,
      {
        caption,
        parse_mode: 'Markdown',
        supports_streaming: true,
        ...options,
      },
      {
        filename: fileName,
      }
    );
    
    logger.info('Video sent', { chatId, fileName, fileSizeMB });
    return result;
  } catch (error) {
    logger.error('Failed to send video', { chatId, filePath, error });
    throw error;
  }
};

// Send audio
export const sendAudio = async (
  chatId: number,
  filePath: string,
  caption?: string,
  options?: TelegramBot.SendAudioOptions
) => {
  try {
    const stats = await fs.stat(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    
    if (fileSizeMB > config.MAX_FILE_SIZE_MB) {
      throw new Error(`Audio too large: ${fileSizeMB.toFixed(2)}MB (max: ${config.MAX_FILE_SIZE_MB}MB)`);
    }

    const fileStream = await fs.readFile(filePath);
    const fileName = path.basename(filePath);
    
    const result = await bot.sendAudio(
      chatId,
      fileStream,
      {
        caption,
        parse_mode: 'Markdown',
        ...options,
      },
      {
        filename: fileName,
      }
    );
    
    logger.info('Audio sent', { chatId, fileName, fileSizeMB });
    return result;
  } catch (error) {
    logger.error('Failed to send audio', { chatId, filePath, error });
    throw error;
  }
};

// Edit message text
export const editMessageText = async (
  text: string,
  options: TelegramBot.EditMessageTextOptions
) => {
  try {
    const result = await bot.editMessageText(text, {
      parse_mode: 'Markdown',
      ...options,
    });
    return result;
  } catch (error) {
    logger.error('Failed to edit message', { error });
    throw error;
  }
};

// Send typing action
export const sendTypingAction = async (chatId: number) => {
  try {
    await bot.sendChatAction(chatId, 'typing');
  } catch (error) {
    logger.error('Failed to send typing action', { chatId, error });
  }
};

// Send upload document action
export const sendUploadAction = async (chatId: number) => {
  try {
    await bot.sendChatAction(chatId, 'upload_document');
  } catch (error) {
    logger.error('Failed to send upload action', { chatId, error });
  }
};

// Set webhook
export const setWebhook = async (url: string, options?: TelegramBot.SetWebHookOptions) => {
  try {
    const result = await bot.setWebHook(url, options);
    logger.info('Webhook set', { url, result });
    return result;
  } catch (error) {
    logger.error('Failed to set webhook', { url, error });
    throw error;
  }
};

// Delete webhook
export const deleteWebhook = async () => {
  try {
    const result = await bot.deleteWebHook();
    logger.info('Webhook deleted', { result });
    return result;
  } catch (error) {
    logger.error('Failed to delete webhook', { error });
    throw error;
  }
};

// Get webhook info
export const getWebhookInfo = async () => {
  try {
    const info = await bot.getWebHookInfo();
    logger.debug('Webhook info', { info });
    return info;
  } catch (error) {
    logger.error('Failed to get webhook info', { error });
    throw error;
  }
};
