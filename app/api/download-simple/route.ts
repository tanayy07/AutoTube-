import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Request body:', body);
    const { url, quality = 'best', format = 'mp4' } = body;

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
    
    // Build base args
    const baseArgs = [
      '-m', 'yt_dlp',
      '--ffmpeg-location', ffmpegPath,
      '--no-playlist',
      '--no-warnings',
      '--extractor-args', 'youtube:player_client=android',
      '--user-agent', 'com.google.android.youtube/19.02.39 (Linux; U; Android 13) gzip',
      '-o', outputPath,
    ];

    // Add format-specific args
    let formatString = '';
    if (format === 'mp3') {
      formatString = 'bestaudio[ext=m4a]/bestaudio/best';
    } else {
      // For Android client, we need to use simpler format selection
      // Android usually provides combined formats (video+audio together)
      // Android client provides limited formats, so we need to be specific
      switch (quality) {
        case '360':
          // Format 18 = 360p with audio
          formatString = '18/best[height<=360]/worst';
          break;
        case '480':
          // Try to get higher quality if available
          formatString = 'best[height<=480][height>360]/18/best';
          break;
        case '720':
          // Format 22 if available, otherwise best available
          formatString = '22/best[height<=720]/18/best';
          break;
        case '1080':
          // Android rarely provides 1080p, but try
          formatString = 'best[height<=1080][height>720]/22/best';
          break;
        case 'best':
        default:
          formatString = 'best';
          break;
      }
    }

    // Build final args array
    const args = [...baseArgs];
    
    if (format === 'mp3') {
      args.push('-f', formatString, '-x', '--audio-format', 'mp3', '--audio-quality', '0', url);
    } else {
      // For video, use the format string (merge-output-format already in baseArgs)
      args.push('-f', formatString, url);
    }

    // Execute download
    await new Promise((resolve, reject) => {
      console.log(`Downloading ${format.toUpperCase()} in quality: ${quality}`);
      console.log('Format string:', formatString);
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
        console.log('yt-dlp exit code:', code);
        if (code === 0) {
          resolve(null);
        } else {
          reject(new Error(`Download failed with code ${code}: ${stderr || stdout}`));
        }
      });

      proc.on('error', (err) => {
        console.error('Spawn error:', err);
        reject(err);
      });
    });

    // Check if file exists
    try {
      await fs.access(outputPath);
    } catch (error) {
      console.error('Output file not found:', outputPath);
      throw new Error('Download completed but output file not found');
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
