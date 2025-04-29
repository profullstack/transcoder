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
 * Processes a batch of files
 * 
 * @param {Array<string>} filePaths - Array of file paths to process
 * @param {Object} options - Batch processing options
 * @param {string} options.outputDir - Directory where processed files will be saved
 * @param {Object} options.transcodeOptions - Options for transcoding
 * @param {string} [options.outputExtension] - Extension for output files (e.g., '.mp4')
 * @param {string} [options.outputPrefix=''] - Prefix for output filenames
 * @param {string} [options.outputSuffix=''] - Suffix for output filenames
 * @param {number} [options.concurrency=1] - Number of files to process concurrently
 * @returns {Promise<Object>} - Promise that resolves with batch processing results
 */
export async function batchProcess(filePaths, options) {
  // Create an emitter for batch processing events
  const emitter = new BatchProcessEmitter();
  
  // Default options
  const settings = {
    outputDir: path.dirname(filePaths[0]),
    transcodeOptions: {},
    outputExtension: null,
    outputPrefix: '',
    outputSuffix: '',
    concurrency: 1,
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
  
  // Process files
  emitter.emit('start', { total: filePaths.length });
  
  // Process files in batches based on concurrency
  for (let i = 0; i < filePaths.length; i += settings.concurrency) {
    const batch = filePaths.slice(i, i + settings.concurrency);
    const batchPromises = batch.map(async (filePath) => {
      try {
        // Determine media type
        const mediaType = getMediaType(filePath);
        if (!mediaType) {
          throw new Error(`Unsupported file type: ${filePath}`);
        }
        
        // Generate output path
        const fileName = path.basename(filePath, path.extname(filePath));
        const outputExt = settings.outputExtension || path.extname(filePath);
        const outputFileName = `${settings.outputPrefix}${fileName}${settings.outputSuffix}${outputExt}`;
        const outputPath = path.join(settings.outputDir, outputFileName);
        
        // Emit file start event
        emitter.emit('fileStart', { 
          filePath, 
          outputPath, 
          mediaType,
          index: results.completed + results.failed.length + 1
        });
        
        // Process file based on media type
        let result;
        
        if (mediaType === 'video') {
          result = await transcode(filePath, outputPath, settings.transcodeOptions);
        } else if (mediaType === 'audio') {
          result = await transcodeAudio(filePath, outputPath, settings.transcodeOptions);
        } else if (mediaType === 'image') {
          result = await transcodeImage(filePath, outputPath, settings.transcodeOptions);
        }
        
        // Add to successful results
        results.successful.push({
          input: filePath,
          output: outputPath,
          mediaType,
          metadata: result.metadata
        });
        
        // Emit file complete event
        emitter.emit('fileComplete', { 
          filePath, 
          outputPath, 
          mediaType,
          metadata: result.metadata,
          success: true
        });
      } catch (error) {
        // Add to failed results
        results.failed.push({
          input: filePath,
          error: error.message
        });
        
        // Emit file error event
        emitter.emit('fileError', { 
          filePath, 
          error: error.message
        });
      }
      
      // Update completed count
      results.completed++;
      
      // Emit progress event
      emitter.emit('progress', { 
        completed: results.completed,
        total: results.total,
        percent: Math.round((results.completed / results.total) * 100)
      });
    });
    
    // Wait for batch to complete
    await Promise.all(batchPromises);
  }
  
  // Emit complete event
  emitter.emit('complete', results);
  
  return { results, emitter };
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
  
  // Process files
  return batchProcess(filePaths, options);
}