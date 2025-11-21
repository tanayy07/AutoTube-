# YouTube Cookies Guide

This guide explains how to extract YouTube cookies from your browser to access higher quality videos and bypass restrictions.

## Why Use Cookies?

- Access 1080p, 1440p, and 4K videos
- Bypass regional restrictions
- Access age-restricted content
- Get member-only videos (if you're a member)

## Method 1: Using Browser Extension (Recommended)

1. Install the "Get cookies.txt" extension:
   - [Chrome](https://chrome.google.com/webstore/detail/get-cookiestxt/bgaddhkoddajcdgocldbbfleckgcbcid)
   - [Firefox](https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/)

2. Log in to YouTube in your browser

3. Click the extension icon and select "Export cookies.txt"

4. Save the file as `cookies.txt` in your project root directory

## Method 2: Using yt-dlp (Built-in)

Run this command to extract cookies directly:

```bash
yt-dlp --cookies-from-browser chrome --cookies cookies.txt https://www.youtube.com
```

Replace `chrome` with your browser: `firefox`, `edge`, `safari`, etc.

## Method 3: Manual Export (Advanced)

1. Open YouTube and log in
2. Press F12 to open Developer Tools
3. Go to Application/Storage → Cookies
4. Export cookies in Netscape format

## Security Notes

⚠️ **IMPORTANT**: Your cookies file contains sensitive login information!

- Never share your cookies.txt file
- Add `cookies.txt` to your `.gitignore`
- Regenerate cookies periodically
- Use separate YouTube account for downloading

## Using Cookies in the App

Once you have the cookies.txt file in your project root:

1. The advanced download endpoint will automatically detect it
2. Enable "Use Cookies" option in the UI
3. Enjoy access to all video qualities!

## Troubleshooting

- **"Cookies file not found"**: Make sure cookies.txt is in the project root
- **"Still can't access high quality"**: Your cookies might be expired, regenerate them
- **"403 Forbidden errors"**: YouTube detected automated access, wait a few hours
