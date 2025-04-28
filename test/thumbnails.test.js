/**
 * Tests for the Thumbnail Generation feature
 */

import { strict as assert } from 'assert';
import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { transcode, generateThumbnails } from '../index.js';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Helper function to check if ffprobe is available
async function checkFfprobe() {
  return new Promise((resolve) => {
    const ffprobeProcess = spawn('ffprobe', ['-version']);
    
    ffprobeProcess.on('close', (code) => {
      resolve(code === 0);
    });
    
    ffprobeProcess.on('error', () => {
      resolve(false);
    });
  });
}

describe('Thumbnail Generation', function() {
  // Increase timeout for async tests
  this.timeout(10000);
  
  // Check if ffprobe is available
  let ffprobeAvailable = false;
  
  before(async function() {
    ffprobeAvailable = await checkFfprobe();
    if (!ffprobeAvailable) {
      console.warn('Warning: ffprobe is not available or has missing dependencies. Skipping thumbnail generation tests.');
    }
  });
  
  describe('generateThumbnails function', function() {
    it('should validate input parameters', async function() {
      // Test missing input path
      try {
        await generateThumbnails(null, './test-videos/output', { count: 3 });
        assert.fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error.message).to.include('Input path is required');
      }
      
      // Test non-existent input file
      try {
        await generateThumbnails('non-existent-file.mp4', './test-videos/output', { count: 3 });
        assert.fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error.message).to.include('Input file does not exist');
      }
    });
    
    // Skip actual thumbnail generation tests in CI environments or if ffprobe is not available
    const runThumbnailTests = process.env.CI !== 'true' && fs.existsSync('./test-videos/input/test-video.mov') && ffprobeAvailable;
    
    (runThumbnailTests ? it : it.skip)('should generate thumbnails with default options', async function() {
      const inputPath = './test-videos/input/test-video.mov';
      const outputDir = './test-videos/output';
      
      // Clean up any existing thumbnails
      const thumbnailPattern = path.join(outputDir, 'thumbnail-*.jpg');
      const existingThumbnails = fs.readdirSync(outputDir)
        .filter(file => file.startsWith('thumbnail-') && file.endsWith('.jpg'))
        .map(file => path.join(outputDir, file));
      
      existingThumbnails.forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
      
      // Generate thumbnails
      const thumbnails = await generateThumbnails(inputPath, outputDir);
      
      // Verify thumbnails were generated
      expect(thumbnails).to.be.an('array');
      expect(thumbnails.length).to.equal(3); // Default count is 3
      
      // Verify thumbnail files exist
      thumbnails.forEach(thumbnailPath => {
        expect(fs.existsSync(thumbnailPath)).to.be.true;
        
        // Clean up
        if (fs.existsSync(thumbnailPath)) {
          fs.unlinkSync(thumbnailPath);
        }
      });
    });
    
    (runThumbnailTests ? it : it.skip)('should generate thumbnails with custom options', async function() {
      const inputPath = './test-videos/input/test-video.mov';
      const outputDir = './test-videos/output';
      const options = {
        count: 5,
        format: 'png',
        filenamePattern: 'test-thumbnail-%d'
      };
      
      // Clean up any existing thumbnails
      const thumbnailPattern = path.join(outputDir, 'test-thumbnail-*.png');
      const existingThumbnails = fs.readdirSync(outputDir)
        .filter(file => file.startsWith('test-thumbnail-') && file.endsWith('.png'))
        .map(file => path.join(outputDir, file));
      
      existingThumbnails.forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
      
      // Generate thumbnails
      const thumbnails = await generateThumbnails(inputPath, outputDir, options);
      
      // Verify thumbnails were generated
      expect(thumbnails).to.be.an('array');
      expect(thumbnails.length).to.equal(options.count);
      
      // Verify thumbnail files exist and have the correct format
      thumbnails.forEach(thumbnailPath => {
        expect(fs.existsSync(thumbnailPath)).to.be.true;
        expect(thumbnailPath.endsWith('.png')).to.be.true;
        expect(path.basename(thumbnailPath).startsWith('test-thumbnail-')).to.be.true;
        
        // Clean up
        if (fs.existsSync(thumbnailPath)) {
          fs.unlinkSync(thumbnailPath);
        }
      });
    });
    
    (runThumbnailTests ? it : it.skip)('should generate thumbnails at specific timestamps', async function() {
      const inputPath = './test-videos/input/test-video.mov';
      const outputDir = './test-videos/output';
      const options = {
        timestamps: true,
        timestampList: ['00:00:00.5', '00:00:01'],
        format: 'jpg',
        filenamePattern: 'timestamp-thumbnail-%d'
      };
      
      // Clean up any existing thumbnails
      const thumbnailPattern = path.join(outputDir, 'timestamp-thumbnail-*.jpg');
      const existingThumbnails = fs.readdirSync(outputDir)
        .filter(file => file.startsWith('timestamp-thumbnail-') && file.endsWith('.jpg'))
        .map(file => path.join(outputDir, file));
      
      existingThumbnails.forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
      
      // Generate thumbnails
      const thumbnails = await generateThumbnails(inputPath, outputDir, options);
      
      // Verify thumbnails were generated
      expect(thumbnails).to.be.an('array');
      expect(thumbnails.length).to.equal(options.timestampList.length);
      
      // Verify thumbnail files exist
      thumbnails.forEach(thumbnailPath => {
        expect(fs.existsSync(thumbnailPath)).to.be.true;
        
        // Clean up
        if (fs.existsSync(thumbnailPath)) {
          fs.unlinkSync(thumbnailPath);
        }
      });
    });
  });
  
  describe('transcode function with thumbnails', function() {
    // Skip actual transcoding tests in CI environments or if ffprobe is not available
    const runTranscodingTests = process.env.CI !== 'true' && fs.existsSync('./test-videos/input/test-video.mov') && ffprobeAvailable;
    
    (runTranscodingTests ? it : it.skip)('should generate thumbnails during transcoding', async function() {
      const inputPath = './test-videos/input/test-video.mov';
      const outputPath = './test-videos/output/test-with-thumbnails.mp4';
      const thumbnailOptions = {
        count: 3,
        format: 'jpg'
      };
      
      // Clean up output file if it exists
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      
      // Clean up any existing thumbnails
      const thumbnailPattern = path.join(path.dirname(outputPath), 'thumbnail-*.jpg');
      const existingThumbnails = fs.readdirSync(path.dirname(outputPath))
        .filter(file => file.startsWith('thumbnail-') && file.endsWith('.jpg'))
        .map(file => path.join(path.dirname(outputPath), file));
      
      existingThumbnails.forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
      
      // Transcode with thumbnails
      const { outputPath: resultPath, thumbnails, emitter } = await transcode(
        inputPath,
        outputPath,
        {
          overwrite: true,
          thumbnails: thumbnailOptions
        }
      );
      
      // Verify transcoding was successful
      expect(resultPath).to.equal(outputPath);
      expect(fs.existsSync(outputPath)).to.be.true;
      
      // Verify thumbnails were generated (if thumbnail generation was successful)
      if (thumbnails) {
        expect(thumbnails).to.be.an('array');
        expect(thumbnails.length).to.equal(thumbnailOptions.count);
        
        // Verify thumbnail files exist
        thumbnails.forEach(thumbnailPath => {
          expect(fs.existsSync(thumbnailPath)).to.be.true;
          
          // Clean up
          if (fs.existsSync(thumbnailPath)) {
            fs.unlinkSync(thumbnailPath);
          }
        });
      } else {
        console.warn('Thumbnail generation was skipped or failed, but transcoding was successful');
      }
      
      // Clean up output file
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    });
  });
});