/**
 * Generate test audio files for testing the audio transcoding functionality
 * 
 * This script creates various test audio files in different formats
 * that can be used to test the audio transcoding functionality.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Create output directory if it doesn't exist
const outputDir = './test-videos/input';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate a test audio file using FFmpeg
async function generateTestAudio(outputPath, options = {}) {
  // Default options
  const settings = {
    duration: 5,        // Duration in seconds
    frequency: 440,     // Frequency in Hz (A4 note)
    sampleRate: 44100,  // Sample rate in Hz
    format: 'wav',      // Output format
    ...options
  };

  return new Promise((resolve, reject) => {
    // Build FFmpeg command to generate a sine wave
    const args = [
      // Input options - generate a sine wave
      '-f', 'lavfi',
      '-i', `sine=frequency=${settings.frequency}:sample_rate=${settings.sampleRate}:duration=${settings.duration}`,
      
      // Output options
      '-c:a', settings.codec || 'pcm_s16le', // Default to PCM for WAV
      
      // Add bitrate if specified
      ...(settings.bitrate ? ['-b:a', settings.bitrate] : []),
      
      // Overwrite existing file
      '-y',
      
      // Output file
      outputPath
    ];

    console.log(`Generating test audio file: ${outputPath}`);
    console.log(`Command: ffmpeg ${args.join(' ')}`);

    const ffmpegProcess = spawn('ffmpeg', args);
    
    let errorOutput = '';
    
    ffmpegProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    ffmpegProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`Successfully generated: ${outputPath}`);
        resolve(outputPath);
      } else {
        console.error(`Failed to generate audio file with code ${code}: ${errorOutput}`);
        reject(new Error(`FFmpeg failed with code ${code}: ${errorOutput}`));
      }
    });
    
    ffmpegProcess.on('error', (err) => {
      reject(new Error(`Failed to start FFmpeg process: ${err.message}`));
    });
  });
}

// Main function to generate all test audio files
async function generateAllTestAudio() {
  try {
    // Generate WAV file (uncompressed PCM audio)
    await generateTestAudio(path.join(outputDir, 'test-audio.wav'), {
      duration: 5,
      frequency: 440, // A4 note
      format: 'wav'
    });
    
    // Generate MP3 file
    await generateTestAudio(path.join(outputDir, 'test-audio.mp3'), {
      duration: 5,
      frequency: 440,
      format: 'mp3',
      codec: 'libmp3lame',
      bitrate: '192k'
    });
    
    // Generate AAC file
    await generateTestAudio(path.join(outputDir, 'test-audio.aac'), {
      duration: 5,
      frequency: 440,
      format: 'aac',
      codec: 'aac',
      bitrate: '192k'
    });
    
    // Generate OGG file
    await generateTestAudio(path.join(outputDir, 'test-audio.ogg'), {
      duration: 5,
      frequency: 440,
      format: 'ogg',
      codec: 'libvorbis',
      bitrate: '192k'
    });
    
    // Generate FLAC file (lossless)
    await generateTestAudio(path.join(outputDir, 'test-audio.flac'), {
      duration: 5,
      frequency: 440,
      format: 'flac',
      codec: 'flac'
    });
    
    console.log('All test audio files generated successfully!');
  } catch (error) {
    console.error('Error generating test audio files:', error.message);
  }
}

// Run the main function
generateAllTestAudio();