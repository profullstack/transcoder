/**
 * @profullstack/transcoder - Utils Module
 * Contains utility functions for metadata extraction and other common operations
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Gets video metadata using ffprobe
 *
 * @param {string} inputPath - Path to the video file
 * @returns {Promise<Object>} - Promise that resolves with the video metadata
 */
export async function getVideoMetadata(inputPath) {
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
export async function getVideoDuration(inputPath) {
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

/**
 * Gets image metadata using ImageMagick identify
 *
 * @param {string} inputPath - Path to the image file
 * @returns {Promise<Object>} - Promise that resolves with the image metadata
 */
export async function getImageMetadata(inputPath) {
  return new Promise((resolve, reject) => {
    // Use ImageMagick identify to get image metadata
    const args = [
      '-format',
      '%w %h %m %Q %[colorspace] %b',
      inputPath
    ];
    
    const identifyProcess = spawn('identify', args);
    
    let output = '';
    let errorOutput = '';
    
    identifyProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    identifyProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    identifyProcess.on('close', (code) => {
      if (code === 0) {
        try {
          // Parse the output
          // Format: width height format quality colorspace filesize
          const [width, height, format, quality, colorspace, filesize] = output.trim().split(' ');
          
          // Extract relevant metadata
          const result = {
            format: {},
            image: {}
          };
          
          // Format metadata
          result.format = {
            filename: inputPath,
            formatName: format,
            size: parseInt(filesize) || 0
          };
          
          // Image metadata
          result.image = {
            width: parseInt(width) || 0,
            height: parseInt(height) || 0,
            format: format,
            quality: parseInt(quality) || 0,
            colorSpace: colorspace
          };
          
          // Calculate aspect ratio
          if (result.image.width && result.image.height) {
            result.image.aspectRatio = `${result.image.width}:${result.image.height}`;
          }
          
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse metadata: ${error.message}`));
        }
      } else {
        reject(new Error(`ImageMagick identify failed with code ${code}: ${errorOutput}`));
      }
    });
    
    identifyProcess.on('error', (err) => {
      reject(new Error(`Failed to start ImageMagick identify process: ${err.message}`));
    });
  });
}

/**
 * Ensures that the output directory exists
 *
 * @param {string} outputPath - Path to the output file
 * @returns {Promise<void>} - Promise that resolves when the directory is created or already exists
 */
export async function ensureOutputDirectory(outputPath) {
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    try {
      fs.mkdirSync(outputDir, { recursive: true });
    } catch (err) {
      throw new Error(`Failed to create output directory: ${err.message}`);
    }
  }
}

/**
 * Validates input and output paths
 *
 * @param {string} inputPath - Path to the input file
 * @param {string} outputPath - Path to the output file
 * @param {boolean} overwrite - Whether to overwrite existing files
 * @returns {Promise<void>} - Promise that resolves when validation is successful
 */
export async function validatePaths(inputPath, outputPath, overwrite = false) {
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
  if (fs.existsSync(outputPath) && !overwrite) {
    throw new Error(`Output file already exists: ${outputPath}. Set overwrite: true to overwrite.`);
  }
  
  // Ensure output directory exists
  await ensureOutputDirectory(outputPath);
}