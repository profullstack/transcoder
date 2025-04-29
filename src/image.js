/**
 * @profullstack/transcoder - Image Module
 * Contains functionality for transcoding image files
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { TranscodeEmitter, DEFAULT_IMAGE_OPTIONS, checkFfmpeg } from './core.js';
import { getImageMetadata, validatePaths, ensureOutputDirectory } from './utils.js';
import { getPreset, PRESETS } from '../presets.js';

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
  await validatePaths(inputPath, outputPath, settings.overwrite);
  
  // Build ImageMagick convert command arguments
  const convertArgs = [];
  
  // Add input file
  convertArgs.push(inputPath);
  
  // Apply transformations in the correct order
  
  // Resize if specified
  if (settings.resize && !settings.squarePad) {
    const { width, height, fit } = settings.resize;
    
    if (width || height) {
      let resizeArg = '';
      
      if (width && height) {
        if (fit === 'inside') {
          // Scale to fit within width/height while maintaining aspect ratio
          resizeArg = `${width}x${height}`;
        } else if (fit === 'outside') {
          // Scale to cover width/height while maintaining aspect ratio
          resizeArg = `${width}x${height}^`;
        } else if (fit === 'cover') {
          // Scale to cover width/height and crop to exact dimensions
          resizeArg = `${width}x${height}^`;
          convertArgs.push('-resize', resizeArg);
          convertArgs.push('-gravity', 'center');
          convertArgs.push('-extent', `${width}x${height}`);
          resizeArg = null; // Skip adding resize again
        } else {
          // Default: exact dimensions
          resizeArg = `${width}x${height}!`;
        }
      } else if (width) {
        // Width only, maintain aspect ratio
        resizeArg = `${width}x`;
      } else if (height) {
        // Height only, maintain aspect ratio
        resizeArg = `x${height}`;
      }
      
      if (resizeArg) {
        convertArgs.push('-resize', resizeArg);
      }
    }
  }
  
  // Rotation if specified
  if (settings.rotate) {
    convertArgs.push('-rotate', settings.rotate.toString());
  }
  
  // Flip if specified
  if (settings.flip) {
    if (settings.flip === 'horizontal') {
      convertArgs.push('-flop');
    } else if (settings.flip === 'vertical') {
      convertArgs.push('-flip');
    } else if (settings.flip === 'both') {
      convertArgs.push('-flip', '-flop');
    }
  }
  
  // Crop if specified
  if (settings.crop && !settings.resize?.fit) {
    const { x, y, width, height } = settings.crop;
    if (width && height) {
      convertArgs.push('-crop', `${width}x${height}+${x || 0}+${y || 0}`);
    }
  }
  
  // Handle square padding if specified
  if (settings.squarePad) {
    try {
      // Get image dimensions using ImageMagick identify
      const identifyProcess = spawn('identify', ['-format', '%w %h', inputPath]);
      
      let identifyOutput = '';
      let identifyError = '';
      
      await new Promise((resolve, reject) => {
        identifyProcess.stdout.on('data', (data) => {
          identifyOutput += data.toString();
        });
        
        identifyProcess.stderr.on('data', (data) => {
          identifyError += data.toString();
        });
        
        identifyProcess.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Failed to get image dimensions: ${identifyError}`));
          }
        });
        
        identifyProcess.on('error', (err) => {
          reject(new Error(`Failed to start identify process: ${err.message}`));
        });
      });
      
      // Parse dimensions
      const [width, height] = identifyOutput.trim().split(' ').map(Number);
      
      if (width && height) {
        // Determine target size (use specified width/height or the larger dimension)
        let targetSize = Math.max(width, height);
        if (settings.width && settings.height) {
          // If both width and height are specified, use the larger one
          targetSize = Math.max(settings.width, settings.height);
        } else if (settings.width) {
          targetSize = settings.width;
        } else if (settings.height) {
          targetSize = settings.height;
        }
        
        // Add extra padding if specified
        if (settings.padSize && settings.padSize > 0) {
          targetSize += settings.padSize * 2;
        }
        
        // Resize to fit within the target size while maintaining aspect ratio
        if (width < height) {
          // Image is taller than wide
          convertArgs.push('-resize', `x${targetSize}`);
        } else {
          // Image is wider than tall
          convertArgs.push('-resize', `${targetSize}x`);
        }
        
        // Add padding to make it square
        convertArgs.push('-background', settings.padColor || 'transparent');
        convertArgs.push('-gravity', 'center');
        convertArgs.push('-extent', `${targetSize}x${targetSize}`);
      }
    } catch (error) {
      console.warn(`Warning: Failed to get image dimensions for square padding: ${error.message}`);
      console.warn('Continuing with regular processing...');
    }
  }
  
  // Quality settings
  if (settings.format === 'jpg' || settings.format === 'jpeg') {
    convertArgs.push('-quality', settings.quality.toString());
  } else if (settings.format === 'png' && settings.compressionLevel) {
    convertArgs.push('-quality', (100 - (settings.compressionLevel * 10)).toString());
  } else if (settings.format === 'webp') {
    convertArgs.push('-quality', settings.quality.toString());
  }
  
  // Optimization
  if (settings.optimize) {
    convertArgs.push('-strip'); // Remove metadata for smaller file size
  }
  
  // Strip metadata if specified
  if (settings.stripMetadata) {
    convertArgs.push('-strip');
  }
  
  // Add output file
  convertArgs.push(outputPath);
  
  // Store the complete ImageMagick command for logging
  const convertCommand = `convert ${convertArgs.join(' ')}`;
  
  return new Promise((resolve, reject) => {
    // Spawn ImageMagick convert process
    const convertProcess = spawn('convert', convertArgs);
    
    let errorOutput = '';
    
    // Handle stdout
    convertProcess.stdout.on('data', (data) => {
      const dataStr = data.toString();
      emitter.emit('log', dataStr);
    });
    
    // Handle stderr
    convertProcess.stderr.on('data', (data) => {
      const dataStr = data.toString();
      errorOutput += dataStr;
      
      // Emit log event
      emitter.emit('log', dataStr);
    });
    
    // Handle process exit
    convertProcess.on('close', async (code) => {
      if (code === 0) {
        // Check if output file was created
        if (!fs.existsSync(outputPath)) {
          return reject(new Error('Transcoding failed: Output file was not created'));
        }
        
        // Get image metadata using ImageMagick identify
        try {
          const identifyProcess = spawn('identify', ['-format', '%w %h %m', outputPath]);
          
          let identifyOutput = '';
          let identifyError = '';
          
          await new Promise((resolveIdentify, rejectIdentify) => {
            identifyProcess.stdout.on('data', (data) => {
              identifyOutput += data.toString();
            });
            
            identifyProcess.stderr.on('data', (data) => {
              identifyError += data.toString();
            });
            
            identifyProcess.on('close', (identifyCode) => {
              if (identifyCode === 0) {
                resolveIdentify();
              } else {
                rejectIdentify(new Error(`Failed to get image metadata: ${identifyError}`));
              }
            });
            
            identifyProcess.on('error', (err) => {
              rejectIdentify(new Error(`Failed to start identify process: ${err.message}`));
            });
          });
          
          // Parse metadata
          const [width, height, format] = identifyOutput.trim().split(' ');
          
          const metadata = {
            format: {
              filename: outputPath,
              formatName: format
            },
            image: {
              width: parseInt(width),
              height: parseInt(height),
              format: format
            }
          };
          
          resolve({ outputPath, emitter, convertCommand, metadata });
        } catch (metadataError) {
          console.warn(`Warning: Failed to extract metadata: ${metadataError.message}`);
          resolve({ outputPath, emitter, convertCommand });
        }
      } else {
        reject(new Error(`ImageMagick convert failed with code ${code}: ${errorOutput}`));
      }
    });
    
    // Handle process error
    convertProcess.on('error', (err) => {
      reject(new Error(`Failed to start ImageMagick convert process: ${err.message}`));
    });
    
    // Emit start event
    emitter.emit('start', { command: 'convert', args: convertArgs });
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