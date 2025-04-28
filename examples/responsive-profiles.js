/**
 * Example demonstrating responsive video profiles functionality
 * 
 * This example shows how to generate multiple versions of a video optimized for different devices
 * and connection speeds using the transcodeResponsive function.
 */

import { transcodeResponsive } from '../index.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Input and output paths
const inputPath = path.join(__dirname, '../test-videos/input/test-video.mov');
const outputDir = path.join(__dirname, '../test-videos/output/responsive');

async function generateResponsiveProfiles() {
  try {
    console.log('Example 1: Using the standard profile set (mobile, web, hd)');
    
    // Example 1: Using the standard profile set
    const result1 = await transcodeResponsive(inputPath, {
      profileSet: 'standard',
      outputDir,
      filenamePattern: 'standard-%s.mp4'
    });
    
    console.log('Generated the following versions:');
    Object.keys(result1.outputs).forEach(profile => {
      console.log(`- ${profile}: ${result1.outputs[profile].outputPath}`);
    });
    
    console.log('\nExample 2: Using the minimal profile set (mobile, web)');
    
    // Example 2: Using the minimal profile set
    const result2 = await transcodeResponsive(inputPath, {
      profileSet: 'minimal',
      outputDir,
      filenamePattern: 'minimal-%s.mp4'
    });
    
    console.log('Generated the following versions:');
    Object.keys(result2.outputs).forEach(profile => {
      console.log(`- ${profile}: ${result2.outputs[profile].outputPath}`);
    });
    
    console.log('\nExample 3: Using custom profiles');
    
    // Example 3: Using custom profiles
    const result3 = await transcodeResponsive(inputPath, {
      profiles: ['low-bandwidth', 'tablet', 'youtube-hd'],
      outputDir,
      filenamePattern: 'custom-%s.mp4'
    });
    
    console.log('Generated the following versions:');
    Object.keys(result3.outputs).forEach(profile => {
      console.log(`- ${profile}: ${result3.outputs[profile].outputPath}`);
    });
    
    console.log('\nExample 4: Using the comprehensive profile set with custom options');
    
    // Example 4: Using the comprehensive profile set with custom options
    const result4 = await transcodeResponsive(inputPath, {
      profileSet: 'comprehensive',
      outputDir,
      filenamePattern: 'comprehensive-%s.mp4',
      transcodeOptions: {
        // These options will be applied to all profiles
        watermark: {
          text: '© Example 2025',
          position: 'bottomRight',
          fontColor: 'white',
          fontSize: 24
        }
      }
    });
    
    console.log('Generated the following versions with watermark:');
    Object.keys(result4.outputs).forEach(profile => {
      console.log(`- ${profile}: ${result4.outputs[profile].outputPath}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the example
generateResponsiveProfiles();