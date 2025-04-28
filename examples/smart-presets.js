/**
 * Smart Presets example for the transcode module
 * 
 * This example demonstrates how to use the platform-specific presets
 * to easily transcode videos for different platforms.
 */

// In a real project, you would import from the package:
// import { transcode } from '@profullstack/transcoder';
// For this example, we're importing directly from the local file:
import { transcode } from '../index.js';
import fs from 'fs';
import path from 'path';

// Ensure output directory exists
const outputDir = './test-videos/output';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Input video path
const inputPath = './test-videos/input/test-video.mov';

// Example 1: Transcode for Instagram
console.log('Example 1: Transcoding for Instagram');
async function instagramExample() {
  try {
    const { outputPath, emitter } = await transcode(
      inputPath,
      './test-videos/output/instagram-video.mp4',
      { 
        preset: 'instagram',
        overwrite: true
      }
    );
    
    // Listen for progress events
    emitter.on('progress', (progress) => {
      if (progress.time) {
        const percent = Math.min(100, Math.round((progress.time / 2) * 100)); // For 2-second test video
        process.stdout.write(`\rProgress: ${percent}% complete`);
      }
    });
    
    console.log('\nTranscoding for Instagram completed successfully:', outputPath);
    console.log('Video optimized for square format (1080x1080)');
  } catch (error) {
    console.error('Transcoding failed:', error.message);
  }
}

// Example 2: Transcode for YouTube HD
console.log('Example 2: Transcoding for YouTube HD');
async function youtubeExample() {
  try {
    const { outputPath, emitter } = await transcode(
      inputPath,
      './test-videos/output/youtube-hd-video.mp4',
      { 
        preset: 'youtube-hd',
        overwrite: true
      }
    );
    
    // Create a progress bar
    emitter.on('progress', (progress) => {
      if (progress.time) {
        const percent = Math.min(100, Math.round((progress.time / 2) * 100)); // For 2-second test video
        const barLength = 30;
        const filledLength = Math.round(barLength * percent / 100);
        const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
        
        process.stdout.write(`\r[${bar}] ${percent}% | ${progress.fps || 0} fps | ${progress.bitrate || 0} kbps`);
      }
    });
    
    console.log('\nTranscoding for YouTube HD completed successfully:', outputPath);
    console.log('Video optimized for HD format (1920x1080)');
  } catch (error) {
    console.error('Transcoding failed:', error.message);
  }
}

// Example 3: Transcode for Twitter with custom overrides
console.log('Example 3: Transcoding for Twitter with custom overrides');
async function twitterCustomExample() {
  try {
    const { outputPath, emitter } = await transcode(
      inputPath,
      './test-videos/output/twitter-custom-video.mp4',
      { 
        preset: 'twitter',
        videoBitrate: '6000k', // Override the preset's videoBitrate
        overwrite: true
      }
    );
    
    // Create a progress bar
    emitter.on('progress', (progress) => {
      if (progress.time) {
        const percent = Math.min(100, Math.round((progress.time / 2) * 100)); // For 2-second test video
        const barLength = 30;
        const filledLength = Math.round(barLength * percent / 100);
        const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
        
        process.stdout.write(`\r[${bar}] ${percent}% | ${progress.fps || 0} fps | ${progress.bitrate || 0} kbps`);
      }
    });
    
    console.log('\nTranscoding for Twitter with custom overrides completed successfully:', outputPath);
    console.log('Video optimized for Twitter with custom video bitrate (6000k)');
  } catch (error) {
    console.error('Transcoding failed:', error.message);
  }
}

// Run the examples
(async () => {
  try {
    console.log('Starting Smart Presets examples...');
    console.log('-----------------------------------');
    
    // Check if input file exists
    if (!fs.existsSync(inputPath)) {
      console.error(`Input file does not exist: ${inputPath}`);
      console.log('Please run "npm run generate-test-video" first to create a test video.');
      process.exit(1);
    }
    
    await instagramExample();
    console.log('\n-----------------------------------\n');
    await youtubeExample();
    console.log('\n-----------------------------------\n');
    await twitterCustomExample();
    
    console.log('\nAll examples completed successfully!');
  } catch (error) {
    console.error('Error running examples:', error.message);
  }
})();