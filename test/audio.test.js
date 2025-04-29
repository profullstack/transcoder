/**
 * @profullstack/transcoder - Audio Transcoding Tests
 */

import { expect } from 'chai';
import { transcodeAudio } from '../index.js';
import fs from 'fs';
import path from 'path';

// Test directory paths
const inputDir = './test-videos/input';
const outputDir = './test-videos/output/test-audio';

describe('Audio Transcoding', function() {
  this.timeout(30000); // Set timeout to 30 seconds
  
  before(function() {
    // Check if test audio file exists
    const testAudioPath = path.join(inputDir, 'test-audio.wav');
    if (!fs.existsSync(testAudioPath)) {
      this.skip();
    }
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });
  
  // Clean up test output files after tests
  after(function() {
    if (fs.existsSync(outputDir)) {
      try {
        const files = fs.readdirSync(outputDir);
        for (const file of files) {
          fs.unlinkSync(path.join(outputDir, file));
        }
      } catch (error) {
        console.warn(`Warning: Failed to clean up test files: ${error.message}`);
      }
    }
  });
  
  it('should transcode audio from WAV to MP3', async function() {
    const inputPath = path.join(inputDir, 'test-audio.wav');
    const outputPath = path.join(outputDir, 'basic-output.mp3');
    
    const result = await transcodeAudio(inputPath, outputPath, {
      audioCodec: 'libmp3lame',
      audioBitrate: '192k',
      overwrite: true
    });
    
    expect(result).to.have.property('outputPath');
    expect(fs.existsSync(result.outputPath)).to.be.true;
    
    // Check if output file has a reasonable size
    const stats = fs.statSync(outputPath);
    expect(stats.size).to.be.greaterThan(0);
  });
  
  it('should transcode audio using presets', async function() {
    const inputPath = path.join(inputDir, 'test-audio.wav');
    const outputPath = path.join(outputDir, 'preset-output.aac');
    
    const result = await transcodeAudio(inputPath, outputPath, {
      preset: 'audio-high',
      overwrite: true
    });
    
    expect(result).to.have.property('outputPath');
    expect(fs.existsSync(result.outputPath)).to.be.true;
    
    // Check if output file has a reasonable size
    const stats = fs.statSync(outputPath);
    expect(stats.size).to.be.greaterThan(0);
  });
  
  it('should apply audio effects during transcoding', async function() {
    const inputPath = path.join(inputDir, 'test-audio.wav');
    const outputPath = path.join(outputDir, 'effects-output.mp3');
    
    const result = await transcodeAudio(inputPath, outputPath, {
      audioCodec: 'libmp3lame',
      audioBitrate: '192k',
      normalize: true,
      fadeIn: 1,
      fadeOut: 1,
      noiseReduction: 0.3,
      overwrite: true
    });
    
    expect(result).to.have.property('outputPath');
    expect(fs.existsSync(result.outputPath)).to.be.true;
    
    // Check if output file has a reasonable size
    const stats = fs.statSync(outputPath);
    expect(stats.size).to.be.greaterThan(0);
  });
  
  describe('Audio Format Conversion', function() {
    const formats = [
      { ext: 'mp3', codec: 'libmp3lame', bitrate: '192k' },
      { ext: 'aac', codec: 'aac', bitrate: '192k' },
      { ext: 'ogg', codec: 'libvorbis', bitrate: '192k' },
      { ext: 'flac', codec: 'flac' }
    ];
    
    formats.forEach(format => {
      it(`should convert audio to ${format.ext.toUpperCase()} format`, async function() {
        const inputPath = path.join(inputDir, 'test-audio.wav');
        const outputPath = path.join(outputDir, `format-output.${format.ext}`);
        
        const options = {
          audioCodec: format.codec,
          overwrite: true
        };
        
        // Add bitrate if specified
        if (format.bitrate) {
          options.audioBitrate = format.bitrate;
        }
        
        const result = await transcodeAudio(inputPath, outputPath, options);
        
        expect(result).to.have.property('outputPath');
        expect(fs.existsSync(result.outputPath)).to.be.true;
        
        // Check if output file has a reasonable size
        const stats = fs.statSync(outputPath);
        expect(stats.size).to.be.greaterThan(0);
      });
    });
  });
  
  describe('Error Handling', function() {
    it('should throw an error for non-existent input file', async function() {
      const nonExistentInput = path.join(inputDir, 'non-existent.wav');
      const outputPath = path.join(outputDir, 'error-output.mp3');
      
      try {
        await transcodeAudio(nonExistentInput, outputPath, {
          audioCodec: 'libmp3lame',
          overwrite: true
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('does not exist');
      }
    });
    
    it('should throw an error for invalid audio codec', async function() {
      const inputPath = path.join(inputDir, 'test-audio.wav');
      const outputPath = path.join(outputDir, 'error-output.mp3');
      
      try {
        await transcodeAudio(inputPath, outputPath, {
          audioCodec: 'invalid-codec',
          overwrite: true
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        // This is expected - FFmpeg will throw an error for invalid codec
        expect(error.message).to.include('FFmpeg');
      }
    });
  });
});