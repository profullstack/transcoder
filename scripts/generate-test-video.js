#!/usr/bin/env node

/**
 * Script to generate a test video for the transcode module
 * 
 * This script creates a 5-second .mov test video using FFmpeg
 * and then uses the transcode module to convert it to MP4.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// In a real project, you would import from the package:
// import { transcode } from '@profullstack/transcoder';
// For this example, we're importing directly from the local file:
import { transcode } from '../index.js';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create directories if they don't exist
const inputDir = path.join(__dirname, '..', 'test-videos', 'input');
const outputDir = path.join(__dirname, '..', 'test-videos', 'output');

if (!fs.existsSync(inputDir)) {
  fs.mkdirSync(inputDir, { recursive: true });
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Define file paths
const testMovPath = path.join(inputDir, 'test-video.mov');
const testMp4Path = path.join(outputDir, 'test-video.mp4');

console.log('Generating 5-second test video...');

// Generate a test video using FFmpeg
// This creates a tiny 2-second video with a color gradient
const ffmpegArgs = [
  '-f', 'lavfi',                                // Use the lavfi input virtual device
  '-i', 'testsrc=duration=2:size=320x240:rate=15', // Generate a test pattern for 2 seconds at very low resolution
  '-c:v', 'libx264',                            // Use H.264 codec (much faster than qtrle)
  '-crf', '30',                                 // High compression (lower quality)
  '-preset', 'ultrafast',                       // Fastest encoding
  '-pix_fmt', 'yuv420p',                        // Standard pixel format
  '-t', '2',                                    // Limit to 2 seconds
  '-an',                                        // No audio
  '-r', '15',                                   // Very low frame rate
  '-y',                                         // Overwrite output file
  testMovPath                                   // Output file
];

// Spawn FFmpeg process to generate the test video
const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

// Handle process output
ffmpegProcess.stderr.on('data', (data) => {
  process.stdout.write('.');
});

// Handle process completion
ffmpegProcess.on('close', async (code) => {
  if (code === 0) {
    console.log('\nTest video generated successfully:', testMovPath);
    
    // Now transcode the test video using our module
    console.log('\nTranscoding test video to MP4...');
    
    try {
      const { outputPath, emitter } = await transcode(testMovPath, testMp4Path, { overwrite: true });
      
      // Display progress
      emitter.on('progress', (progress) => {
        if (progress.time) {
          const percent = Math.min(100, Math.round((progress.time / 2) * 100)); // Updated for 2-second video
          const barLength = 30;
          const filledLength = Math.round(barLength * percent / 100);
          const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
          
          process.stdout.write(`\r[${bar}] ${percent}% | ${progress.fps || 0} fps | ${progress.bitrate || 0} kbps`);
        }
      });
      
      // Display log messages
      emitter.on('log', (log) => {
        // Uncomment to see detailed logs
        // console.log(`Log: ${log}`);
      });
      
      console.log('\nTranscoding completed successfully:', outputPath);
      console.log('\nYou can now use these files for testing the module.');
    } catch (error) {
      console.error('\nTranscoding failed:', error.message);
    }
  } else {
    console.error('\nFailed to generate test video. FFmpeg exited with code', code);
  }
});

console.log('FFmpeg is generating the test video. This may take a moment...');