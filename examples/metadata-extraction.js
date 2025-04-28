/**
 * Metadata extraction example for the transcode module
 * 
 * This example demonstrates how to extract metadata from a video file
 * during transcoding and display it in a formatted way.
 */

// In a real project, you would import from the package:
// import { transcode } from '@profullstack/transcoder';
// For this example, we're importing directly from the local file:
import { transcode } from '../index.js';

// Helper function to format time in HH:MM:SS format
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Helper function to format file size in human-readable format
function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

// Example: Extract metadata from a video file
console.log('Example: Metadata Extraction');
async function metadataExample() {
  try {
    const { outputPath, metadata, emitter } = await transcode(
      './test-videos/input/test-video.mov',
      './test-videos/output/transcoded-metadata.mp4',
      { overwrite: true }
    );
    
    // Listen for progress events
    emitter.on('progress', (progress) => {
      if (progress.time) {
        const percent = Math.min(100, Math.round((progress.time / 5) * 100)); // For 5-second test video
        process.stdout.write(`\rProgress: ${percent}% complete`);
      }
    });
    
    console.log('\nTranscoding completed successfully:', outputPath);
    
    // Display metadata in a formatted way
    if (metadata) {
      console.log('\n=== Video Metadata ===');
      
      // Format metadata
      if (metadata.format) {
        console.log('\nFormat Information:');
        console.log(`  Format: ${metadata.format.formatName || 'Unknown'}`);
        console.log(`  Duration: ${formatTime(metadata.format.duration || 0)} (${metadata.format.duration.toFixed(2)} seconds)`);
        console.log(`  Size: ${formatFileSize(metadata.format.size || 0)}`);
        console.log(`  Bitrate: ${(metadata.format.bitrate / 1000).toFixed(2)} kbps`);
      }
      
      // Video stream metadata
      if (metadata.video && Object.keys(metadata.video).length > 0) {
        console.log('\nVideo Stream:');
        console.log(`  Codec: ${metadata.video.codec || 'Unknown'}`);
        console.log(`  Resolution: ${metadata.video.width}x${metadata.video.height}`);
        console.log(`  Aspect Ratio: ${metadata.video.aspectRatio || 'Unknown'}`);
        console.log(`  Frame Rate: ${metadata.video.fps?.toFixed(2)} fps`);
        console.log(`  Pixel Format: ${metadata.video.pixelFormat || 'Unknown'}`);
        if (metadata.video.bitrate) {
          console.log(`  Bitrate: ${(metadata.video.bitrate / 1000).toFixed(2)} kbps`);
        }
        if (metadata.video.colorSpace) {
          console.log(`  Color Space: ${metadata.video.colorSpace}`);
        }
      }
      
      // Audio stream metadata
      if (metadata.audio && Object.keys(metadata.audio).length > 0) {
        console.log('\nAudio Stream:');
        console.log(`  Codec: ${metadata.audio.codec || 'Unknown'}`);
        console.log(`  Sample Rate: ${metadata.audio.sampleRate} Hz`);
        console.log(`  Channels: ${metadata.audio.channels || 'Unknown'}`);
        console.log(`  Channel Layout: ${metadata.audio.channelLayout || 'Unknown'}`);
        if (metadata.audio.bitrate) {
          console.log(`  Bitrate: ${(metadata.audio.bitrate / 1000).toFixed(2)} kbps`);
        }
      }
      
      // Raw metadata for debugging
      if (process.env.DEBUG) {
        console.log('\nRaw Metadata:');
        console.log(JSON.stringify(metadata, null, 2));
      }
    } else {
      console.log('\nNo metadata available');
    }
  } catch (error) {
    console.error('Metadata extraction failed:', error.message);
  }
}

// Run the example
metadataExample();