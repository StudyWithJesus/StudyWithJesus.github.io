# Team America GIFs for Konami Code Easter Egg

This directory should contain 50 GIF files related to Team America: World Police for the Konami code Easter egg overlay.

## Expected Files

The following GIF files are referenced by the Konami code implementation in `script.js`:

1. `america-01.gif` through `america-50.gif`

## File Specifications

- **Format**: GIF (animated or static)
- **Recommended Size**: 120x120 pixels (or similar square aspect ratio)
- **File Naming**: `america-{01-50}.gif` (zero-padded numbers)
- **Max File Size**: Keep under 500KB each for optimal loading performance

## Current Status

⚠️ **Missing Assets**: The GIF files are currently not present in this repository.

The Konami code implementation has been updated to:
1. Use local file paths (`/assets/gifs/america-XX.gif`)
2. Implement graceful fallback to `/assets/images/gif-fallback.svg` when files are missing
3. Use concurrency-limited loading (max 6 concurrent loads)
4. Handle mobile browsers properly

## Adding GIF Files

To add the GIF files:

1. Obtain 50 appropriate GIF images (Team America themed or patriotic)
2. Resize them to approximately 120x120 pixels
3. Name them `america-01.gif` through `america-50.gif`
4. Place them in this directory
5. Commit and push to the repository

## Fallback Behavior

When GIF files are missing or fail to load:
- The overlay will display a fallback image (`/assets/images/gif-fallback.svg`)
- A console warning will be logged for debugging
- The Easter egg will still function normally with the center image and quote

## Testing

See `docs/KONAMI_GIFS.md` for testing and reproduction steps.
