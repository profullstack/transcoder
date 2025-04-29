#!/usr/bin/env node

/**
 * Debug script for batch processing
 */

import path from 'path';
import fs from 'fs';
import { batchProcessDirectory, BatchProcessEmitter } from './src/index.js';

// Configuration
const inputDir = './test-videos/input';
const outputDir = './test-videos/output/debug';
const preset = 'web';

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log(`Starting batch processing of files in ${inputDir}...`);
console.log(`Output directory: ${outputDir}`);
console.log(`Preset: ${preset}`);

// Create a custom emitter
const customEmitter = new BatchProcessEmitter();

// Add debug event listeners
customEmitter.on('start', (data) => {
  console.log('Batch start event:', data);
});

customEmitter.on('progress', (data) => {
  console.log('Batch progress event:', data);
});

customEmitter.on('fileStart', (data) => {
  console.log('File start event:', data);
});

customEmitter.on('fileProgress', (data) => {
  console.log('File progress event:', data);
  // Force update to console
  process.stdout.write(`Progress: ${data.percent}%\r`);
});

customEmitter.on('fileComplete', (data) => {
  console.log('File complete event:', data);
});

customEmitter.on('fileError', (data) => {
  console.log('File error event:', data);
});

customEmitter.on('complete', (data) => {
  console.log('Batch complete event:', data);
  console.log('Batch processing complete!');
  console.log(`Processed ${data.total} files: ${data.successful.length} successful, ${data.failed.length} failed`);
  
  if (data.successful.length > 0) {
    console.log('\nSuccessfully processed files:');
    data.successful.forEach((item, index) => {
      console.log(`${index + 1}. ${path.basename(item.input)} → ${path.basename(item.output)}`);
    });
  }
  
  if (data.failed.length > 0) {
    console.log('\nFailed files:');
    data.failed.forEach((item, index) => {
      console.log(`${index + 1}. ${path.basename(item.input)}: ${item.error}`);
    });
  }
});

// Batch options
const batchOptions = {
  outputDir,
  transcodeOptions: {
    preset,
    overwrite: true
  },
  concurrency: 1,
  emitter: customEmitter  // Pass the custom emitter
};

// Scan options
const scanOptions = {
  mediaTypes: ['video'],
  recursive: false
};

// Start batch processing
async function main() {
  try {
    console.log('Starting batch processing...');
    
    // Start batch processing with the custom emitter
    const { results } = await batchProcessDirectory(inputDir, batchOptions, scanOptions);
    
    // Wait for batch processing to complete
    await new Promise(resolve => {
      customEmitter.on('complete', () => {
        resolve();
      });
    });
    
    console.log('Batch processing finished!');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();