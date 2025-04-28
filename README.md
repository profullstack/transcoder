# @profullstack/transcoder

A lightweight Node.js module for transcoding videos to web-friendly MP4 format using FFmpeg. This module is designed for server-side use and ensures compatibility with all modern browsers including Safari, Chrome, and Firefox on both desktop and mobile devices.

## Features

- Transcodes any video format to web-friendly MP4 (H.264/AAC)
- Ensures compatibility across all modern browsers
- Modern ESM (ECMAScript Modules) implementation
- Async/await API with real-time progress reporting
- Event-based progress tracking
- Customizable encoding options
- Smart Presets for popular platforms (Instagram, YouTube, Twitter, etc.)
- No file storage - just passes through to FFmpeg
- Lightweight with minimal dependencies

## Prerequisites

This module requires FFmpeg to be installed on your system. You can download it from [ffmpeg.org](https://ffmpeg.org/download.html) or install it using your system's package manager.

### Installing FFmpeg

The package includes a script to automatically install FFmpeg on various operating systems:

```bash
# Using npm
npm run install-ffmpeg

# Using yarn
yarn install-ffmpeg

# Using pnpm
pnpm install-ffmpeg

# Or directly
./bin/build-ffmpeg.sh
```

The script supports:
- **macOS** (using Homebrew)
- **Ubuntu/Debian** (using apt)
- **Arch Linux** (using pacman)
- **Windows** (using Chocolatey or Scoop)

If you prefer to install FFmpeg manually:

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**macOS (using Homebrew):**
```bash
brew install ffmpeg
```

**Windows (using Scoop - recommended):**
```bash
# Install Scoop if not already installed
iwr -useb get.scoop.sh | iex

# Install FFmpeg
scoop install ffmpeg
```

**Windows (using Chocolatey):**
```bash
choco install ffmpeg
```

**Arch Linux:**
```bash
sudo pacman -S ffmpeg
```

## Installation

```bash
npm install @profullstack/transcoder
# or
yarn add @profullstack/transcoder
# or
pnpm add @profullstack/transcoder
```

## Usage

### Basic Usage with Async/Await

```javascript
import { transcode } from '@profullstack/transcoder';

async function transcodeVideo() {
  try {
    const { outputPath, emitter } = await transcode('input.mov', 'output.mp4');
    
    // Listen for progress events
    emitter.on('progress', (progress) => {
      console.log(`Progress: ${JSON.stringify(progress)}`);
      // Example output: {"frame":120,"fps":30,"time":4.5,"bitrate":1500,"size":1024000,"speed":2.5}
    });
    
    console.log('Transcoding completed successfully:', outputPath);
  } catch (error) {
    console.error('Transcoding failed:', error.message);
  }
}

transcodeVideo();
```

### With Custom Options

```javascript
import { transcode } from '@profullstack/transcoder';

async function transcodeWithOptions() {
  try {
    const options = {
      videoCodec: 'libx264',
      audioBitrate: '192k',
      videoBitrate: '2500k',
      width: 1280,
      height: 720,
      fps: 30,
      preset: 'slow',  // Higher quality but slower encoding
      overwrite: true  // Overwrite existing file if it exists
    };
    
    const { outputPath, emitter } = await transcode('input.mov', 'output.mp4', options);
    
    // Create a progress bar
    emitter.on('progress', (progress) => {
      if (progress.time) {
        const percent = Math.min(100, Math.round((progress.time / 60) * 100)); // Assuming 1-minute video
        const barLength = 30;
        const filledLength = Math.round(barLength * percent / 100);
        const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
        
        process.stdout.write(`\r[${bar}] ${percent}% | ${progress.fps || 0} fps | ${progress.bitrate || 0} kbps`);
      }
    });
    
    console.log('\nTranscoding completed successfully:', outputPath);
  } catch (error) {
    console.error('Transcoding failed:', error.message);
  }
}

transcodeWithOptions();
```

### Using Smart Presets

The module includes pre-configured settings optimized for specific platforms and use cases:

```javascript
import { transcode } from '@profullstack/transcoder';

// Transcode for Instagram (square format 1080x1080)
await transcode('input.mp4', 'instagram-output.mp4', { preset: 'instagram' });

// Transcode for YouTube HD (1920x1080)
await transcode('input.mp4', 'youtube-output.mp4', { preset: 'youtube-hd' });

// Transcode for Twitter with custom overrides
await transcode('input.mp4', 'twitter-output.mp4', {
  preset: 'twitter',
  videoBitrate: '6000k' // Override the preset's videoBitrate
});
```

Available presets:

| Preset | Description | Resolution | Optimized For |
|--------|-------------|------------|---------------|
| `instagram` | Square format | 1080x1080 | Instagram feed |
| `instagram-stories` | Vertical format | 1080x1920 | Instagram stories |
| `youtube-hd` | HD format | 1920x1080 | YouTube |
| `youtube-4k` | 4K format | 3840x2160 | YouTube |
| `twitter` | HD format | 1280x720 | Twitter |
| `facebook` | HD format | 1280x720 | Facebook |
| `tiktok` | Vertical format | 1080x1920 | TikTok |
| `vimeo-hd` | HD format | 1920x1080 | Vimeo |
| `web` | Optimized for web | 1280x720 | Web playback |
| `mobile` | Optimized for mobile | 640x360 | Mobile devices |

You can also override any preset setting by providing your own options:

```javascript
// Use YouTube HD preset but with a higher bitrate
await transcode('input.mp4', 'output.mp4', {
  preset: 'youtube-hd',
  videoBitrate: '15000k'
});
```

## API Reference

### transcode(inputPath, outputPath, [options])

Transcodes a video file to web-friendly MP4 format.

**Parameters:**

- `inputPath` (string): Path to the input video file
- `outputPath` (string): Path where the transcoded video will be saved
- `options` (object, optional): Transcoding options or preset name
  - Can include a `preset` property with one of the predefined platform presets

**Returns:**

- Promise that resolves with an object containing:
  - `outputPath` (string): Path to the transcoded video
  - `emitter` (TranscodeEmitter): Event emitter for progress tracking

### TranscodeEmitter Events

The emitter returned by the transcode function emits the following events:

- `start`: Emitted when the transcoding process starts
  - Payload: `{ command: string, args: string[] }`
- `progress`: Emitted when FFmpeg reports progress
  - Payload: `{ frame: number, fps: number, time: number, bitrate: number, size: number, speed: number }`
- `log`: Emitted for each line of FFmpeg output
  - Payload: `string`

### DEFAULT_OPTIONS

An object containing the default transcoding options.

## Options

The following options can be customized:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| preset | string | - | Platform preset name (e.g., 'instagram', 'youtube-hd', 'twitter') |
| videoCodec | string | 'libx264' | Video codec to use |
| audioCodec | string | 'aac' | Audio codec to use |
| videoBitrate | string | '1500k' | Video bitrate |
| audioBitrate | string | '128k' | Audio bitrate |
| width | number | -1 | Output width (use -1 to maintain aspect ratio) |
| height | number | -1 | Output height (use -1 to maintain aspect ratio) |
| fps | number | -1 | Frames per second (use -1 to maintain original fps) |
| preset | string | 'medium' | Encoding preset (ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow) |
| profile | string | 'main' | H.264 profile (baseline, main, high) |
| level | string | '4.0' | H.264 level |
| pixelFormat | string | 'yuv420p' | Pixel format |
| movflags | string | '+faststart' | MP4 container flags |
| threads | number | 0 | Number of threads to use (0 = auto) |
| overwrite | boolean | false | Whether to overwrite existing output file |

**Note:** When using a platform preset, the `preset` option refers to the platform name (e.g., 'instagram'). The FFmpeg encoding preset (e.g., 'medium', 'slow') is still configurable but is included in each platform preset with appropriate values.

## How It Works

This module uses Node.js's built-in `child_process.spawn()` to call FFmpeg with appropriate parameters to transcode the video. It parses the FFmpeg output to provide real-time progress updates through an event emitter. The module does not store any files itself but simply passes through to FFmpeg.

## Testing

### Manual Testing

The module includes a script to generate a 5-second test video for manual testing purposes:

```bash
# Generate a test video
pnpm generate-test-video

# Run the basic example with the test video
pnpm example

# Run the Smart Presets example
pnpm example:presets
```

This will:
1. Create a tiny 2-second test video (320x240) in .mov format in the `test-videos/input` directory
2. Transcode it to MP4 format in the `test-videos/output` directory
3. Run the example file that demonstrates basic usage and custom options

### Automated Tests

The module includes Mocha tests for automated testing:

```bash
# Run the automated tests
pnpm test
```

The module includes the following test files:
- `test/transcode.test.js` - Tests for the core transcoding functionality
- `test/presets.test.js` - Tests for the Smart Presets feature

These tests verify the core functionality of the module, including error handling, option processing, and preset handling.

## License

MIT