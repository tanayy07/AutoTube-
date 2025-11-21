import { NextRequest, NextResponse } from 'next/server';
import youtubedl from 'youtube-dl-exec';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

// Configure youtube-dl-exec to use Python's yt-dlp
const ffmpegPath = 'C:\\Users\\tanay\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0-full_build\\bin';
// Use Python yt-dlp directly
const ytdlp = youtubedl;

export async function POST(req: NextRequest) {
  try {
    const { url, quality = 'best', format = 'mp4' } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate YouTube URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    if (!youtubeRegex.test(url)) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    // Create temp directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    // Generate unique filename
    const fileId = uuidv4();
    const outputPath = path.join(tempDir, `${fileId}.%(ext)s`);

    // Build download options
    const downloadOptions: any = {
      output: outputPath,
      noPlaylist: true,
      maxFilesize: '50M',
      ffmpegLocation: ffmpegPath,
      extractorArgs: 'youtube:player_client=android,player_skip=webpage',
      userAgent: 'com.google.android.youtube/19.02.39 (Linux; U; Android 13) gzip',
      noCheckCertificate: true,
      preferFreeFormats: true,
      mergeOutputFormat: 'mp4',
      // Use Python's yt-dlp
      pythonPath: 'python',
      ytDlpPath: undefined,
    };

    if (format === 'mp3') {
      downloadOptions.format = 'bestaudio';
      downloadOptions.extractAudio = true;
      downloadOptions.audioFormat = 'mp3';
      downloadOptions.audioQuality = 0;
    } else {
      // Video quality selection - same as worker
      const qualityMap: Record<string, string> = {
        'best': 'bestvideo+bestaudio/best',
        'worst': 'worstvideo+worstaudio/worst',
        '1080': 'bestvideo[height<=1080]+bestaudio/best[height<=1080]/best',
        '720': 'bestvideo[height<=720]+bestaudio/best[height<=720]/best',
        '480': 'bestvideo[height<=480]+bestaudio/best[height<=480]/best',
        '360': 'bestvideo[height<=360]+bestaudio/best[height<=360]/best',
      };
      downloadOptions.format = qualityMap[quality] || qualityMap['best'];
    }

    // Get video info first
    const videoInfo = await ytdlp(url, {
      dumpSingleJson: true,
      noPlaylist: true,
    }) as any;

    // Start download
    await ytdlp(url, downloadOptions);

    // Find the actual downloaded file
    const files = await fs.readdir(tempDir);
    const downloadedFile = files.find(f => f.startsWith(fileId));
    
    if (!downloadedFile) {
      throw new Error('Download failed - file not found');
    }

    const filePath = path.join(tempDir, downloadedFile);
    const fileBuffer = await fs.readFile(filePath);
    const stats = await fs.stat(filePath);

    // Clean up temp file
    await fs.unlink(filePath).catch(() => {});

    // Return file as response
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': format === 'mp3' ? 'audio/mpeg' : 'video/mp4',
        'Content-Disposition': `attachment; filename="${videoInfo.title || 'download'}.${format}"`,
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

// Get download progress
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    // Get video information
    const info = await ytdlp(url, {
      dumpSingleJson: true,
      noPlaylist: true,
    }) as any;

    return NextResponse.json({
      title: info.title,
      duration: info.duration,
      thumbnail: info.thumbnail,
      formats: info.formats?.map((f: any) => ({
        format_id: f.format_id,
        ext: f.ext,
        quality: f.height,
        filesize: f.filesize,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get video info' },
      { status: 500 }
    );
  }
}
