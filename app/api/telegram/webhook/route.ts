/**
 * Telegram webhook endpoint for receiving bot updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { addDownloadJob } from '@/lib/queue';
import { sendMessage } from '@/lib/telegram-client';
import { logger, logTelegramWebhook } from '@/lib/logger';
import { isValidYouTubeUrl } from '@/lib/downloader';
import { TelegramUpdate, ParsedCommand, JobData, VideoQuality } from '@/lib/types';
import { config } from '@/lib/config';

// Command parser schema
const commandSchema = z.object({
  url: z.string().url(),
  start: z.string().optional(),
  end: z.string().optional(),
  q: z.string().optional(),
  mp3: z.boolean().optional(),
});

// Parse command from message text
const parseCommand = (text: string): ParsedCommand | null => {
  try {
    // Extract URL (first URL-like string)
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    if (!urlMatch) return null;
    
    const url = urlMatch[0];
    
    // Extract parameters
    const params: any = { url };
    
    // Extract START parameter
    const startMatch = text.match(/START=(\d+:\d+(?::\d+)?)/i);
    if (startMatch) params.start = startMatch[1];
    
    // Extract END parameter
    const endMatch = text.match(/END=(\d+:\d+(?::\d+)?)/i);
    if (endMatch) params.end = endMatch[1];
    
    // Extract Q (quality) parameter
    const qualityMatch = text.match(/Q=(\d+|best|worst)/i);
    if (qualityMatch) params.q = qualityMatch[1];
    
    // Extract MP3 parameter
    const mp3Match = text.match(/MP3=(true|false)/i);
    if (mp3Match) params.mp3 = mp3Match[1].toLowerCase() === 'true';
    
    // Validate with schema
    const validated = commandSchema.parse(params);
    
    return {
      url: validated.url,
      startTime: validated.start,
      endTime: validated.end,
      quality: validated.q as VideoQuality,
      mp3: validated.mp3,
    };
  } catch (error) {
    logger.error('Failed to parse command', { text, error });
    return null;
  }
};

// Handle webhook POST request
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret if configured
    const secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (config.TELEGRAM_WEBHOOK_SECRET && secret !== config.TELEGRAM_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse update
    const update: TelegramUpdate = await request.json();
    logTelegramWebhook(update);
    
    // Handle only message updates
    if (!update.message || !update.message.text) {
      return NextResponse.json({ ok: true });
    }
    
    const { message } = update;
    const chatId = message.chat.id;
    const userId = message.from.id;
    const messageId = message.message_id;
    
    // Handle /start command
    if (message.text.startsWith('/start')) {
      // Check if URL was passed with /start command
      const startParams = message.text.split(' ')[1];
      if (startParams) {
        // Decode the URL and process it
        const decodedUrl = decodeURIComponent(startParams);
        message.text = `/dl ${decodedUrl}`;
        // Continue processing as /dl command below
      } else {
        // Show help message
        await sendMessage(
          chatId,
          `🎬 *YouTube Downloader Bot*\n\n` +
          `Send me a YouTube URL with optional parameters:\n\n` +
          `\`/dl <url> START=0:30 END=1:10 Q=720 MP3=true\`\n\n` +
          `*Parameters:*\n` +
          `• \`START\` - Start time (e.g., 0:30)\n` +
          `• \`END\` - End time (e.g., 1:10)\n` +
          `• \`Q\` - Quality (144, 240, 360, 480, 720, 1080, best, worst)\n` +
          `• \`MP3\` - Convert to MP3 (true/false)\n\n` +
          `*Example:*\n` +
          `\`/dl https://youtube.com/watch?v=xyz START=0:30 END=1:00 Q=720\``,
          { reply_to_message_id: messageId }
        );
        return NextResponse.json({ ok: true });
      }
    }
    
    // Handle /dl command
    if (message.text.startsWith('/dl ')) {
      const commandText = message.text.substring(4);
      const parsed = parseCommand(commandText);
      
      if (!parsed || !isValidYouTubeUrl(parsed.url)) {
        await sendMessage(
          chatId,
          '❌ Invalid command or URL. Please check the format and try again.',
          { reply_to_message_id: messageId }
        );
        return NextResponse.json({ ok: true });
      }
      
      // Create or update user
      const [user] = await db
        .insert(schema.users)
        .values({
          telegramId: userId,
          username: message.from.username,
          firstName: message.from.first_name,
          languageCode: message.from.language_code,
        })
        .onConflictDoUpdate({
          target: schema.users.telegramId,
          set: {
            username: message.from.username,
            firstName: message.from.first_name,
            updatedAt: new Date(),
          },
        })
        .returning();
      
      // Create job
      const jobId = uuidv4();
      const jobData: JobData = {
        id: jobId,
        userId: user.id,
        chatId,
        messageId,
        url: parsed.url,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        quality: parsed.quality,
        convertToMp3: parsed.mp3,
        createdAt: new Date(),
      };
      
      // Save job to database
      await db.insert(schema.jobs).values({
        id: jobId,
        userId: user.id,
        chatId,
        messageId,
        url: parsed.url,
        status: 'pending',
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        quality: parsed.quality,
        convertToMp3: parsed.mp3 || false,
      });
      
      // Add job to queue
      await addDownloadJob(jobData);
      
      // Send confirmation message
      await sendMessage(
        chatId,
        `✅ Your download job has been queued!\n\n` +
        `🆔 Job ID: \`${jobId}\`\n` +
        `🔗 URL: ${parsed.url}\n` +
        (parsed.startTime ? `⏰ Start: ${parsed.startTime}\n` : '') +
        (parsed.endTime ? `⏰ End: ${parsed.endTime}\n` : '') +
        (parsed.quality ? `📺 Quality: ${parsed.quality}\n` : '') +
        (parsed.mp3 ? `🎵 Format: MP3\n` : '') +
        `\n⏳ Processing...`,
        { reply_to_message_id: messageId }
      );
      
      return NextResponse.json({ ok: true });
    }
    
    // Unknown command
    await sendMessage(
      chatId,
      'Unknown command. Use /start to see available commands.',
      { reply_to_message_id: messageId }
    );
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('Webhook error', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
