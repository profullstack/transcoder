/**
 * Image transcoding example for the transcode module
 * 
 * This example demonstrates how to use the async/await API
 * to transcode images to different formats with various
 * transformations and optimizations.
 */

// In a real project, you would import from the package:
// import { transcodeImage, transcodeImageBatch } from '@profullstack/transcoder';
// For this example, we're importing directly from the local file:
import { transcodeImage, transcodeImageBatch } from '../index.js';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

// Create test directories if they don't exist
const inputDir = './test-images/input';
const outputDir = './test-images/output';

if (!fs.existsSync(inputDir)) {
  fs.mkdirSync(inputDir, { recursive: true });
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Function to create a test image using FFmpeg
async function createTestImage(outputPath, width = 800, height = 600, color = 'blue') {
  return new Promise((resolve, reject) => {
    // Skip if the file already exists
    if (fs.existsSync(outputPath)) {
      return resolve(outputPath);
    }
    
    // Try to find a system font that's likely to be available
    const fontPaths = [
      '/usr/share/fonts/Adwaita/AdwaitaSans-Bold.ttf',
      '/usr/share/fonts/Adwaita/AdwaitaSans-Regular.ttf',
      '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
      '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf',
      '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
      '/System/Library/Fonts/Helvetica.ttc',
      '/Windows/Fonts/arial.ttf'
    ];
    
    let fontFile = null;
    for (const path of fontPaths) {
      if (fs.existsSync(path)) {
        fontFile = path;
        console.log(`Using font: ${path}`);
        break;
      }
    }
    
    if (!fontFile) {
      console.log('No font found, creating image without text');
      // If no font is found, create a simple colored rectangle without text
      const args = [
        '-f', 'lavfi',
        '-i', `color=${color}:s=${width}x${height}`,
        '-frames:v', '1',
        '-y',
        outputPath
      ];
      
      const ffmpegProcess = spawn('ffmpeg', args);
      
      let errorOutput = '';
      
      ffmpegProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`Successfully generated: ${outputPath} (without text)`);
          resolve(outputPath);
        } else {
          console.error(`Failed to generate image with code ${code}: ${errorOutput}`);
          reject(new Error(`FFmpeg failed with code ${code}: ${errorOutput}`));
        }
      });
      
      ffmpegProcess.on('error', (err) => {
        reject(new Error(`Failed to start FFmpeg process: ${err.message}`));
      });
      
      return;
    }
    
    // Create a simple colored rectangle with text
    const args = [
      '-f', 'lavfi',
      '-i', `color=${color}:s=${width}x${height}`,
      '-vf', `drawtext=fontfile=${fontFile}:text='Test Image':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2`,
      '-frames:v', '1',
      '-y',
      outputPath
    ];
    
    console.log(`Generating test image: ${outputPath}`);
    
    const ffmpegProcess = spawn('ffmpeg', args);
    
    let errorOutput = '';
    
    ffmpegProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    ffmpegProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`Successfully generated: ${outputPath}`);
        resolve(outputPath);
      } else {
        console.error(`Failed to generate image with code ${code}: ${errorOutput}`);
        reject(new Error(`FFmpeg failed with code ${code}: ${errorOutput}`));
      }
    });
    
    ffmpegProcess.on('error', (err) => {
      reject(new Error(`Failed to start FFmpeg process: ${err.message}`));
    });
  });
}

// Example 1: Basic image transcoding
console.log('Example 1: Basic image transcoding');
async function basicImageExample() {
  try {
    // Create a test image
    const testImagePath = path.join(inputDir, 'test-image.png');
    await createTestImage(testImagePath, 800, 600, 'blue');
    
    // Transcode the image to WebP format
    const { outputPath, metadata } = await transcodeImage(
      testImagePath,
      path.join(outputDir, 'basic-output.webp'),
      { 
        format: 'webp',
        quality: 90,
        overwrite: true 
      }
    );
    
    console.log('Image transcoded successfully:', outputPath);
    
    // Display metadata
    if (metadata && metadata.image) {
      console.log('\nImage Metadata:');
      console.log(`  Format: ${metadata.format.formatName || 'Unknown'}`);
      console.log(`  Size: ${formatFileSize(metadata.format.size || 0)}`);
      console.log(`  Dimensions: ${metadata.image.width}x${metadata.image.height}`);
      console.log(`  Codec: ${metadata.image.codec || 'Unknown'}`);
      console.log(`  Pixel Format: ${metadata.image.pixelFormat || 'Unknown'}`);
    }
    
    return true;
  } catch (error) {
    console.error('Image transcoding failed:', error.message);
    return false;
  }
}

// Example 2: Using image presets
console.log('Example 2: Using image presets');
async function imagePresetsExample() {
  try {
    // Create a test image
    const testImagePath = path.join(inputDir, 'test-image.png');
    
    // Array of presets to demonstrate
    const presets = [
      { name: 'jpeg-high', output: 'high-quality.jpg' },
      { name: 'jpeg-medium', output: 'medium-quality.jpg' },
      { name: 'jpeg-low', output: 'low-quality.jpg' },
      { name: 'webp-high', output: 'high-quality.webp' },
      { name: 'webp-medium', output: 'medium-quality.webp' },
      { name: 'webp-low', output: 'low-quality.webp' },
      { name: 'png', output: 'standard.png' },
      { name: 'png-optimized', output: 'optimized.png' },
      { name: 'thumbnail', output: 'thumbnail.jpg' },
      { name: 'social-media', output: 'social-media.jpg' }
    ];
    
    console.log('\nTranscoding with different image presets:');
    
    for (const preset of presets) {
      console.log(`\nUsing preset: ${preset.name}`);
      
      const outputPath = path.join(outputDir, preset.output);
      
      const result = await transcodeImage(
        testImagePath,
        outputPath,
        { 
          preset: preset.name,
          overwrite: true 
        }
      );
      
      console.log(`Transcoded to: ${outputPath}`);
      
      // Display file size
      const stats = fs.statSync(outputPath);
      console.log(`File size: ${formatFileSize(stats.size)}`);
    }
    
    return true;
  } catch (error) {
    console.error('Image preset transcoding failed:', error.message);
    return false;
  }
}

// Example 3: Image transformations
console.log('Example 3: Image transformations');
async function imageTransformationsExample() {
  try {
    // Create a test image
    const testImagePath = path.join(inputDir, 'test-image.png');
    
    // Resize example
    const resizeResult = await transcodeImage(
      testImagePath,
      path.join(outputDir, 'resize.jpg'),
      {
        format: 'jpg',
        quality: 90,
        resize: { width: 400, height: 300 },
        overwrite: true
      }
    );
    console.log('\nResized image:', resizeResult.outputPath);
    
    // Rotate example
    const rotateResult = await transcodeImage(
      testImagePath,
      path.join(outputDir, 'rotate.jpg'),
      {
        format: 'jpg',
        quality: 90,
        rotate: 90, // 90 degrees clockwise
        overwrite: true
      }
    );
    console.log('Rotated image:', rotateResult.outputPath);
    
    // Crop example
    const cropResult = await transcodeImage(
      testImagePath,
      path.join(outputDir, 'crop.jpg'),
      {
        format: 'jpg',
        quality: 90,
        crop: { x: 100, y: 100, width: 600, height: 400 },
        overwrite: true
      }
    );
    console.log('Cropped image:', cropResult.outputPath);
    
    // Flip example
    const flipResult = await transcodeImage(
      testImagePath,
      path.join(outputDir, 'flip.jpg'),
      {
        format: 'jpg',
        quality: 90,
        flip: 'horizontal',
        overwrite: true
      }
    );
    console.log('Flipped image:', flipResult.outputPath);
    
    // Combined transformations
    const combinedResult = await transcodeImage(
      testImagePath,
      path.join(outputDir, 'combined.jpg'),
      {
        format: 'jpg',
        quality: 90,
        resize: { width: 400, height: 300 },
        rotate: 180,
        overwrite: true
      }
    );
    console.log('Combined transformations:', combinedResult.outputPath);
    
    return true;
  } catch (error) {
    console.error('Image transformations failed:', error.message);
    return false;
  }
}

// Example 4: Batch image processing
console.log('Example 4: Batch image processing');
async function batchImageProcessingExample() {
  try {
    // Create multiple test images with different colors
    const colors = ['red', 'green', 'blue', 'yellow', 'purple'];
    const testImages = [];
    
    for (let i = 0; i < colors.length; i++) {
      const imagePath = path.join(inputDir, `test-image-${colors[i]}.png`);
      await createTestImage(imagePath, 800, 600, colors[i]);
      testImages.push(imagePath);
    }
    
    console.log('\nBatch converting images to WebP format:');
    
    // Prepare batch items
    const batchItems = testImages.map(inputPath => {
      const filename = path.basename(inputPath, path.extname(inputPath));
      return {
        input: inputPath,
        output: path.join(outputDir, `${filename}.webp`),
        options: {
          quality: 85,
          resize: { width: 400, height: 300, fit: 'inside' }
        }
      };
    });
    
    // Process batch
    const results = await transcodeImageBatch(batchItems, {
      format: 'webp',
      optimize: true,
      overwrite: true
    });
    
    console.log(`\nSuccessfully converted: ${results.successful.length} images`);
    for (const result of results.successful) {
      console.log(`  ${result.input} -> ${result.output}`);
    }
    
    if (results.failed.length > 0) {
      console.log(`\nFailed to convert: ${results.failed.length} images`);
      for (const failure of results.failed) {
        console.log(`  ${failure.input}: ${failure.error}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Batch image processing failed:', error.message);
    return false;
  }
}

// Helper function to format file size
function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

// Run the examples
(async () => {
  try {
    await basicImageExample();
    console.log('\n-----------------------------------\n');
    await imagePresetsExample();
    console.log('\n-----------------------------------\n');
    await imageTransformationsExample();
    console.log('\n-----------------------------------\n');
    await batchImageProcessingExample();
  } catch (error) {
    console.error('Error running examples:', error.message);
  }
})();