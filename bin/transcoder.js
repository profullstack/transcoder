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
  attachBatchUI,
  BatchProcessEmitter,
  scanDirectory,
  batchProcess
} from '../src/index.js';

// Parse command line arguments
const argv = configureCommandLine().argv;

// Main function
async function main() {
  try {
    // Handle thumbnails-only mode
    if (argv.thumbnailsOnly) {
      await handleThumbnailsOnly(argv);
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
  } finally {
    // Force exit after a short delay to ensure all output is flushed
    setTimeout(() => {
      process.exit(0);
    }, 100);
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
  
  // Add verbose flag to batch options
  batchOptions.verbose = argv.verbose;
  
  // Prepare scan options
  const scanOptions = prepareScanOptions(argv);
  
  console.log(colors.green(`Starting batch processing of files in ${dirPath}...`));
  console.log(colors.yellow(`Output directory: ${batchOptions.outputDir}`));
  
  if (argv.verbose) {
    console.log('Batch options:', JSON.stringify(batchOptions, null, 2));
    console.log('Scan options:', JSON.stringify(scanOptions, null, 2));
  }
  
  try {
    // Create a custom emitter
    const customEmitter = new BatchProcessEmitter();
    
    // Add the custom emitter to the batch options
    batchOptions.emitter = customEmitter;
    
    // Add debug event listeners only if verbose is enabled
    if (argv.verbose) {
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
      });
      
      customEmitter.on('fileComplete', (data) => {
        console.log('File complete event:', data);
      });
      
      customEmitter.on('fileError', (data) => {
        console.log('File error event:', data);
      });
      
      customEmitter.on('complete', (data) => {
        console.log('Batch complete event:', data);
      });
    }
    
    // Use fancy UI if enabled, otherwise use simple progress bar
    if (argv.fancyUi) {
      console.log('Using fancy UI for batch processing');
      
      // Attach terminal UI to emitter
      const ui = attachBatchUI(customEmitter);
      
      // Start batch processing
      console.log('Scanning directory for files...');
      const { results } = await batchProcessDirectory(dirPath, batchOptions, scanOptions);
      
      if (argv.verbose) {
        console.log(`Found ${results.total} files to process`);
      }
      
      // Wait for batch processing to complete
      await new Promise((resolve) => {
        const completeHandler = () => {
          if (argv.verbose) {
            console.log('Batch processing complete, destroying UI...');
          }
          ui.destroy();
          resolve();
        };
        
        customEmitter.once('complete', completeHandler);
      });
    } else {
      console.log('Using simple progress bar for batch processing');
      
      // Track current file being processed
      let multiBar = null;
      let overallBar = null;
      let currentFileBar = null;
      let currentFile = null;
      
      // First, scan the directory to get the file count
      console.log('Scanning directory for files...');
      const filePaths = await scanDirectory(dirPath, scanOptions);
      
      if (filePaths.length === 0) {
        console.error(colors.red(`No supported media files found in directory: ${dirPath}`));
        return;
      }
      
      console.log(`Found ${filePaths.length} files to process`);
      
      // Create progress bars
      multiBar = createBatchProgressBar(filePaths.length);
      overallBar = multiBar.create(filePaths.length, 0, { file: 'Overall progress' });
      
      // Set up event listeners
      customEmitter.on('fileStart', (data) => {
        if (argv.verbose) {
          console.log(`Starting file: ${path.basename(data.filePath)}`);
        }
        
        if (currentFileBar) {
          currentFileBar.stop();
        }
        
        currentFile = path.basename(data.filePath);
        currentFileBar = multiBar.create(100, 0, { file: currentFile });
      });
      
      customEmitter.on('fileProgress', (data) => {
        if (argv.verbose) {
          console.log(`File progress: ${currentFile} - ${data.percent}%`);
        }
        
        if (currentFileBar) {
          currentFileBar.update(data.percent || 0);
        }
      });
      
      customEmitter.on('fileComplete', () => {
        if (argv.verbose) {
          console.log(`File complete: ${currentFile}`);
        }
        
        if (currentFileBar) {
          currentFileBar.update(100);
        }
        
        if (overallBar) {
          overallBar.increment(1);
        }
      });
      
      customEmitter.on('fileError', () => {
        if (argv.verbose) {
          console.log(`File error: ${currentFile}`);
        }
        
        if (currentFileBar) {
          currentFileBar.update(100, { file: `${currentFile} (Failed)` });
        }
        
        if (overallBar) {
          overallBar.increment(1);
        }
      });
      
      // Start batch processing
      const { results } = await batchProcess(filePaths, batchOptions);
      
      // Stop progress bars
      if (multiBar) {
        multiBar.stop();
      }
      
      // Display batch processing results
      displayBatchResults(results);
    }
  } catch (err) {
    console.error(colors.red('Error:'), err.message);
  }
}

// Run the main function and force exit when done
main()
  .catch(err => {
    console.error(colors.red('Unhandled error:'), err);
  })
  .finally(() => {
    // Force exit after a short delay to ensure all output is flushed
    setTimeout(() => {
      process.exit(0);
    }, 100);
  });