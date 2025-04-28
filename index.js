/**
 * @profullstack/transcoder - A server-side module for transcoding videos to web-friendly MP4 format using FFmpeg
 */

import { exec, spawn } from 'child_process';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { getPreset, PRESETS } from './presets.js';
import { promisify } from 'util';

/**
 * Default transcoding options for web-friendly MP4 format
 * These settings ensure compatibility with all modern browsers including Safari, Chrome, and Firefox
 * on both desktop and mobile devices.
 */
export const DEFAULT_OPTIONS = {
  videoCodec: 'libx264',     // H.264 video codec for maximum compatibility
  audioCodec: 'aac',         // AAC audio codec for maximum compatibility
  videoBitrate: '1500k',     // Reasonable default bitrate
  audioBitrate: '128k',      // Standard audio bitrate
  width: -1,                 // Maintain aspect ratio
  height: -1,                // Maintain aspect ratio
  fps: -1,                   // Maintain original fps
  preset: 'medium',          // Balance between quality and encoding speed
  profile: 'main',           // Main profile for H.264
  level: '4.0',              // Level 4.0 for broad compatibility
  pixelFormat: 'yuv420p',    // Standard pixel format for web compatibility
  movflags: '+faststart',    // Optimize for web streaming
  threads: 0,                // Use all available CPU cores
  overwrite: false           // Don't overwrite existing files by default
};

/**
 * TranscodeEmitter class for emitting progress events
 * @extends EventEmitter
 */
export class TranscodeEmitter extends EventEmitter {
  constructor() {
    super();
  }
}

/**
 * Checks if ffmpeg is installed and available
 * 
 * @returns {Promise<boolean>} - Promise that resolves to true if FFmpeg is installed
 */
export async function checkFfmpeg() {
  return new Promise((resolve, reject) => {
    exec('ffmpeg -version', (error) => {
      if (error) {
        reject(new Error('FFmpeg is not installed or not available in PATH'));
      }
      resolve(true);
    });
  });
}

/**
 * Parse FFmpeg progress output
 * 
 * @param {string} data - FFmpeg output data
 * @returns {Object|null} - Progress object or null if not parseable
 */
function parseProgress(data) {
  const progressData = {};
  
  // Extract time information (e.g., time=00:00:04.00)
  const timeMatch = data.match(/time=(\d+:\d+:\d+\.\d+)/);
  if (timeMatch && timeMatch[1]) {
    const timeParts = timeMatch[1].split(':');
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    const seconds = parseFloat(timeParts[2]);
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    progressData.time = totalSeconds;
  }
  
  // Extract frame information
  const frameMatch = data.match(/frame=\s*(\d+)/);
  if (frameMatch && frameMatch[1]) {
    progressData.frame = parseInt(frameMatch[1], 10);
  }
  
  // Extract fps information
  const fpsMatch = data.match(/fps=\s*(\d+)/);
  if (fpsMatch && fpsMatch[1]) {
    progressData.fps = parseInt(fpsMatch[1], 10);
  }
  
  // Extract bitrate information
  const bitrateMatch = data.match(/bitrate=\s*([\d\.]+)kbits\/s/);
  if (bitrateMatch && bitrateMatch[1]) {
    progressData.bitrate = parseFloat(bitrateMatch[1]);
  }
  
  // Extract size information
  const sizeMatch = data.match(/size=\s*(\d+)kB/);
  if (sizeMatch && sizeMatch[1]) {
    progressData.size = parseInt(sizeMatch[1], 10) * 1024; // Convert to bytes
  }
  
  // Extract speed information
  const speedMatch = data.match(/speed=\s*([\d\.]+)x/);
  if (speedMatch && speedMatch[1]) {
    progressData.speed = parseFloat(speedMatch[1]);
  }
  
  return Object.keys(progressData).length > 0 ? progressData : null;
}

/**
 * Transcodes a video file to web-friendly MP4 format
 * 
 * @param {string} inputPath - Path to the input video file
 * @param {string} outputPath - Path where the transcoded video will be saved
 * @param {Object} [options={}] - Transcoding options
 * @returns {Promise<Object>} - Promise that resolves with the output path and emitter
 */
/**
 * Generates thumbnails from a video file
 *
 * @param {string} inputPath - Path to the input video file
 * @param {string} outputDir - Directory where thumbnails will be saved
 * @param {Object} options - Thumbnail generation options
 * @param {number} options.count - Number of thumbnails to generate
 * @param {string} options.format - Image format (jpg, png)
 * @param {string} options.filenamePattern - Pattern for thumbnail filenames (default: thumbnail-%03d)
 * @param {boolean} options.timestamps - Whether to use specific timestamps instead of intervals
 * @param {Array<string>} options.timestampList - List of timestamps (only used if timestamps is true)
 * @returns {Promise<Array<string>>} - Promise that resolves with an array of thumbnail paths
 */
export async function generateThumbnails(inputPath, outputDir, options) {
  // Default options
  const settings = {
    count: 3,
    format: 'jpg',
    filenamePattern: 'thumbnail-%03d',
    timestamps: false,
    timestampList: [],
    ...options
  };
  
  // Validate input path
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Input path is required and must be a string');
  }
  
  // Check if input file exists
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file does not exist: ${inputPath}`);
  }
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    try {
      fs.mkdirSync(outputDir, { recursive: true });
    } catch (err) {
      throw new Error(`Failed to create output directory: ${err.message}`);
    }
  }
  
  // Check if ffmpeg is installed
  try {
    await checkFfmpeg();
  } catch (error) {
    throw error;
  }
  
  // Get video duration to calculate thumbnail positions
  const duration = await getVideoDuration(inputPath);
  
  // Build ffmpeg arguments
  const ffmpegArgs = [];
  
  // Add input file
  ffmpegArgs.push('-i', inputPath);
  
  // Disable audio
  ffmpegArgs.push('-an');
  
  // Set output quality
  ffmpegArgs.push('-q:v', '2');
  
  // Set output format
  ffmpegArgs.push('-f', 'image2');
  
  // Generate thumbnails based on timestamps or intervals
  const thumbnailPaths = [];
  
  if (settings.timestamps && settings.timestampList.length > 0) {
    // Use specific timestamps
    for (let i = 0; i < settings.timestampList.length; i++) {
      const timestamp = settings.timestampList[i];
      const outputPath = path.join(outputDir, `${settings.filenamePattern.replace(/%\d*d/, i + 1)}.${settings.format}`);
      thumbnailPaths.push(outputPath);
      
      // Create a separate ffmpeg command for each timestamp
      await new Promise((resolve, reject) => {
        const args = [
          '-ss', timestamp,
          '-i', inputPath,
          '-vframes', '1',
          '-an',
          '-q:v', '2',
          '-f', 'image2',
          outputPath
        ];
        
        const ffmpegProcess = spawn('ffmpeg', args);
        
        let errorOutput = '';
        
        ffmpegProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
        
        ffmpegProcess.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`FFmpeg thumbnail generation failed with code ${code}: ${errorOutput}`));
          }
        });
        
        ffmpegProcess.on('error', (err) => {
          reject(new Error(`Failed to start FFmpeg process: ${err.message}`));
        });
      });
    }
  } else {
    // Calculate intervals based on count
    const interval = duration / (settings.count + 1);
    
    for (let i = 0; i < settings.count; i++) {
      const time = interval * (i + 1);
      const outputPath = path.join(outputDir, `${settings.filenamePattern.replace(/%\d*d/, i + 1)}.${settings.format}`);
      thumbnailPaths.push(outputPath);
      
      // Create a separate ffmpeg command for each interval
      await new Promise((resolve, reject) => {
        const args = [
          '-ss', time.toString(),
          '-i', inputPath,
          '-vframes', '1',
          '-an',
          '-q:v', '2',
          '-f', 'image2',
          outputPath
        ];
        
        const ffmpegProcess = spawn('ffmpeg', args);
        
        let errorOutput = '';
        
        ffmpegProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
        
        ffmpegProcess.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`FFmpeg thumbnail generation failed with code ${code}: ${errorOutput}`));
          }
        });
        
        ffmpegProcess.on('error', (err) => {
          reject(new Error(`Failed to start FFmpeg process: ${err.message}`));
        });
      });
    }
  }
  
  return thumbnailPaths;
}

/**
 * Gets the duration of a video file in seconds
 *
 * @param {string} inputPath - Path to the video file
 * @returns {Promise<number>} - Promise that resolves with the duration in seconds
 */
async function getVideoDuration(inputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      inputPath
    ];
    
    const ffprobeProcess = spawn('ffprobe', args);
    
    let output = '';
    let errorOutput = '';
    
    ffprobeProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    ffprobeProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    ffprobeProcess.on('close', (code) => {
      if (code === 0) {
        const duration = parseFloat(output.trim());
        resolve(duration);
      } else {
        reject(new Error(`FFprobe failed with code ${code}: ${errorOutput}`));
      }
    });
    
    ffprobeProcess.on('error', (err) => {
      reject(new Error(`Failed to start FFprobe process: ${err.message}`));
    });
  });
}

export async function transcode(inputPath, outputPath, options = {}) {
  // Create an emitter for progress events
  const emitter = new TranscodeEmitter();
  
  // Handle platform-specific presets
  let mergedOptions = { ...options };
  
  // If a preset name is provided, get the preset configuration
  if (options.preset && typeof options.preset === 'string' && PRESETS[options.preset.toLowerCase()]) {
    const presetConfig = getPreset(options.preset);
    if (presetConfig) {
      // Merge preset with user options (user options take precedence over preset)
      mergedOptions = { ...presetConfig, ...options };
      
      // Remove the preset name to avoid confusion with ffmpeg's preset parameter
      if (mergedOptions.preset === options.preset) {
        // If the preset name is the same as the original options.preset,
        // restore the ffmpeg preset value from the preset config
        mergedOptions.preset = presetConfig.preset;
      }
    }
  }
  
  // Merge default options with user options (including preset if applicable)
  const settings = { ...DEFAULT_OPTIONS, ...mergedOptions };
  
  // Extract thumbnails option if present
  const thumbnailOptions = settings.thumbnails;
  delete settings.thumbnails;
  
  // Validate input and output paths
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Input path is required and must be a string');
  }
  
  if (!outputPath || typeof outputPath !== 'string') {
    throw new Error('Output path is required and must be a string');
  }
  
  // Check if input file exists
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file does not exist: ${inputPath}`);
  }
  
  // Check if output file exists and handle overwrite option
  if (fs.existsSync(outputPath) && !settings.overwrite) {
    throw new Error(`Output file already exists: ${outputPath}. Set overwrite: true to overwrite.`);
  }
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    try {
      fs.mkdirSync(outputDir, { recursive: true });
    } catch (err) {
      throw new Error(`Failed to create output directory: ${err.message}`);
    }
  }
  
  // Check if ffmpeg is installed
  try {
    await checkFfmpeg();
  } catch (error) {
    throw error;
  }
  
  // Build ffmpeg arguments
  const ffmpegArgs = [];
  
  // Add input file
  ffmpegArgs.push('-i', inputPath);
  
  // Add video codec
  ffmpegArgs.push('-c:v', settings.videoCodec);
  
  // Add audio codec
  ffmpegArgs.push('-c:a', settings.audioCodec);
  
  // Add video bitrate if specified
  if (settings.videoBitrate) {
    ffmpegArgs.push('-b:v', settings.videoBitrate);
  }
  
  // Add audio bitrate if specified
  if (settings.audioBitrate) {
    ffmpegArgs.push('-b:a', settings.audioBitrate);
  }
  
  // Add resolution if specified
  if (settings.width > 0 && settings.height > 0) {
    ffmpegArgs.push('-vf', `scale=${settings.width}:${settings.height}`);
  } else if (settings.width > 0) {
    ffmpegArgs.push('-vf', `scale=${settings.width}:-1`);
  } else if (settings.height > 0) {
    ffmpegArgs.push('-vf', `scale=-1:${settings.height}`);
  }
  
  // Add fps if specified
  if (settings.fps > 0) {
    ffmpegArgs.push('-r', settings.fps.toString());
  }
  
  // Add preset
  ffmpegArgs.push('-preset', settings.preset);
  
  // Add profile
  ffmpegArgs.push('-profile:v', settings.profile);
  
  // Add level
  ffmpegArgs.push('-level', settings.level);
  
  // Add pixel format
  ffmpegArgs.push('-pix_fmt', settings.pixelFormat);
  
  // Add movflags for web optimization
  ffmpegArgs.push('-movflags', settings.movflags);
  
  // Add thread count
  ffmpegArgs.push('-threads', settings.threads.toString());
  
  // Add progress output
  ffmpegArgs.push('-progress', 'pipe:1');
  
  // Add overwrite flag if needed
  if (settings.overwrite) {
    ffmpegArgs.push('-y');
  } else {
    ffmpegArgs.push('-n');
  }
  
  // Add output file
  ffmpegArgs.push(outputPath);
  
  return new Promise((resolve, reject) => {
    // Spawn ffmpeg process
    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
    
    let errorOutput = '';
    
    // Handle stdout (progress information)
    ffmpegProcess.stdout.on('data', (data) => {
      const dataStr = data.toString();
      const progress = parseProgress(dataStr);
      
      if (progress) {
        emitter.emit('progress', progress);
      }
    });
    
    // Handle stderr (log information)
    ffmpegProcess.stderr.on('data', (data) => {
      const dataStr = data.toString();
      errorOutput += dataStr;
      
      // FFmpeg outputs progress information to stderr as well
      const progress = parseProgress(dataStr);
      if (progress) {
        emitter.emit('progress', progress);
      }
      
      // Emit log event
      emitter.emit('log', dataStr);
    });
    
    // Handle process exit
    ffmpegProcess.on('close', async (code) => {
      if (code === 0) {
        // Check if output file was created
        if (!fs.existsSync(outputPath)) {
          return reject(new Error('Transcoding failed: Output file was not created'));
        }
        
        // Generate thumbnails if requested
        if (thumbnailOptions) {
          try {
            const thumbnailDir = path.dirname(outputPath);
            const thumbnails = await generateThumbnails(inputPath, thumbnailDir, thumbnailOptions);
            resolve({ outputPath, emitter, thumbnails });
          } catch (thumbnailError) {
            // If thumbnail generation fails, still return the transcoded video
            console.error(`Thumbnail generation failed: ${thumbnailError.message}`);
            resolve({ outputPath, emitter });
          }
        } else {
          resolve({ outputPath, emitter });
        }
      } else {
        reject(new Error(`FFmpeg transcoding failed with code ${code}: ${errorOutput}`));
      }
    });
    
    // Handle process error
    ffmpegProcess.on('error', (err) => {
      reject(new Error(`Failed to start FFmpeg process: ${err.message}`));
    });
    
    // Emit start event
    emitter.emit('start', { command: 'ffmpeg', args: ffmpegArgs });
  });
}

/**
 * Example usage with async/await
 *
 * ```javascript
 * import { transcode } from '@profullstack/transcoder';
 *
 * async function transcodeVideo() {
 *   try {
 *     const { outputPath, emitter } = await transcode('input.mov', 'output.mp4');
 *
 *     // Listen for progress events
 *     emitter.on('progress', (progress) => {
 *       console.log(`Progress: ${JSON.stringify(progress)}`);
 *     });
 *
 *     // Listen for log events
 *     emitter.on('log', (log) => {
 *       console.log(`Log: ${log}`);
 *     });
 *
 *     console.log(`Transcoding completed: ${outputPath}`);
 *   } catch (error) {
 *     console.error(`Transcoding failed: ${error.message}`);
 *   }
 * }
 *
 * transcodeVideo();
 * ```
 *
 * Example usage with platform-specific presets:
 *
 * ```javascript
 * import { transcode } from '@profullstack/transcoder';
 *
 * // Transcode for Instagram
 * await transcode('input.mp4', 'instagram-output.mp4', { preset: 'instagram' });
 *
 * // Transcode for YouTube HD
 * await transcode('input.mp4', 'youtube-output.mp4', { preset: 'youtube-hd' });
 *
 * // Transcode for Twitter with custom overrides
 * await transcode('input.mp4', 'twitter-output.mp4', {
 *   preset: 'twitter',
 *   videoBitrate: '6000k' // Override the preset's videoBitrate
 * });
 * ```
 *
 * Example usage with thumbnail generation:
 *
 * ```javascript
 * import { transcode } from '@profullstack/transcoder';
 *
 * // Generate 5 thumbnails at equal intervals
 * const { outputPath, thumbnails } = await transcode('input.mp4', 'output.mp4', {
 *   thumbnails: { count: 5, format: 'jpg' }
 * });
 *
 * console.log('Video transcoded to:', outputPath);
 * console.log('Thumbnails generated:', thumbnails);
 *
 * // Generate thumbnails at specific timestamps
 * const { outputPath, thumbnails } = await transcode('input.mp4', 'output.mp4', {
 *   thumbnails: {
 *     timestamps: true,
 *     timestampList: ['00:00:10', '00:00:30', '00:01:15'],
 *     format: 'png'
 *   }
 * });
 * ```
 *
 * Available presets:
 * - instagram: Square format (1080x1080) optimized for Instagram feed
 * - instagram-stories: Vertical format (1080x1920) optimized for Instagram stories
 * - youtube-hd: HD format (1920x1080) optimized for YouTube
 * - youtube-4k: 4K format (3840x2160) optimized for YouTube
 * - twitter: Format optimized for Twitter
 * - facebook: Format optimized for Facebook
 * - tiktok: Vertical format (1080x1920) optimized for TikTok
 * - vimeo-hd: HD format optimized for Vimeo
 * - web: Format optimized for web playback
 * - mobile: Format optimized for mobile devices
 */
