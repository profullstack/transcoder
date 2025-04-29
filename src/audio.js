/**
 * @profullstack/transcoder - Audio Module
 * Contains functionality for transcoding audio files
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { TranscodeEmitter, DEFAULT_AUDIO_OPTIONS, checkFfmpeg, parseProgress } from './core.js';
import { getVideoMetadata, validatePaths, ensureOutputDirectory } from './utils.js';
import { getPreset, PRESETS } from '../presets.js';

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
  await validatePaths(inputPath, outputPath, settings.overwrite);
  
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
 * Batch transcodes multiple audio files
 *
 * @param {Array<Object>} items - Array of objects with input and output paths and optional settings
 * @param {Object} [globalOptions={}] - Global options to apply to all items
 * @returns {Promise<Object>} - Promise that resolves with results for all items
 */
export async function transcodeAudioBatch(items, globalOptions = {}) {
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
      
      // Transcode the audio
      const result = await transcodeAudio(item.input, item.output, options);
      
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