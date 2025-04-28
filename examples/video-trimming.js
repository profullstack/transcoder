/**
 * Example demonstrating video trimming functionality
 * 
 * This example shows how to extract specific segments from videos without re-encoding the entire file.
 */

import { transcode } from '../index.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Input and output paths
const inputPath = path.join(__dirname, '../test-videos/input/test-video.mov');
const outputDir = path.join(__dirname, '../test-videos/output');

async function trimVideo() {
  try {
    console.log('Example 1: Trimming a video with start and end times');
    
    // Example 1: Trim a video with start and end times (HH:MM:SS format)
    const { outputPath: output1 } = await transcode(
      inputPath,
      path.join(outputDir, 'trimmed-video-1.mp4'),
      {
        trim: {
          start: '00:00:01',
          end: '00:00:03'
        },
        overwrite: true
      }
    );
    
    console.log(`Trimmed video saved to: ${output1}`);
    console.log('Extracted 2 seconds from the video (from 1s to 3s)');
    
    console.log('\nExample 2: Trimming a video with only start time');
    
    // Example 2: Trim a video with only start time (seconds format)
    const { outputPath: output2 } = await transcode(
      inputPath,
      path.join(outputDir, 'trimmed-video-2.mp4'),
      {
        trim: {
          start: '2'  // Start at 2 seconds
        },
        overwrite: true
      }
    );
    
    console.log(`Trimmed video saved to: ${output2}`);
    console.log('Extracted from 2 seconds to the end of the video');
    
    console.log('\nExample 3: Trimming a video with only end time');
    
    // Example 3: Trim a video with only end time
    const { outputPath: output3 } = await transcode(
      inputPath,
      path.join(outputDir, 'trimmed-video-3.mp4'),
      {
        trim: {
          end: '00:00:03'  // End at 3 seconds
        },
        overwrite: true
      }
    );
    
    console.log(`Trimmed video saved to: ${output3}`);
    console.log('Extracted from the beginning to 3 seconds');
    
    console.log('\nExample 4: Trimming with additional transcoding options');
    
    // Example 4: Trim a video with additional transcoding options
    const { outputPath: output4 } = await transcode(
      inputPath,
      path.join(outputDir, 'trimmed-video-4.mp4'),
      {
        trim: {
          start: '00:00:01',
          end: '00:00:04'
        },
        videoBitrate: '2000k',
        width: 640,
        height: 360,
        overwrite: true
      }
    );
    
    console.log(`Trimmed and transcoded video saved to: ${output4}`);
    console.log('Extracted 3 seconds from the video (from 1s to 4s) and resized to 640x360');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the example
trimVideo();