import type { Metadata } from 'next'
import { Inter, DM_Sans } from 'next/font/google'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const dmSans = DM_Sans({ 
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'YTDownloader - Fast YouTube Downloads',
  description: 'Download YouTube videos, MP3s, and clips directly from Telegram. No ads, no limits, just pure speed.',
  keywords: 'youtube downloader, telegram bot, mp3 converter, video downloader, yt-dlp',
  authors: [{ name: 'YTDownloader' }],
  openGraph: {
    title: 'YTDownloader - Fast YouTube Downloads',
    description: 'Download YouTube videos directly from Telegram',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YTDownloader',
    description: 'Fast YouTube downloads via Telegram',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSans.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
