/**
 * @profullstack/transcoder - Audio Enhancement Tests
 * Tests for audio enhancement features
 */

import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import { transcode } from '../src/index.js';
import { transcodeAudio } from '../src/audio.js';
import { getVideoMetadata } from '../src/utils.js';

// Test file paths
const TEST_VIDEO_PATH = './test-videos/input/test-video.mov';
const TEST_AUDIO_PATH = './test-videos/input/test-audio.wav';
const OUTPUT_DIR = './test-videos/output/test';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

describe('Audio Enhancement Features', function() {
  // Increase timeout for transcoding operations
  this.timeout(30000);
  
  // Clean up output files after tests
  afterEach(function() {
    // Delete all files in the output directory
    const files = fs.readdirSync(OUTPUT_DIR);
    files.forEach(file => {
      const filePath = path.join(OUTPUT_DIR, file);
      if (fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      }
    });
  });
  
  describe('Audio Normalization', function() {
    it('should apply audio normalization to video files', async function() {
      const outputPath = path.join(OUTPUT_DIR, 'normalized-video.mp4');
      
      const result = await transcode(TEST_VIDEO_PATH, outputPath, {
        audio: {
          normalize: true
        },
        overwrite: true
      });
      
      // Verify the file was created
      expect(fs.existsSync(outputPath)).to.be.true;
      
      // Verify the FFmpeg command includes the normalization filter
      expect(result.ffmpegCommand).to.include('loudnorm=I=-16:TP=-1.5:LRA=11');
    });
    
    it('should apply audio normalization to WAV audio files', async function() {
      const outputPath = path.join(OUTPUT_DIR, 'normalized-audio.wav');
      
      const result = await transcodeAudio(TEST_AUDIO_PATH, outputPath, {
        normalize: true,
        overwrite: true
      });
      
      // Verify the file was created
      expect(fs.existsSync(outputPath)).to.be.true;
      
      // Verify the FFmpeg command includes the normalization filter
      expect(result.ffmpegCommand).to.include('loudnorm=I=-16:TP=-1.5:LRA=11');
    });
  });
  
  describe('Noise Reduction', function() {
    it('should apply noise reduction to video files', async function() {
      const outputPath = path.join(OUTPUT_DIR, 'noise-reduced-video.mp4');
      
      const result = await transcode(TEST_VIDEO_PATH, outputPath, {
        audio: {
          noiseReduction: 0.3
        },
        overwrite: true
      });
      
      // Verify the file was created
      expect(fs.existsSync(outputPath)).to.be.true;
      
      // Verify the FFmpeg command includes the noise reduction filter
      expect(result.ffmpegCommand).to.include('afftdn=nr=');
    });
    
    it('should apply noise reduction to WAV audio files', async function() {
      const outputPath = path.join(OUTPUT_DIR, 'noise-reduced-audio.wav');
      
      const result = await transcodeAudio(TEST_AUDIO_PATH, outputPath, {
        noiseReduction: 0.3,
        overwrite: true
      });
      
      // Verify the file was created
      expect(fs.existsSync(outputPath)).to.be.true;
      
      // Verify the FFmpeg command includes the noise reduction filter
      expect(result.ffmpegCommand).to.include('afftdn=nr=');
    });
    
    it('should apply the correct noise reduction amount', async function() {
      const outputPath = path.join(OUTPUT_DIR, 'noise-reduced-amount.mp4');
      const noiseReduction = 0.5; // 50% noise reduction
      
      const result = await transcode(TEST_VIDEO_PATH, outputPath, {
        audio: {
          noiseReduction
        },
        overwrite: true
      });
      
      // Calculate the expected noise reduction amount (0.01 + (value * 0.96))
      const expectedAmount = 0.01 + (noiseReduction * 0.96);
      
      // Verify the FFmpeg command includes the noise reduction filter
      expect(result.ffmpegCommand).to.include('afftdn=nr=');
      
      // Extract the actual noise reduction value from the command
      const match = result.ffmpegCommand.match(/afftdn=nr=([0-9.]+)/);
      expect(match).to.not.be.null;
      
      if (match) {
        const actualAmount = parseFloat(match[1]);
        // Allow for small floating point differences
        expect(actualAmount).to.be.closeTo(expectedAmount, 0.001);
      }
    });
  });
  
  describe('Audio Fade In/Out', function() {
    it('should apply fade in to video files', async function() {
      const outputPath = path.join(OUTPUT_DIR, 'fade-in-video.mp4');
      const fadeIn = 1.5; // 1.5 seconds fade in
      
      const result = await transcode(TEST_VIDEO_PATH, outputPath, {
        audio: {
          fadeIn
        },
        overwrite: true
      });
      
      // Verify the file was created
      expect(fs.existsSync(outputPath)).to.be.true;
      
      // Verify the FFmpeg command includes the fade in filter
      expect(result.ffmpegCommand).to.include(`afade=t=in:st=0:d=${fadeIn}`);
    });
    
    it('should apply fade out to video files', async function() {
      const outputPath = path.join(OUTPUT_DIR, 'fade-out-video.mp4');
      const fadeOut = 2.0; // 2 seconds fade out
      
      const result = await transcode(TEST_VIDEO_PATH, outputPath, {
        audio: {
          fadeOut
        },
        overwrite: true
      });
      
      // Verify the file was created
      expect(fs.existsSync(outputPath)).to.be.true;
      
      // Verify the FFmpeg command includes the fade out filter
      expect(result.ffmpegCommand).to.include(`afade=t=out:st=`);
      expect(result.ffmpegCommand).to.include(`:d=${fadeOut}`);
    });
    
    it('should apply both fade in and fade out to video files', async function() {
      const outputPath = path.join(OUTPUT_DIR, 'fade-in-out-video.mp4');
      const fadeIn = 0.5; // 0.5 seconds fade in
      const fadeOut = 1.0; // 1 second fade out
      
      const result = await transcode(TEST_VIDEO_PATH, outputPath, {
        audio: {
          fadeIn,
          fadeOut
        },
        overwrite: true
      });
      
      // Verify the file was created
      expect(fs.existsSync(outputPath)).to.be.true;
      
      // Verify the FFmpeg command includes both fade filters
      expect(result.ffmpegCommand).to.include(`afade=t=in:st=0:d=${fadeIn}`);
      expect(result.ffmpegCommand).to.include(`afade=t=out:st=`);
      expect(result.ffmpegCommand).to.include(`:d=${fadeOut}`);
    });
  });
  
  describe('Volume Adjustment', function() {
    it('should apply volume adjustment to video files', async function() {
      const outputPath = path.join(OUTPUT_DIR, 'volume-adjusted-video.mp4');
      const volume = 1.5; // Increase volume by 50%
      
      const result = await transcode(TEST_VIDEO_PATH, outputPath, {
        audio: {
          volume
        },
        overwrite: true
      });
      
      // Verify the file was created
      expect(fs.existsSync(outputPath)).to.be.true;
      
      // Verify the FFmpeg command includes the volume filter
      expect(result.ffmpegCommand).to.include(`volume=${volume}`);
    });
  });
  
  describe('Combined Audio Enhancements', function() {
    it('should apply multiple audio enhancements together', async function() {
      const outputPath = path.join(OUTPUT_DIR, 'combined-enhancements.mp4');
      
      const result = await transcode(TEST_VIDEO_PATH, outputPath, {
        audio: {
          normalize: true,
          noiseReduction: 0.2,
          fadeIn: 0.5,
          fadeOut: 1.0,
          volume: 1.2
        },
        overwrite: true
      });
      
      // Verify the file was created
      expect(fs.existsSync(outputPath)).to.be.true;
      
      // Verify the FFmpeg command includes all filters
      expect(result.ffmpegCommand).to.include('loudnorm=I=-16:TP=-1.5:LRA=11');
      expect(result.ffmpegCommand).to.include('afftdn=nr=');
      expect(result.ffmpegCommand).to.include('afade=t=in:st=0:d=0.5');
      expect(result.ffmpegCommand).to.include('afade=t=out:st=');
      expect(result.ffmpegCommand).to.include('volume=1.2');
    });
  });
  
  describe('CLI Options', function() {
    it('should apply audio enhancements via CLI options', async function() {
      // This is a mock test to verify the CLI options are correctly mapped to the API
      // In a real test, you would use child_process.exec to run the CLI command
      
      const outputPath = path.join(OUTPUT_DIR, 'cli-options.mp4');
      
      // Simulate CLI options being parsed and passed to the API
      const cliOptions = {
        audioNormalize: true,
        audioNoiseReduction: 0.3,
        audioFadeIn: 1.0,
        audioFadeOut: 2.0,
        audioVolume: 1.5
      };
      
      // Convert CLI options to API options
      const apiOptions = {
        audio: {}
      };
      
      if (cliOptions.audioNormalize) {
        apiOptions.audio.normalize = true;
      }
      
      if (cliOptions.audioNoiseReduction !== undefined) {
        apiOptions.audio.noiseReduction = cliOptions.audioNoiseReduction;
      }
      
      if (cliOptions.audioFadeIn !== undefined) {
        apiOptions.audio.fadeIn = cliOptions.audioFadeIn;
      }
      
      if (cliOptions.audioFadeOut !== undefined) {
        apiOptions.audio.fadeOut = cliOptions.audioFadeOut;
      }
      
      if (cliOptions.audioVolume !== undefined) {
        apiOptions.audio.volume = cliOptions.audioVolume;
      }
      
      apiOptions.overwrite = true;
      
      const result = await transcode(TEST_VIDEO_PATH, outputPath, apiOptions);
      
      // Verify the file was created
      expect(fs.existsSync(outputPath)).to.be.true;
      
      // Verify the FFmpeg command includes all filters
      expect(result.ffmpegCommand).to.include('loudnorm=I=-16:TP=-1.5:LRA=11');
      expect(result.ffmpegCommand).to.include('afftdn=nr=');
      expect(result.ffmpegCommand).to.include('afade=t=in:st=0:d=1');
      expect(result.ffmpegCommand).to.include('afade=t=out:st=');
      expect(result.ffmpegCommand).to.include('volume=1.5');
    });
  });
});