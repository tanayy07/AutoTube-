'use client';

import React, { useState, useEffect, useRef } from 'react';

interface TimestampSelectorProps {
  startTime: string;
  endTime: string;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  videoDuration?: number; // in seconds
}

export default function TimestampSelector({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  videoDuration = 0
}: TimestampSelectorProps) {
  const [startError, setStartError] = useState('');
  const [endError, setEndError] = useState('');
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Format time input as user types
  const formatTimeInput = (value: string): string => {
    // Remove all non-numeric characters except colons
    let cleaned = value.replace(/[^\d:]/g, '');
    
    // Remove multiple consecutive colons
    cleaned = cleaned.replace(/:{2,}/g, ':');
    
    // Split by colon
    const parts = cleaned.split(':');
    
    // Limit to 3 parts (HH:MM:SS)
    const limitedParts = parts.slice(0, 3);
    
    // Format each part
    const formatted = limitedParts.map((part, index) => {
      if (index === 0 && limitedParts.length === 1) {
        // First part when alone - allow up to 3 digits for hours
        return part.slice(0, 3);
      } else {
        // Minutes and seconds - max 2 digits
        return part.slice(0, 2);
      }
    });
    
    return formatted.join(':');
  };

  // Convert time string to seconds
  const timeToSeconds = (time: string): number => {
    if (!time) return 0;
    const parts = time.split(':').reverse();
    let seconds = 0;
    for (let i = 0; i < parts.length; i++) {
      const val = parseInt(parts[i]) || 0;
      seconds += val * Math.pow(60, i);
    }
    return seconds;
  };

  // Convert seconds to time string
  const secondsToTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  // Validate time format
  const validateTime = (time: string): boolean => {
    if (!time) return true; // Empty is valid
    const parts = time.split(':');
    
    if (parts.length > 3) return false;
    
    for (let i = 0; i < parts.length; i++) {
      const num = parseInt(parts[i]);
      if (isNaN(num)) return false;
      
      // Check ranges
      if (i === parts.length - 1 && num >= 60) return false; // seconds
      if (i === parts.length - 2 && parts.length > 1 && num >= 60) return false; // minutes
    }
    
    return true;
  };

  // Validate start and end times
  useEffect(() => {
    setStartError('');
    setEndError('');
    
    if (startTime && !validateTime(startTime)) {
      setStartError('Invalid format — use MM:SS or HH:MM:SS');
    }
    
    if (endTime && !validateTime(endTime)) {
      setEndError('Invalid format — use MM:SS or HH:MM:SS');
    }
    
    if (startTime && endTime && validateTime(startTime) && validateTime(endTime)) {
      const startSec = timeToSeconds(startTime);
      const endSec = timeToSeconds(endTime);
      
      if (endSec <= startSec) {
        setEndError('End time must be after start time');
      }
      
      if (videoDuration > 0) {
        if (startSec > videoDuration) {
          setStartError('Start time exceeds video duration');
        }
        if (endSec > videoDuration) {
          setEndError('End time exceeds video duration');
        }
      }
    }
  }, [startTime, endTime, videoDuration]);

  // Handle time input change
  const handleTimeChange = (value: string, type: 'start' | 'end') => {
    const formatted = formatTimeInput(value);
    if (type === 'start') {
      onStartTimeChange(formatted);
    } else {
      onEndTimeChange(formatted);
    }
  };

  // Adjust time by seconds
  const adjustTime = (type: 'start' | 'end', seconds: number) => {
    const currentTime = type === 'start' ? startTime : endTime;
    const currentSeconds = timeToSeconds(currentTime);
    const newSeconds = Math.max(0, currentSeconds + seconds);
    const newTime = secondsToTime(newSeconds);
    
    if (type === 'start') {
      onStartTimeChange(newTime);
    } else {
      onEndTimeChange(newTime);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, type: 'start' | 'end') => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      adjustTime(type, -1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      adjustTime(type, 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      adjustTime(type, 10);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      adjustTime(type, -10);
    }
  };

  // Timeline drag handling
  const handleTimelineDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !timelineRef.current || !videoDuration) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const percentage = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
    const seconds = Math.floor(percentage * videoDuration);
    const time = secondsToTime(seconds);
    
    if (isDragging === 'start') {
      onStartTimeChange(time);
    } else {
      onEndTimeChange(time);
    }
  };

  // Calculate timeline positions
  const startPosition = videoDuration > 0 ? (timeToSeconds(startTime) / videoDuration) * 100 : 0;
  const endPosition = videoDuration > 0 ? (timeToSeconds(endTime) / videoDuration) * 100 : 100;

  return (
    <div className="space-y-4">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-gray-500">Quick start:</span>
        {['0:00', '0:30', '1:00', '2:00'].map((preset) => (
          <button
            key={preset}
            onClick={() => onStartTimeChange(preset)}
            className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
            type="button"
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Time inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Start time */}
        <div>
          <label htmlFor="start-time" className="block text-sm font-medium text-gray-300 mb-2">
            Start Time
          </label>
          <div className="relative">
            <input
              id="start-time"
              type="text"
              value={startTime}
              onChange={(e) => handleTimeChange(e.target.value, 'start')}
              onKeyDown={(e) => handleKeyDown(e, 'start')}
              placeholder="0:00"
              inputMode="numeric"
              pattern="[0-9:]*"
              className={`w-full bg-gray-900 border ${
                startError ? 'border-red-500' : 'border-gray-700 focus:border-blue-500'
              } rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all`}
              aria-label="Start time in format MM:SS or HH:MM:SS"
              aria-invalid={!!startError}
              aria-describedby={startError ? 'start-error' : 'time-format-hint'}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <button
                onClick={() => adjustTime('start', -5)}
                className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                type="button"
                aria-label="Decrease start time by 5 seconds"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => adjustTime('start', 5)}
                className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                type="button"
                aria-label="Increase start time by 5 seconds"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          {startError && (
            <p id="start-error" className="mt-1 text-xs text-red-400" role="alert">
              {startError}
            </p>
          )}
        </div>

        {/* End time */}
        <div>
          <label htmlFor="end-time" className="block text-sm font-medium text-gray-300 mb-2">
            End Time
          </label>
          <div className="relative">
            <input
              id="end-time"
              type="text"
              value={endTime}
              onChange={(e) => handleTimeChange(e.target.value, 'end')}
              onKeyDown={(e) => handleKeyDown(e, 'end')}
              placeholder="1:30"
              inputMode="numeric"
              pattern="[0-9:]*"
              className={`w-full bg-gray-900 border ${
                endError ? 'border-red-500' : 'border-gray-700 focus:border-blue-500'
              } rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all`}
              aria-label="End time in format MM:SS or HH:MM:SS"
              aria-invalid={!!endError}
              aria-describedby={endError ? 'end-error' : 'time-format-hint'}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <button
                onClick={() => adjustTime('end', -5)}
                className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                type="button"
                aria-label="Decrease end time by 5 seconds"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => adjustTime('end', 5)}
                className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                type="button"
                aria-label="Increase end time by 5 seconds"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          {endError && (
            <p id="end-error" className="mt-1 text-xs text-red-400" role="alert">
              {endError}
            </p>
          )}
        </div>
      </div>

      {/* Format hint */}
      <p id="time-format-hint" className="text-xs text-gray-500 text-center">
        Format: MM:SS or HH:MM:SS • Use arrow keys: ←→ ±1s, ↑↓ ±10s
      </p>

      {/* Visual timeline (if video duration is known) */}
      {videoDuration > 0 && (
        <div className="mt-6">
          <div className="text-xs text-gray-500 mb-2">Timeline</div>
          <div
            ref={timelineRef}
            className="relative h-12 bg-gray-800 rounded-lg overflow-hidden cursor-pointer"
            onMouseMove={handleTimelineDrag}
            onTouchMove={handleTimelineDrag}
            onMouseUp={() => setIsDragging(null)}
            onTouchEnd={() => setIsDragging(null)}
            onMouseLeave={() => setIsDragging(null)}
          >
            {/* Selected range */}
            <div
              className="absolute top-0 bottom-0 bg-blue-500/30"
              style={{
                left: `${startPosition}%`,
                width: `${endPosition - startPosition}%`
              }}
            />
            
            {/* Start marker */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-blue-500 cursor-ew-resize group"
              style={{ left: `${startPosition}%` }}
              onMouseDown={() => setIsDragging('start')}
              onTouchStart={() => setIsDragging('start')}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-900 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {startTime || '0:00'}
              </div>
            </div>
            
            {/* End marker */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-blue-500 cursor-ew-resize group"
              style={{ left: `${endPosition}%` }}
              onMouseDown={() => setIsDragging('end')}
              onTouchStart={() => setIsDragging('end')}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-900 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {endTime || secondsToTime(videoDuration)}
              </div>
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0:00</span>
            <span>{secondsToTime(videoDuration)}</span>
          </div>
        </div>
      )}

      {/* No-JS fallback */}
      <noscript>
        <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-gray-800 rounded-lg">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Start (minutes)</label>
            <input type="number" name="start_minutes" min="0" className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Start (seconds)</label>
            <input type="number" name="start_seconds" min="0" max="59" className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">End (minutes)</label>
            <input type="number" name="end_minutes" min="0" className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">End (seconds)</label>
            <input type="number" name="end_seconds" min="0" max="59" className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2" />
          </div>
        </div>
      </noscript>
    </div>
  );
}
