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

    // Build yt-dlp command with cookies and different approach
    const ffmpegPath = 'C:\\Users\\tanay\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0-full_build\\bin';
    
    // Use a simpler approach - let yt-dlp handle quality selection
    const args = [
      '-m', 'yt_dlp',
      url,
      '-o', outputPath,
      '--ffmpeg-location', ffmpegPath,
      '--no-playlist',
      '--no-warnings',
    ];

    // Add quality selection
    if (format === 'mp3') {
      args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
    } else {
      // For video, use simple quality selection
      if (quality !== 'best') {
        args.push('-S', `res:${quality},ext:mp4`);
      }
      args.push('--merge-output-format', 'mp4');
    }

    // Execute download
    const result = await new Promise<{success: boolean, error?: string}>((resolve) => {
      console.log('Executing:', 'python', args.join(' '));
      const proc = spawn('python', args);
      let output = '';
      let error = '';

      proc.stdout.on('data', (data) => {
        output += data.toString();
        console.log('Output:', data.toString());
      });

      proc.stderr.on('data', (data) => {
        error += data.toString();
        console.error('Error:', data.toString());
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: error || output });
        }
      });
    });

    if (!result.success) {
      throw new Error(result.error || 'Download failed');
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
