/**
 * Basic usage example for the transcode module
 * 
 * This example demonstrates how to use the async/await API
 * to transcode a video file to web-friendly MP4 format
 * with progress reporting.
 */

// In a real project, you would import from the package:
// import { transcode, DEFAULT_OPTIONS } from '@profullstack/transcoder';
// For this example, we're importing directly from the local file:
import { transcode, DEFAULT_OPTIONS } from '../index.js';

// Example 1: Basic usage with async/await
console.log('Example 1: Basic usage with async/await');
async function basicExample() {
  try {
    const { outputPath, emitter } = await transcode(
      './test-videos/input/test-video.mov',
      './test-videos/output/transcoded-basic.mp4',
      { overwrite: true }
    );
    
    // Listen for progress events
    emitter.on('progress', (progress) => {
      // Calculate percentage if time information is available
      if (progress.time) {
        const percent = Math.min(100, Math.round((progress.time / 2) * 100)); // For 2-second test video
        process.stdout.write(`\rProgress: ${percent}% complete`);
      }
    });
    
    // Listen for log events (optional)
    emitter.on('log', (log) => {
      // Uncomment to see detailed logs
      // console.log(`Log: ${log}`);
    });
    
    console.log('\nTranscoding completed successfully:', outputPath);
  } catch (error) {
    console.error('Transcoding failed:', error.message);
  }
}

// Example 2: Using custom options
console.log('Example 2: Using custom options');
async function customOptionsExample() {
  try {
    const customOptions = {
      videoCodec: 'libx264',
      audioBitrate: '192k',
      videoBitrate: '2500k',
      width: 1280,
      height: 720,
      fps: 30,
      preset: 'fast',
      overwrite: true
    };
    
    const { outputPath, emitter } = await transcode(
      './test-videos/input/test-video.mov',
      './test-videos/output/transcoded-custom.mp4',
      customOptions
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
    
    console.log('\nTranscoding with custom options completed successfully:', outputPath);
  } catch (error) {
    console.error('Transcoding failed:', error.message);
  }
}

// Run the examples
(async () => {
  try {
    await basicExample();
    console.log('\n-----------------------------------\n');
    await customOptionsExample();
  } catch (error) {
    console.error('Error running examples:', error.message);
  }
})();