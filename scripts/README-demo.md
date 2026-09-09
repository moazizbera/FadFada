# FadFada Demo Video — Setup & Run Guide

## Prerequisites

- Node.js 22+
- Playwright browsers installed (Chromium)

## Quick Start

```bash
# 1. Install Playwright browsers (if not already installed)
npx playwright install chromium

# 2. Run the automation script
npx tsx scripts/demo-video.ts

# 3. The browser will open and run through the demo flow automatically
#    - Video is recorded automatically by Playwright
#    - Screenshots are saved to scripts/demo-output/

# 4. When the script finishes, close the browser to finalize the video
```

## Output

After running, check `scripts/demo-output/`:

- `*.webm` — Recorded video (Playwright format)
- `*.png` — Screenshots from each scene

### Convert WebM to MP4 (for editing)

```bash
# Using FFmpeg
ffmpeg -i scripts/demo-output/recording.webm -c:v libx264 -crf 23 scripts/demo-output/fadfada-demo.mp4
```

## Recording with OBS (alternative)

If you prefer OBS for higher quality recording:

```bash
# Run in headed mode (default) — browser appears on screen
npx tsx scripts/demo-video.ts

# In OBS:
# 1. Add "Window Capture" source
# 2. Select the Chromium window
# 3. Record at 1920x1080 or 1280x800
# 4. Start recording before running the script
```

## Narration

See `docs/narration.md` for the full voiceover script with timestamps.

### Recording narration:

1. Open `docs/narration.md`
2. Record each scene's narration separately
3. Match timing to the on-screen action
4. Use a calm, warm tone (not salesy)
5. Tools: ElevenLabs, Murf.ai, or any recording software

### Combining video + narration:

```bash
# Using FFmpeg to merge
ffmpeg -i demo.mp4 -i narration.mp3 -c:v copy -c:a aac final-demo.mp4
```

## Customization

### Change viewport size:

Edit the `browser.newContext()` call in `demo-video.ts`:

```typescript
// Desktop (default)
viewport: { width: 1280, height: 800 }

// Mobile
viewport: { width: 390, height: 844 }

// Full HD
viewport: { width: 1920, height: 1080 }
```

### Change timing:

Adjust the `WAIT` object at the top of the script:

```typescript
const WAIT = {
  short: 800,     // Quick pauses
  medium: 1500,   // Scene transitions
  long: 2500,     // Loading waits
  scene: 3500,    // Scene opening pauses
  response: 6000, // AI response waits
  typing: 12000,  // Full typewriter animation
};
```

### Change demo messages:

Edit the `DEMO_MESSAGES` array:

```typescript
const DEMO_MESSAGES = [
  "Your custom first message",
  "Your custom second message",
];
```

## Troubleshooting

### "Browser not found"
```bash
npx playwright install chromium
```

### "Timeout waiting for selector"
The app may have loaded differently. Check that the live URL is accessible:
```bash
Invoke-WebRequest -Uri "https://fad-fada.vercel.app" -UseBasicParsing
```

### Video is black/empty
Make sure you close the browser window properly (don't kill the process) — this finalizes the video file.
