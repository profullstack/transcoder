/**
 * Test script for the modular transcoder structure
 */

import { transcode, DEFAULT_OPTIONS } from '../src/index.js';
import path from 'path';

// Define input and output paths
const inputPath = path.join('test-videos', 'input', 'test-video.mov');
const outputPath = path.join('test-videos', 'output', 'modular-test-output.mp4');

// Define transcoding options
const options = {
  ...DEFAULT_OPTIONS,
  width: 640,
  height: 360,
  videoBitrate: '1000k',
  audioBitrate: '128k',
  overwrite: true,
  thumbnails: {
    count: 3,
    format: 'jpg'
  }
};

console.log(`Transcoding ${inputPath} to ${outputPath}...`);

// Transcode the video
transcode(inputPath, outputPath, options)
  .then(result => {
    console.log('Transcoding completed successfully!');
    console.log(`Output file: ${result.outputPath}`);
    
    if (result.thumbnails) {
      console.log('Thumbnails generated:');
      result.thumbnails.forEach(thumbnail => {
        console.log(`- ${thumbnail}`);
      });
    }
    
    if (result.metadata) {
      console.log('Video metadata:');
      console.log(`- Format: ${result.metadata.format.formatName}`);
      console.log(`- Duration: ${result.metadata.format.duration} seconds`);
      console.log(`- Size: ${result.metadata.format.size} bytes`);
      
      if (result.metadata.video) {
        console.log(`- Resolution: ${result.metadata.video.width}x${result.metadata.video.height}`);
        console.log(`- Video codec: ${result.metadata.video.codec}`);
        console.log(`- Frame rate: ${result.metadata.video.fps} fps`);
      }
      
      if (result.metadata.audio) {
        console.log(`- Audio codec: ${result.metadata.audio.codec}`);
        console.log(`- Sample rate: ${result.metadata.audio.sampleRate} Hz`);
        console.log(`- Channels: ${result.metadata.audio.channels}`);
      }
    }
  })
  .catch(error => {
    console.error('Transcoding failed:', error.message);
  });