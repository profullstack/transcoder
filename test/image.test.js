/**
 * @profullstack/transcoder - Image Transcoding Tests
 */

import { expect } from 'chai';
import { transcodeImage, transcodeImageBatch } from '../index.js';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

// Test directory paths
const inputDir = './test-images/input';
const outputDir = './test-images/output/test';

describe('Image Transcoding', function() {
  this.timeout(30000); // Set timeout to 30 seconds
  
  // Create a test image using FFmpeg
  async function createTestImage(outputPath, width = 800, height = 600, color = 'blue') {
    return new Promise((resolve, reject) => {
      // Skip if the file already exists
      if (fs.existsSync(outputPath)) {
        return resolve(outputPath);
      }
      
      // Try to find a system font that's likely to be available
      const fontPaths = [
        '/usr/share/fonts/Adwaita/AdwaitaSans-Bold.ttf',
        '/usr/share/fonts/Adwaita/AdwaitaSans-Regular.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
        '/Windows/Fonts/arial.ttf'
      ];
      
      let fontFile = null;
      for (const path of fontPaths) {
        if (fs.existsSync(path)) {
          fontFile = path;
          break;
        }
      }
      
      if (!fontFile) {
        // If no font is found, create a simple colored rectangle without text
        const args = [
          '-f', 'lavfi',
          '-i', `color=${color}:s=${width}x${height}`,
          '-frames:v', '1',
          '-y',
          outputPath
        ];
        
        const ffmpegProcess = spawn('ffmpeg', args);
        
        let errorOutput = '';
        
        ffmpegProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
        
        ffmpegProcess.on('close', (code) => {
          if (code === 0) {
            resolve(outputPath);
          } else {
            reject(new Error(`FFmpeg failed with code ${code}: ${errorOutput}`));
          }
        });
        
        ffmpegProcess.on('error', (err) => {
          reject(new Error(`Failed to start FFmpeg process: ${err.message}`));
        });
        
        return;
      }
      
      // Create a simple colored rectangle with text
      const args = [
        '-f', 'lavfi',
        '-i', `color=${color}:s=${width}x${height}`,
        '-vf', `drawtext=fontfile=${fontFile}:text='Test Image':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2`,
        '-frames:v', '1',
        '-y',
        outputPath
      ];
      
      const ffmpegProcess = spawn('ffmpeg', args);
      
      let errorOutput = '';
      
      ffmpegProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error(`FFmpeg failed with code ${code}: ${errorOutput}`));
        }
      });
      
      ffmpegProcess.on('error', (err) => {
        reject(new Error(`Failed to start FFmpeg process: ${err.message}`));
      });
    });
  }
  
  before(async function() {
    // Create test directories if they don't exist
    if (!fs.existsSync(inputDir)) {
      fs.mkdirSync(inputDir, { recursive: true });
    }
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Create a test image
    try {
      const testImagePath = path.join(inputDir, 'test-image.png');
      await createTestImage(testImagePath);
    } catch (error) {
      console.warn(`Warning: Failed to create test image: ${error.message}. Some tests may be skipped.`);
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
  
  describe('transcodeImage function parameter validation', function() {
    it('should reject missing input path', async function() {
      try {
        await transcodeImage(null, 'output.jpg');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Input path is required');
      }
    });
    
    it('should reject missing output path', async function() {
      try {
        await transcodeImage('./test-images/input/test-image.png', null);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Output path is required');
      }
    });
    
    it('should reject non-existent input file', async function() {
      try {
        await transcodeImage('./test-images/input/non-existent.png', './test-images/output/test/output.jpg');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('does not exist');
      }
    });
  });
  
  describe('Basic image transcoding', function() {
    it('should transcode an image to JPEG format', async function() {
      const testImagePath = path.join(inputDir, 'test-image.png');
      
      // Skip if test image doesn't exist
      if (!fs.existsSync(testImagePath)) {
        this.skip();
      }
      
      const outputPath = path.join(outputDir, 'basic-output.jpg');
      
      const result = await transcodeImage(testImagePath, outputPath, {
        format: 'jpg',
        quality: 90,
        overwrite: true
      });
      
      expect(result).to.have.property('outputPath');
      expect(fs.existsSync(result.outputPath)).to.be.true;
      
      // Check if output file has a reasonable size
      const stats = fs.statSync(outputPath);
      expect(stats.size).to.be.greaterThan(0);
    });
    
    it('should transcode an image to another JPEG format with different quality', async function() {
      const testImagePath = path.join(inputDir, 'test-image.png');
      
      // Skip if test image doesn't exist
      if (!fs.existsSync(testImagePath)) {
        this.skip();
      }
      
      const outputPath = path.join(outputDir, 'basic-output-low-quality.jpg');
      
      const result = await transcodeImage(testImagePath, outputPath, {
        format: 'jpg',
        quality: 50, // Lower quality
        overwrite: true
      });
      
      expect(result).to.have.property('outputPath');
      expect(fs.existsSync(result.outputPath)).to.be.true;
      
      // Check if output file has a reasonable size
      const stats = fs.statSync(outputPath);
      expect(stats.size).to.be.greaterThan(0);
    });
    
    it('should transcode an image to BMP format', async function() {
      const testImagePath = path.join(inputDir, 'test-image.png');
      
      // Skip if test image doesn't exist
      if (!fs.existsSync(testImagePath)) {
        this.skip();
      }
      
      const outputPath = path.join(outputDir, 'basic-output.bmp');
      
      const result = await transcodeImage(testImagePath, outputPath, {
        format: 'bmp',
        overwrite: true
      });
      
      expect(result).to.have.property('outputPath');
      expect(fs.existsSync(result.outputPath)).to.be.true;
      
      // Check if output file has a reasonable size
      const stats = fs.statSync(outputPath);
      expect(stats.size).to.be.greaterThan(0);
    });
  });
  
  describe('Image transformations', function() {
    it('should resize an image', async function() {
      const testImagePath = path.join(inputDir, 'test-image.png');
      
      // Skip if test image doesn't exist
      if (!fs.existsSync(testImagePath)) {
        this.skip();
      }
      
      const outputPath = path.join(outputDir, 'resize.jpg');
      
      const result = await transcodeImage(testImagePath, outputPath, {
        format: 'jpg',
        quality: 90,
        resize: { width: 400, height: 300 },
        overwrite: true
      });
      
      expect(result).to.have.property('outputPath');
      expect(fs.existsSync(result.outputPath)).to.be.true;
      
      // Check if output file has a reasonable size
      const stats = fs.statSync(outputPath);
      expect(stats.size).to.be.greaterThan(0);
      
      // Ideally, we would check the dimensions of the output image here
    });
    
    it('should rotate an image', async function() {
      const testImagePath = path.join(inputDir, 'test-image.png');
      
      // Skip if test image doesn't exist
      if (!fs.existsSync(testImagePath)) {
        this.skip();
      }
      
      const outputPath = path.join(outputDir, 'rotate.jpg');
      
      const result = await transcodeImage(testImagePath, outputPath, {
        format: 'jpg',
        quality: 90,
        rotate: 90, // 90 degrees clockwise
        overwrite: true
      });
      
      expect(result).to.have.property('outputPath');
      expect(fs.existsSync(result.outputPath)).to.be.true;
      
      // Check if output file has a reasonable size
      const stats = fs.statSync(outputPath);
      expect(stats.size).to.be.greaterThan(0);
    });
    
    it('should crop an image', async function() {
      const testImagePath = path.join(inputDir, 'test-image.png');
      
      // Skip if test image doesn't exist
      if (!fs.existsSync(testImagePath)) {
        this.skip();
      }
      
      const outputPath = path.join(outputDir, 'crop.jpg');
      
      const result = await transcodeImage(testImagePath, outputPath, {
        format: 'jpg',
        quality: 90,
        crop: { x: 100, y: 100, width: 600, height: 400 },
        overwrite: true
      });
      
      expect(result).to.have.property('outputPath');
      expect(fs.existsSync(result.outputPath)).to.be.true;
      
      // Check if output file has a reasonable size
      const stats = fs.statSync(outputPath);
      expect(stats.size).to.be.greaterThan(0);
    });
    
    it('should flip an image', async function() {
      const testImagePath = path.join(inputDir, 'test-image.png');
      
      // Skip if test image doesn't exist
      if (!fs.existsSync(testImagePath)) {
        this.skip();
      }
      
      const outputPath = path.join(outputDir, 'flip.jpg');
      
      const result = await transcodeImage(testImagePath, outputPath, {
        format: 'jpg',
        quality: 90,
        flip: 'horizontal',
        overwrite: true
      });
      
      expect(result).to.have.property('outputPath');
      expect(fs.existsSync(result.outputPath)).to.be.true;
      
      // Check if output file has a reasonable size
      const stats = fs.statSync(outputPath);
      expect(stats.size).to.be.greaterThan(0);
    });
  });
  
  describe('Image presets', function() {
    it('should apply JPEG high quality preset', async function() {
      const testImagePath = path.join(inputDir, 'test-image.png');
      
      // Skip if test image doesn't exist
      if (!fs.existsSync(testImagePath)) {
        this.skip();
      }
      
      const outputPath = path.join(outputDir, 'preset-jpeg-high.jpg');
      
      const result = await transcodeImage(testImagePath, outputPath, {
        preset: 'jpeg-high',
        overwrite: true
      });
      
      expect(result).to.have.property('outputPath');
      expect(fs.existsSync(result.outputPath)).to.be.true;
      
      // Check if output file has a reasonable size
      const stats = fs.statSync(outputPath);
      expect(stats.size).to.be.greaterThan(0);
    });
    
    it('should apply JPEG medium quality preset', async function() {
      const testImagePath = path.join(inputDir, 'test-image.png');
      
      // Skip if test image doesn't exist
      if (!fs.existsSync(testImagePath)) {
        this.skip();
      }
      
      const outputPath = path.join(outputDir, 'preset-jpeg-medium.jpg');
      
      const result = await transcodeImage(testImagePath, outputPath, {
        preset: 'jpeg-medium',
        overwrite: true
      });
      
      expect(result).to.have.property('outputPath');
      expect(fs.existsSync(result.outputPath)).to.be.true;
      
      // Check if output file has a reasonable size
      const stats = fs.statSync(outputPath);
      expect(stats.size).to.be.greaterThan(0);
    });
    
    it('should apply thumbnail preset', async function() {
      const testImagePath = path.join(inputDir, 'test-image.png');
      
      // Skip if test image doesn't exist
      if (!fs.existsSync(testImagePath)) {
        this.skip();
      }
      
      const outputPath = path.join(outputDir, 'preset-thumbnail.jpg');
      
      const result = await transcodeImage(testImagePath, outputPath, {
        preset: 'thumbnail',
        overwrite: true
      });
      
      expect(result).to.have.property('outputPath');
      expect(fs.existsSync(result.outputPath)).to.be.true;
      
      // Check if output file has a reasonable size
      const stats = fs.statSync(outputPath);
      expect(stats.size).to.be.greaterThan(0);
    });
  });
  
  describe('Square padding', function() {
    it('should convert a landscape image to square with transparent padding', async function() {
      // Create a landscape test image
      const testImagePath = path.join(inputDir, 'test-image-landscape.png');
      
      try {
        await createTestImage(testImagePath, 800, 400, 'green');
      } catch (error) {
        this.skip();
      }
      
      const outputPath = path.join(outputDir, 'square-transparent-landscape.jpg');
      
      const result = await transcodeImage(testImagePath, outputPath, {
        format: 'jpg',
        squarePad: true,
        padColor: 'white', // Using white instead of transparent for JPEG
        overwrite: true
      });
      
      expect(result).to.have.property('outputPath');
      expect(fs.existsSync(result.outputPath)).to.be.true;
      
      // Check if output file has a reasonable size
      const stats = fs.statSync(outputPath);
      expect(stats.size).to.be.greaterThan(0);
    });
    
    it('should convert a portrait image to square with white padding', async function() {
      // Create a portrait test image
      const testImagePath = path.join(inputDir, 'test-image-portrait.png');
      
      try {
        await createTestImage(testImagePath, 400, 800, 'red');
      } catch (error) {
        this.skip();
      }
      
      const outputPath = path.join(outputDir, 'square-white-portrait.jpg');
      
      const result = await transcodeImage(testImagePath, outputPath, {
        format: 'jpg',
        quality: 90,
        squarePad: true,
        padColor: 'white',
        overwrite: true
      });
      
      expect(result).to.have.property('outputPath');
      expect(fs.existsSync(result.outputPath)).to.be.true;
      
      // Check if output file has a reasonable size
      const stats = fs.statSync(outputPath);
      expect(stats.size).to.be.greaterThan(0);
    });
    
    it('should apply the square preset', async function() {
      // Create a landscape test image
      const testImagePath = path.join(inputDir, 'test-image-landscape.png');
      
      if (!fs.existsSync(testImagePath)) {
        try {
          await createTestImage(testImagePath, 800, 400, 'green');
        } catch (error) {
          this.skip();
        }
      }
      
      const outputPath = path.join(outputDir, 'preset-square.png');
      
      const result = await transcodeImage(testImagePath, outputPath, {
        preset: 'square', // Use square preset with transparent padding
        overwrite: true
      });
      
      expect(result).to.have.property('outputPath');
      expect(fs.existsSync(result.outputPath)).to.be.true;
      
      // Check if output file has a reasonable size
      const stats = fs.statSync(outputPath);
      expect(stats.size).to.be.greaterThan(0);
    });
    
    it('should apply the instagram-square preset', async function() {
      // Create a portrait test image
      const testImagePath = path.join(inputDir, 'test-image-portrait.png');
      
      if (!fs.existsSync(testImagePath)) {
        try {
          await createTestImage(testImagePath, 400, 800, 'red');
        } catch (error) {
          this.skip();
        }
      }
      
      const outputPath = path.join(outputDir, 'preset-instagram-square.jpg');
      
      const result = await transcodeImage(testImagePath, outputPath, {
        preset: 'instagram-square',
        overwrite: true
      });
      
      expect(result).to.have.property('outputPath');
      expect(fs.existsSync(result.outputPath)).to.be.true;
      
      // Check if output file has a reasonable size
      const stats = fs.statSync(outputPath);
      expect(stats.size).to.be.greaterThan(0);
    });
  });
  
  describe('Batch image processing', function() {
    it('should process multiple images in batch', async function() {
      // Create multiple test images with different colors
      const colors = ['red', 'green', 'blue'];
      const testImages = [];
      
      try {
        for (let i = 0; i < colors.length; i++) {
          const imagePath = path.join(inputDir, `test-image-${colors[i]}.png`);
          await createTestImage(imagePath, 800, 600, colors[i]);
          testImages.push(imagePath);
        }
      } catch (error) {
        this.skip();
      }
      
      // Prepare batch items
      const batchItems = testImages.map(inputPath => {
        const filename = path.basename(inputPath, path.extname(inputPath));
        return {
          input: inputPath,
          output: path.join(outputDir, `${filename}.jpg`),
          options: {
            quality: 85
          }
        };
      });
      
      // Process batch
      const results = await transcodeImageBatch(batchItems, {
        format: 'jpg',
        optimize: true,
        overwrite: true
      });
      
      expect(results).to.have.property('successful').that.is.an('array');
      expect(results.successful.length).to.equal(testImages.length);
      
      // Check if all output files exist
      for (const result of results.successful) {
        expect(fs.existsSync(result.output)).to.be.true;
        
        // Check if output file has a reasonable size
        const stats = fs.statSync(result.output);
        expect(stats.size).to.be.greaterThan(0);
      }
    });
  });
});