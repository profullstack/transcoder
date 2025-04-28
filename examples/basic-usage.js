/**
 * Basic usage example for the transcode module
 * 
 * This example demonstrates how to use the async/await API
 * to transcode a video file to web-friendly MP4 format
 * with progress reporting.
 */

// In a real project, you would import from the package:
// import { transcode, DEFAULT_OPTIONS } from '@profullstack/transcoder';
// For this example, we're importing directly from the local file:
import { transcode, DEFAULT_OPTIONS } from '../index.js';

// Example 1: Basic usage with async/await
console.log('Example 1: Basic usage with async/await');
async function basicExample() {
  try {
    const { outputPath, emitter, metadata } = await transcode(
      './test-videos/input/test-video.mov',
      './test-videos/output/transcoded-basic.mp4',
      { overwrite: true }
    );
    
    // Listen for progress events
    emitter.on('progress', (progress) => {
      // Calculate percentage if time information is available
      if (progress.time) {
        const percent = Math.min(100, Math.round((progress.time / 5) * 100)); // For 5-second test video
        process.stdout.write(`\rProgress: ${percent}% complete`);
      }
    });
    
    // Listen for log events (optional)
    emitter.on('log', (log) => {
      // Uncomment to see detailed logs
      // console.log(`Log: ${log}`);
    });
    
    console.log('\nTranscoding completed successfully:', outputPath);
    
    // Display metadata
    if (metadata) {
      console.log('\nVideo Metadata:');
      
      // Format metadata
      if (metadata.format) {
        console.log('\nFormat:');
        console.log(`  Format: ${metadata.format.formatName || 'Unknown'}`);
        console.log(`  Duration: ${formatTime(metadata.format.duration || 0)}`);
        console.log(`  Size: ${formatFileSize(metadata.format.size || 0)}`);
        console.log(`  Bitrate: ${(metadata.format.bitrate / 1000).toFixed(2)} kbps`);
      }
      
      // Video stream metadata
      if (metadata.video && Object.keys(metadata.video).length > 0) {
        console.log('\nVideo:');
        console.log(`  Codec: ${metadata.video.codec || 'Unknown'}`);
        console.log(`  Resolution: ${metadata.video.width}x${metadata.video.height}`);
        console.log(`  Aspect Ratio: ${metadata.video.aspectRatio || 'Unknown'}`);
        console.log(`  Frame Rate: ${metadata.video.fps?.toFixed(2)} fps`);
        console.log(`  Pixel Format: ${metadata.video.pixelFormat || 'Unknown'}`);
        if (metadata.video.bitrate) {
          console.log(`  Bitrate: ${(metadata.video.bitrate / 1000).toFixed(2)} kbps`);
        }
      }
      
      // Audio stream metadata
      if (metadata.audio && Object.keys(metadata.audio).length > 0) {
        console.log('\nAudio:');
        console.log(`  Codec: ${metadata.audio.codec || 'Unknown'}`);
        console.log(`  Sample Rate: ${metadata.audio.sampleRate} Hz`);
        console.log(`  Channels: ${metadata.audio.channels || 'Unknown'}`);
        console.log(`  Channel Layout: ${metadata.audio.channelLayout || 'Unknown'}`);
        if (metadata.audio.bitrate) {
          console.log(`  Bitrate: ${(metadata.audio.bitrate / 1000).toFixed(2)} kbps`);
        }
      }
    }
  } catch (error) {
    console.error('Transcoding failed:', error.message);
  }
}

// Example 2: Using custom options
console.log('Example 2: Using custom options');
async function customOptionsExample() {
  try {
    const customOptions = {
      videoCodec: 'libx264',
      audioBitrate: '192k',
      videoBitrate: '2500k',
      width: 1280,
      height: 720,
      fps: 30,
      preset: 'fast',
      overwrite: true
    };
    
    const { outputPath, emitter } = await transcode(
      './test-videos/input/test-video.mov',
      './test-videos/output/transcoded-custom.mp4',
      customOptions
    );
    
    // Create a progress bar
    emitter.on('progress', (progress) => {
      if (progress.time) {
        const percent = Math.min(100, Math.round((progress.time / 5) * 100)); // For 5-second test video
        const barLength = 30;
        const filledLength = Math.round(barLength * percent / 100);
        const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
        
        process.stdout.write(`\r[${bar}] ${percent}% | ${progress.fps || 0} fps | ${progress.bitrate || 0} kbps`);
      }
    });
    
    console.log('\nTranscoding with custom options completed successfully:', outputPath);
  } catch (error) {
    console.error('Transcoding failed:', error.message);
  }
}

// Helper functions
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

// Example 3: Metadata extraction
console.log('Example 3: Metadata extraction');
async function metadataExample() {
  try {
    const { outputPath, metadata } = await transcode(
      './test-videos/input/test-video.mov',
      './test-videos/output/transcoded-metadata.mp4',
      { overwrite: true }
    );
    
    console.log('\nMetadata extraction example:');
    console.log('Input file:', './test-videos/input/test-video.mov');
    console.log('Output file:', outputPath);
    
    if (metadata) {
      console.log('\nExtracted Metadata:');
      console.log(JSON.stringify(metadata, null, 2));
    } else {
      console.log('\nNo metadata available');
    }
  } catch (error) {
    console.error('Metadata extraction failed:', error.message);
  }
}

// Run the examples
(async () => {
  try {
    await basicExample();
    console.log('\n-----------------------------------\n');
    await customOptionsExample();
    console.log('\n-----------------------------------\n');
    await metadataExample();
  } catch (error) {
    console.error('Error running examples:', error.message);
  }
})();