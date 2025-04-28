/**
 * Thumbnail Generation example for the transcode module
 * 
 * This example demonstrates how to use the thumbnail generation feature
 * to automatically extract thumbnails from a video file.
 */

// In a real project, you would import from the package:
// import { transcode, generateThumbnails } from '@profullstack/transcoder';
// For this example, we're importing directly from the local file:
import { transcode, generateThumbnails } from '../index.js';
import fs from 'fs';
import path from 'path';

// Ensure output directory exists
const outputDir = './test-videos/output';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Input video path
const inputPath = './test-videos/input/test-video.mov';

// Example 1: Generate thumbnails during transcoding
console.log('Example 1: Generate thumbnails during transcoding');
async function thumbnailsWithTranscodeExample() {
  try {
    const { outputPath, thumbnails, emitter } = await transcode(
      inputPath,
      './test-videos/output/video-with-thumbnails.mp4',
      { 
        overwrite: true,
        thumbnails: {
          count: 3,
          format: 'jpg',
          filenamePattern: 'thumbnail-%d'
        }
      }
    );
    
    // Listen for progress events
    emitter.on('progress', (progress) => {
      if (progress.time) {
        const percent = Math.min(100, Math.round((progress.time / 2) * 100)); // For 2-second test video
        process.stdout.write(`\rProgress: ${percent}% complete`);
      }
    });
    
    console.log('\nTranscoding completed successfully:', outputPath);
    console.log('Thumbnails generated:', thumbnails);
  } catch (error) {
    console.error('Transcoding failed:', error.message);
  }
}

// Example 2: Generate thumbnails at specific timestamps
console.log('Example 2: Generate thumbnails at specific timestamps');
async function timestampThumbnailsExample() {
  try {
    const { outputPath, thumbnails, emitter } = await transcode(
      inputPath,
      './test-videos/output/video-with-timestamp-thumbnails.mp4',
      { 
        overwrite: true,
        thumbnails: {
          timestamps: true,
          timestampList: ['00:00:00.5', '00:00:01', '00:00:01.5'],
          format: 'png',
          filenamePattern: 'timestamp-thumbnail-%d'
        }
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
    
    console.log('\nTranscoding with timestamp thumbnails completed successfully:', outputPath);
    console.log('Thumbnails generated:', thumbnails);
  } catch (error) {
    console.error('Transcoding failed:', error.message);
  }
}

// Example 3: Generate thumbnails directly without transcoding
console.log('Example 3: Generate thumbnails directly without transcoding');
async function standaloneThumbnailsExample() {
  try {
    const thumbnailOptions = {
      count: 5,
      format: 'jpg',
      filenamePattern: 'standalone-thumbnail-%d'
    };
    
    const thumbnails = await generateThumbnails(
      inputPath,
      './test-videos/output',
      thumbnailOptions
    );
    
    console.log('Standalone thumbnails generated successfully:', thumbnails);
  } catch (error) {
    console.error('Thumbnail generation failed:', error.message);
  }
}

// Run the examples
(async () => {
  try {
    console.log('Starting Thumbnail Generation examples...');
    console.log('-----------------------------------');
    
    // Check if input file exists
    if (!fs.existsSync(inputPath)) {
      console.error(`Input file does not exist: ${inputPath}`);
      console.log('Please run "pnpm generate-test-video" first to create a test video.');
      process.exit(1);
    }
    
    await thumbnailsWithTranscodeExample();
    console.log('\n-----------------------------------\n');
    await timestampThumbnailsExample();
    console.log('\n-----------------------------------\n');
    await standaloneThumbnailsExample();
    
    console.log('\nAll examples completed successfully!');
  } catch (error) {
    console.error('Error running examples:', error.message);
  }
})();