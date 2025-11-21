/**
 * Database schema using Drizzle ORM
 */

import { pgTable, serial, text, integer, timestamp, boolean, varchar, bigint } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  telegramId: bigint('telegram_id', { mode: 'number' }).notNull().unique(),
  username: varchar('username', { length: 255 }),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  languageCode: varchar('language_code', { length: 10 }),
  totalDownloads: integer('total_downloads').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Jobs table
export const jobs = pgTable('jobs', {
  id: varchar('id', { length: 36 }).primaryKey(), // UUID
  userId: integer('user_id').notNull().references(() => users.id),
  chatId: bigint('chat_id', { mode: 'number' }).notNull(),
  messageId: bigint('message_id', { mode: 'number' }).notNull(),
  url: text('url').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  startTime: varchar('start_time', { length: 20 }),
  endTime: varchar('end_time', { length: 20 }),
  quality: varchar('quality', { length: 10 }),
  convertToMp3: boolean('convert_to_mp3').notNull().default(false),
  filePath: text('file_path'),
  fileName: text('file_name'),
  fileSize: bigint('file_size', { mode: 'number' }),
  error: text('error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  jobs: many(jobs),
}));

export const jobsRelations = relations(jobs, ({ one }) => ({
  user: one(users, {
    fields: [jobs.userId],
    references: [users.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
