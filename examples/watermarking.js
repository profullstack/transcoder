/**
 * @profullstack/transcoder - Watermarking Examples
 *
 * This example demonstrates how to add text watermarks to videos using the transcoder module.
 */

import { transcode } from '../index.js';
import fs from 'fs';

// Create output directory if it doesn't exist
const outputDir = './test-videos/output';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Simple watermarking example
async function runWatermarkExamples() {
  console.log('Starting Watermarking examples...');
  
  try {
    // Example 1: Bottom right watermark
    console.log('\nExample 1: Bottom right watermark');
    console.log('-----------------------------------');
    
    const inputPath = './test-videos/input/test-video.mov';
    const outputPath1 = './test-videos/output/video-with-watermark-1.mp4';
    
    const options1 = {
      watermark: {
        text: '© ProFullStack 2025',
        position: 'bottomRight',
        fontColor: 'white',
        fontSize: 24,
        boxColor: 'black@0.5',
        opacity: 0.8,
        margin: 20
      },
      preset: 'web',
      overwrite: true
    };
    
    console.log(`Adding watermark to ${inputPath}...`);
    const result1 = await transcode(inputPath, outputPath1, options1);
    console.log(`Video with watermark created: ${result1.outputPath}`);
    
    // Example 2: Centered large watermark
    console.log('\nExample 2: Centered large watermark');
    console.log('-----------------------------------');
    
    const outputPath2 = './test-videos/output/video-with-watermark-2.mp4';
    
    const options2 = {
      watermark: {
        text: 'PREVIEW',
        position: 'center',
        fontColor: 'white@0.5',
        fontSize: 72,
        opacity: 0.5
      },
      preset: 'web',
      overwrite: true
    };
    
    console.log(`Adding centered watermark to ${inputPath}...`);
    const result2 = await transcode(inputPath, outputPath2, options2);
    console.log(`Video with centered watermark created: ${result2.outputPath}`);
    
    console.log('\nAll examples completed successfully!');
  } catch (error) {
    console.error(`Error in watermark examples: ${error.message}`);
  }
}

runWatermarkExamples();