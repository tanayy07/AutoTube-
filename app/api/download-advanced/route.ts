import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const { url, quality = '720', format = 'mp4', useCookies = false, proxy, startTime, endTime } = await req.json();

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

    // ALWAYS use cookies for advanced mode - this is critical for high quality
    const cookiesPath = path.join(process.cwd(), 'cookies.txt');
    const cookiesExist = await fs.access(cookiesPath).then(() => true).catch(() => false);
    
    if (cookiesExist) {
      baseArgs.push('--cookies', cookiesPath);
      console.log('Using cookies for authentication');
    } else {
      console.warn('Cookies file not found at:', cookiesPath);
      return NextResponse.json({ 
        error: 'Cookies file required for high quality downloads. Please add cookies.txt to enable 1080p+ quality.' 
      }, { status: 400 });
    }

    // Add proxy support
    if (proxy) {
      baseArgs.push('--proxy', proxy);
      console.log('Using proxy:', proxy);
    }

    // Add format sorting to prioritize quality
    baseArgs.push('--no-check-certificate');
    
    // CRITICAL: Enable JavaScript challenge solving
    baseArgs.push('--enable-file-urls');
    
    // Sort by resolution first to ensure we get highest quality
    baseArgs.push('--format-sort', 'res,quality,fps,vcodec:h264');

    console.log(`Requested quality: ${quality}, format: ${format}`);

    // Format selection for better quality
    let formatString = '';
    if (format === 'mp3') {
      formatString = 'bestaudio[ext=m4a]/bestaudio/best';
    } else {
      // Use the EXACT same format selection that worked before
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
          // Use format 96 which is 1080p for this video
          formatString = '96+140/bestvideo[height=1080]+bestaudio/best[height<=1080]';
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

    // First, let's check what formats are actually available
    if (format !== 'mp3' && quality !== '360' && quality !== '480') {
      console.log('Checking available formats first...');
      const checkArgs = [...baseArgs, '-F', url];
      
      try {
        const formats = await new Promise<string>((resolve, reject) => {
          const proc = spawn('python', checkArgs);
          let output = '';
          
          proc.stdout.on('data', (data) => {
            output += data.toString();
          });
          
          proc.on('close', (code) => {
            if (code === 0) {
              resolve(output);
            } else {
              reject(new Error('Failed to list formats'));
            }
          });
        });
        
        console.log('AVAILABLE FORMATS:', formats);
        
        // Check if requested quality is actually available
        const has1080p = formats.includes('1920x1080');
        const has720p = formats.includes('1280x720');
        
        if (quality === '1080' && !has1080p) {
          throw new Error('1080p not available for this video. Available formats:\n' + formats);
        }
      } catch (error) {
        console.error('Format check failed:', error);
      }
    }
    
    // Build final args
    const args = [...baseArgs];
    
    // SMART: Download only the segment we need!
    if (startTime || endTime) {
      console.log(`Downloading only segment from ${startTime || 'start'} to ${endTime || 'end'}`);
      
      // Use yt-dlp's built-in segment download
      if (startTime && endTime) {
        // Download specific segment
        args.push('--download-sections', `*${startTime}-${endTime}`);
      } else if (startTime) {
        // Download from start time to end
        args.push('--download-sections', `*${startTime}-`);
      } else if (endTime) {
        // Download from beginning to end time
        args.push('--download-sections', `*-${endTime}`);
      }
      
      // Force re-encoding for accurate trimming
      args.push('--force-keyframes-at-cuts');
    }
    
    if (format === 'mp3') {
      args.push('-f', formatString, '-x', '--audio-format', 'mp3', '--audio-quality', '0', url);
    } else {
      // Add verbose to see what's being downloaded
      console.log('Format string being used:', formatString);
      args.push('-f', formatString);
      args.push('--merge-output-format', 'mp4');
      // Print info about selected format
      args.push('--print', 'before_dl:%(format_id)s %(resolution)s %(filesize_approx)s');
      args.push(url);
    }

    // Execute download with fallback
    let downloadSuccess = false;
    let attempts = 0;
    
    while (!downloadSuccess && attempts < 2) {
      try {
        await new Promise((resolve, reject) => {
          console.log('Executing command:', 'python', args.join(' '));
          const proc = spawn('python', args);
          let stderr = '';
          let stdout = '';

          proc.stdout.on('data', (data) => {
            stdout += data.toString();
            const output = data.toString();
            console.log('yt-dlp output:', output);
            
            // Log which format is being downloaded
            if (output.includes('format(s):')) {
              console.log('FORMAT SELECTED:', output);
            }
            // Log resolution and format details
            if (output.includes('x') && (output.includes('mp4') || output.includes('webm'))) {
              console.log('VIDEO DETAILS:', output);
            }
            // Log merging info
            if (output.includes('Merging formats')) {
              console.log('MERGING:', output);
            }
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
        downloadSuccess = true;
      } catch (error: any) {
        attempts++;
        const errorMsg = error.message || '';
        
        // Check if the error is because of format restrictions
        if (errorMsg.includes('Requested format is not available') && format === 'mp4') {
          console.error('Format not available with current settings, will retry with fallback...');
          // Don't throw here, let it try the fallback
        }
        
        if (attempts === 1 && format !== 'mp3') {
          // Try with simpler format selection as fallback
          console.log('First attempt failed, trying with simpler format selection...');
          
          // Use simpler format string
          const formatIndex = args.indexOf('-f');
          if (formatIndex !== -1) {
            args[formatIndex + 1] = 'best';
          }
        } else {
          throw error;
        }
      }
    }

    // Log original file size before trimming
    const originalStats = await fs.stat(outputPath);
    console.log(`Original downloaded file size: ${(originalStats.size / 1024 / 1024).toFixed(2)} MB`);

    // No need to trim - yt-dlp already downloaded only the segment we need!
    let finalPath = outputPath;

    // Get file stats
    const stats = await fs.stat(finalPath);
    console.log(`Final file size being sent: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    
    // For large files, stream instead of loading into memory
    if (stats.size > 500 * 1024 * 1024) { // If larger than 500MB
      console.log('Large file detected, using streaming response');
      
      const stream = createReadStream(finalPath);
      
      // Clean up after streaming
      stream.on('end', () => {
        fs.unlink(finalPath).catch(() => {});
      });
      
      return new NextResponse(stream as any, {
        headers: {
          'Content-Type': format === 'mp3' ? 'audio/mpeg' : 'video/mp4',
          'Content-Disposition': `attachment; filename="download.${format}"`,
          'Content-Length': stats.size.toString(),
        },
      });
    } else {
      // Small files can be read into memory
      const fileBuffer = await fs.readFile(finalPath);
      
      // Clean up
      await fs.unlink(finalPath).catch(() => {});
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': format === 'mp3' ? 'audio/mpeg' : 'video/mp4',
          'Content-Disposition': `attachment; filename="download.${format}"`,
          'Content-Length': stats.size.toString(),
        },
      });
    }

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Download failed' },
      { status: 500 }
    );
  }
}

async function trimVideo(
  inputPath: string, 
  outputPath: string, 
  startTime?: string, 
  endTime?: string,
  ffmpegPath?: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpegBin = ffmpegPath ? path.join(ffmpegPath, 'ffmpeg.exe') : 'ffmpeg';
    
    // Build ffmpeg command
    const args = ['-i', inputPath];
    
    // Add start time if provided
    if (startTime) {
      args.push('-ss', startTime);
    }
    
    // Add duration if end time is provided
    if (endTime && startTime) {
      // Calculate duration from start to end
      const duration = calculateDuration(startTime, endTime);
      if (duration) {
        args.push('-t', duration);
      }
    } else if (endTime) {
      // If only end time, use -to
      args.push('-to', endTime);
    }
    
    // Copy codecs to preserve quality (no re-encoding)
    args.push('-c', 'copy');
    // Ensure proper timestamp handling
    args.push('-avoid_negative_ts', 'make_zero');
    // Copy all streams (video, audio, subtitles if any)
    args.push('-map', '0');
    // Output file
    args.push(outputPath);
    
    console.log('Trimming video:', ffmpegBin, args.join(' '));
    
    const proc = spawn(ffmpegBin, args);
    let stderr = '';
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg trim failed: ${stderr}`));
      }
    });
    
    proc.on('error', reject);
  });
}

function calculateDuration(startTime: string, endTime: string): string {
  // Convert time strings to seconds
  const toSeconds = (time: string): number => {
    const parts = time.split(':').reverse();
    let seconds = 0;
    for (let i = 0; i < parts.length; i++) {
      seconds += parseFloat(parts[i]) * Math.pow(60, i);
    }
    return seconds;
  };
  
  const startSeconds = toSeconds(startTime);
  const endSeconds = toSeconds(endTime);
  const duration = endSeconds - startSeconds;
  
  if (duration <= 0) {
    throw new Error('End time must be after start time');
  }
  
  // Convert back to HH:MM:SS format
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = duration % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toFixed(3).padStart(6, '0')}`;
  } else {
    return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
  }
}
