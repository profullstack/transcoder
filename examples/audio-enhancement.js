/**
 * @profullstack/transcoder - Audio Enhancement Example
 * 
 * This example demonstrates how to use audio enhancement features
 * to improve the quality of audio in video files.
 */

import { transcode } from '../src/index.js';
import path from 'path';

// Input and output paths
const inputPath = './test-videos/input/test-video.mov';
const outputDir = './test-videos/output';

// Ensure output directory exists
import fs from 'fs';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Example 1: Basic audio normalization
async function normalizeAudio() {
  console.log('\n--- Example 1: Basic Audio Normalization ---');
  const outputPath = path.join(outputDir, 'normalized-audio.mp4');
  
  console.log(`Transcoding ${inputPath} to ${outputPath} with audio normalization...`);
  
  try {
    const result = await transcode(inputPath, outputPath, {
      preset: 'web',
      audio: {
        normalize: true
      },
      overwrite: true
    });
    
    console.log('Transcoding completed successfully!');
    console.log(`Output file: ${result.outputPath}`);
    console.log('FFmpeg command used:');
    console.log(result.ffmpegCommand);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 2: Noise reduction
async function reduceNoise() {
  console.log('\n--- Example 2: Noise Reduction ---');
  const outputPath = path.join(outputDir, 'noise-reduced.mp4');
  
  console.log(`Transcoding ${inputPath} to ${outputPath} with noise reduction...`);
  
  try {
    const result = await transcode(inputPath, outputPath, {
      preset: 'web',
      audio: {
        noiseReduction: 0.3 // Value between 0 and 1, higher values = more noise reduction
      },
      overwrite: true
    });
    
    console.log('Transcoding completed successfully!');
    console.log(`Output file: ${result.outputPath}`);
    console.log('FFmpeg command used:');
    console.log(result.ffmpegCommand);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 3: Fade in/out
async function addFades() {
  console.log('\n--- Example 3: Audio Fade In/Out ---');
  const outputPath = path.join(outputDir, 'audio-fades.mp4');
  
  console.log(`Transcoding ${inputPath} to ${outputPath} with audio fades...`);
  
  try {
    const result = await transcode(inputPath, outputPath, {
      preset: 'web',
      audio: {
        fadeIn: 1.5,  // Fade in duration in seconds
        fadeOut: 2.0  // Fade out duration in seconds
      },
      overwrite: true
    });
    
    console.log('Transcoding completed successfully!');
    console.log(`Output file: ${result.outputPath}`);
    console.log('FFmpeg command used:');
    console.log(result.ffmpegCommand);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 4: Volume adjustment
async function adjustVolume() {
  console.log('\n--- Example 4: Volume Adjustment ---');
  const outputPath = path.join(outputDir, 'volume-adjusted.mp4');
  
  console.log(`Transcoding ${inputPath} to ${outputPath} with volume adjustment...`);
  
  try {
    const result = await transcode(inputPath, outputPath, {
      preset: 'web',
      audio: {
        volume: 1.5  // Increase volume by 50%
      },
      overwrite: true
    });
    
    console.log('Transcoding completed successfully!');
    console.log(`Output file: ${result.outputPath}`);
    console.log('FFmpeg command used:');
    console.log(result.ffmpegCommand);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 5: Combining multiple audio enhancements
async function combineEnhancements() {
  console.log('\n--- Example 5: Combined Audio Enhancements ---');
  const outputPath = path.join(outputDir, 'enhanced-audio.mp4');
  
  console.log(`Transcoding ${inputPath} to ${outputPath} with multiple audio enhancements...`);
  
  try {
    const result = await transcode(inputPath, outputPath, {
      preset: 'web',
      audio: {
        normalize: true,
        noiseReduction: 0.2,
        fadeIn: 0.5,
        fadeOut: 1.0,
        volume: 1.2
      },
      overwrite: true
    });
    
    console.log('Transcoding completed successfully!');
    console.log(`Output file: ${result.outputPath}`);
    console.log('FFmpeg command used:');
    console.log(result.ffmpegCommand);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run all examples
async function runExamples() {
  await normalizeAudio();
  await reduceNoise();
  await addFades();
  await adjustVolume();
  await combineEnhancements();
  
  console.log('\nAll examples completed!');
  console.log('Output files are in the directory:', outputDir);
}

runExamples().catch(err => {
  console.error('Error running examples:', err);
});