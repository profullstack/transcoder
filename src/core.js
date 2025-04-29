/**
 * @profullstack/transcoder - Core Module
 * Contains core functionality and shared utilities
 */

import { EventEmitter } from 'events';
import { exec } from 'child_process';

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
  overwrite: false,          // Don't overwrite existing files by default
  watermark: null,           // No watermark by default
  trim: null,                // No trimming by default
  responsive: null           // No responsive profiles by default
};

/**
 * Default audio transcoding options
 * These settings ensure compatibility with most audio players and devices
 */
export const DEFAULT_AUDIO_OPTIONS = {
  audioCodec: 'aac',         // AAC audio codec for maximum compatibility
  audioBitrate: '192k',      // Standard audio bitrate
  audioSampleRate: 44100,    // Standard sample rate (44.1 kHz)
  audioChannels: 2,          // Stereo
  normalize: false,          // No audio normalization by default
  fadeIn: 0,                 // No fade in by default (in seconds)
  fadeOut: 0,                // No fade out by default (in seconds)
  noiseReduction: 0,         // No noise reduction by default (0-1 scale)
  overwrite: false,          // Don't overwrite existing files by default
};

/**
 * Default image transcoding options
 * These settings ensure compatibility with most image viewers and web browsers
 */
export const DEFAULT_IMAGE_OPTIONS = {
  format: 'jpg',         // JPEG format for maximum compatibility
  quality: 85,           // Good balance between quality and file size
  resize: null,          // No resizing by default
  rotate: null,          // No rotation by default
  flip: null,            // No flipping by default
  crop: null,            // No cropping by default
  squarePad: false,      // No square padding by default
  padColor: 'transparent', // Default padding color (transparent)
  padSize: 0,            // Default padding size (auto-calculated)
  optimize: true,        // Optimize output by default
  stripMetadata: false,  // Keep metadata by default
  overwrite: false       // Don't overwrite existing files by default
};

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
export function parseProgress(data) {
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