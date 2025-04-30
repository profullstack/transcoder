/**
 * @profullstack/transcoder - Batch Processing Module
 * Contains functionality for batch processing multiple files
 */

import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { transcode } from './video.js';
import { transcodeAudio } from './audio.js';
import { transcodeImage } from './image.js';
import { getPreset } from '../presets.js';

/**
 * BatchProcessEmitter class for emitting batch processing events
 * @extends EventEmitter
 */
export class BatchProcessEmitter extends EventEmitter {
  constructor() {
    super();
  }
}

/**
 * Supported file extensions for different media types
 */
export const SUPPORTED_EXTENSIONS = {
  video: ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv', '.m4v', '.3gp'],
  audio: ['.mp3', '.wav', '.aac', '.ogg', '.flac', '.m4a', '.wma'],
  image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.bmp', '.svg']
};

/**
 * Default output extensions for different media types and presets
 */
export const DEFAULT_OUTPUT_EXTENSIONS = {
  video: {
    default: '.mp4',
    presets: {
      'web': '.mp4',
      'mobile': '.mp4',
      'hd': '.mp4',
      'youtube-hd': '.mp4',
      'youtube-4k': '.mp4',
      'instagram': '.mp4',
      'twitter': '.mp4',
      'facebook': '.mp4',
      'tiktok': '.mp4',
      'vimeo-hd': '.mp4'
    }
  },
  audio: {
    default: '.mp3',
    presets: {
      'audio-high': '.aac',
      'audio-medium': '.aac',
      'audio-low': '.aac',
      'audio-voice': '.aac',
      'mp3-high': '.mp3',
      'mp3-medium': '.mp3',
      'mp3-low': '.mp3'
    }
  },
  image: {
    default: '.jpg',
    presets: {
      'jpeg-high': '.jpg',
      'jpeg-medium': '.jpg',
      'jpeg-low': '.jpg',
      'webp-high': '.webp',
      'webp-medium': '.webp',
      'webp-low': '.webp',
      'png': '.png',
      'png-optimized': '.png',
      'avif-high': '.avif',
      'avif-medium': '.avif',
      'thumbnail': '.jpg',
      'social-media': '.jpg',
      'square': '.png',
      'square-white': '.jpg',
      'instagram-square': '.jpg'
    }
  }
};

/**
 * Determines the media type based on file extension
 * 
 * @param {string} filePath - Path to the file
 * @returns {string|null} - Media type ('video', 'audio', 'image') or null if unsupported
 */
function getMediaType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  if (SUPPORTED_EXTENSIONS.video.includes(ext)) {
    return 'video';
  } else if (SUPPORTED_EXTENSIONS.audio.includes(ext)) {
    return 'audio';
  } else if (SUPPORTED_EXTENSIONS.image.includes(ext)) {
    return 'image';
  }
  
  return null;
}

/**
 * Get the appropriate output extension based on media type and preset
 *
 * @param {string} mediaType - Media type ('video', 'audio', 'image')
 * @param {Object} settings - Batch processing settings
 * @param {string} filePath - Original file path (for fallback)
 * @returns {string} - Output file extension (e.g., '.mp4', '.mp3', '.jpg')
 */
function getOutputExtension(mediaType, settings, filePath) {
  // If an output extension is explicitly specified, use it
  if (settings.outputExtension) {
    return settings.outputExtension;
  }
  
  // Get the preset name if specified
  const presetName = settings.transcodeOptions?.preset?.toLowerCase();
  
  // If a preset is specified and there's a default extension for it, use it
  if (presetName && DEFAULT_OUTPUT_EXTENSIONS[mediaType]?.presets?.[presetName]) {
    return DEFAULT_OUTPUT_EXTENSIONS[mediaType].presets[presetName];
  }
  
  // For audio files, check if we're only applying enhancements
  if (mediaType === 'audio') {
    // Check if we're only applying audio enhancements without changing the codec
    const isEnhancementOnly = settings.transcodeOptions?.audio &&
      !settings.transcodeOptions?.audioCodec;
    
    // If we're only enhancing, preserve the original extension
    if (isEnhancementOnly) {
      return path.extname(filePath);
    }
    
    // Otherwise, ensure the extension matches the codec
    const audioCodec = settings.transcodeOptions?.audioCodec?.toLowerCase();
    if (audioCodec) {
      if (audioCodec === 'libmp3lame' || audioCodec.includes('mp3')) {
        return '.mp3';
      } else if (audioCodec === 'aac' || audioCodec.includes('aac')) {
        return '.aac';
      } else if (audioCodec === 'libvorbis' || audioCodec.includes('vorbis')) {
        return '.ogg';
      } else if (audioCodec === 'flac' || audioCodec.includes('flac')) {
        return '.flac';
      } else if (audioCodec.includes('pcm') || audioCodec.includes('wav')) {
        return '.wav';
      }
    }
    
    // Default audio extension if codec doesn't match any known format
    return '.mp3';
  }
  
  // Otherwise, use the default extension for the media type
  return DEFAULT_OUTPUT_EXTENSIONS[mediaType]?.default || path.extname(filePath);
}

/**
 * Scans a directory for media files
 * 
 * @param {string} dirPath - Path to the directory to scan
 * @param {Object} options - Scan options
 * @param {Array<string>} [options.mediaTypes] - Media types to include ('video', 'audio', 'image')
 * @param {Array<string>} [options.extensions] - File extensions to include
 * @param {boolean} [options.recursive=false] - Whether to scan subdirectories
 * @returns {Promise<Array<string>>} - Promise that resolves with an array of file paths
 */
export async function scanDirectory(dirPath, options = {}) {
  const {
    mediaTypes = ['video', 'audio', 'image'],
    extensions = [],
    recursive = false
  } = options;
  
  // Validate directory path
  if (!fs.existsSync(dirPath)) {
    throw new Error(`Directory does not exist: ${dirPath}`);
  }
  
  const stats = fs.statSync(dirPath);
  if (!stats.isDirectory()) {
    throw new Error(`Not a directory: ${dirPath}`);
  }
  
  // Build list of supported extensions
  let supportedExtensions = [];
  
  if (extensions.length > 0) {
    // Use provided extensions
    supportedExtensions = extensions.map(ext => ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`);
  } else {
    // Use extensions for specified media types
    mediaTypes.forEach(type => {
      if (SUPPORTED_EXTENSIONS[type]) {
        supportedExtensions = [...supportedExtensions, ...SUPPORTED_EXTENSIONS[type]];
      }
    });
  }
  
  // Read directory contents
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  // Process files and subdirectories
  const files = [];
  
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory() && recursive) {
      // Recursively scan subdirectory
      const subFiles = await scanDirectory(entryPath, options);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      // Check if file has a supported extension
      const ext = path.extname(entry.name).toLowerCase();
      if (supportedExtensions.includes(ext)) {
        files.push(entryPath);
      }
    }
  }
  
  return files;
}

/**
 * Process a single file
 * 
 * @param {string} filePath - Path to the file to process
 * @param {Object} settings - Batch processing settings
 * @param {BatchProcessEmitter} emitter - Batch process emitter
 * @param {number} index - Index of the file in the batch
 * @returns {Promise<Object>} - Promise that resolves with the processing result
 */
async function processFile(filePath, settings, emitter, index) {
  try {
    // Determine media type
    const mediaType = getMediaType(filePath);
    if (!mediaType) {
      throw new Error(`Unsupported file type: ${filePath}`);
    }
    
    // Get the appropriate output extension
    const outputExt = getOutputExtension(mediaType, settings, filePath);
    
    // Generate output path
    const fileName = path.basename(filePath, path.extname(filePath));
    const outputFileName = `${settings.outputPrefix}${fileName}${settings.outputSuffix}${outputExt}`;
    const outputPath = path.join(settings.outputDir, outputFileName);
    
    // Emit file start event
    emitter.emit('fileStart', { 
      filePath, 
      outputPath, 
      mediaType,
      index
    });
    
    // Create a progress callback function
    const progressCallback = (progress) => {
      // Only log progress details if verbose is enabled
      if (settings.verbose) {
        console.log('Progress callback called:', progress);
      }
      
      emitter.emit('fileProgress', { 
        filePath,
        outputPath,
        mediaType,
        percent: progress.time && progress.duration ? 
          Math.min(100, Math.round((progress.time / progress.duration) * 100)) : 0,
        ...progress
      });
    };
    
    // Add the progress callback to the transcode options
    const transcodeOptionsWithProgress = {
      ...settings.transcodeOptions,
      onProgress: progressCallback,
      verbose: settings.verbose
    };
    
    // Process file based on media type
    let result;
    
    if (mediaType === 'video') {
      // Emit initial progress
      emitter.emit('fileProgress', { filePath, outputPath, mediaType, percent: 0 });
      
      result = await transcode(filePath, outputPath, transcodeOptionsWithProgress);
    } else if (mediaType === 'audio') {
      // For audio, we don't have real-time progress, so emit a few progress updates
      emitter.emit('fileProgress', { filePath, outputPath, mediaType, percent: 25 });
      result = await transcodeAudio(filePath, outputPath, transcodeOptionsWithProgress);
      emitter.emit('fileProgress', { filePath, outputPath, mediaType, percent: 75 });
    } else if (mediaType === 'image') {
      // For images, we don't have real-time progress, so emit a few progress updates
      emitter.emit('fileProgress', { filePath, outputPath, mediaType, percent: 25 });
      result = await transcodeImage(filePath, outputPath, transcodeOptionsWithProgress);
      emitter.emit('fileProgress', { filePath, outputPath, mediaType, percent: 75 });
    }
    
    // Emit 100% progress to ensure the progress bar is completed
    emitter.emit('fileProgress', { filePath, outputPath, mediaType, percent: 100 });
    
    // Emit file complete event
    emitter.emit('fileComplete', { 
      filePath, 
      outputPath, 
      mediaType,
      metadata: result.metadata,
      success: true
    });
    
    return {
      input: filePath,
      output: outputPath,
      mediaType,
      metadata: result.metadata,
      success: true
    };
  } catch (error) {
    // Only log detailed error if verbose is enabled
    if (settings.verbose) {
      console.error('Error processing file:', error);
    }
    
    // Emit file error event
    emitter.emit('fileError', { 
      filePath, 
      error: error.message
    });
    
    return {
      input: filePath,
      error: error.message,
      success: false
    };
  }
}

/**
 * Processes a batch of files in parallel
 * 
 * @param {Array<string>} filePaths - Array of file paths to process
 * @param {Object} options - Batch processing options
 * @param {string} options.outputDir - Directory where processed files will be saved
 * @param {Object} options.transcodeOptions - Options for transcoding
 * @param {string} [options.outputExtension] - Extension for output files (e.g., '.mp4')
 * @param {string} [options.outputPrefix=''] - Prefix for output filenames
 * @param {string} [options.outputSuffix=''] - Suffix for output filenames
 * @param {number} [options.concurrency=1] - Number of files to process concurrently
 * @param {BatchProcessEmitter} [options.emitter] - Custom emitter for batch processing events
 * @param {boolean} [options.verbose=false] - Whether to log verbose output
 * @returns {Promise<Object>} - Promise that resolves with batch processing results
 */
export async function batchProcess(filePaths, options) {
  // Create an emitter for batch processing events or use the provided one
  const emitter = options.emitter || new BatchProcessEmitter();
  
  // Default options
  const settings = {
    outputDir: path.dirname(filePaths[0]),
    transcodeOptions: {},
    outputExtension: null,
    outputPrefix: '',
    outputSuffix: '',
    concurrency: 2, // Default to 2 concurrent processes
    verbose: false,
    ...options
  };
  
  // Ensure output directory exists
  if (!fs.existsSync(settings.outputDir)) {
    fs.mkdirSync(settings.outputDir, { recursive: true });
  }
  
  // Results object
  const results = {
    total: filePaths.length,
    completed: 0,
    successful: [],
    failed: []
  };
  
  // Emit start event
  emitter.emit('start', { total: filePaths.length });
  
  // Process files in parallel with concurrency limit
  return new Promise((resolve) => {
    // Track active promises
    let activePromises = 0;
    let fileIndex = 0;
    let completedCount = 0;
    
    // Function to process the next file
    const processNextFile = () => {
      // If we've processed all files and no active promises, we're done
      if (fileIndex >= filePaths.length && activePromises === 0) {
        // Emit complete event
        emitter.emit('complete', results);
        resolve({ results, emitter });
        return;
      }
      
      // If we've reached the end of the files, just wait for active promises
      if (fileIndex >= filePaths.length) {
        return;
      }
      
      // If we've reached concurrency limit, wait for some promises to complete
      if (activePromises >= settings.concurrency) {
        return;
      }
      
      // Get the next file
      const filePath = filePaths[fileIndex];
      fileIndex++;
      
      // Increment active promises
      activePromises++;
      
      // Process the file
      processFile(filePath, settings, emitter, fileIndex)
        .then((result) => {
          // Update results
          if (result.success) {
            results.successful.push(result);
          } else {
            results.failed.push(result);
          }
          
          // Update completed count
          completedCount++;
          results.completed = completedCount;
          
          // Emit progress event
          emitter.emit('progress', { 
            completed: completedCount,
            total: filePaths.length,
            percent: Math.round((completedCount / filePaths.length) * 100)
          });
        })
        .catch((error) => {
          // Log error
          if (settings.verbose) {
            console.error('Error processing file:', error);
          }
          
          // Update results
          results.failed.push({
            input: filePath,
            error: error.message,
            success: false
          });
          
          // Update completed count
          completedCount++;
          results.completed = completedCount;
          
          // Emit progress event
          emitter.emit('progress', { 
            completed: completedCount,
            total: filePaths.length,
            percent: Math.round((completedCount / filePaths.length) * 100)
          });
        })
        .finally(() => {
          // Decrement active promises
          activePromises--;
          
          // Process next file
          processNextFile();
        });
      
      // Try to process more files if we haven't reached concurrency limit
      processNextFile();
    };
    
    // Start processing files
    processNextFile();
  });
}

/**
 * Processes all media files in a directory
 * 
 * @param {string} dirPath - Path to the directory containing media files
 * @param {Object} options - Batch processing options
 * @param {Object} scanOptions - Options for scanning the directory
 * @returns {Promise<Object>} - Promise that resolves with batch processing results
 */
export async function batchProcessDirectory(dirPath, options = {}, scanOptions = {}) {
  // Scan directory for media files
  const filePaths = await scanDirectory(dirPath, scanOptions);
  
  if (filePaths.length === 0) {
    throw new Error(`No supported media files found in directory: ${dirPath}`);
  }
  
  // Only log detailed file count if verbose is enabled
  if (options.verbose) {
    console.log(`Found ${filePaths.length} files to process`);
  }
  
  // Process files
  return batchProcess(filePaths, options);
}