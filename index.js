/**
 * @profullstack/transcoder - A server-side module for transcoding videos to web-friendly MP4 format using FFmpeg
 */

import { exec, spawn } from 'child_process';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

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
export async function transcode(inputPath, outputPath, options = {}) {
  // Create an emitter for progress events
  const emitter = new TranscodeEmitter();
  
  // Merge default options with user options
  const settings = { ...DEFAULT_OPTIONS, ...options };
  
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
    ffmpegProcess.on('close', (code) => {
      if (code === 0) {
        // Check if output file was created
        if (!fs.existsSync(outputPath)) {
          return reject(new Error('Transcoding failed: Output file was not created'));
        }
        
        resolve({ outputPath, emitter });
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
 */
