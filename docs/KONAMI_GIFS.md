# Konami Code GIF Easter Egg - Testing & Maintenance Guide

## Overview

The Konami code Easter egg displays a Team America themed overlay with 24 randomly selected GIFs from a pool of 50, arranged in a collage around a center image with an animated quote.

## How to Trigger the Easter Egg

### Desktop (Keyboard)
Enter the classic Konami code sequence:
```
↑ ↑ ↓ ↓ ← → ← → B A
```

Use the arrow keys followed by the B and A keys on your keyboard.

### Mobile (Touch Gestures)
Perform the following gesture sequence:
```
Swipe Up (2x)
Swipe Down (2x)
Swipe Left
Swipe Right
Swipe Left
Swipe Right
Tap (2x)
```

**Note**: Mobile gestures have a 5-second timeout between inputs. A progress indicator will appear in the bottom-right corner showing your progress.

## Expected Behavior

When successfully triggered:

1. **Sound Effect**: A short triumphant beep plays (Web Audio API)
2. **Overlay Appears**: A dark overlay covers the screen with:
   - Center image (`bftb.png`) with golden glow
   - Random Team America quote with patriotic styling
   - Achievement counter showing how many times you've triggered it
   - Close button (golden circle with ×)
3. **GIF Collage**: 24 GIFs positioned around the edges:
   - 6 on top
   - 6 on right
   - 6 on bottom
   - 6 on left
4. **Animations**:
   - Overlay fades in
   - Center image pops with bounce effect
   - Quote bounces in
   - Achievement badge slides in
   - GIFs fade in with staggered cascade effect (50ms delay each)
   - GIFs float gently with rotation

## Closing the Overlay

- Click the golden **×** button in the top-right
- Click on the dark background (not on GIFs or center content)
- Press **Escape** key

## Testing Checklist

### Visual Testing

- [ ] Overlay appears correctly on desktop
- [ ] Overlay appears correctly on mobile
- [ ] Center image (`bftb.png`) loads and displays
- [ ] Random quote appears with correct styling
- [ ] Achievement counter shows correct count
- [ ] Close button is visible and properly positioned
- [ ] GIF collage is arranged correctly (24 GIFs around edges)
- [ ] Animations are smooth and complete

### Functionality Testing

- [ ] Desktop: Konami code sequence triggers overlay
- [ ] Desktop: Wrong key press resets sequence
- [ ] Desktop: Can start sequence again after reset
- [ ] Mobile: Touch gestures trigger overlay
- [ ] Mobile: Progress indicator shows during sequence
- [ ] Mobile: Incorrect gesture resets sequence
- [ ] Sound effect plays on trigger (if browser supports Web Audio)
- [ ] Close button closes overlay
- [ ] Clicking background closes overlay
- [ ] Escape key closes overlay
- [ ] Achievement counter increments on each trigger
- [ ] Achievement count persists across page reloads (localStorage)

### GIF Loading Testing

- [ ] GIFs load without errors in Network tab
- [ ] Failed GIF loads show fallback image instead of broken image
- [ ] No more than 6 GIFs load concurrently (check Network waterfall)
- [ ] Console shows warnings for any failed GIF loads
- [ ] Fallback image (`/assets/images/gif-fallback.svg`) loads when GIFs missing

### Browser DevTools Verification

#### Network Tab
1. Open DevTools (F12) → Network tab
2. Trigger the Konami code
3. Verify:
   - `bftb.png` loads successfully (200 status)
   - GIF requests show correct paths (e.g., `/assets/gifs/america-01.gif`)
   - Fallback image loads when GIFs are missing (200 or 404)
   - No external CDN requests to Giphy or other domains
   - Maximum 6 concurrent GIF requests at a time

#### Console Tab
1. Open DevTools (F12) → Console tab
2. Trigger the Konami code
3. Verify:
   - No JavaScript errors
   - Warning messages for missing GIFs (expected until GIFs are added)
   - Warning format: `Failed to load GIF: /assets/gifs/america-XX.gif`

#### Performance
1. Open DevTools → Performance tab
2. Start recording
3. Trigger Konami code
4. Stop recording after overlay appears
5. Verify:
   - Overlay renders within 300ms
   - No layout thrashing
   - Animations are smooth (60fps)
   - Memory usage is reasonable

### GitHub Pages Deployment Verification

After deployment to GitHub Pages:

1. **Check Asset URLs**:
   ```
   https://studywithjesus.github.io/assets/gifs/america-01.gif
   https://studywithjesus.github.io/assets/gifs/america-02.gif
   ... (test a few)
   https://studywithjesus.github.io/assets/images/gif-fallback.svg
   https://studywithjesus.github.io/bftb.png
   ```

2. **Verify Response Codes**:
   - If GIFs exist: Should return **200 OK**
   - If GIFs missing: Should return **404 Not Found** (fallback will handle)
   - Fallback image: Should return **200 OK**
   - Center image: Should return **200 OK**

3. **Test from Subpages**:
   - Navigate to a page in a subdirectory (e.g., `/pages/exam.html`)
   - Trigger Konami code
   - Verify all assets load with absolute paths from root

## Implementation Details

### File Locations

- **Main Script**: `/script.js` (lines 1408-2040)
- **GIF Assets**: `/assets/gifs/america-{01-50}.gif`
- **Fallback Image**: `/assets/images/gif-fallback.svg`
- **Center Image**: `/bftb.png` (root directory)
- **Documentation**: `/docs/KONAMI_GIFS.md` (this file)

### Key Features

1. **Absolute Paths**: All asset paths use absolute URLs from root (e.g., `/assets/gifs/...`)
   - Works correctly from any subdirectory
   - Prevents issues with relative path resolution

2. **Concurrency Control**: Maximum 6 GIFs load simultaneously
   - Uses Promise-based queue with `loadGifWithConcurrency()`
   - Prevents browser from being overwhelmed
   - Improves perceived performance

3. **Error Handling**: Robust fallback mechanism
   - `img.onerror` handler catches failed loads
   - Automatically switches to fallback image
   - Logs warnings for debugging
   - Hides element if fallback also fails

4. **Lazy Loading**: GIFs use `loading="lazy"` attribute
   - Offscreen GIFs load as needed
   - Reduces initial bandwidth usage
   - Browser-native optimization

5. **Mobile Support**: Touch gesture detection
   - Swipe detection with configurable thresholds
   - Tap detection for final inputs
   - Visual progress indicator
   - 5-second timeout between gestures

## Troubleshooting

### GIFs Show "THIS CONTENT IS NOT AVAILABLE"

**Cause**: External Giphy CDN URLs were being used and are blocked/unavailable.

**Solution**: Code has been updated to use local assets. If you see this:
1. Check if GIF files exist in `/assets/gifs/`
2. Verify file permissions allow reading
3. Check browser console for 404 errors
4. Ensure GitHub Pages deployment includes the assets

### GIFs Not Loading

1. **Check file paths**: Open DevTools Network tab, verify paths are absolute from root
2. **Check file names**: Ensure files are named `america-01.gif` through `america-50.gif`
3. **Check file format**: Verify files are valid GIF format
4. **Check CORS**: If loading from CDN, verify CORS headers allow loading
5. **Check console**: Look for error messages or warnings

### Overlay Doesn't Appear

1. **Verify sequence**: Make sure you're entering the exact Konami code sequence
2. **Check console**: Look for JavaScript errors
3. **Test keyboard**: Ensure keyboard events are firing (not blocked by other scripts)
4. **Check mobile**: On mobile, verify touch events aren't being prevented

### Performance Issues

1. **Reduce GIF count**: Currently shows 24 of 50 - could reduce to 16 or 12
2. **Optimize GIF sizes**: Compress GIFs, reduce frame count, or use smaller dimensions
3. **Convert to video**: Consider using mp4/webm for better compression
4. **Increase concurrency limit**: Adjust from 6 to 3 if experiencing issues

## Future Improvements

### Potential Enhancements

- [ ] Add loading spinner while GIFs are loading
- [ ] Add progressive enhancement for low-bandwidth connections
- [ ] Cache loaded GIFs in memory for repeat triggers
- [ ] Add option to disable GIF animations (accessibility)
- [ ] Add keyboard shortcuts to cycle through quotes
- [ ] Add Easter egg counter leaderboard
- [ ] Add sound toggle button
- [ ] Support custom GIF sets via configuration

### Performance Optimizations

- [ ] Convert GIFs to optimized mp4/webm with poster frames
- [ ] Implement service worker caching for assets
- [ ] Add prefetch hints for critical assets
- [ ] Use intersection observer for more intelligent lazy loading
- [ ] Implement virtual scrolling for very large GIF sets

## Maintenance Notes

### Adding New GIFs

1. Resize to 120x120px (or similar)
2. Optimize file size (target: under 500KB)
3. Name sequentially: `america-{number}.gif`
4. Update pool size in code if changing from 50

### Updating Quotes

Edit the `teamAmericaQuotes` array in `script.js` (line 1436):
```javascript
const teamAmericaQuotes = [
  "Your quote here",
  // ... add more
];
```

### Changing Layout

Modify the `positions` array in `createCollageGifs()` function (line 1940):
```javascript
const positions = [
  { top: '5%', left: '15%' },
  // ... adjust positions
];
```

## Related Files

- `/script.js` - Main Konami code implementation
- `/assets/gifs/README.md` - GIF asset directory documentation
- `/assets/images/gif-fallback.svg` - Fallback image for missing GIFs
- `/bftb.png` - Center eagle image
- `.gitignore` - Should NOT include assets/gifs or assets/images

## Support

For issues or questions:
1. Check browser console for errors
2. Verify all assets are deployed to GitHub Pages
3. Test in multiple browsers (Chrome, Firefox, Safari, Edge)
4. Check mobile vs desktop behavior separately
5. Review this documentation for common issues
