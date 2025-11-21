/**
 * Alternative: Telegram Bot with Polling (No ngrok needed)
 * Run this instead of the webhook approach for local testing
 */

import TelegramBot from 'node-telegram-bot-api';
import { v4 as uuidv4 } from 'uuid';
import { downloadQueue } from './lib/queue';
import { db, schema } from './db';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: true });

console.log('Bot started with polling mode. No ngrok needed!');

// Handle /start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
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
    { parse_mode: 'Markdown' }
  );
});

// Handle /dl command
bot.onText(/\/dl (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from!.id;
  const commandText = match![1];

  // Parse command
  const urlMatch = commandText.match(/(https?:\/\/[^\s]+)/);
  if (!urlMatch) {
    await bot.sendMessage(chatId, '❌ Please provide a valid YouTube URL');
    return;
  }

  const url = urlMatch[1];
  const startTime = commandText.match(/START=(\S+)/)?.[1];
  const endTime = commandText.match(/END=(\S+)/)?.[1];
  const quality = commandText.match(/Q=(\S+)/)?.[1];
  const mp3 = commandText.match(/MP3=(\S+)/)?.[1] === 'true';

  // Create or get user
  const [user] = await db
    .insert(schema.users)
    .values({
      id: uuidv4(),
      telegramId: userId,
      username: msg.from!.username,
      firstName: msg.from!.first_name,
      lastName: msg.from!.last_name,
    })
    .onConflictDoUpdate({
      target: schema.users.telegramId,
      set: {
        username: msg.from!.username,
        firstName: msg.from!.first_name,
        lastName: msg.from!.last_name,
        updatedAt: new Date(),
      },
    })
    .returning();

  // Create job
  const jobId = uuidv4();
  await db.insert(schema.jobs).values({
    id: jobId,
    userId: user.id,
    url,
    options: {
      startTime,
      endTime,
      quality,
      convertToMp3: mp3,
    },
  });

  // Add to queue
  await downloadQueue.add('download', {
    jobId,
    userId: user.id,
    chatId,
    url,
    startTime,
    endTime,
    quality,
    convertToMp3: mp3,
  });

  await bot.sendMessage(
    chatId,
    `✅ Download job created!\n\n` +
    `🔗 URL: ${url}\n` +
    `📋 Job ID: \`${jobId}\`\n\n` +
    `⏳ Processing your request...`,
    { parse_mode: 'Markdown' }
  );
});

console.log('Bot is ready! Send /start to begin.');
