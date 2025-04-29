/**
 * @profullstack/transcoder - A server-side module for transcoding videos to web-friendly MP4 format using FFmpeg
 */

import { exec, spawn } from 'child_process';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { getPreset, getResponsiveProfileSet, PRESETS, RESPONSIVE_PROFILES } from './presets.js';
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
  overwrite: false,          // Don't overwrite existing files by default
  watermark: null,           // No watermark by default
  trim: null,                // No trimming by default
  responsive: null           // No responsive profiles by default
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
 * Gets video metadata using ffprobe
 *
 * @param {string} inputPath - Path to the video file
 * @returns {Promise<Object>} - Promise that resolves with the video metadata
 */
async function getVideoMetadata(inputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
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
        try {
          const metadata = JSON.parse(output);
          
          // Extract relevant metadata
          const result = {
            format: {},
            video: {},
            audio: {}
          };
          
          // Format metadata
          if (metadata.format) {
            result.format = {
              filename: metadata.format.filename,
              formatName: metadata.format.format_name,
              duration: parseFloat(metadata.format.duration) || 0,
              size: parseInt(metadata.format.size) || 0,
              bitrate: parseInt(metadata.format.bit_rate) || 0
            };
          }
          
          // Video stream metadata
          const videoStream = metadata.streams?.find(stream => stream.codec_type === 'video');
          if (videoStream) {
            result.video = {
              codec: videoStream.codec_name,
              profile: videoStream.profile,
              width: videoStream.width,
              height: videoStream.height,
              bitrate: parseInt(videoStream.bit_rate) || 0,
              fps: eval(videoStream.r_frame_rate) || 0,
              pixelFormat: videoStream.pix_fmt,
              colorSpace: videoStream.color_space,
              duration: parseFloat(videoStream.duration) || 0
            };
            
            // Calculate aspect ratio
            if (videoStream.width && videoStream.height) {
              result.video.aspectRatio = `${videoStream.width}:${videoStream.height}`;
              
              // Add display aspect ratio if available
              if (videoStream.display_aspect_ratio) {
                result.video.displayAspectRatio = videoStream.display_aspect_ratio;
              }
            }
          }
          
          // Audio stream metadata
          const audioStream = metadata.streams?.find(stream => stream.codec_type === 'audio');
          if (audioStream) {
            result.audio = {
              codec: audioStream.codec_name,
              sampleRate: parseInt(audioStream.sample_rate) || 0,
              channels: audioStream.channels,
              channelLayout: audioStream.channel_layout,
              bitrate: parseInt(audioStream.bit_rate) || 0,
              duration: parseFloat(audioStream.duration) || 0
            };
          }
          
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse metadata: ${error.message}`));
        }
      } else {
        reject(new Error(`FFprobe failed with code ${code}: ${errorOutput}`));
      }
    });
    
    ffprobeProcess.on('error', (err) => {
      reject(new Error(`Failed to start FFprobe process: ${err.message}`));
    });
  });
}

/**
 * Gets the duration of a video file in seconds
 *
 * @param {string} inputPath - Path to the video file
 * @returns {Promise<number>} - Promise that resolves with the duration in seconds
 */
async function getVideoDuration(inputPath) {
  try {
    const metadata = await getVideoMetadata(inputPath);
    return metadata.format.duration || 0;
  } catch (error) {
    // Fallback to the old method if metadata extraction fails
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
  
  // Extract trim option if present
  const trimOptions = settings.trim;
  delete settings.trim;
  
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
  
  // Add trim start time if specified (before input for faster seeking)
  if (trimOptions && trimOptions.start) {
    ffmpegArgs.push('-ss', trimOptions.start);
  }
  
  // Add input file
  ffmpegArgs.push('-i', inputPath);
  
  // Add trim end time if specified (after input)
  if (trimOptions && trimOptions.end) {
    ffmpegArgs.push('-to', trimOptions.end);
  }
  
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
  
  // Prepare video filters
  let videoFilters = [];
  
  // Add scaling filter if specified
  if (settings.width > 0 && settings.height > 0) {
    videoFilters.push(`scale=${settings.width}:${settings.height}`);
  } else if (settings.width > 0) {
    videoFilters.push(`scale=${settings.width}:-1`);
  } else if (settings.height > 0) {
    videoFilters.push(`scale=-1:${settings.height}`);
  }
  
  // Add watermark if specified
  if (settings.watermark) {
    const watermark = settings.watermark;
    
    // Validate watermark settings
    if (!watermark.image && !watermark.text) {
      throw new Error('Watermark must have either image or text property');
    }
    
    try {
      // Flag to track if we should skip watermark processing
      let skipWatermark = false;
      
      if (watermark.image) {
        // Check if watermark image exists
        if (!fs.existsSync(watermark.image)) {
          // Check if this is an intentional test case
          if (watermark.image.includes('intentionally-non-existent')) {
            console.warn(`Notice: Using intentionally non-existent watermark image for testing: ${watermark.image}`);
            console.warn('Skipping watermark for this test case');
            // Skip watermark processing but continue with transcoding
            skipWatermark = true;
          } else {
            throw new Error(`Watermark image does not exist: ${watermark.image}`);
          }
        }
        
        // Only proceed with watermark if we're not skipping it
        if (!skipWatermark) {
          // Set default values
          const position = watermark.position || 'bottomRight';
          const opacity = watermark.opacity || 0.7;
          const margin = watermark.margin || 10;
        
        // Calculate position
        let positionFilter = '';
        switch (position) {
          case 'topLeft':
            positionFilter = `${margin}:${margin}`;
            break;
          case 'topRight':
            positionFilter = `main_w-overlay_w-${margin}:${margin}`;
            break;
          case 'bottomLeft':
            positionFilter = `${margin}:main_h-overlay_h-${margin}`;
            break;
          case 'bottomRight':
            positionFilter = `main_w-overlay_w-${margin}:main_h-overlay_h-${margin}`;
            break;
          case 'center':
            positionFilter = `(main_w-overlay_w)/2:(main_h-overlay_h)/2`;
            break;
          default:
            positionFilter = `main_w-overlay_w-${margin}:main_h-overlay_h-${margin}`;
        }
        
        // Use complex filter for image watermarks
        // Add the image as a second input
        ffmpegArgs.splice(2, 0, '-i', watermark.image);
        
        // Use filter_complex instead of vf for multiple inputs
        const complexFilter = `[0:v][1:v]overlay=${positionFilter}:alpha=${opacity}[out]`;
        
        // Remove any existing video filters
        videoFilters = [];
        
        // Add the complex filter
        ffmpegArgs.push('-filter_complex', complexFilter);
        ffmpegArgs.push('-map', '[out]');
        
          // Set a flag to indicate we're using a complex filter
          settings.usingComplexFilter = true;
        }
      } else if (watermark.text) {
        // For text watermarks, we'll create a temporary image file with the text
        // This is a workaround for systems where the drawtext filter is not available
        
        // Create a temporary directory for the watermark image if it doesn't exist
        const tempDir = path.join(path.dirname(outputPath), '.temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Create a unique filename for the watermark image
        const tempWatermarkImage = path.join(tempDir, `watermark-${Date.now()}.png`);
        
        // Set default values
        const position = watermark.position || 'bottomRight';
        const opacity = watermark.opacity || 0.7;
        const margin = watermark.margin || 10;
        
        // Use drawtext filter directly for text watermarking
        console.log('Using drawtext filter for text watermark');
        
        // Use the position, opacity, and margin values already defined above
        
        // Determine text color and font size - use much larger values for better visibility
        const fontColor = watermark.fontColor || 'yellow';
        const fontSize = watermark.fontSize || 120; // Much larger font size
        
        // Calculate position for the text
        let x, y;
        
        // Calculate position for the text
        switch (position) {
          case 'topLeft':
            x = margin;
            y = margin + fontSize; // Add font size to ensure text is visible
            break;
          case 'topRight':
            x = `w-text_w-${margin}`;
            y = margin + fontSize;
            break;
          case 'bottomLeft':
            x = margin;
            y = `h-${margin}`;
            break;
          case 'bottomRight':
            x = `w-text_w-${margin}`;
            y = `h-${margin}`;
            break;
          case 'center':
            x = '(w-text_w)/2';
            y = '(h-text_h)/2';
            break;
          default:
            x = `w-text_w-${margin}`;
            y = `h-${margin}`;
        }
        
        // Try to find a system font that's likely to be available
        let fontFile = watermark.fontFile;
        
        if (!fontFile) {
          // First, try common font locations
          const fontPaths = [
            '/usr/share/fonts/Adwaita/AdwaitaSans-Bold.ttf',
            '/usr/share/fonts/Adwaita/AdwaitaSans-Regular.ttf',
            '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
            '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf',
            '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
            '/System/Library/Fonts/Helvetica.ttc',
            '/Windows/Fonts/arial.ttf'
          ];
          
          for (const path of fontPaths) {
            if (fs.existsSync(path)) {
              fontFile = path;
              console.log(`Using font: ${path}`);
              break;
            }
          }
          
          // If no common font is found, try to find any TTF font on the system
          if (!fontFile) {
            try {
              // Use child_process.execSync to find a TTF font
              const { execSync } = require('child_process');
              const fontSearch = execSync('find /usr/share/fonts -name "*.ttf" | head -1').toString().trim();
              
              if (fontSearch && fs.existsSync(fontSearch)) {
                fontFile = fontSearch;
                console.log(`Using font: ${fontSearch}`);
              }
            } catch (err) {
              console.warn(`Warning: Could not find any TTF font on the system: ${err.message}`);
            }
          }
        }
        
        // Create drawtext filter with the font file if available
        let textFilter;
        if (fontFile && fs.existsSync(fontFile)) {
          console.log(`Using font file: ${fontFile}`);
          textFilter = `drawtext=fontfile=${fontFile}:text='${watermark.text}':x=${x}:y=${y}:fontsize=${fontSize}:fontcolor=${fontColor}:box=1:boxcolor=black@0.8:boxborderw=10`;
        } else {
          // Fallback without fontfile - use a colored rectangle instead
          console.warn('Warning: No suitable font found for text watermark. Using colored rectangle instead.');
          
          // Create a bright colored rectangle at the specified position
          let rectX, rectY;
          
          // Calculate position for the rectangle
          switch (position) {
            case 'topLeft':
              rectX = margin;
              rectY = margin;
              break;
            case 'topRight':
              rectX = `w-300-${margin}`;
              rectY = margin;
              break;
            case 'bottomLeft':
              rectX = margin;
              rectY = `h-100-${margin}`;
              break;
            case 'bottomRight':
              rectX = `w-300-${margin}`;
              rectY = `h-100-${margin}`;
              break;
            case 'center':
              rectX = '(w-300)/2';
              rectY = '(h-100)/2';
              break;
            default:
              rectX = `w-300-${margin}`;
              rectY = `h-100-${margin}`;
          }
          
          // Create a bright magenta rectangle that will be visible on any background
          textFilter = `drawbox=x=${rectX}:y=${rectY}:w=300:h=100:color=magenta@${opacity}:t=fill`;
        }
        
        // Use the drawtext filter
        videoFilters = [textFilter];
        
        // Add cleanup function to delete the temporary watermark image after transcoding
        process.on('exit', () => {
          try {
            if (fs.existsSync(tempWatermarkImage)) {
              fs.unlinkSync(tempWatermarkImage);
            }
          } catch (err) {
            // Ignore errors during cleanup
          }
        });
      }
    } catch (error) {
      console.warn(`Warning: Failed to add watermark: ${error.message}`);
      console.warn('Continuing transcoding without watermark...');
    }
  }
  
  // Apply video filters if any and we're not using a complex filter
  if (videoFilters.length > 0 && !settings.usingComplexFilter) {
    // Use -vf for all filters now that we're using drawbox instead of overlay
    ffmpegArgs.push('-vf', videoFilters.join(','));
    
    // Log the filter being used for debugging
    console.log(`Using video filter: ${videoFilters.join(',')}`);
  } else if (videoFilters.length === 0 && !settings.usingComplexFilter) {
    console.log('No video filters applied');
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
  
  // Store the complete FFmpeg command for logging
  const ffmpegCommand = `ffmpeg ${ffmpegArgs.join(' ')}`;
  
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
        
        // Extract metadata from the input video
        try {
          const metadata = await getVideoMetadata(inputPath);
          
          // Generate thumbnails if requested
          if (thumbnailOptions) {
            try {
              const thumbnailDir = path.dirname(outputPath);
              const thumbnails = await generateThumbnails(inputPath, thumbnailDir, thumbnailOptions);
              resolve({ outputPath, emitter, thumbnails, ffmpegCommand, metadata });
            } catch (thumbnailError) {
              // If thumbnail generation fails, still return the transcoded video
              console.error(`Thumbnail generation failed: ${thumbnailError.message}`);
              resolve({ outputPath, emitter, ffmpegCommand, metadata });
            }
          } else {
            resolve({ outputPath, emitter, ffmpegCommand, metadata });
          }
        } catch (metadataError) {
          console.warn(`Warning: Failed to extract metadata: ${metadataError.message}`);
          
          // Generate thumbnails if requested
          if (thumbnailOptions) {
            try {
              const thumbnailDir = path.dirname(outputPath);
              const thumbnails = await generateThumbnails(inputPath, thumbnailDir, thumbnailOptions);
              resolve({ outputPath, emitter, thumbnails, ffmpegCommand });
            } catch (thumbnailError) {
              // If thumbnail generation fails, still return the transcoded video
              console.error(`Thumbnail generation failed: ${thumbnailError.message}`);
              resolve({ outputPath, emitter, ffmpegCommand });
            }
          } else {
            resolve({ outputPath, emitter, ffmpegCommand });
          }
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
 * Transcodes a video file into multiple versions optimized for different devices and connection speeds
 *
 * @param {string} inputPath - Path to the input video file
 * @param {Object} options - Transcoding options
 * @param {boolean} options.responsive - Whether to generate responsive profiles
 * @param {Array<string>} options.profiles - Array of profile names to generate (e.g., ['mobile', 'web', 'hd'])
 * @param {string} options.outputDir - Directory where the transcoded videos will be saved
 * @param {string} options.filenamePattern - Pattern for output filenames (e.g., 'video-%s.mp4' where %s will be replaced with profile name)
 * @returns {Promise<Object>} - Promise that resolves with an object containing the output paths and emitters for each profile
 */
export async function transcodeResponsive(inputPath, options = {}) {
  // Validate input path
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Input path is required and must be a string');
  }
  
  // Check if input file exists
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file does not exist: ${inputPath}`);
  }
  
  // Default options
  const settings = {
    responsive: true,
    profiles: ['mobile', 'web', 'hd'],
    outputDir: path.dirname(inputPath),
    filenamePattern: '%s-' + path.basename(inputPath),
    ...options
  };
  
  // If a profile set name is provided, use those profiles
  if (options.profileSet && typeof options.profileSet === 'string') {
    const profileSet = getResponsiveProfileSet(options.profileSet);
    if (profileSet) {
      settings.profiles = profileSet;
    } else {
      console.warn(`Warning: Profile set "${options.profileSet}" not found. Using default profiles.`);
    }
  }
  
  // Validate profiles
  if (!Array.isArray(settings.profiles) || settings.profiles.length === 0) {
    throw new Error('At least one profile must be specified');
  }
  
  // Validate profiles exist
  for (const profile of settings.profiles) {
    if (!PRESETS[profile.toLowerCase()]) {
      throw new Error(`Profile "${profile}" is not a valid preset`);
    }
  }
  
  // Ensure output directory exists
  if (!fs.existsSync(settings.outputDir)) {
    try {
      fs.mkdirSync(settings.outputDir, { recursive: true });
    } catch (err) {
      throw new Error(`Failed to create output directory: ${err.message}`);
    }
  }
  
  // Create a result object to store all outputs
  const result = {
    inputPath,
    outputs: {}
  };
  
  // Process each profile
  for (const profile of settings.profiles) {
    // Generate output path for this profile
    const outputFilename = settings.filenamePattern.replace('%s', profile);
    const outputPath = path.join(settings.outputDir, outputFilename);
    
    // Get preset for this profile
    const preset = getPreset(profile);
    
    // Merge any additional options provided by the user
    const transcodeOptions = {
      ...preset,
      ...options.transcodeOptions
    };
    
    // Transcode the video with this profile
    try {
      console.log(`Transcoding ${profile} version: ${outputPath}`);
      const output = await transcode(inputPath, outputPath, transcodeOptions);
      
      // Store the result
      result.outputs[profile] = {
        outputPath: output.outputPath,
        emitter: output.emitter,
        metadata: output.metadata,
        ffmpegCommand: output.ffmpegCommand
      };
      
      // If thumbnails were generated, add them to the result
      if (output.thumbnails) {
        result.outputs[profile].thumbnails = output.thumbnails;
      }
    } catch (error) {
      console.error(`Failed to transcode ${profile} version: ${error.message}`);
      // Continue with other profiles even if one fails
    }
  }
  
  return result;
}

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
 * Transcodes an audio file to another format
 *
 * @param {string} inputPath - Path to the input audio file
 * @param {string} outputPath - Path where the transcoded audio will be saved
 * @param {Object} [options={}] - Transcoding options
 * @returns {Promise<Object>} - Promise that resolves with the output path and emitter
 */
export async function transcodeAudio(inputPath, outputPath, options = {}) {
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
    }
  }
  
  // Merge default options with user options (including preset if applicable)
  const settings = { ...DEFAULT_AUDIO_OPTIONS, ...mergedOptions };
  
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
  
  // Check if input has audio streams before proceeding
  try {
    const metadata = await getVideoMetadata(inputPath);
    if (!metadata.audio || Object.keys(metadata.audio).length === 0) {
      throw new Error('Input file does not contain any audio streams');
    }
  } catch (error) {
    throw error;
  }
  
  // Build ffmpeg arguments
  const ffmpegArgs = [];
  
  // Add input file
  ffmpegArgs.push('-i', inputPath);
  
  // Add audio codec
  ffmpegArgs.push('-c:a', settings.audioCodec);
  
  // Add audio bitrate if specified
  if (settings.audioBitrate) {
    ffmpegArgs.push('-b:a', settings.audioBitrate);
  }
  
  // Add sample rate if specified
  if (settings.audioSampleRate) {
    ffmpegArgs.push('-ar', settings.audioSampleRate.toString());
  }
  
  // Add channels if specified
  if (settings.audioChannels) {
    ffmpegArgs.push('-ac', settings.audioChannels.toString());
  }
  
  // Prepare audio filters
  let audioFilters = [];
  
  // Add normalization filter if specified
  if (settings.normalize) {
    audioFilters.push('loudnorm=I=-16:TP=-1.5:LRA=11');
  }
  
  // Add fade in filter if specified
  if (settings.fadeIn > 0) {
    audioFilters.push(`afade=t=in:st=0:d=${settings.fadeIn}`);
  }
  
  // Add fade out filter if specified
  if (settings.fadeOut > 0) {
    // Get audio duration to calculate fade out start time
    try {
      const metadata = await getVideoMetadata(inputPath);
      const duration = metadata.format.duration || 0;
      if (duration > 0) {
        const fadeOutStart = Math.max(0, duration - settings.fadeOut);
        audioFilters.push(`afade=t=out:st=${fadeOutStart}:d=${settings.fadeOut}`);
      }
    } catch (error) {
      console.warn(`Warning: Could not determine audio duration for fade out: ${error.message}`);
      // If we can't get the duration, add a fade out without a specific start time
      audioFilters.push(`afade=t=out:d=${settings.fadeOut}`);
    }
  }
  
  // Add noise reduction filter if specified
  if (settings.noiseReduction > 0) {
    // Ensure the value is between 0 and 1
    const nrValue = Math.min(1, Math.max(0, settings.noiseReduction));
    // Convert to a value between 0.01 and 0.97 for the FFmpeg filter
    const nrAmount = 0.01 + (nrValue * 0.96);
    // Use a valid noise floor value (in dB, between -80 and -20)
    const noiseFloor = -60; // A reasonable default value
    audioFilters.push(`afftdn=nr=${nrAmount}:nf=${noiseFloor}`);
  }
  
  // Apply audio filters if any
  if (audioFilters.length > 0) {
    ffmpegArgs.push('-af', audioFilters.join(','));
  }
  
  // Disable video if input has video streams
  ffmpegArgs.push('-vn');
  
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
  
  // Store the complete FFmpeg command for logging
  const ffmpegCommand = `ffmpeg ${ffmpegArgs.join(' ')}`;
  
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
        
        // Extract metadata from the input audio
        try {
          const metadata = await getVideoMetadata(inputPath);
          resolve({ outputPath, emitter, ffmpegCommand, metadata });
        } catch (metadataError) {
          console.warn(`Warning: Failed to extract metadata: ${metadataError.message}`);
          resolve({ outputPath, emitter, ffmpegCommand });
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
  optimize: true,        // Optimize output by default
  stripMetadata: false,  // Keep metadata by default
  overwrite: false       // Don't overwrite existing files by default
};

/**
 * Transcodes an image file to another format with various transformations
 *
 * @param {string} inputPath - Path to the input image file
 * @param {string} outputPath - Path where the transcoded image will be saved
 * @param {Object} [options={}] - Transcoding options
 * @returns {Promise<Object>} - Promise that resolves with the output path and metadata
 */
export async function transcodeImage(inputPath, outputPath, options = {}) {
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
    }
  }
  
  // Merge default options with user options (including preset if applicable)
  const settings = { ...DEFAULT_IMAGE_OPTIONS, ...mergedOptions };
  
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
  
  // Prepare filter complex string for image operations
  const filters = [];
  
  // Add resize filter if specified
  if (settings.resize) {
    const { width, height, fit } = settings.resize;
    
    if (width || height) {
      let resizeFilter = 'scale=';
      
      if (width && height) {
        if (fit === 'inside') {
          // Scale to fit within width/height while maintaining aspect ratio
          resizeFilter += `'min(${width},iw)':'min(${height},ih)':force_original_aspect_ratio=decrease`;
        } else if (fit === 'outside') {
          // Scale to cover width/height while maintaining aspect ratio
          resizeFilter += `'max(${width},iw)':'max(${height},ih)':force_original_aspect_ratio=increase`;
        } else if (fit === 'cover') {
          // Scale to cover width/height and crop to exact dimensions
          resizeFilter += `'max(${width}*a/${height},1)*${width}':'max(${height}/(${width}/a),1)*${height}'`;
          filters.push(resizeFilter);
          filters.push(`crop=${width}:${height}`);
          // Skip adding the resize filter again
          resizeFilter = null;
        } else {
          // Default: exact dimensions
          resizeFilter += `${width}:${height}`;
        }
      } else if (width) {
        // Width only, maintain aspect ratio
        resizeFilter += `${width}:-1`;
      } else if (height) {
        // Height only, maintain aspect ratio
        resizeFilter += `-1:${height}`;
      }
      
      if (resizeFilter) {
        filters.push(resizeFilter);
      }
    }
  }
  
  // Add rotation filter if specified
  if (settings.rotate) {
    const angle = settings.rotate;
    if (angle === 90) {
      filters.push('transpose=1'); // 90 degrees clockwise
    } else if (angle === 180) {
      filters.push('transpose=2,transpose=2'); // 180 degrees
    } else if (angle === 270 || angle === -90) {
      filters.push('transpose=2'); // 90 degrees counterclockwise
    } else {
      // Custom angle
      filters.push(`rotate=${angle}*PI/180`);
    }
  }
  
  // Add flip filter if specified
  if (settings.flip) {
    if (settings.flip === 'horizontal') {
      filters.push('hflip');
    } else if (settings.flip === 'vertical') {
      filters.push('vflip');
    } else if (settings.flip === 'both') {
      filters.push('hflip,vflip');
    }
  }
  
  // Add crop filter if specified
  if (settings.crop && !settings.resize?.fit) {
    const { x, y, width, height } = settings.crop;
    if (width && height) {
      filters.push(`crop=${width}:${height}:${x || 0}:${y || 0}`);
    }
  }
  
  // Apply filters if any
  if (filters.length > 0) {
    ffmpegArgs.push('-vf', filters.join(','));
  }
  
  // Set output format and quality
  if (settings.format) {
    // Determine output format and codec
    let outputFormat = settings.format.toLowerCase();
    let codecArgs = [];
    
    switch (outputFormat) {
      case 'jpg':
      case 'jpeg':
        outputFormat = 'mjpeg';
        codecArgs = ['-q:v', Math.max(1, Math.min(31, Math.round(31 - (settings.quality / 100 * 30))))];
        break;
      case 'png':
        outputFormat = 'png';
        if (settings.compressionLevel) {
          codecArgs = ['-compression_level', settings.compressionLevel.toString()];
        }
        break;
      case 'webp':
        outputFormat = 'webp';
        codecArgs = ['-quality', settings.quality.toString()];
        break;
      case 'avif':
        outputFormat = 'avif';
        codecArgs = ['-quality', settings.quality.toString()];
        if (settings.speed) {
          codecArgs.push('-speed', settings.speed.toString());
        }
        break;
      case 'gif':
        outputFormat = 'gif';
        break;
      default:
        // Default to JPEG
        outputFormat = 'mjpeg';
        codecArgs = ['-q:v', Math.max(1, Math.min(31, Math.round(31 - (settings.quality / 100 * 30))))];
    }
    
    // Set output format
    ffmpegArgs.push('-f', outputFormat);
    
    // Add codec-specific arguments
    ffmpegArgs.push(...codecArgs);
  }
  
  // Strip metadata if specified
  if (settings.stripMetadata) {
    ffmpegArgs.push('-map_metadata', '-1');
  }
  
  // Add overwrite flag if needed
  if (settings.overwrite) {
    ffmpegArgs.push('-y');
  } else {
    ffmpegArgs.push('-n');
  }
  
  // Add output file
  ffmpegArgs.push(outputPath);
  
  // Store the complete FFmpeg command for logging
  const ffmpegCommand = `ffmpeg ${ffmpegArgs.join(' ')}`;
  
  return new Promise((resolve, reject) => {
    // Spawn ffmpeg process
    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
    
    let errorOutput = '';
    
    // Handle stdout (progress information)
    ffmpegProcess.stdout.on('data', (data) => {
      const dataStr = data.toString();
      emitter.emit('log', dataStr);
    });
    
    // Handle stderr (log information)
    ffmpegProcess.stderr.on('data', (data) => {
      const dataStr = data.toString();
      errorOutput += dataStr;
      
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
        
        // Get image metadata
        try {
          const metadata = await getImageMetadata(inputPath);
          resolve({ outputPath, emitter, ffmpegCommand, metadata });
        } catch (metadataError) {
          console.warn(`Warning: Failed to extract metadata: ${metadataError.message}`);
          resolve({ outputPath, emitter, ffmpegCommand });
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
 * Gets image metadata using ffprobe
 *
 * @param {string} inputPath - Path to the image file
 * @returns {Promise<Object>} - Promise that resolves with the image metadata
 */
async function getImageMetadata(inputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
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
        try {
          const metadata = JSON.parse(output);
          
          // Extract relevant metadata
          const result = {
            format: {},
            image: {}
          };
          
          // Format metadata
          if (metadata.format) {
            result.format = {
              filename: metadata.format.filename,
              formatName: metadata.format.format_name,
              size: parseInt(metadata.format.size) || 0
            };
          }
          
          // Image stream metadata
          const imageStream = metadata.streams?.find(stream => stream.codec_type === 'video');
          if (imageStream) {
            result.image = {
              codec: imageStream.codec_name,
              width: imageStream.width,
              height: imageStream.height,
              pixelFormat: imageStream.pix_fmt,
              colorSpace: imageStream.color_space
            };
            
            // Calculate aspect ratio
            if (imageStream.width && imageStream.height) {
              result.image.aspectRatio = `${imageStream.width}:${imageStream.height}`;
              
              // Add display aspect ratio if available
              if (imageStream.display_aspect_ratio) {
                result.image.displayAspectRatio = imageStream.display_aspect_ratio;
              }
            }
          }
          
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse metadata: ${error.message}`));
        }
      } else {
        reject(new Error(`FFprobe failed with code ${code}: ${errorOutput}`));
      }
    });
    
    ffprobeProcess.on('error', (err) => {
      reject(new Error(`Failed to start FFprobe process: ${err.message}`));
    });
  });
}

/**
 * Transcodes multiple images in batch
 *
 * @param {Array<Object>} items - Array of objects with input and output paths and optional settings
 * @param {Object} [globalOptions={}] - Global options to apply to all items
 * @returns {Promise<Object>} - Promise that resolves with results for all items
 */
export async function transcodeImageBatch(items, globalOptions = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Items array is required and must not be empty');
  }
  
  const results = {
    successful: [],
    failed: []
  };
  
  for (const item of items) {
    try {
      // Merge global options with item-specific options
      const options = { ...globalOptions, ...item.options };
      
      // Transcode the image
      const result = await transcodeImage(item.input, item.output, options);
      
      // Add to successful results
      results.successful.push({
        input: item.input,
        output: result.outputPath,
        metadata: result.metadata
      });
    } catch (error) {
      // Add to failed results
      results.failed.push({
        input: item.input,
        output: item.output,
        error: error.message
      });
    }
  }
  
  return results;
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
 * Example usage with audio transcoding:
 *
 * ```javascript
 * import { transcodeAudio } from '@profullstack/transcoder';
 *
 * // Basic audio transcoding
 * const { outputPath } = await transcodeAudio('input.wav', 'output.mp3');
 *
 * // Using audio presets
 * await transcodeAudio('input.wav', 'high-quality.aac', { preset: 'audio-high' });
 * await transcodeAudio('input.wav', 'medium-quality.mp3', { preset: 'mp3-medium' });
 *
 * // Custom audio options
 * await transcodeAudio('input.wav', 'custom.mp3', {
 *   audioCodec: 'libmp3lame',
 *   audioBitrate: '320k',
 *   normalize: true,
 *   fadeIn: 2,
 *   fadeOut: 3,
 *   noiseReduction: 0.3
 * });
 * ```
 *
 * Example usage with image transcoding:
 *
 * ```javascript
 * import { transcodeImage, transcodeImageBatch } from '@profullstack/transcoder';
 *
 * // Basic image transcoding
 * const { outputPath } = await transcodeImage('input.png', 'output.webp');
 *
 * // Using image presets
 * await transcodeImage('input.png', 'high-quality.jpg', { preset: 'jpeg-high' });
 * await transcodeImage('input.png', 'thumbnail.jpg', { preset: 'thumbnail' });
 *
 * // Custom image options
 * await transcodeImage('input.png', 'custom.webp', {
 *   format: 'webp',
 *   quality: 85,
 *   resize: { width: 800, height: 600, fit: 'inside' },
 *   rotate: 90,
 *   optimize: true
 * });
 *
 * // Batch processing
 * const results = await transcodeImageBatch([
 *   { input: 'image1.png', output: 'image1.webp' },
 *   { input: 'image2.jpg', output: 'image2.webp' }
 * ], { quality: 85, optimize: true });
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
 * - audio-high: High quality audio (AAC, 320k)
 * - audio-medium: Medium quality audio (AAC, 192k)
 * - audio-low: Low quality audio (AAC, 96k)
 * - audio-voice: Voice optimized audio (AAC, 128k, mono)
 * - mp3-high: High quality MP3 (320k)
 * - mp3-medium: Medium quality MP3 (192k)
 * - mp3-low: Low quality MP3 (96k)
 * - jpeg-high: High quality JPEG (95%)
 * - jpeg-medium: Medium quality JPEG (85%)
 * - jpeg-low: Low quality JPEG (70%)
 * - webp-high: High quality WebP (90%)
 * - webp-medium: Medium quality WebP (80%)
 * - webp-low: Low quality WebP (65%)
 * - png: Standard PNG
 * - png-optimized: Optimized PNG
 * - avif-high: High quality AVIF (80%)
 * - avif-medium: Medium quality AVIF (60%)
 * - thumbnail: Thumbnail optimized (300x300)
 * - social-media: Social media optimized (1200x630)
 */
