import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    // Check available formats with cookies
    const cookiesPath = path.join(process.cwd(), 'cookies.txt');
    const args = ['-m', 'yt_dlp', '-F', '--cookies', cookiesPath, url];
    
    return new Promise((resolve) => {
      const proc = spawn('python', args);
      let output = '';
      
      proc.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      proc.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      proc.on('close', () => {
        // Parse formats to find video qualities
        const lines = output.split('\n');
        const formats = [];
        
        lines.forEach(line => {
          if (line.includes('mp4') && line.includes('x')) {
            const match = line.match(/(\d+)\s+mp4\s+(\d+x\d+)/);
            if (match) {
              formats.push({
                id: match[1],
                resolution: match[2],
                line: line.trim()
              });
            }
          }
        });
        
        resolve(NextResponse.json({ 
          formats,
          fullOutput: output 
        }));
      });
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check formats' }, { status: 500 });
  }
}
