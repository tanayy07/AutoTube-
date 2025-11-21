import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const guidePath = path.join(process.cwd(), 'COOKIES_GUIDE.md');
    const content = await fs.readFile(guidePath, 'utf-8');
    
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/markdown',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Cookies guide not found' },
      { status: 404 }
    );
  }
}
