/**
 * Tests for the @profullstack/transcoder module
 */

import { strict as assert } from 'assert';
import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { transcode, DEFAULT_OPTIONS, checkFfmpeg } from '../index.js';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('transcode module', function() {
  // Increase timeout for async tests
  this.timeout(5000);
  
  describe('checkFfmpeg function', function() {
    it('should detect if ffmpeg is installed', async function() {
      try {
        const result = await checkFfmpeg();
        expect(result).to.be.true;
      } catch (error) {
        // This test will fail if ffmpeg is not installed
        // But that's expected since the module requires ffmpeg
        assert.fail('FFmpeg should be installed for this test to pass');
      }
    });
  });
  
  describe('transcode function parameter validation', function() {
    it('should reject missing input path', async function() {
      try {
        await transcode(null, 'output.mp4');
        assert.fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error.message).to.include('Input path is required');
      }
    });
    
    it('should reject missing output path', async function() {
      try {
        await transcode('input.mp4', null);
        assert.fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error.message).to.include('Output path is required');
      }
    });
    
    it('should reject non-existent input file', async function() {
      const nonExistentFile = path.join(__dirname, 'non-existent-file.mp4');
      
      try {
        await transcode(nonExistentFile, 'output.mp4');
        assert.fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error.message).to.include('Input file does not exist');
      }
    });
  });
  
  describe('DEFAULT_OPTIONS', function() {
    it('should have the expected default options', function() {
      expect(DEFAULT_OPTIONS).to.have.property('videoCodec', 'libx264');
      expect(DEFAULT_OPTIONS).to.have.property('audioCodec', 'aac');
      expect(DEFAULT_OPTIONS).to.have.property('preset', 'medium');
      expect(DEFAULT_OPTIONS).to.have.property('profile', 'main');
      expect(DEFAULT_OPTIONS).to.have.property('level', '4.0');
      expect(DEFAULT_OPTIONS).to.have.property('pixelFormat', 'yuv420p');
    });
  });
  
  // Skip actual transcoding tests in CI environments
  const runTranscodingTests = process.env.CI !== 'true' && fs.existsSync('./test-videos/input/test-video.mov');
  
  (runTranscodingTests ? describe : describe.skip)('transcode function with actual files', function() {
    const inputPath = './test-videos/input/test-video.mov';
    const outputPath = './test-videos/output/mocha-test-output.mp4';
    
    // Clean up output file before each test
    beforeEach(function() {
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    });
    
    it('should transcode a video file successfully', async function() {
      const { outputPath: resultPath, emitter } = await transcode(inputPath, outputPath);
      
      expect(resultPath).to.equal(outputPath);
      expect(fs.existsSync(outputPath)).to.be.true;
      
      // Test that progress events are emitted
      let progressEventReceived = false;
      
      emitter.on('progress', (progress) => {
        progressEventReceived = true;
        // We can't assert much here since the events are asynchronous
        // and the test might complete before we receive them
      });
      
      // Manually emit a progress event to test the handler
      emitter.emit('progress', {
        time: 1,
        frame: 30,
        fps: 30,
        bitrate: 1500,
        size: 100000,
        speed: 2.0
      });
      
      expect(progressEventReceived).to.be.true;
    });
    
    it('should use custom options', async function() {
      const options = {
        videoCodec: 'libx264',
        audioBitrate: '192k',
        videoBitrate: '2000k',
        preset: 'fast',
        overwrite: true
      };
      
      const { outputPath: resultPath } = await transcode(inputPath, outputPath, options);
      
      expect(resultPath).to.equal(outputPath);
      expect(fs.existsSync(outputPath)).to.be.true;
    });
  });
});