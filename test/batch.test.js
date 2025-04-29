/**
 * @profullstack/transcoder - Batch Processing Tests
 */

import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import { 
  scanDirectory, 
  batchProcess, 
  batchProcessDirectory,
  SUPPORTED_EXTENSIONS
} from '../src/batch.js';

// Test directory paths
const TEST_INPUT_DIR = path.join('test-videos', 'input');
const TEST_OUTPUT_DIR = path.join('test-videos', 'output', 'batch-test');

// Ensure output directory exists
if (!fs.existsSync(TEST_OUTPUT_DIR)) {
  fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
}

describe('Batch Processing Module', function() {
  // Increase timeout for transcoding operations
  this.timeout(30000);

  describe('scanDirectory()', function() {
    it('should scan a directory for media files', async function() {
      const files = await scanDirectory(TEST_INPUT_DIR);
      expect(files).to.be.an('array');
      expect(files.length).to.be.greaterThan(0);
      
      // Verify all files have supported extensions
      const allSupported = files.every(file => {
        const ext = path.extname(file).toLowerCase();
        return SUPPORTED_EXTENSIONS.video.includes(ext) || 
               SUPPORTED_EXTENSIONS.audio.includes(ext) || 
               SUPPORTED_EXTENSIONS.image.includes(ext);
      });
      
      expect(allSupported).to.be.true;
    });

    it('should filter files by media type', async function() {
      const videoFiles = await scanDirectory(TEST_INPUT_DIR, { mediaTypes: ['video'] });
      expect(videoFiles).to.be.an('array');
      
      // Verify all files have video extensions
      const allVideos = videoFiles.every(file => {
        const ext = path.extname(file).toLowerCase();
        return SUPPORTED_EXTENSIONS.video.includes(ext);
      });
      
      expect(allVideos).to.be.true;
    });

    it('should handle non-existent directories', async function() {
      try {
        await scanDirectory('non-existent-directory');
        // Should not reach here
        expect.fail('Should have thrown an error for non-existent directory');
      } catch (error) {
        expect(error).to.be.an('error');
        expect(error.message).to.include('does not exist');
      }
    });
  });

  describe('batchProcess()', function() {
    it('should process a batch of files', async function() {
      // Find a test video file
      const testFiles = fs.readdirSync(TEST_INPUT_DIR)
        .filter(file => SUPPORTED_EXTENSIONS.video.includes(path.extname(file).toLowerCase()))
        .map(file => path.join(TEST_INPUT_DIR, file));
      
      // Skip test if no test files found
      if (testFiles.length === 0) {
        this.skip();
        return;
      }
      
      // Use just the first file for faster testing
      const filePaths = [testFiles[0]];
      
      const options = {
        outputDir: TEST_OUTPUT_DIR,
        outputPrefix: 'test-batch-',
        transcodeOptions: {
          preset: 'mobile', // Use a fast preset for testing
          overwrite: true
        }
      };
      
      const { results, emitter } = await batchProcess(filePaths, options);
      
      expect(results).to.be.an('object');
      expect(results.total).to.equal(filePaths.length);
      expect(results.completed).to.equal(filePaths.length);
      expect(results.successful).to.be.an('array');
      expect(results.failed).to.be.an('array');
      
      // Verify successful transcoding
      if (results.successful.length > 0) {
        const firstResult = results.successful[0];
        expect(firstResult).to.have.property('input');
        expect(firstResult).to.have.property('output');
        expect(fs.existsSync(firstResult.output)).to.be.true;
      }
      
      // Verify emitter
      expect(emitter).to.be.an('object');
      expect(emitter.emit).to.be.a('function');
    });

    it('should handle errors gracefully', async function() {
      // Test with a non-existent file
      const filePaths = ['non-existent-file.mp4'];
      
      const options = {
        outputDir: TEST_OUTPUT_DIR,
        transcodeOptions: {
          preset: 'mobile',
          overwrite: true
        }
      };
      
      const { results } = await batchProcess(filePaths, options);
      
      expect(results).to.be.an('object');
      expect(results.total).to.equal(filePaths.length);
      expect(results.completed).to.equal(filePaths.length);
      expect(results.successful).to.be.an('array');
      expect(results.successful.length).to.equal(0);
      expect(results.failed).to.be.an('array');
      expect(results.failed.length).to.equal(filePaths.length);
      
      // Verify error message
      const firstError = results.failed[0];
      expect(firstError).to.have.property('input');
      expect(firstError).to.have.property('error');
      expect(firstError.error).to.include('does not exist');
    });
  });

  describe('batchProcessDirectory()', function() {
    it('should process all media files in a directory', async function() {
      const options = {
        outputDir: TEST_OUTPUT_DIR,
        outputPrefix: 'dir-test-',
        transcodeOptions: {
          preset: 'mobile', // Use a fast preset for testing
          overwrite: true
        }
      };
      
      const scanOptions = {
        mediaTypes: ['video'],
        recursive: false
      };
      
      const { results, emitter } = await batchProcessDirectory(TEST_INPUT_DIR, options, scanOptions);
      
      expect(results).to.be.an('object');
      expect(results.total).to.be.a('number');
      expect(results.completed).to.equal(results.total);
      expect(results.successful).to.be.an('array');
      expect(results.failed).to.be.an('array');
      
      // Verify emitter
      expect(emitter).to.be.an('object');
      expect(emitter.emit).to.be.a('function');
    });

    it('should handle empty directories', async function() {
      // Create an empty directory
      const emptyDir = path.join(TEST_OUTPUT_DIR, 'empty');
      if (!fs.existsSync(emptyDir)) {
        fs.mkdirSync(emptyDir, { recursive: true });
      }
      
      try {
        await batchProcessDirectory(emptyDir);
        // Should not reach here
        expect.fail('Should have thrown an error for empty directory');
      } catch (error) {
        expect(error).to.be.an('error');
        expect(error.message).to.include('No supported media files found');
      }
    });
  });

  // Clean up test output files after all tests
  after(function() {
    // Uncomment to clean up test files
    // if (fs.existsSync(TEST_OUTPUT_DIR)) {
    //   fs.readdirSync(TEST_OUTPUT_DIR).forEach(file => {
    //     const filePath = path.join(TEST_OUTPUT_DIR, file);
    //     if (fs.statSync(filePath).isFile()) {
    //       fs.unlinkSync(filePath);
    //     }
    //   });
    // }
  });
});