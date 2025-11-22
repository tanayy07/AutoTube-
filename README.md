# YouTube Downloader Telegram Bot

A production-ready Telegram bot that downloads YouTube videos with custom trimming and quality selection. Built with Next.js, BullMQ, PostgreSQL, and yt-dlp.

## 🎥 Demo

https://www.youtube.com/watch?v=PbdtciyUgz0

> *Click the image above to watch the demo video*

## Features

- 🎬 Download YouTube videos directly through Telegram
- ✂️ Trim videos by specifying start and end timestamps
- 📺 Choose video quality (144p to 4K, or best/worst)
- 🎵 Convert videos to MP3 format
- ⚡ Asynchronous processing with job queue
- 📊 PostgreSQL database for job tracking
- 🔄 Automatic retry on failure
- 📱 Beautiful web interface for bot information

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Telegram   │────▶│   Next.js   │────▶│    Redis    │
│    Users    │     │   Webhook   │     │   (Queue)   │
└─────────────┘     └─────────────┘     └─────────────┘
                            │                    │
                            ▼                    ▼
                    ┌─────────────┐     ┌─────────────┐
                    │ PostgreSQL  │     │   Worker    │
                    │  Database   │     │  (yt-dlp)   │
                    └─────────────┘     └─────────────┘
```

## Prerequisites

- Node.js 20+
- PostgreSQL
- Redis
- ffmpeg
- yt-dlp
- Telegram Bot Token

## Installation

1. **Clone the repository**
   ```bash
   cd ytbot
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   DATABASE_URL=postgresql://user:password@localhost:5432/ytbot
   REDIS_URL=redis://localhost:6379
   ```

4. **Set up the database**
   ```bash
   # Generate migrations
   npm run db:generate
   
   # Run migrations
   npm run db:migrate
   ```

5. **Install system dependencies**
   
   **Ubuntu/Debian:**
   ```bash
   sudo apt update
   sudo apt install ffmpeg python3-pip
   pip3 install yt-dlp
   ```
   
   **macOS:**
   ```bash
   brew install ffmpeg yt-dlp
   ```
   
   **Windows:**
   - Install ffmpeg: https://ffmpeg.org/download.html
   - Install yt-dlp: `pip install yt-dlp`

## Running Locally

1. **Start Redis**
   ```bash
   # Using Docker
   docker run -d -p 6379:6379 redis:alpine
   
   # Or using local Redis
   redis-server
   ```

2. **Start PostgreSQL**
   ```bash
   # Using Docker
   docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:alpine
   
   # Create database
   psql -U postgres -c "CREATE DATABASE ytbot;"
   ```

3. **Start the Next.js app**
   ```bash
   npm run dev
   ```

4. **Start the worker**
   ```bash
   # In a new terminal
   npm run worker:dev
   ```

5. **Set up Telegram webhook**
   ```bash
   # Using ngrok for local development
   ngrok http 3000
   
   # Set webhook (replace with your ngrok URL)
   curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-ngrok-url.ngrok.io/api/telegram/webhook"}'
   ```

## Deployment

### Vercel (Next.js App)

1. **Deploy to Vercel**
   ```bash
   vercel
   ```

2. **Set environment variables in Vercel dashboard**

3. **Update webhook URL**
   ```bash
   curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-app.vercel.app/api/telegram/webhook"}'
   ```

### Google Cloud Run (Worker)

1. **Build Docker image**
   ```bash
   cd worker
   docker build -t ytbot-worker .
   ```

2. **Push to Google Container Registry**
   ```bash
   docker tag ytbot-worker gcr.io/YOUR_PROJECT_ID/ytbot-worker
   docker push gcr.io/YOUR_PROJECT_ID/ytbot-worker
   ```

3. **Deploy to Cloud Run**
   ```bash
   gcloud run deploy ytbot-worker \
     --image gcr.io/YOUR_PROJECT_ID/ytbot-worker \
     --platform managed \
     --region us-central1 \
     --set-env-vars "DATABASE_URL=your-db-url,REDIS_URL=your-redis-url"
   ```

### Database Options

- **Supabase**: Free PostgreSQL hosting
- **Neon**: Serverless PostgreSQL
- **Railway**: Simple PostgreSQL deployment

### Redis Options

- **Upstash**: Serverless Redis with free tier
- **Redis Cloud**: Managed Redis hosting
- **Railway**: Simple Redis deployment

## Usage

1. **Start a conversation with your bot on Telegram**
   ```
   /start
   ```

2. **Download a video**
   ```
   /dl https://youtube.com/watch?v=VIDEO_ID
   ```

3. **Download with options**
   ```
   /dl https://youtube.com/watch?v=VIDEO_ID START=0:30 END=1:00 Q=720 MP3=false
   ```

### Parameters

- `START`: Start time (format: `MM:SS` or `HH:MM:SS`)
- `END`: End time (format: `MM:SS` or `HH:MM:SS`)
- `Q`: Quality (144, 240, 360, 480, 720, 1080, 1440, 2160, best, worst)
- `MP3`: Convert to MP3 (true/false)

## API Endpoints

- `POST /api/telegram/webhook` - Telegram webhook endpoint
- `GET /api/health` - Health check endpoint
- `GET /` - Web interface

## Development

### Project Structure

```
ytbot/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── telegram/      # Telegram webhook
│   │   └── health/        # Health check
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── lib/                   # Shared libraries
│   ├── downloader.ts      # yt-dlp wrapper
│   ├── queue.ts           # BullMQ setup
│   ├── telegram-client.ts # Telegram API client
│   ├── config.ts          # Configuration
│   ├── logger.ts          # Winston logger
│   └── types.ts           # TypeScript types
├── db/                    # Database
│   ├── schema.ts          # Drizzle schema
│   ├── index.ts           # Database client
│   └── migrate.ts         # Migration runner
├── worker/                # Background worker
│   ├── index.ts           # Worker process
│   ├── Dockerfile         # Worker container
│   └── package.json       # Worker dependencies
└── drizzle/               # Database migrations
```

### Adding Features

1. **Rate Limiting**
   ```typescript
   // In lib/rate-limit.ts
   import { RateLimiterRedis } from 'rate-limiter-flexible';
   ```

2. **User Limits**
   ```typescript
   // Add to db/schema.ts
   dailyLimit: integer('daily_limit').notNull().default(10),
   ```

3. **Payment Integration**
   ```typescript
   // Create app/api/payment/route.ts
   // Integrate Stripe or other payment provider
   ```

## Monitoring

- **Logs**: Check worker logs for processing details
- **Queue**: Monitor BullMQ dashboard
- **Database**: Query jobs table for statistics
- **Health**: Check `/api/health` endpoint

## Troubleshooting

### Common Issues

1. **"File too large" error**
   - Increase `MAX_FILE_SIZE_MB` in `.env`
   - Note: Telegram has a 50MB limit for bots

2. **"yt-dlp not found" error**
   - Ensure yt-dlp is installed: `pip install yt-dlp`
   - Check PATH environment variable

3. **"ffmpeg not found" error**
   - Ensure ffmpeg is installed
   - Check PATH environment variable

4. **Worker not processing jobs**
   - Check Redis connection
   - Verify worker is running
   - Check worker logs

### Debug Mode

Enable debug logging:
```env
LOG_LEVEL=debug
```

## Security

- Always use environment variables for sensitive data
- Set up webhook secret for Telegram
- Use HTTPS for production webhooks
- Implement rate limiting for production
- Validate and sanitize user inputs

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details

## Support

- Create an issue for bug reports
- Join our Discord for community support
- Check documentation for common questions

## Acknowledgments

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) for YouTube downloading
- [BullMQ](https://docs.bullmq.io/) for job queue management
- [Drizzle ORM](https://orm.drizzle.team/) for database management
- [Next.js](https://nextjs.org/) for the web framework
