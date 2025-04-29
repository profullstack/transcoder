/**
 * @profullstack/transcoder - Batch Processing Example
 * 
 * This example demonstrates how to use the batch processing functionality
 * to process multiple files in a directory.
 */

import path from 'path';
import { batchProcessDirectory, attachBatchUI } from '../src/index.js';

// Directory containing media files
const inputDir = path.join('test-videos', 'input');

// Output directory for processed files
const outputDir = path.join('test-videos', 'output', 'batch');

// Batch processing options
const batchOptions = {
  // Output directory
  outputDir: outputDir,
  
  // Add a prefix to output filenames
  outputPrefix: 'processed-',
  
  // Transcoding options (same as for single file transcoding)
  transcodeOptions: {
    // Use the 'web' preset
    preset: 'web',
    
    // Generate thumbnails
    thumbnails: {
      count: 1,
      format: 'jpg'
    },
    
    // Always overwrite existing files
    overwrite: true
  },
  
  // Process 2 files concurrently
  concurrency: 2
};

// Scan options
const scanOptions = {
  // Only process video files
  mediaTypes: ['video'],
  
  // Don't scan subdirectories
  recursive: false
};

console.log(`Starting batch processing of files in ${inputDir}...`);
console.log(`Output directory: ${outputDir}`);

// Start batch processing
batchProcessDirectory(inputDir, batchOptions, scanOptions)
  .then(({ results, emitter }) => {
    // Attach terminal UI to emitter
    const ui = attachBatchUI(emitter);
    
    // Listen for batch processing completion
    emitter.on('complete', () => {
      // Give user time to see the results before exiting
      setTimeout(() => {
        ui.destroy();
        
        // Print summary
        console.log(`\nBatch processing completed!`);
        console.log(`Processed ${results.total} files: ${results.successful.length} successful, ${results.failed.length} failed`);
        
        if (results.successful.length > 0) {
          console.log(`\nSuccessfully processed files:`);
          results.successful.forEach((item, index) => {
            console.log(`${index + 1}. ${path.basename(item.input)} → ${path.basename(item.output)}`);
          });
        }
        
        if (results.failed.length > 0) {
          console.log(`\nFailed files:`);
          results.failed.forEach((item, index) => {
            console.log(`${index + 1}. ${path.basename(item.input)}: ${item.error}`);
          });
        }
      }, 3000);
    });
  })
  .catch(err => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });