import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    // List all available formats
    const formats = await new Promise<string>((resolve, reject) => {
      const proc = spawn('python', ['-m', 'yt_dlp', '-F', url]);
      let output = '';
      
      proc.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      proc.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error('Failed to get formats'));
        }
      });
    });
    
    return NextResponse.json({ formats });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
