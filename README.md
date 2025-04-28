# @profullstack/transcoder

A lightweight Node.js module for transcoding videos to web-friendly MP4 format using FFmpeg. This module is designed for server-side use and ensures compatibility with all modern browsers including Safari, Chrome, and Firefox on both desktop and mobile devices.

[![GitHub](https://img.shields.io/github/license/profullstack/transcoder)](https://github.com/profullstack/transcoder/blob/master/LICENSE)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/m/profullstack/transcoder)](https://github.com/profullstack/transcoder/pulse)
[![GitHub last commit](https://img.shields.io/github/last-commit/profullstack/transcoder)](https://github.com/profullstack/transcoder/commits/master)
[![npm version](https://img.shields.io/npm/v/@profullstack/transcoder)](https://www.npmjs.com/package/@profullstack/transcoder)
[![npm downloads](https://img.shields.io/npm/dm/@profullstack/transcoder)](https://www.npmjs.com/package/@profullstack/transcoder)
[![npm bundle size](https://img.shields.io/bundlephobia/min/@profullstack/transcoder)](https://bundlephobia.com/package/@profullstack/transcoder)

[![Windows](https://img.shields.io/badge/Windows-0078D6?logo=windows&logoColor=fff&style=for-the-badge)](https://github.com/profullstack/transcoder)
[![macOS](https://img.shields.io/badge/macOS-000000?logo=macos&logoColor=fff&style=for-the-badge)](https://github.com/profullstack/transcoder)
[![Linux](https://img.shields.io/badge/Linux-FCC624?logo=linux&logoColor=000&style=for-the-badge)](https://github.com/profullstack/transcoder)

## Features

- Transcodes any video format to web-friendly MP4 (H.264/AAC)
- Ensures compatibility across all modern browsers
- Modern ESM (ECMAScript Modules) implementation
- Async/await API with real-time progress reporting
- Event-based progress tracking
- Customizable encoding options
- Smart Presets for popular platforms (Instagram, YouTube, Twitter, etc.)
- Thumbnail Generation at specified intervals or timestamps
- No file storage - just passes through to FFmpeg
- Lightweight with minimal dependencies

## Prerequisites

This module requires FFmpeg and ffprobe to be installed on your system. You can download them from [ffmpeg.org](https://ffmpeg.org/download.html) or build them from source.

### Building FFmpeg from Source

The package includes a script to automatically build FFmpeg from source with custom flags optimized for video transcoding and thumbnail generation:

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

The build script:
- Builds FFmpeg from source with optimized flags
- Enables all necessary codecs and libraries for maximum compatibility
- Includes support for ffprobe and thumbnail generation
- Installs all required dependencies

The script supports:
- **macOS**
- **Ubuntu/Debian**
- **Arch Linux**
- **Windows** (via WSL - Windows Subsystem for Linux)

If you already have FFmpeg installed but need to rebuild it (for example, if thumbnail generation is not working), you can use the `--force` flag:

```bash
# Force rebuild of FFmpeg from source
pnpm install-ffmpeg -- --force

# Or directly
./bin/build-ffmpeg.sh --force
```

The custom build includes support for:
- H.264/H.265 encoding and decoding
- AAC, MP3, and Opus audio codecs
- VP8/VP9 video codecs
- Hardware acceleration (when available)
- Rubberband library (required for ffprobe and thumbnail generation)
- And many other optimizations for video processing

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

### Extracting Metadata

The module automatically extracts metadata from the input video during transcoding:

```javascript
import { transcode } from '@profullstack/transcoder';

async function extractMetadata() {
  try {
    const { outputPath, metadata } = await transcode('input.mp4', 'output.mp4');
    
    // Display format information
    console.log('Format:', metadata.format.formatName);
    console.log('Duration:', metadata.format.duration, 'seconds');
    console.log('File Size:', metadata.format.size, 'bytes');
    console.log('Bitrate:', metadata.format.bitrate, 'bps');
    
    // Display video stream information
    console.log('Video Codec:', metadata.video.codec);
    console.log('Resolution:', metadata.video.width + 'x' + metadata.video.height);
    console.log('Frame Rate:', metadata.video.fps, 'fps');
    console.log('Pixel Format:', metadata.video.pixelFormat);
    
    // Display audio stream information
    console.log('Audio Codec:', metadata.audio.codec);
    console.log('Sample Rate:', metadata.audio.sampleRate, 'Hz');
    console.log('Channels:', metadata.audio.channels);
    console.log('Channel Layout:', metadata.audio.channelLayout);
  } catch (error) {
    console.error('Transcoding failed:', error.message);
  }
}

extractMetadata();
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

### Using Watermarks

You can add image or text watermarks to your videos:

```javascript
import { transcode } from '@profullstack/transcoder';

// Add an image watermark
await transcode('input.mp4', 'output.mp4', {
  watermark: {
    image: 'logo.png',
    position: 'bottomRight', // Options: topLeft, topRight, bottomLeft, bottomRight, center
    opacity: 0.7,            // 0.0 to 1.0
    margin: 10               // Margin from the edge in pixels
  }
});

// Add a text watermark
await transcode('input.mp4', 'output.mp4', {
  watermark: {
    text: '© Copyright 2025',
    position: 'bottomRight',
    fontColor: 'white',
    fontSize: 24,
    fontFile: '/path/to/your/font.ttf',  // Optional path to a font file
    boxColor: 'black@0.5',   // Optional background box with opacity
    opacity: 0.8
  }
});
```

### Using the CLI Tool

The module includes a command-line interface (CLI) for easy video transcoding, thumbnail generation, and watermarking directly from your terminal:

```bash
# Basic usage
transcoder input.mp4 output.mp4

# Using a preset
transcoder input.mp4 output.mp4 --preset youtube-hd

# Generate thumbnails during transcoding
transcoder input.mp4 output.mp4 --thumbnails 3

# Generate thumbnails without transcoding
transcoder --thumbnails-only input.mp4 --count 5

# Customize video settings
transcoder input.mp4 output.mp4 --width 1280 --height 720 --bitrate 2M

# Trim a video
transcoder input.mp4 output.mp4 --trim --start 00:00:10 --end 00:00:30
```

The CLI tool features a cool progress bar with real-time information:

![Progress Bar](https://example.com/progress-bar.png)

- Colorful progress visualization
- Percentage completion
- Current FPS (frames per second)
- Elapsed time
- Estimated time remaining (ETA)
- Fast and efficient thumbnail generation

#### CLI Options

| Option | Description |
|--------|-------------|
| `--preset`, `-p` | Use a predefined preset (e.g., youtube-hd, twitter, instagram) |
| `--width`, `-w` | Output video width |
| `--height`, `-h` | Output video height |
| `--bitrate`, `-b` | Output video bitrate (e.g., 1M, 5M) |
| `--fps`, `-f` | Output video frame rate |
| `--codec`, `-c` | Video codec to use (e.g., h264, h265) |
| `--audio-codec`, `-a` | Audio codec to use (e.g., aac, mp3) |
| `--audio-bitrate` | Audio bitrate (e.g., 128k, 256k) |
| `--thumbnails`, `-t` | Number of thumbnails to generate during transcoding |
| `--thumbnails-only` | Generate thumbnails without transcoding |
| `--count` | Number of thumbnails to generate (for thumbnails-only mode) |
| `--format` | Thumbnail format (jpg or png) |
| `--timestamps` | Specific timestamps for thumbnails (comma-separated, in seconds or HH:MM:SS format) |
| `--thumbnail-output` | Output pattern for thumbnails (e.g., "thumb-%d.jpg") |
| `--trim` | Enable video trimming |
| `--start` | Start time for trimming (in seconds or HH:MM:SS format) |
| `--end` | End time for trimming (in seconds or HH:MM:SS format) |
| `--watermark-image` | Path to image file to use as watermark |
| `--watermark-text` | Text to use as watermark |
| `--watermark-position` | Position of the watermark (topLeft, topRight, bottomLeft, bottomRight, center) |
| `--watermark-opacity` | Opacity of the watermark (0.0 to 1.0) |
| `--watermark-margin` | Margin from the edge in pixels |
| `--watermark-font-size` | Font size for text watermark in pixels |
| `--watermark-font-color` | Font color for text watermark |
| `--watermark-font` | Path to font file for text watermark |
| `--watermark-box-color` | Background box color for text watermark |
| `--verbose`, `-v` | Show detailed progress information |
| `--help`, `-?` | Show help |

#### Installation

The CLI tool is automatically installed when you install the package:

```bash
# Install globally
npm install -g @profullstack/transcoder

# Now you can use the 'transcoder' command from anywhere
transcoder input.mp4 output.mp4 --preset youtube-hd

# Or use npx without installing
npx @profullstack/transcoder input.mp4 output.mp4 --preset youtube-hd
```

When installed globally, you can use the `transcoder` command from any directory:

```bash
# Basic usage
transcoder input.mp4 output.mp4

# With options
transcoder input.mp4 output.mp4 --preset youtube-hd --thumbnails 3

# Generate thumbnails only
transcoder --thumbnails-only input.mp4 --count 5
```

## API Reference

### transcode(inputPath, outputPath, [options])

Transcodes a video file to web-friendly MP4 format.

**Parameters:**

- `inputPath` (string): Path to the input video file
- `outputPath` (string): Path where the transcoded video will be saved
- `options` (object, optional): Transcoding options or preset name
  - Can include a `preset` property with one of the predefined platform presets
  - Can include a `thumbnails` property for generating thumbnails during transcoding

**Returns:**

- Promise that resolves with an object containing:
  - `outputPath` (string): Path to the transcoded video
  - `emitter` (TranscodeEmitter): Event emitter for progress tracking
  - `thumbnails` (Array, optional): Array of thumbnail paths if thumbnails were requested
  - `metadata` (Object, optional): Video metadata extracted from the input file
    - `format`: Format information (duration, size, bitrate, etc.)
    - `video`: Video stream information (codec, resolution, fps, etc.)
    - `audio`: Audio stream information (codec, sample rate, channels, etc.)

### generateThumbnails(inputPath, outputDir, [options])

Generates thumbnails from a video file without transcoding.

**Parameters:**

- `inputPath` (string): Path to the input video file
- `outputDir` (string): Directory where thumbnails will be saved
- `options` (object, optional): Thumbnail generation options
  - `count` (number, default: 3): Number of thumbnails to generate
  - `format` (string, default: 'jpg'): Image format ('jpg' or 'png')
  - `filenamePattern` (string, default: 'thumbnail-%03d'): Pattern for thumbnail filenames
  - `timestamps` (boolean, default: false): Whether to use specific timestamps instead of intervals
  - `timestampList` (Array<string>, default: []): List of timestamps (only used if timestamps is true)

**Returns:**

- Promise that resolves with an array of thumbnail paths

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
| thumbnails | object | - | Thumbnail generation options (see below) |
| watermark | object | - | Watermark options (see below) |
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

**Thumbnail Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| count | number | 3 | Number of thumbnails to generate |
| format | string | 'jpg' | Image format ('jpg' or 'png') |
| filenamePattern | string | 'thumbnail-%03d' | Pattern for thumbnail filenames |
| timestamps | boolean | false | Whether to use specific timestamps instead of intervals |
| timestampList | Array<string> | [] | List of timestamps (only used if timestamps is true) |

**Watermark Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| image | string | - | Path to image file to use as watermark |
| text | string | - | Text to use as watermark |
| position | string | 'bottomRight' | Position of the watermark (topLeft, topRight, bottomLeft, bottomRight, center) |
| opacity | number | 0.7 | Opacity of the watermark (0.0 to 1.0) |
| margin | number | 10 | Margin from the edge in pixels |
| fontSize | number | 24 | Font size for text watermark in pixels |
| fontColor | string | 'white' | Font color for text watermark |
| fontFile | string | - | Path to font file for text watermark (if not specified, will try to find a system font) |
| boxColor | string | - | Background box color for text watermark (e.g., "black@0.5" for semi-transparent black) |

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

# Run the Thumbnail Generation example
pnpm example:thumbnails
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
- `test/thumbnails.test.js` - Tests for the Thumbnail Generation feature

These tests verify the core functionality of the module, including error handling, option processing, preset handling, and thumbnail generation.

## License

MIT
