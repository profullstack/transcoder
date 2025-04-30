/**
 * @profullstack/transcoder - CLI Module
 * Contains functionality for the command-line interface
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import cliProgress from 'cli-progress';
import colors from 'ansi-colors';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { spawn } from 'child_process';
import { parseProgress } from './core.js';
import { getVideoDuration } from './utils.js';
import { generateThumbnailsEfficient } from './thumbnails.js';
import { getPreset, PRESETS } from '../presets.js';

/**
 * Format time as HH:MM:SS
 * 
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted time string
 */
export function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Format file size in human-readable format
 * 
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size string
 */
export function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Expand tilde in path to user's home directory
 * 
 * @param {string} filePath - Path that may contain a tilde
 * @returns {string} - Path with tilde expanded
 */
export function expandTildePath(filePath) {
  if (!filePath) return filePath;
  if (filePath.startsWith('~/') || filePath === '~') {
    return filePath.replace(/^~/, os.homedir());
  }
  return filePath;
}

/**
 * Configure the command-line interface
 * 
 * @returns {Object} - Yargs parser
 */
export function configureCommandLine() {
  return yargs(hideBin(process.argv))
    .usage('Usage: $0 <input> <output> [options] OR $0 --path <directory> [options]')
    .example('$0 input.mp4 output.mp4 --preset youtube-hd', 'Transcode a video using the youtube-hd preset')
    .example('$0 input.mp4 output.mp4 --thumbnails 3', 'Transcode a video and generate 3 thumbnails')
    .example('$0 input.mp4 output.mp4 --width 1280 --height 720', 'Transcode a video to 720p resolution')
    .example('$0 --thumbnails-only input.mp4 --count 5', 'Generate 5 thumbnails without transcoding')
    .example('$0 --path ./videos --preset web', 'Batch process all videos in the directory using the web preset')
    .example('$0 --path ./videos --recursive --output-dir ./processed', 'Recursively process all videos and save to output directory')
    
    // Input and output arguments
    .positional('input', {
      describe: 'Input video file',
      type: 'string'
    })
    .positional('output', {
      describe: 'Output video file',
      type: 'string'
    })
    
    // Batch processing options
    .option('path', {
      describe: 'Path to directory containing media files for batch processing',
      type: 'string'
    })
    .option('recursive', {
      describe: 'Recursively process files in subdirectories (for batch processing)',
      type: 'boolean',
      default: false
    })
    .option('output-dir', {
      describe: 'Output directory for batch processed files',
      type: 'string'
    })
    .option('output-prefix', {
      describe: 'Prefix to add to output filenames (for batch processing)',
      type: 'string',
      default: ''
    })
    .option('output-suffix', {
      describe: 'Suffix to add to output filenames (for batch processing)',
      type: 'string',
      default: ''
    })
    .option('output-extension', {
      describe: 'Extension for output files (for batch processing)',
      type: 'string'
    })
    .option('media-types', {
      describe: 'Media types to process (for batch processing)',
      type: 'array',
      choices: ['video', 'audio', 'image'],
      default: ['video', 'audio', 'image']
    })
    .option('concurrency', {
      describe: 'Number of files to process concurrently (for batch processing)',
      type: 'number',
      default: 1
    })
    .option('fancy-ui', {
      describe: 'Use fancy terminal UI for batch processing',
      type: 'boolean',
      default: true
    })
    
    // Transcoding options
    .option('preset', {
      alias: 'p',
      describe: 'Use a predefined preset (e.g., youtube-hd, twitter, instagram)',
      type: 'string'
    })
    .option('width', {
      alias: 'w',
      describe: 'Output video width',
      type: 'number'
    })
    .option('height', {
      alias: 'h',
      describe: 'Output video height',
      type: 'number'
    })
    .option('bitrate', {
      alias: 'b',
      describe: 'Output video bitrate (e.g., 1M, 5M)',
      type: 'string'
    })
    .option('fps', {
      alias: 'f',
      describe: 'Output video frame rate',
      type: 'number'
    })
    .option('codec', {
      alias: 'c',
      describe: 'Video codec to use (e.g., h264, h265)',
      type: 'string'
    })
    .option('audio-codec', {
      alias: 'a',
      describe: 'Audio codec to use (e.g., aac, mp3)',
      type: 'string'
    })
    .option('audio-bitrate', {
      describe: 'Audio bitrate (e.g., 128k, 256k)',
      type: 'string'
    })
    
    // Thumbnail options
    .option('thumbnails', {
      alias: 't',
      describe: 'Number of thumbnails to generate during transcoding',
      type: 'number'
    })
    .option('thumbnails-only', {
      describe: 'Generate thumbnails without transcoding',
      type: 'boolean'
    })
    .option('count', {
      describe: 'Number of thumbnails to generate (for thumbnails-only mode)',
      type: 'number',
      default: 3
    })
    .option('format', {
      describe: 'Thumbnail format (jpg or png)',
      type: 'string',
      choices: ['jpg', 'png'],
      default: 'jpg'
    })
    .option('timestamps', {
      describe: 'Specific timestamps for thumbnails (comma-separated, in seconds or HH:MM:SS format)',
      type: 'string'
    })
    .option('thumbnail-output', {
      describe: 'Output pattern for thumbnails (e.g., "thumb-%d.jpg")',
      type: 'string'
    })
    
    // Watermark options
    .option('watermark-image', {
      describe: 'Path to image file to use as watermark',
      type: 'string'
    })
    .option('watermark-text', {
      describe: 'Text to use as watermark',
      type: 'string'
    })
    .option('watermark-position', {
      describe: 'Position of the watermark',
      type: 'string',
      choices: ['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'center'],
      default: 'bottomRight'
    })
    .option('watermark-opacity', {
      describe: 'Opacity of the watermark (0.0 to 1.0)',
      type: 'number',
      default: 1.0
    })
    .option('watermark-margin', {
      describe: 'Margin from the edge in pixels',
      type: 'number',
      default: 20
    })
    .option('watermark-font-size', {
      describe: 'Font size for text watermark in pixels',
      type: 'number',
      default: 72
    })
    .option('watermark-font-color', {
      describe: 'Font color for text watermark',
      type: 'string',
      default: 'yellow'
    })
    .option('watermark-font', {
      describe: 'Path to font file for text watermark (if not specified, will try to find a system font)',
      type: 'string'
    })
    .option('watermark-box-color', {
      describe: 'Background box color for text watermark (e.g., "black@0.9" for nearly opaque black)',
      type: 'string',
      default: 'black@0.9'
    })
    
    // Trim options
    .option('trim', {
      describe: 'Enable video trimming',
      type: 'boolean'
    })
    .option('start', {
      describe: 'Start time for trimming (in seconds or HH:MM:SS format)',
      type: 'string'
    })
    .option('end', {
      describe: 'End time for trimming (in seconds or HH:MM:SS format)',
      type: 'string'
    })
    
    // Audio enhancement options
    .option('audio-normalize', {
      describe: 'Normalize audio levels for consistent volume',
      type: 'boolean',
      default: false
    })
    .option('audio-noise-reduction', {
      describe: 'Reduce background noise (0.0 to 1.0, higher values = more reduction)',
      type: 'number'
    })
    .option('audio-fade-in', {
      describe: 'Fade in duration in seconds',
      type: 'number'
    })
    .option('audio-fade-out', {
      describe: 'Fade out duration in seconds',
      type: 'number'
    })
    .option('audio-volume', {
      describe: 'Volume adjustment factor (1.0 = original volume)',
      type: 'number'
    })
    
    // Other options
    .option('verbose', {
      alias: 'v',
      describe: 'Show detailed progress information',
      type: 'boolean',
      default: false
    })
    .option('help', {
      alias: '?',
      describe: 'Show help',
      type: 'boolean'
    })
    .middleware((argv) => {
      // Expand tilde in paths
      if (argv.path) {
        argv.path = expandTildePath(argv.path);
      }
      if (argv.outputDir) {
        argv.outputDir = expandTildePath(argv.outputDir);
      }
      if (argv._[0]) {
        argv._[0] = expandTildePath(argv._[0]);
      }
      if (argv._[1]) {
        argv._[1] = expandTildePath(argv._[1]);
      }
      return argv;
    })
    .demandCommand(0)
    .help();
}

/**
 * Handle thumbnails-only mode
 * 
 * @param {Object} argv - Command-line arguments
 */
export async function handleThumbnailsOnly(argv) {
  const input = argv._[0];
  if (!input) {
    console.error(colors.red('Error: Input file is required for thumbnails-only mode'));
    process.exit(1);
  }
  
  if (!fs.existsSync(input)) {
    console.error(colors.red(`Error: Input file "${input}" does not exist`));
    process.exit(1);
  }
  
  // Get video duration first to provide better progress information
  try {
    const duration = await getVideoDuration(input);
    console.log(`Video duration: ${formatTime(duration)}`);
    
    const options = {
      count: argv.count,
      format: argv.format,
      outputPattern: argv.thumbnailOutput || path.join(path.dirname(input), 'thumbnail-%d.' + argv.format)
    };
    
    if (argv.timestamps) {
      options.timestamps = true;
      options.timestampList = argv.timestamps.split(',').map(t => t.trim());
    }
    
    console.log(`Generating ${options.count} thumbnails from ${input}...`);
    
    // Create a progress bar
    const progressBar = new cliProgress.SingleBar({
      format: colors.cyan('{bar}') + ' | ' + colors.yellow('Generating thumbnails'),
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });
    
    progressBar.start(100, 0);
    
    try {
      const thumbnails = await generateThumbnailsEfficient(input, options);
      progressBar.update(100);
      progressBar.stop();
      
      console.log(colors.green('\nThumbnails generated successfully:'));
      thumbnails.forEach(thumbnail => console.log(`- ${colors.yellow(thumbnail)}`));
    } catch (err) {
      progressBar.stop();
      console.error(colors.red('Error:'), err.message);
      process.exit(1);
    }
  } catch (durationErr) {
    console.warn(colors.yellow(`Warning: Could not determine video duration: ${durationErr.message}`));
    console.error(colors.red('Error: Failed to generate thumbnails'));
    process.exit(1);
  }
}

/**
 * Prepare transcoding options from command-line arguments
 * 
 * @param {Object} argv - Command-line arguments
 * @returns {Object} - Transcoding options
 */
export function prepareTranscodeOptions(argv) {
  const options = {};
  
  // Add preset if specified
  if (argv.preset) {
    options.preset = argv.preset;
  }
  
  // Add video options
  if (argv.width || argv.height) {
    options.width = argv.width || -1;
    options.height = argv.height || -1;
  }
  
  if (argv.bitrate) options.videoBitrate = argv.bitrate;
  if (argv.fps) options.fps = argv.fps;
  if (argv.codec) options.videoCodec = argv.codec;
  
  // Add audio options
  if (argv.audioCodec) options.audioCodec = argv.audioCodec;
  if (argv.audioBitrate) options.audioBitrate = argv.audioBitrate;
  
  // Add audio enhancement options
  if (argv.audioNormalize || argv.audioNoiseReduction !== undefined ||
      argv.audioFadeIn !== undefined || argv.audioFadeOut !== undefined ||
      argv.audioVolume !== undefined) {
    options.audio = {};
    
    if (argv.audioNormalize) {
      options.audio.normalize = true;
    }
    
    if (argv.audioNoiseReduction !== undefined) {
      options.audio.noiseReduction = Math.min(1, Math.max(0, argv.audioNoiseReduction));
    }
    
    if (argv.audioFadeIn !== undefined) {
      options.audio.fadeIn = argv.audioFadeIn;
    }
    
    if (argv.audioFadeOut !== undefined) {
      options.audio.fadeOut = argv.audioFadeOut;
    }
    
    if (argv.audioVolume !== undefined) {
      options.audio.volume = argv.audioVolume;
    }
    
    // For audio-only files, don't set a specific codec if none is provided
    // This will allow the original format to be preserved
    if (!argv.audioCodec && argv['media-types'] &&
        argv['media-types'].length === 1 &&
        argv['media-types'][0] === 'audio') {
      // Remove any codec that might have been set by a preset
      delete options.audioCodec;
    }
  }
  
  // Add thumbnail options
  if (argv.thumbnails) {
    options.thumbnails = {
      count: argv.thumbnails,
      format: argv.format
    };
    
    if (argv.thumbnailOutput) {
      options.thumbnails.outputPattern = argv.thumbnailOutput;
    }
  }
  
  // Add watermark options
  if (argv.watermarkImage || argv.watermarkText) {
    options.watermark = {};
    
    if (argv.watermarkImage) {
      options.watermark.image = argv.watermarkImage;
    }
    
    if (argv.watermarkText) {
      options.watermark.text = argv.watermarkText;
    }
    
    options.watermark.position = argv.watermarkPosition;
    options.watermark.opacity = argv.watermarkOpacity;
    options.watermark.margin = argv.watermarkMargin;
    
    if (argv.watermarkText) {
      options.watermark.fontSize = argv.watermarkFontSize;
      options.watermark.fontColor = argv.watermarkFontColor;
      
      if (argv.watermarkBoxColor) {
        options.watermark.boxColor = argv.watermarkBoxColor;
      }
      
      if (argv.watermarkFont) {
        options.watermark.fontFile = argv.watermarkFont;
      }
    }
  }
  
  // Add trim options
  if (argv.trim && (argv.start || argv.end)) {
    options.trim = {};
    if (argv.start) options.trim.start = argv.start;
    if (argv.end) options.trim.end = argv.end;
  }
  
  // Add overwrite option
  options.overwrite = true;
  
  // Add verbose option
  if (argv.verbose) {
    options.verbose = true;
  }
  
  return options;
}

/**
 * Prepare batch processing options from command-line arguments
 * 
 * @param {Object} argv - Command-line arguments
 * @returns {Object} - Batch processing options
 */
export function prepareBatchOptions(argv) {
  const options = {
    transcodeOptions: prepareTranscodeOptions(argv)
  };
  
  // Add output directory
  if (argv.outputDir) {
    options.outputDir = argv.outputDir;
  }
  
  // Add output filename options
  if (argv.outputPrefix) {
    options.outputPrefix = argv.outputPrefix;
  }
  
  if (argv.outputSuffix) {
    options.outputSuffix = argv.outputSuffix;
  }
  
  if (argv.outputExtension) {
    options.outputExtension = argv.outputExtension.startsWith('.') ? 
      argv.outputExtension : `.${argv.outputExtension}`;
  }
  
  // Add concurrency
  if (argv.concurrency) {
    options.concurrency = argv.concurrency;
  }
  
  return options;
}

/**
 * Prepare scan options from command-line arguments
 * 
 * @param {Object} argv - Command-line arguments
 * @returns {Object} - Scan options
 */
export function prepareScanOptions(argv) {
  const options = {};
  
  // Add media types - use the correct property name from argv
  if (argv['media-types']) {
    options.mediaTypes = argv['media-types'];
  }
  
  // Add recursive option
  if (argv.recursive) {
    options.recursive = argv.recursive;
  }
  
  return options;
}

/**
 * Display transcoding results
 * 
 * @param {Object} result - Transcoding result
 */
export function displayTranscodeResults(result) {
  console.log(colors.green(`\nTranscoding completed successfully: ${result.outputPath}`));
  
  // Log the FFmpeg command
  if (result.ffmpegCommand) {
    console.log('\nEquivalent FFmpeg command:');
    console.log(colors.cyan(result.ffmpegCommand));
    
    // Check if the command includes video filters
    if (result.ffmpegCommand.includes('-vf')) {
      console.log('\nCommand includes video filters:');
      const vfIndex = result.ffmpegCommand.indexOf('-vf');
      const nextArgIndex = result.ffmpegCommand.indexOf(' ', vfIndex + 4);
      const filter = result.ffmpegCommand.substring(vfIndex + 4, nextArgIndex);
      console.log(colors.yellow(filter));
    } else {
      console.log('\nCommand does not include video filters');
    }
    
    // Check if the command includes audio filters
    if (result.ffmpegCommand.includes('-af')) {
      console.log('\nCommand includes audio filters:');
      const afIndex = result.ffmpegCommand.indexOf('-af');
      const nextArgIndex = result.ffmpegCommand.indexOf(' ', afIndex + 4);
      const filter = result.ffmpegCommand.substring(afIndex + 4, nextArgIndex);
      console.log(colors.yellow(filter));
    }
  }
  
  // Display metadata if available
  if (result.metadata) {
    console.log('\nVideo Metadata:');
    
    // Format metadata
    if (result.metadata.format) {
      console.log(colors.green('\nFormat:'));
      console.log(`  Format: ${colors.yellow(result.metadata.format.formatName || 'Unknown')}`);
      console.log(`  Duration: ${colors.yellow(formatTime(result.metadata.format.duration || 0))}`);
      console.log(`  Size: ${colors.yellow(formatFileSize(result.metadata.format.size || 0))}`);
      console.log(`  Bitrate: ${colors.yellow((result.metadata.format.bitrate / 1000).toFixed(2) + ' kbps' || 'Unknown')}`);
    }
    
    // Video stream metadata
    if (result.metadata.video && Object.keys(result.metadata.video).length > 0) {
      console.log(colors.green('\nVideo:'));
      console.log(`  Codec: ${colors.yellow(result.metadata.video.codec || 'Unknown')}`);
      console.log(`  Resolution: ${colors.yellow(result.metadata.video.width + 'x' + result.metadata.video.height || 'Unknown')}`);
      console.log(`  Aspect Ratio: ${colors.yellow(result.metadata.video.aspectRatio || 'Unknown')}`);
      console.log(`  Frame Rate: ${colors.yellow(result.metadata.video.fps?.toFixed(2) + ' fps' || 'Unknown')}`);
      console.log(`  Pixel Format: ${colors.yellow(result.metadata.video.pixelFormat || 'Unknown')}`);
      if (result.metadata.video.bitrate) {
        console.log(`  Bitrate: ${colors.yellow((result.metadata.video.bitrate / 1000).toFixed(2) + ' kbps' || 'Unknown')}`);
      }
    }
    
    // Audio stream metadata
    if (result.metadata.audio && Object.keys(result.metadata.audio).length > 0) {
      console.log(colors.green('\nAudio:'));
      console.log(`  Codec: ${colors.yellow(result.metadata.audio.codec || 'Unknown')}`);
      console.log(`  Sample Rate: ${colors.yellow(result.metadata.audio.sampleRate + ' Hz' || 'Unknown')}`);
      console.log(`  Channels: ${colors.yellow(result.metadata.audio.channels || 'Unknown')}`);
      console.log(`  Channel Layout: ${colors.yellow(result.metadata.audio.channelLayout || 'Unknown')}`);
      if (result.metadata.audio.bitrate) {
        console.log(`  Bitrate: ${colors.yellow((result.metadata.audio.bitrate / 1000).toFixed(2) + ' kbps' || 'Unknown')}`);
      }
    }
  }
  
  if (result.thumbnails && result.thumbnails.length > 0) {
    console.log('\nThumbnails generated:');
    result.thumbnails.forEach(thumbnail => console.log(`- ${colors.yellow(thumbnail)}`));
  }
}

/**
 * Display batch processing results
 *
 * @param {Object} results - Batch processing results
 */
export function displayBatchResults(results) {
  console.log(colors.green(`\nBatch processing completed successfully!`));
  
  // Count skipped files
  const skippedFiles = results.failed.filter(item => item.skipped);
  const failedFiles = results.failed.filter(item => !item.skipped);
  
  console.log(colors.green(`Processed ${results.total} files: ${results.successful.length} successful, ${failedFiles.length} failed, ${skippedFiles.length} skipped`));
  
  if (results.successful.length > 0) {
    console.log(colors.green('\nSuccessfully processed files:'));
    results.successful.forEach((item, index) => {
      console.log(`${index + 1}. ${colors.yellow(path.basename(item.input))} → ${colors.yellow(path.basename(item.output))}`);
    });
  }
  
  if (skippedFiles.length > 0) {
    console.log(colors.yellow('\nSkipped files (format not fully supported for enhancement):'));
    skippedFiles.forEach((item, index) => {
      console.log(`${index + 1}. ${colors.yellow(path.basename(item.input))}: ${colors.yellow(item.warning)}`);
    });
  }
  
  if (failedFiles.length > 0) {
    console.log(colors.red('\nFailed files:'));
    failedFiles.forEach((item, index) => {
      console.log(`${index + 1}. ${colors.yellow(path.basename(item.input))}: ${colors.red(item.error)}`);
    });
  }
}

/**
 * Create a progress bar for transcoding
 * 
 * @param {number} duration - Video duration in seconds
 * @returns {Object} - CLI progress bar
 */
export function createTranscodeProgressBar(duration) {
  return new cliProgress.SingleBar({
    format: colors.cyan('{bar}') + ' | ' + colors.yellow('{percentage}%') + ' | ' + colors.green('{fps} fps') + ' | ' + colors.blue('Time: {time}') + ' | ' + colors.magenta('ETA: {eta}'),
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
    clearOnComplete: false,
    barsize: 30
  }, cliProgress.Presets.shades_classic);
}

/**
 * Update progress bar with transcoding progress
 * 
 * @param {Object} progressBar - CLI progress bar
 * @param {Object} progress - Progress information
 * @param {number} duration - Video duration in seconds
 */
export function updateProgressBar(progressBar, progress, duration) {
  const currentTime = progress.time || 0;
  const percentage = duration ? Math.min(100, (currentTime / duration) * 100) : 0;
  
  progressBar.update(percentage, {
    fps: progress.fps ? `${progress.fps}` : '0',
    time: formatTime(currentTime),
    eta: formatTime(duration ? (duration - currentTime) / (progress.speed || 1) : 0)
  });
}

/**
 * Create a batch progress bar
 * 
 * @param {number} total - Total number of files
 * @returns {Object} - CLI progress bar
 */
export function createBatchProgressBar(total) {
  return new cliProgress.MultiBar({
    clearOnComplete: false,
    hideCursor: true,
    format: '{bar} | {percentage}% | {value}/{total} files | {file}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591'
  }, cliProgress.Presets.shades_classic);
}