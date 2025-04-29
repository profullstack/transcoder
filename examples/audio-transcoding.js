/**
 * Audio transcoding example for the transcode module
 * 
 * This example demonstrates how to use the async/await API
 * to transcode audio files to different formats with various
 * quality settings and effects.
 */

// In a real project, you would import from the package:
// import { transcodeAudio, DEFAULT_AUDIO_OPTIONS } from '@profullstack/transcoder';
// For this example, we're importing directly from the local file:
import { transcodeAudio, DEFAULT_AUDIO_OPTIONS } from '../index.js';
import fs from 'fs';
import path from 'path';

// Example 1: Basic audio transcoding
console.log('Example 1: Basic audio transcoding');
async function basicAudioExample() {
  try {
    // Create test directory if it doesn't exist
    const outputDir = './test-videos/output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Use our generated test audio file as input
    const { outputPath, emitter, metadata } = await transcodeAudio(
      './test-videos/input/test-audio.wav',
      './test-videos/output/basic-audio.mp3',
      {
        audioCodec: 'libmp3lame',
        audioBitrate: '192k',
        overwrite: true
      }
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
    
    console.log('\nAudio transcoding completed successfully:', outputPath);
    
    // Display metadata
    if (metadata && metadata.audio) {
      console.log('\nAudio Metadata:');
      console.log(`  Codec: ${metadata.audio.codec || 'Unknown'}`);
      console.log(`  Sample Rate: ${metadata.audio.sampleRate} Hz`);
      console.log(`  Channels: ${metadata.audio.channels || 'Unknown'}`);
      console.log(`  Channel Layout: ${metadata.audio.channelLayout || 'Unknown'}`);
      if (metadata.audio.bitrate) {
        console.log(`  Bitrate: ${(metadata.audio.bitrate / 1000).toFixed(2)} kbps`);
      }
    }
  } catch (error) {
    console.error('Audio transcoding failed:', error.message);
  }
}

// Example 2: Using audio presets
console.log('Example 2: Using audio presets');
async function audioPresetsExample() {
  try {
    // Create test directory if it doesn't exist
    const outputDir = './test-videos/output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Array of presets to demonstrate
    const presets = [
      { name: 'audio-high', output: 'high-quality.aac' },
      { name: 'audio-medium', output: 'medium-quality.aac' },
      { name: 'audio-low', output: 'low-quality.aac' },
      { name: 'audio-voice', output: 'voice-optimized.aac' },
      { name: 'mp3-high', output: 'high-quality.mp3' },
      { name: 'mp3-medium', output: 'medium-quality.mp3' },
      { name: 'mp3-low', output: 'low-quality.mp3' }
    ];
    
    console.log('\nTranscoding with different audio presets:');
    
    for (const preset of presets) {
      console.log(`\nUsing preset: ${preset.name}`);
      
      const outputPath = path.join('./test-videos/output', preset.output);
      
      const { emitter } = await transcodeAudio(
        './test-videos/input/test-audio.wav',
        outputPath,
        {
          preset: preset.name,
          overwrite: true
        }
      );
      
      // Simple progress indicator
      emitter.on('progress', (progress) => {
        if (progress.time) {
          const percent = Math.min(100, Math.round((progress.time / 5) * 100)); // For 5-second test video
          process.stdout.write(`\rProgress: ${percent}% complete`);
        }
      });
      
      console.log(`\nTranscoded to: ${outputPath}`);
    }
  } catch (error) {
    console.error('Audio preset transcoding failed:', error.message);
  }
}

// Example 3: Audio effects (normalization, fade in/out, noise reduction)
console.log('Example 3: Audio effects');
async function audioEffectsExample() {
  try {
    // Create test directory if it doesn't exist
    const outputDir = './test-videos/output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const { outputPath, emitter } = await transcodeAudio(
      './test-videos/input/test-audio.wav',
      './test-videos/output/audio-with-effects.mp3',
      {
        audioCodec: 'libmp3lame',
        audioBitrate: '192k',
        normalize: true,
        fadeIn: 1,
        fadeOut: 1,
        noiseReduction: 0.3,
        overwrite: true
      }
    );
    
    // Create a progress bar
    emitter.on('progress', (progress) => {
      if (progress.time) {
        const percent = Math.min(100, Math.round((progress.time / 5) * 100)); // For 5-second test video
        const barLength = 30;
        const filledLength = Math.round(barLength * percent / 100);
        const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
        
        process.stdout.write(`\r[${bar}] ${percent}%`);
      }
    });
    
    console.log('\nAudio transcoding with effects completed successfully:', outputPath);
    console.log('Applied effects:');
    console.log('- Audio normalization');
    console.log('- 1 second fade in');
    console.log('- 1 second fade out');
    console.log('- Noise reduction (30%)');
  } catch (error) {
    console.error('Audio effects transcoding failed:', error.message);
  }
}

// Example 4: Batch audio format conversion
console.log('Example 4: Batch audio format conversion');
async function batchAudioConversionExample() {
  try {
    // Create test directory if it doesn't exist
    const outputDir = './test-videos/output/batch-audio';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // For this example, we'll use the same input file but convert to different formats
    const inputFile = './test-videos/input/test-audio.wav';
    
    // Define output formats
    const formats = [
      { ext: 'mp3', codec: 'libmp3lame', bitrate: '192k' },
      { ext: 'aac', codec: 'aac', bitrate: '192k' },
      { ext: 'ogg', codec: 'libvorbis', bitrate: '192k' },
      { ext: 'flac', codec: 'flac', bitrate: null } // FLAC is lossless, no bitrate needed
    ];
    
    console.log('\nBatch converting audio to different formats:');
    
    for (const format of formats) {
      const outputFile = path.join(outputDir, `audio.${format.ext}`);
      console.log(`\nConverting to ${format.ext.toUpperCase()}...`);
      
      const options = { 
        audioCodec: format.codec,
        overwrite: true 
      };
      
      // Add bitrate if specified
      if (format.bitrate) {
        options.audioBitrate = format.bitrate;
      }
      
      try {
        const { emitter } = await transcodeAudio(inputFile, outputFile, options);
        
        // Simple progress indicator
        emitter.on('progress', (progress) => {
          if (progress.time) {
            const percent = Math.min(100, Math.round((progress.time / 5) * 100)); // For 5-second test video
            process.stdout.write(`\rProgress: ${percent}% complete`);
          }
        });
        
        console.log(`\nSuccessfully converted to: ${outputFile}`);
      } catch (formatError) {
        console.error(`Failed to convert to ${format.ext}: ${formatError.message}`);
        // Continue with other formats even if one fails
      }
    }
  } catch (error) {
    console.error('Batch audio conversion failed:', error.message);
  }
}

// Run the examples
(async () => {
  try {
    await basicAudioExample();
    console.log('\n-----------------------------------\n');
    await audioPresetsExample();
    console.log('\n-----------------------------------\n');
    await audioEffectsExample();
    console.log('\n-----------------------------------\n');
    await batchAudioConversionExample();
  } catch (error) {
    console.error('Error running examples:', error.message);
  }
})();