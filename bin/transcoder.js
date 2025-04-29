#!/usr/bin/env node

/**
 * @profullstack/transcoder - Command-line interface
 */

import fs from 'fs';
import path from 'path';
import colors from 'ansi-colors';
import {
  configureCommandLine,
  handleThumbnailsOnly,
  prepareTranscodeOptions,
  prepareBatchOptions,
  prepareScanOptions,
  displayTranscodeResults,
  displayBatchResults,
  createBatchProgressBar,
  transcode,
  batchProcessDirectory,
  attachBatchUI
} from '../src/index.js';

// Parse command line arguments
const argv = configureCommandLine().argv;

// Main function
async function main() {
  // Handle thumbnails-only mode
  if (argv.thumbnailsOnly) {
    handleThumbnailsOnly(argv);
    return;
  }
  
  // Handle batch processing mode
  if (argv.path) {
    await handleBatchProcessing(argv);
    return;
  }
  
  // Handle normal transcoding mode
  const input = argv._[0];
  const output = argv._[1];
  
  if (!input || !output) {
    console.error(colors.red('Error: Both input and output files are required for single file transcoding'));
    console.error(colors.yellow('For batch processing, use --path option'));
    process.exit(1);
  }
  
  if (!fs.existsSync(input)) {
    console.error(colors.red(`Error: Input file "${input}" does not exist`));
    process.exit(1);
  }
  
  // Prepare options from command-line arguments
  const options = prepareTranscodeOptions(argv);
  
  console.log(`Transcoding ${input} to ${output}...`);
  if (Object.keys(options).length > 0 && argv.verbose) {
    console.log('Options:', JSON.stringify(options, null, 2));
  }
  
  // Use the transcode function from index.js
  try {
    const result = await transcode(input, output, options);
    displayTranscodeResults(result);
  } catch (err) {
    console.error(colors.red('Error:'), err.message);
    process.exit(1);
  }
}

/**
 * Handle batch processing mode
 * 
 * @param {Object} argv - Command-line arguments
 */
async function handleBatchProcessing(argv) {
  const dirPath = argv.path;
  
  // Validate directory path
  if (!fs.existsSync(dirPath)) {
    console.error(colors.red(`Error: Directory "${dirPath}" does not exist`));
    process.exit(1);
  }
  
  const stats = fs.statSync(dirPath);
  if (!stats.isDirectory()) {
    console.error(colors.red(`Error: "${dirPath}" is not a directory`));
    process.exit(1);
  }
  
  // Prepare batch options
  const batchOptions = prepareBatchOptions(argv);
  
  // If output directory is not specified, use input directory
  if (!batchOptions.outputDir) {
    batchOptions.outputDir = dirPath;
  }
  
  // Prepare scan options
  const scanOptions = prepareScanOptions(argv);
  
  console.log(colors.green(`Starting batch processing of files in ${dirPath}...`));
  console.log(colors.yellow(`Output directory: ${batchOptions.outputDir}`));
  
  if (argv.verbose) {
    console.log('Batch options:', JSON.stringify(batchOptions, null, 2));
    console.log('Scan options:', JSON.stringify(scanOptions, null, 2));
  }
  
  try {
    // Start batch processing
    const { results, emitter } = await batchProcessDirectory(dirPath, batchOptions, scanOptions);
    
    // Use fancy UI if enabled, otherwise use simple progress bar
    if (argv.fancyUi) {
      // Attach terminal UI to emitter
      const ui = attachBatchUI(emitter);
      
      // Wait for batch processing to complete
      await new Promise(resolve => {
        emitter.on('complete', () => {
          // Give user time to see the results before exiting
          setTimeout(() => {
            ui.destroy();
            resolve();
          }, 3000);
        });
      });
    } else {
      // Create a simple progress bar
      const multiBar = createBatchProgressBar(results.total);
      const overallBar = multiBar.create(results.total, 0, { file: 'Overall progress' });
      
      // Track current file being processed
      let currentFileBar = null;
      let currentFile = null;
      
      // Listen for batch processing events
      emitter.on('fileStart', (data) => {
        if (currentFileBar) {
          currentFileBar.stop();
        }
        currentFile = path.basename(data.filePath);
        currentFileBar = multiBar.create(100, 0, { file: currentFile });
      });
      
      emitter.on('fileProgress', (data) => {
        if (currentFileBar) {
          currentFileBar.update(data.percent);
        }
      });
      
      emitter.on('fileComplete', () => {
        if (currentFileBar) {
          currentFileBar.update(100);
        }
        overallBar.increment(1);
      });
      
      emitter.on('fileError', () => {
        if (currentFileBar) {
          currentFileBar.update(100, { file: `${currentFile} (Failed)` });
        }
        overallBar.increment(1);
      });
      
      // Wait for batch processing to complete
      await new Promise(resolve => {
        emitter.on('complete', () => {
          multiBar.stop();
          resolve();
        });
      });
      
      // Display batch processing results
      displayBatchResults(results);
    }
  } catch (err) {
    console.error(colors.red('Error:'), err.message);
    process.exit(1);
  }
}

// Run the main function
main().catch(err => {
  console.error(colors.red('Unhandled error:'), err);
  process.exit(1);
});