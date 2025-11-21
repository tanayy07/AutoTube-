# Multi-stage Dockerfile for YouTube downloader worker
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY worker/package*.json ./worker/

# Install dependencies
RUN npm ci --only=production
RUN cd worker && npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    py3-pip \
    && pip3 install --no-cache-dir yt-dlp \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/worker/node_modules ./worker/node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/worker ./worker
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Create temp directory
RUN mkdir -p /tmp/ytdl && chown nodejs:nodejs /tmp/ytdl

# Switch to non-root user
USER nodejs

# Set environment variables
ENV NODE_ENV=production
ENV TEMP_DIR=/tmp/ytdl

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start worker
CMD ["node", "worker/index.js"]
