# Meme Videos/GIFs for Konami Code Easter Egg

This directory contains 712 media files (videos and GIFs) from the Dominicentek/my-meme-folder repository for the Konami code Easter egg overlay.

## Expected Files

The following media files are referenced by the Konami code implementation in `script.js`:

1. `america-001.mp4` through `america-712.mp4` (mostly MP4 videos, with one GIF)

## File Specifications

- **Format**: MP4 video (primary), GIF (fallback)
- **Recommended Size**: 120x120 pixels on desktop, 80x80 on mobile (scaled via CSS)
- **File Naming**: `america-{001-712}.mp4` or `.gif` (zero-padded 3-digit numbers)
- **Source**: https://github.com/Dominicentek/my-meme-folder

## Current Status

✅ **Assets Present**: All 712 media files from Dominicentek/my-meme-folder are now included.

The Konami code implementation:
1. Uses local file paths (`/assets/gifs/america-XXX.mp4`)
2. Implements graceful fallback to GIF if MP4 fails, then to `/assets/images/gif-fallback.svg`
3. Uses HTML5 video elements with autoplay, loop, and muted attributes
4. Uses concurrency-limited loading (max 6 concurrent loads)
5. Handles mobile browsers properly
6. Randomly selects 24 out of 712 videos to display in the collage

## Video Playback

Videos are configured to:
- Autoplay on load (muted to comply with browser policies)
- Loop continuously
- Play inline on mobile devices
- Scale to fit the container with object-fit: cover

## Fallback Behavior

When media files fail to load:
- MP4 videos first try the .gif equivalent
- If that also fails, display a fallback image (`/assets/images/gif-fallback.svg`)
- Errors are handled silently to avoid console noise
- The Easter egg will still function normally with the center image and quote

## Testing

To trigger the Easter egg:
- Desktop: Press ↑ ↑ ↓ ↓ ← → ← → B A
- Mobile: Swipe up, up, down, down, left, right, left, right, then tap twice
