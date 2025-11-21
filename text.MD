TITLE:
Build a full YouTube Downloader Telegram Bot (Next.js + Queue + Worker + ffmpeg + yt-dlp)
PROMPT:
You are my senior full-stack engineer.
Build a complete production-ready project like the Liora project structure, but instead of AI therapy, the bot will:
Download any YouTube video
Trim by start & end timestamp
Choose video quality
Convert to MP3 if requested
Send the processed file back to the user on Telegram
I want a full, end-to-end implementation with correct folder structure, clean code, and comments.

🚧 Project Requirements (VERY IMPORTANT)
1. Framework
Next.js 15 (App Router)
TypeScript
pnpm preferred
2. Architecture
Use this structure (same philosophy as Liora):
ytbot/
├── app/
│   ├── api/
│   │   └── telegram/webhook/       # receives Telegram updates
│   │   └── health/                 # simple health check for worker
│   ├── paid/ (optional)
│   └── cancelled/ (optional)
├── lib/
│   ├── downloader.ts               # yt-dlp + ffmpeg helper
│   ├── queue.ts                    # BullMQ queue
│   ├── telegram-client.ts          # Telegram sendMessage/sendDocument
│   ├── config.ts                   # env variables
│   ├── logger.ts                   # logger
│   └── types.ts                    # shared interfaces
├── db/
│   ├── schema.ts                   # job + user schema
│   ├── index.ts
├── worker/
│   ├── index.ts                    # BullMQ worker
│   ├── Dockerfile                  # ffmpeg + yt-dlp included
│   └── package.json
└── drizzle/
    └── migrations...


3. Telegram Bot Specs
Use webhook method (not polling)
Handle /dl <url> START=0:30 END=1:10 Q=720 MP3=true
Parse arguments safely
Validate user input
Enqueue the job in Redis (BullMQ)
Immediately reply: “Your job has been queued.”
When job is complete:
Worker sends processed video or MP3 back via Telegram API

4. Processing Requirements
Worker must:
download using yt-dlp
trim using ffmpeg
convert to MP3 when requested
clean up temp files
send output to Telegram

5. Deployment Requirements
Generate:
Full Dockerfile for the worker (must include ffmpeg + yt-dlp)
Cloud Run deployment guide
Redis setup (Upstash or local Docker)
Vercel config for Next.js webhook
.env template with all variables

6. What Windsurf Must Deliver
I want Windsurf to generate:
✔ Complete project folder created inside my workspace
✔ All .ts files implemented fully
✔ Full worker code
✔ BullMQ integration
✔ Telegram webhook route
✔ Downloader functions
✔ Sample migrations for Drizzle
✔ Dockerfile for worker
✔ README.md with:
setup instructions
how to run locally
how to deploy (Vercel + Cloud Run)
✔ Optional: Small UI page explaining how to use the bot

🛠 Additional Instructions
Code style:
Clean, readable TS
Comments explaining each function
Error handling properly
Reusable utilities
Avoid unnecessary complexity
Behavior:
If a file is too large for Telegram, reply with an error
Trim logic should try -c copy then fallback to re-encode
All temporary files must be auto-deleted
Quality:
Production-grade
No hardcoding
All env vars in config.ts
Modular structure

🧨 FINAL PROMPT BLOCK
IMPORTANT:
Implement the full project now — generate all folders and files exactly in the structure given above.
Create all code (Next.js API, worker, queue, downloader, telegram client, Drizzle schema, Dockerfile, README).
Once structure is ready, ask if I want:
tests
monitoring
payment features
admin panel
user limits (rate limit)
Make this a complete, deployable, production-ready project.
NO mistkes 