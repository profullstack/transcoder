/**
 * @profullstack/transcoder - Thumbnails Module
 * Contains functionality for generating thumbnails from video files
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { checkFfmpeg } from './core.js';
import { getVideoDuration, validatePaths, ensureOutputDirectory } from './utils.js';

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
 * Generates thumbnails more efficiently using a single FFmpeg command
 * This is an alternative implementation that's more suitable for CLI usage
 *
 * @param {string} inputPath - Path to the input video file
 * @param {Object} options - Thumbnail generation options
 * @param {number} options.count - Number of thumbnails to generate
 * @param {string} options.format - Image format (jpg, png)
 * @param {string} options.outputPattern - Pattern for output filenames
 * @param {boolean} options.timestamps - Whether to use specific timestamps
 * @param {Array<string>} options.timestampList - List of timestamps
 * @returns {Promise<Array<string>>} - Promise that resolves with an array of thumbnail paths
 */
export async function generateThumbnailsEfficient(inputPath, options) {
  // Default options
  const settings = {
    count: 3,
    format: 'jpg',
    outputPattern: path.join(path.dirname(inputPath), `thumbnail-%d.${options.format || 'jpg'}`),
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
  const outputDir = path.dirname(settings.outputPattern);
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
  
  let args = [];
  let thumbnailCount = 0;
  
  if (settings.timestamps && settings.timestampList && settings.timestampList.length > 0) {
    // For timestamp-based thumbnails, use a filtergraph with multiple outputs
    thumbnailCount = settings.timestampList.length;
    
    // Build a complex filter for multiple timestamps
    let filterComplex = '';
    let outputs = '';
    
    for (let i = 0; i < thumbnailCount; i++) {
      filterComplex += `[0:v]select=eq(t\\,${settings.timestampList[i]}),setpts=PTS-STARTPTS[v${i}];`;
      outputs += `[v${i}]`;
    }
    
    args = [
      '-i', inputPath,
      '-filter_complex', filterComplex,
      '-map', outputs,
      '-q:v', '2',
      '-vsync', '0',
      settings.outputPattern
    ];
  } else {
    // For evenly spaced thumbnails, use fps filter
    thumbnailCount = settings.count;
    
    args = [
      '-i', inputPath,
      '-vf', `fps=1/${Math.ceil(duration/thumbnailCount)}`,
      '-q:v', '2',
      '-vsync', '0',
      settings.outputPattern
    ];
  }
  
  return new Promise((resolve, reject) => {
    const ffmpegProcess = spawn('ffmpeg', args);
    
    let errorOutput = '';
    
    ffmpegProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    ffmpegProcess.on('close', (code) => {
      if (code === 0) {
        // Generate the list of thumbnail paths
        const thumbnailPaths = [];
        for (let i = 1; i <= thumbnailCount; i++) {
          thumbnailPaths.push(settings.outputPattern.replace('%d', i));
        }
        resolve(thumbnailPaths);
      } else {
        reject(new Error(`FFmpeg thumbnail generation failed with code ${code}: ${errorOutput}`));
      }
    });
    
    ffmpegProcess.on('error', (err) => {
      reject(new Error(`Failed to start FFmpeg process: ${err.message}`));
    });
  });
}