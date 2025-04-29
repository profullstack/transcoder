/**
 * @profullstack/transcoder - Square Padding Example
 * 
 * This example demonstrates how to convert rectangular images to square format
 * with padding while maintaining the original aspect ratio.
 */

import { transcodeImage } from '../index.js';
import path from 'path';
import fs from 'fs';

// Create directories for input and output
const inputDir = path.join(process.cwd(), 'test-images', 'input');
const outputDir = path.join(process.cwd(), 'test-images', 'output');

// Ensure directories exist
if (!fs.existsSync(inputDir)) {
  fs.mkdirSync(inputDir, { recursive: true });
}
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Helper function to create a test image
async function createTestImage(filePath, width, height, color) {
  return new Promise((resolve, reject) => {
    const args = [
      '-size', `${width}x${height}`,
      'canvas:', color,
      filePath
    ];
    
    const { spawn } = require('child_process');
    const convertProcess = spawn('convert', args);
    
    convertProcess.on('close', (code) => {
      if (code === 0) {
        resolve(filePath);
      } else {
        reject(new Error(`Failed to create test image with code ${code}`));
      }
    });
    
    convertProcess.on('error', (err) => {
      reject(new Error(`Failed to start convert process: ${err.message}`));
    });
  });
}

// Example: Square padding with transparent background
async function squarePaddingExample() {
  try {
    console.log('Square Padding Example');
    
    // Create a landscape test image (wider than tall)
    const landscapeImagePath = path.join(inputDir, 'test-image-landscape.png');
    await createTestImage(landscapeImagePath, 800, 400, 'green');
    console.log(`Created landscape test image: ${landscapeImagePath}`);
    
    // Create a portrait test image (taller than wide)
    const portraitImagePath = path.join(inputDir, 'test-image-portrait.png');
    await createTestImage(portraitImagePath, 400, 800, 'red');
    console.log(`Created portrait test image: ${portraitImagePath}`);
    
    // Example 1: Convert landscape image to square with transparent padding
    const squareTransparentLandscape = await transcodeImage(
      landscapeImagePath,
      path.join(outputDir, 'square-transparent-landscape.png'),
      {
        format: 'png',
        squarePad: true,
        padColor: 'transparent',
        overwrite: true
      }
    );
    console.log('\nConverted landscape to square with transparent padding:',
      squareTransparentLandscape.outputPath);
    
    // Example 2: Convert portrait image to square with transparent padding
    const squareTransparentPortrait = await transcodeImage(
      portraitImagePath,
      path.join(outputDir, 'square-transparent-portrait.png'),
      {
        format: 'png',
        squarePad: true,
        padColor: 'transparent',
        overwrite: true
      }
    );
    console.log('Converted portrait to square with transparent padding:',
      squareTransparentPortrait.outputPath);
    
    // Example 3: Convert landscape image to square with white padding
    const squareWhiteLandscape = await transcodeImage(
      landscapeImagePath,
      path.join(outputDir, 'square-white-landscape.jpg'),
      {
        format: 'jpg',
        quality: 90,
        squarePad: true,
        padColor: 'white',
        overwrite: true
      }
    );
    console.log('\nConverted landscape to square with white padding:', 
      squareWhiteLandscape.outputPath);
    
    // Example 4: Convert portrait image to square with white padding
    const squareWhitePortrait = await transcodeImage(
      portraitImagePath,
      path.join(outputDir, 'square-white-portrait.jpg'),
      {
        format: 'jpg',
        quality: 90,
        squarePad: true,
        padColor: 'white',
        overwrite: true
      }
    );
    console.log('Converted portrait to square with white padding:', 
      squareWhitePortrait.outputPath);
    
    // Example 5: Using a preset for Instagram square format
    const instagramSquare = await transcodeImage(
      portraitImagePath,
      path.join(outputDir, 'instagram-square.jpg'),
      {
        preset: 'instagram-square',
        overwrite: true
      }
    );
    console.log('\nConverted to Instagram square format (1080x1080):', 
      instagramSquare.outputPath);
    
    // Example 6: Custom size and padding
    const customSquare = await transcodeImage(
      landscapeImagePath,
      path.join(outputDir, 'custom-square.png'),
      {
        format: 'png',
        width: 600,
        height: 600,
        squarePad: true,
        padColor: 'transparent',
        padSize: 20, // Add extra 20px padding
        overwrite: true
      }
    );
    console.log('\nConverted to custom square with extra padding:',
      customSquare.outputPath);
    
    console.log('\nAll examples completed successfully!');
    
  } catch (error) {
    console.error('Error in square padding example:', error.message);
  }
}

// Run the example
squarePaddingExample();