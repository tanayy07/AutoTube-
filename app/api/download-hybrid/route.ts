import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const { url, quality = 'best', format = 'mp4' } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Create temp directory
    const tempDir = path.join(process.cwd(), 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    // Generate unique filename
    const fileId = uuidv4();
    const outputPath = path.join(tempDir, `${fileId}.${format}`);

    // Build yt-dlp command
    const ffmpegPath = 'C:\\Users\\tanay\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0-full_build\\bin';
    
    // Try without client restrictions first for better quality
    let baseArgs = [
      '-m', 'yt_dlp',
      '--ffmpeg-location', ffmpegPath,
      '--no-playlist',
      '--no-warnings',
      '--no-check-certificate',
      '-o', outputPath,
    ];

    // Format selection
    let formatString = '';
    if (format === 'mp3') {
      formatString = 'bestaudio/best';
    } else {
      // Try to get the requested quality
      switch (quality) {
        case '360':
          formatString = 'best[height<=360]';
          break;
        case '480':
          formatString = 'best[height<=480]';
          break;
        case '720':
          formatString = 'best[height<=720]';
          break;
        case '1080':
          formatString = 'best[height<=1080]';
          break;
        case 'best':
        default:
          formatString = 'best';
          break;
      }
    }

    // First attempt: Try without client restrictions
    let success = false;
    try {
      const args = [...baseArgs];
      if (format === 'mp3') {
        args.push('-f', formatString, '-x', '--audio-format', 'mp3', url);
      } else {
        args.push('-f', formatString, url);
      }

      await executeDownload(args);
      success = true;
      console.log('Downloaded successfully without client restrictions');
    } catch (error) {
      console.log('First attempt failed, trying with Android client...');
    }

    // Second attempt: Use Android client as fallback
    if (!success) {
      baseArgs.push(
        '--extractor-args', 'youtube:player_client=android',
        '--user-agent', 'com.google.android.youtube/19.02.39 (Linux; U; Android 13) gzip'
      );

      const args = [...baseArgs];
      if (format === 'mp3') {
        args.push('-f', 'bestaudio/best', '-x', '--audio-format', 'mp3', url);
      } else {
        // Android client usually only has format 18 (360p)
        args.push('-f', 'best', url);
      }

      await executeDownload(args);
      console.log('Downloaded successfully with Android client (quality may be limited)');
    }

    // Read the downloaded file
    const fileBuffer = await fs.readFile(outputPath);
    const stats = await fs.stat(outputPath);
    
    console.log(`Downloaded file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    // Clean up
    await fs.unlink(outputPath).catch(() => {});

    // Return file
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': format === 'mp3' ? 'audio/mpeg' : 'video/mp4',
        'Content-Disposition': `attachment; filename="download.${format}"`,
        'Content-Length': stats.size.toString(),
      },
    });

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Download failed' },
      { status: 500 }
    );
  }
}

async function executeDownload(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('Executing:', 'python', args.join(' '));
    const proc = spawn('python', args);
    let stderr = '';

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr));
      }
    });

    proc.on('error', reject);
  });
}
