import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const { url, quality = 'best', format = 'mp4', useCookies = false, proxy = null } = await req.json();

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
    
    // Base args - using web client for better quality access
    const baseArgs = [
      '-m', 'yt_dlp',
      '--ffmpeg-location', ffmpegPath,
      '--no-playlist',
      '--no-warnings',
      '-o', outputPath,
    ];

    // Add cookies support
    if (useCookies) {
      const cookiesPath = path.join(process.cwd(), 'cookies.txt');
      const cookiesExist = await fs.access(cookiesPath).then(() => true).catch(() => false);
      
      if (cookiesExist) {
        baseArgs.push('--cookies', cookiesPath);
        console.log('Using cookies for authentication');
      } else {
        console.warn('Cookies file not found at:', cookiesPath);
      }
    }

    // Add proxy support
    if (proxy) {
      baseArgs.push('--proxy', proxy);
      console.log('Using proxy:', proxy);
    }

    // Don't force a specific client - let yt-dlp choose based on cookies
    baseArgs.push('--no-check-certificate');

    // Format selection for better quality
    let formatString = '';
    if (format === 'mp3') {
      formatString = 'bestaudio[ext=m4a]/bestaudio/best';
    } else {
      // Simple format selection that works with cookies
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
        case '1440':
          formatString = 'best[height<=1440]';
          break;
        case '2160':
        case '4k':
          formatString = 'best[height<=2160]';
          break;
        case 'best':
        default:
          formatString = 'best';
          break;
      }
    }

    // Build final args
    const args = [...baseArgs];
    
    if (format === 'mp3') {
      args.push('-f', formatString, '-x', '--audio-format', 'mp3', '--audio-quality', '0', url);
    } else {
      args.push('-f', formatString, '--merge-output-format', 'mp4', url);
    }

    // Execute download
    await new Promise((resolve, reject) => {
      console.log('Executing command:', 'python', args.join(' '));
      const proc = spawn('python', args);
      let stderr = '';
      let stdout = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log('yt-dlp output:', data.toString());
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error('yt-dlp error:', data.toString());
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(null);
        } else {
          reject(new Error(`Download failed: ${stderr || stdout}`));
        }
      });

      proc.on('error', reject);
    });

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
