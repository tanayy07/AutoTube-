import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

export async function GET(req: NextRequest) {
  try {
    // Test if Python and yt-dlp are accessible
    const result = await new Promise<string>((resolve, reject) => {
      const proc = spawn('python', ['-m', 'yt_dlp', '--version']);
      let output = '';
      let error = '';

      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data) => {
        error += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`yt-dlp test failed: ${error}`));
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });

    return NextResponse.json({ 
      success: true, 
      version: result,
      message: 'yt-dlp is working correctly'
    });

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      suggestion: 'Make sure Python and yt-dlp are installed: pip install yt-dlp'
    }, { status: 500 });
  }
}
