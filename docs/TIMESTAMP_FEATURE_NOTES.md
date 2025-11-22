# Timestamp Feature Implementation Notes

## Overview
The improved timestamp selector provides a user-friendly interface for selecting video trim points with robust validation, keyboard controls, and mobile optimization.

## Features Implemented

### 1. Input Validation
- **Auto-formatting**: Only allows numbers and colons, automatically formats as MM:SS or HH:MM:SS
- **Real-time validation**: Shows inline errors for invalid formats
- **Range validation**: Ensures end time is after start time
- **Duration validation**: Checks against video duration (when available)

### 2. Convenience Features
- **Preset buttons**: Quick selection for common start times (0:00, 0:30, 1:00, 2:00)
- **Adjust buttons**: ±5 seconds with single click
- **Keyboard controls**:
  - Arrow Left/Right: ±1 second
  - Arrow Up/Down: ±10 seconds
- **Visual timeline**: Draggable markers for visual selection (when video duration is known)

### 3. Mobile Optimization
- **Numeric keyboard**: `inputmode="numeric"` triggers number pad on mobile
- **Large tap targets**: 44px minimum for all interactive elements
- **Responsive layout**: Stacks inputs vertically on small screens

### 4. Accessibility
- **ARIA labels**: Clear descriptions for screen readers
- **Keyboard navigation**: Full functionality without mouse
- **Error announcements**: `role="alert"` for dynamic error messages
- **No-JS fallback**: Basic numeric inputs when JavaScript is disabled

## Integration with Backend

### 1. FFmpeg Command Construction
```typescript
// In download routes
if (startTime || endTime) {
  const args = ['-i', inputPath];
  
  // Start time (seek before input for efficiency)
  if (startTime) {
    args.push('-ss', startTime);
  }
  
  // Duration or end time
  if (endTime && startTime) {
    const duration = calculateDuration(startTime, endTime);
    args.push('-t', duration);
  } else if (endTime) {
    args.push('-to', endTime);
  }
  
  // Copy codecs for fast trimming
  args.push('-c', 'copy', outputPath);
}
```

### 2. Video Duration Retrieval
To enable the visual timeline, fetch video duration from yt-dlp:
```typescript
// Add to download routes
const metadata = await getVideoMetadata(url);
const videoDuration = metadata.duration; // in seconds

// Pass to frontend
return { videoDuration, ... };
```

### 3. Limitations & Considerations

#### Video Length
- **Maximum supported**: Up to 999:59:59 (999 hours)
- **Precision**: Millisecond precision supported by ffmpeg
- **Memory usage**: Longer videos may require streaming approach

#### Performance
- **Codec copy**: Using `-c copy` is fast but may have frame accuracy issues
- **Re-encoding**: More accurate but slower, use when precision is critical
- **Keyframe alignment**: Cuts may shift to nearest keyframe with codec copy

#### Validation
- Server-side validation should mirror client-side rules
- Check that trim duration doesn't exceed video length
- Sanitize time inputs to prevent command injection

## Usage Examples

### Basic Trim (30 seconds from middle)
```
Start: 1:00
End: 1:30
FFmpeg: -ss 1:00 -t 0:30
```

### From Beginning
```
Start: (empty)
End: 0:45
FFmpeg: -to 0:45
```

### To End
```
Start: 2:30
End: (empty)
FFmpeg: -ss 2:30
```

### Precise Cut (with re-encoding)
```
Start: 1:23.500
End: 2:45.750
FFmpeg: -ss 1:23.500 -t 1:22.250 -c:v libx264 -c:a aac
```

## Future Enhancements

1. **Thumbnail Preview**: Show video frames at trim points
2. **Waveform Display**: Audio visualization for precise cuts
3. **Multi-segment**: Support multiple trim segments in one download
4. **Frame-accurate mode**: Toggle between fast (codec copy) and precise (re-encode)
5. **Bookmark system**: Save frequently used trim points

## Testing Checklist

- [ ] Valid time formats accepted (MM:SS, HH:MM:SS)
- [ ] Invalid characters blocked
- [ ] Keyboard navigation works
- [ ] Mobile numeric keyboard appears
- [ ] Timeline drag works on touch devices
- [ ] Errors display correctly
- [ ] No-JS fallback renders
- [ ] FFmpeg commands execute correctly
- [ ] Trimmed videos play properly
- [ ] Edge cases handled (0:00, end of video, etc.)
