#!/usr/bin/env node

/**
 * @profullstack/transcoder - Command-line interface
 */

import colors from 'ansi-colors';
import {
  configureCommandLine,
  handleThumbnailsOnly,
  prepareTranscodeOptions,
  displayTranscodeResults,
  transcode
} from '../src/index.js';

// Parse command line arguments
const argv = configureCommandLine().argv;

// Main function
function main() {
  // Handle thumbnails-only mode
  if (argv.thumbnailsOnly) {
    handleThumbnailsOnly(argv);
    return;
  }
  
  // Handle normal transcoding mode
  const input = argv._[0];
  const output = argv._[1];
  
  if (!input || !output) {
    console.error(colors.red('Error: Both input and output files are required'));
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
  transcode(input, output, options)
    .then((result) => {
      displayTranscodeResults(result);
    })
    .catch((err) => {
      console.error(colors.red('Error:'), err.message);
      process.exit(1);
    });
}

// Import fs here to avoid hoisting issues
import fs from 'fs';

// Run the main function
main();