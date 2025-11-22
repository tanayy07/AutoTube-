'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import TimestampSelector from '@/components/TimestampSelector'

export default function Home() {
  const [url, setUrl] = useState('')
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadMode, setDownloadMode] = useState<'direct' | 'telegram'>('direct')
  const [quality, setQuality] = useState('720')
  const [format, setFormat] = useState<'mp4' | 'mp3'>('mp4')
  const [useAdvanced, setUseAdvanced] = useState(true) // Default to advanced mode
  const [useCookies, setUseCookies] = useState(false)
  const [proxy, setProxy] = useState('')
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const [useTimestamp, setUseTimestamp] = useState(false)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const handleDirectDownload = async () => {
    if (!url) {
      alert('Please enter a YouTube URL first')
      return
    }

    setIsDownloading(true)
    try {
      const endpoint = useAdvanced ? '/api/download-advanced' : '/api/download-hybrid'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          quality,
          format,
          ...(useAdvanced && { useCookies, proxy: proxy || null }),
          ...(useTimestamp && { startTime, endTime }),
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Download failed' }))
        throw new Error(error.error || 'Download failed')
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename\*?=(?:UTF-8'')?"?([^\";]+)/)
      const filename = filenameMatch ? filenameMatch[1] : `download.${format}`

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Download failed')
    } finally {
      setIsDownloading(false)
    }
  }

  const features = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" key="f1">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: 'Lightning Fast',
      description: 'High-speed downloads with parallel processing',
      color: 'from-yellow-400 to-orange-500',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" key="f2">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      ),
      title: 'MP3/MP4 Support',
      description: 'Convert to audio or keep as video',
      color: 'from-purple-400 to-pink-500',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" key="f3">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Trim Timestamps',
      description: 'Cut videos to exact start and end times',
      color: 'from-blue-400 to-cyan-500',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" key="f4">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      title: 'HD to 4K Quality',
      description: 'Choose from 144p to 4K resolution',
      color: 'from-green-400 to-emerald-500',
    },
  ]

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white overflow-hidden relative">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0">
        {/* Animated gradient orbs */}
        <div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,0,51,0.1) 0%, transparent 70%)',
            left: `${mousePosition.x * 0.05}px`,
            top: `${mousePosition.y * 0.05}px`,
            transform: 'translate(-50%, -50%)',
            filter: 'blur(100px)',
          }}
        />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 left-1/3 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[150px] animate-pulse" />

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />

        {/* Noise texture */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 px-6 lg:px-12 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">AutoTube</span>
          </div>
          <div className="flex items-center space-x-6">
            <Link href="/api/health" className="text-gray-400 hover:text-white transition-colors text-sm">
              API Status
            </Link>
            <Link
              href="https://t.me/openmind1_bot"
              className="bg-white/10 backdrop-blur-md border border-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition-all text-sm font-medium"
            >
              Open Bot
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 lg:px-12 pt-20 pb-32">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-full px-4 py-2 mb-8">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm text-red-400">Powered by yt-dlp</span>
            </div>

            {/* Main headline */}
            <h1 className="text-5xl lg:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">Fast • Simple • Powerful</span>
              <br />
              <span className="bg-gradient-to-r from-red-400 via-red-500 to-red-600 bg-clip-text text-transparent">YouTube Downloader</span>
            </h1>

            <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
              {downloadMode === 'direct'
                ? 'Download YouTube videos, MP3s, and clips directly. No ads, no limits, just pure speed.'
                : 'Use our Telegram bot for easy downloads on any device. Send a link, get your video!'}
            </p>

            {/* URL Input - Only show for direct download mode */}
            {downloadMode === 'direct' && (
              <div className="max-w-2xl mx-auto mb-8">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-blue-500 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition duration-1000" />
                  <div className="relative bg-[#1A1A1A]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2">
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Paste YouTube URL here..."
                        className="flex-1 bg-transparent px-6 py-4 text-lg placeholder-gray-500 focus:outline-none"
                      />
                      <button
                        onClick={handleDirectDownload}
                        disabled={isDownloading}
                        className={`${
                          isDownloading ? 'bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                        } text-white px-8 py-4 rounded-xl font-semibold transition-all transform hover:scale-[1.02]`}
                      >
                        {isDownloading ? 'Downloading...' : 'Download Now'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Download Options */}
            <div className="mt-4 flex flex-wrap gap-4 justify-center items-center">
              {/* Mode Toggle */}
              <div className="flex bg-[#1A1A1A]/50 backdrop-blur-sm border border-white/10 rounded-lg p-1">
                <button
                  onClick={() => setDownloadMode('direct')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    downloadMode === 'direct' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Direct Download
                </button>
                <button
                  onClick={() => setDownloadMode('telegram')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    downloadMode === 'telegram' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Telegram Bot
                </button>
              </div>

              {/* Quality Selector (for direct download) */}
              {downloadMode === 'direct' && (
                <>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    className="bg-[#1A1A1A]/50 backdrop-blur-sm border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/20"
                  >
                    <option value="best">Best Quality</option>
                    <option value="2160">4K (2160p)</option>
                    <option value="1440">1440p</option>
                    <option value="1080">1080p</option>
                    <option value="720">720p</option>
                    <option value="480">480p</option>
                    <option value="360">360p</option>
                  </select>

                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as 'mp4' | 'mp3')}
                    className="bg-[#1A1A1A]/50 backdrop-blur-sm border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/20"
                  >
                    <option value="mp4">MP4 (Video)</option>
                    <option value="mp3">MP3 (Audio)</option>
                  </select>
                </>
              )}

              {/* Advanced Mode Toggle */}
              {downloadMode === 'direct' && (
                <button
                  onClick={() => setUseAdvanced(!useAdvanced)}
                  className={`text-xs ${useAdvanced ? 'text-green-400' : 'text-gray-500'} hover:text-gray-300 transition-colors flex items-center gap-1`}
                >
                  <span>{useAdvanced ? '✓' : '○'}</span>
                  <span>Advanced Options</span>
                </button>
              )}

              {/* Timestamp Toggle */}
              {downloadMode === 'direct' && (
                <button
                  onClick={() => setUseTimestamp(!useTimestamp)}
                  className={`text-xs ${useTimestamp ? 'text-blue-400' : 'text-gray-500'} hover:text-blue-300 transition-colors`}
                >
                  ✂️ Trim Video
                </button>
              )}
            </div>

            {/* Timestamp Selection */}
            {downloadMode === 'direct' && useTimestamp && (
              <div className="mt-4 p-4 bg-[#1A1A1A]/50 backdrop-blur-sm border border-white/10 rounded-lg">
                <TimestampSelector startTime={startTime} endTime={endTime} onStartTimeChange={setStartTime} onEndTimeChange={setEndTime} videoDuration={0} />
              </div>
            )}

            {/* Advanced Options Panel */}
            {downloadMode === 'direct' && useAdvanced && (
              <div className="mt-4 p-4 bg-[#1A1A1A]/50 backdrop-blur-sm border border-white/10 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-300">Advanced Options</h3>
                  <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded">Premium Features</span>
                </div>

                <div className="space-y-3">
                  {/* Use Cookies */}
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={useCookies} onChange={(e) => setUseCookies(e.target.checked)} className="rounded border-gray-600 text-blue-500 focus:ring-blue-500" />
                    <span className="text-sm text-gray-400">Use cookies for authentication</span>
                    <span className="text-xs text-green-400 ml-1">(Unlocks 4K/1440p)</span>
                  </label>

                  {useCookies && (
                    <p className="text-xs text-gray-500 ml-6">
                      Place cookies.txt file in the project root.
                      <Link href="/api/cookies-guide" className="text-blue-400 hover:text-blue-300 ml-1">
                        Learn how →
                      </Link>
                    </p>
                  )}

                  {/* Show More Options Toggle */}
                  <button onClick={() => setShowMoreOptions(!showMoreOptions)} className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center space-x-1">
                    <span>{showMoreOptions ? '▼' : '▶'}</span>
                    <span>More options</span>
                  </button>

                  {/* Proxy Input - Hidden by default */}
                  {showMoreOptions && (
                    <div className="pl-4 border-l-2 border-gray-700">
                      <label className="block text-sm text-gray-400 mb-1">Proxy URL (for regional restrictions)</label>
                      <input
                        type="text"
                        value={proxy}
                        onChange={(e) => setProxy(e.target.value)}
                        placeholder="http://proxy.example.com:8080"
                        className="w-full bg-[#1A1A1A]/80 border border-white/10 rounded-lg px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:border-white/20"
                      />
                      <p className="text-xs text-gray-600 mt-1">Only needed if videos are blocked in your region</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CTA Buttons - Only show when Telegram mode is selected */}
            {downloadMode === 'telegram' && (
              <div className="flex flex-col lg:flex-row gap-8 justify-center items-center mt-12 max-w-3xl mx-auto">
                {/* Try Telegram Bot Button */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                  <Link 
                    href="https://t.me/openmind1_bot"
                    className="relative flex items-center space-x-3 bg-[#1A1A1A]/80 backdrop-blur-xl border border-white/10 rounded-2xl px-8 py-5 hover:border-white/20 transition-all"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                      <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.56c-.21 2.27-1.13 7.75-1.6 10.29-.2 1.08-.58 1.44-.96 1.47-.81.07-1.43-.54-2.22-1.06-1.23-.82-1.93-1.33-3.12-2.13-1.38-.93-.49-1.44.3-2.27.21-.22 3.82-3.5 3.89-3.8.01-.04.01-.19-.07-.27-.09-.08-.22-.05-.32-.03-.13.03-2.24 1.42-6.32 4.18-.6.41-1.14.61-1.63.6-.54-.01-1.57-.3-2.34-.55-.94-.31-1.69-.47-1.62-.99.03-.28.41-.57 1.13-.87 4.44-1.94 7.4-3.22 8.88-3.84 4.23-1.77 5.1-2.08 5.68-2.09.13 0 .4.03.58.17.15.12.19.28.21.44-.01.12.01.3 0 .46z"/>
                      </svg>
                    </div>
                    <div className="text-left">
                      <h3 className="text-white font-semibold text-lg">Try Telegram Bot</h3>
                      <p className="text-gray-400 text-sm">@openmind1_bot</p>
                    </div>
                  </Link>
                </div>
                
                {/* OR Divider */}
                <div className="flex items-center">
                  <span className="text-gray-500 text-sm font-medium">OR</span>
                </div>
                
                {/* QR Code */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                  <div className="relative bg-[#1A1A1A]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all">
                    <div className="w-40 h-40 bg-white rounded-xl p-2 mb-3 overflow-hidden">
                      <img 
                        src="/telegram-qr.png" 
                        alt="Telegram Bot QR Code"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-gray-400 text-sm text-center">Scan to open bot</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 lg:px-12 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="group relative">
                <div className={`absolute -inset-0.5 bg-gradient-to-r ${feature.color} opacity-0 group-hover:opacity-100 blur-lg transition duration-500`} />
                <div className="relative bg-[#1A1A1A]/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 h-full hover:border-white/20 transition-all">
                  <div className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center mb-4 text-white`}>{feature.icon}</div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 lg:px-12 py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-500 text-sm">Built with Next.js, BullMQ, and yt-dlp • Max file size: 50MB</p>
        </div>
      </footer>
    </main>
  )
}
