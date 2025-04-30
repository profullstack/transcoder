/**
 * @profullstack/transcoder - Audio Enhancement Example
 * 
 * This example demonstrates how to use the audio enhancement features
 * of the transcoder library, including:
 * - Audio normalization
 * - Noise reduction
 * - Fade in/out
 * - Volume adjustment
 */

import { transcodeAudio } from '../src/audio.js';
import { batchProcessDirectory } from '../src/batch.js';
import path from 'path';

// Example 1: Basic audio enhancement
async function enhanceAudioFile() {
  const inputPath = './test-videos/input/test-audio.wav';
  const outputPath = './test-videos/output/enhanced-audio.wav';
  
  console.log('Enhancing audio file...');
  
  try {
    const result = await transcodeAudio(inputPath, outputPath, {
      // Audio enhancement options
      normalize: true,              // Normalize audio levels
      noiseReduction: 0.3,          // Apply noise reduction (0-1 scale)
      fadeIn: 0.5,                  // Add 0.5 second fade in
      fadeOut: 0.5,                 // Add 0.5 second fade out
      volume: 1.2,                  // Increase volume by 20%
      
      // Always overwrite existing files
      overwrite: true
    });
    
    console.log(`Audio enhancement completed: ${result.outputPath}`);
    console.log('FFmpeg command used:');
    console.log(result.ffmpegCommand);
  } catch (error) {
    console.error('Error enhancing audio:', error.message);
  }
}

// Example 2: Batch process audio files with enhancement
async function batchEnhanceAudioFiles() {
  const inputDir = './test-videos/input';
  const outputDir = './test-videos/output/batch-enhanced';
  
  console.log('Batch enhancing audio files...');
  
  try {
    const result = await batchProcessDirectory(inputDir, {
      // Output directory
      outputDir,
      
      // Output filename options
      outputPrefix: 'enhanced-',
      outputSuffix: '',
      
      // Transcoding options
      transcodeOptions: {
        // Audio enhancement options
        audio: {
          normalize: true,
          noiseReduction: 0.2,
          fadeIn: 0.3,
          fadeOut: 0.3,
          volume: 1.1
        },
        
        // Always overwrite existing files
        overwrite: true
      },
      
      // Process 2 files concurrently
      concurrency: 2,
      
      // Show verbose output
      verbose: true
    }, {
      // Only process audio files
      mediaTypes: ['audio'],
      
      // Process files recursively
      recursive: true
    });
    
    console.log(`Batch processing completed: ${result.results.successful.length} successful, ${result.results.failed.length} failed`);
    
    // Print successful files
    if (result.results.successful.length > 0) {
      console.log('\nSuccessfully processed files:');
      result.results.successful.forEach(file => {
        console.log(`- ${path.basename(file.input)} → ${path.basename(file.output)}`);
      });
    }
    
    // Print skipped files
    const skippedFiles = result.results.failed.filter(file => file.skipped);
    if (skippedFiles.length > 0) {
      console.log('\nSkipped files:');
      skippedFiles.forEach(file => {
        console.log(`- ${path.basename(file.input)}: ${file.warning}`);
      });
    }
    
    // Print failed files
    const failedFiles = result.results.failed.filter(file => !file.skipped);
    if (failedFiles.length > 0) {
      console.log('\nFailed files:');
      failedFiles.forEach(file => {
        console.log(`- ${path.basename(file.input)}: ${file.error}`);
      });
    }
  } catch (error) {
    console.error('Error batch enhancing audio:', error.message);
  }
}

// Example 3: Audio enhancement with codec conversion
async function enhanceAndConvertAudio() {
  const inputPath = './test-videos/input/test-audio.mp3';
  const outputPath = './test-videos/output/enhanced-converted.aac';
  
  console.log('Enhancing and converting audio file...');
  
  try {
    const result = await transcodeAudio(inputPath, outputPath, {
      // Audio enhancement options
      normalize: true,
      noiseReduction: 0.3,
      fadeIn: 0.5,
      fadeOut: 0.5,
      
      // Transcoding options
      audioCodec: 'aac',           // Convert to AAC codec
      audioBitrate: '128k',        // Set bitrate to 128k
      audioSampleRate: 44100,      // Set sample rate to 44.1kHz
      audioChannels: 2,            // Convert to stereo
      
      // Always overwrite existing files
      overwrite: true
    });
    
    console.log(`Audio enhancement and conversion completed: ${result.outputPath}`);
    console.log('FFmpeg command used:');
    console.log(result.ffmpegCommand);
  } catch (error) {
    console.error('Error enhancing and converting audio:', error.message);
  }
}

// Run the examples
async function runExamples() {
  console.log('=== Example 1: Basic Audio Enhancement ===');
  await enhanceAudioFile();
  
  console.log('\n=== Example 2: Batch Audio Enhancement ===');
  await batchEnhanceAudioFiles();
  
  console.log('\n=== Example 3: Audio Enhancement with Codec Conversion ===');
  await enhanceAndConvertAudio();
}

runExamples().catch(error => {
  console.error('Error running examples:', error);
});