/**
 * @profullstack/transcoder - Watermarking Tests
 */

import { expect } from 'chai';
import { transcode } from '../index.js';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

// Test input and output paths
const inputPath = './test-videos/input/test-video.mov';
const outputDir = './test-videos/output';
const watermarksDir = './test-videos/watermarks';

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Create watermarks directory if it doesn't exist
if (!fs.existsSync(watermarksDir)) {
  fs.mkdirSync(watermarksDir, { recursive: true });
}

// Create a simple watermark image for testing
const logoPath = path.join(watermarksDir, 'logo.png');

describe('Watermarking', function() {
  this.timeout(30000); // Set timeout to 30 seconds
  
  before(function() {
    // Check if input file exists
    if (!fs.existsSync(inputPath)) {
      this.skip();
    }
    
    // Check if logo file exists
    if (!fs.existsSync(logoPath)) {
      console.warn(`Warning: Logo file ${logoPath} does not exist. Some watermark tests may fail.`);
    }
  });
  
  it('should add an image watermark to a video', async function() {
    const outputPath = path.join(outputDir, 'test-image-watermark.mp4');
    
    const options = {
      watermark: {
        image: logoPath,
        position: 'bottomRight',
        opacity: 0.7,
        margin: 10
      },
      overwrite: true
    };
    
    const result = await transcode(inputPath, outputPath, options);
    
    expect(result).to.have.property('outputPath');
    expect(fs.existsSync(result.outputPath)).to.be.true;
  });
  
  it('should add a text watermark to a video', async function() {
    const outputPath = path.join(outputDir, 'test-text-watermark.mp4');
    
    const options = {
      watermark: {
        text: 'TEST WATERMARK',
        position: 'bottomRight',
        fontColor: 'white',
        fontSize: 24,
        opacity: 0.8,
        margin: 10
      },
      overwrite: true
    };
    
    const result = await transcode(inputPath, outputPath, options);
    
    expect(result).to.have.property('outputPath');
    expect(fs.existsSync(result.outputPath)).to.be.true;
  });
  
  it('should add a text watermark with background box', async function() {
    const outputPath = path.join(outputDir, 'test-text-box-watermark.mp4');
    
    const options = {
      watermark: {
        text: 'TEST WATERMARK',
        position: 'bottomRight',
        fontColor: 'white',
        fontSize: 24,
        boxColor: 'black@0.5',
        opacity: 0.8,
        margin: 10
      },
      overwrite: true
    };
    
    const result = await transcode(inputPath, outputPath, options);
    
    expect(result).to.have.property('outputPath');
    expect(fs.existsSync(result.outputPath)).to.be.true;
  });
  
  it('should add a centered watermark', async function() {
    const outputPath = path.join(outputDir, 'test-centered-watermark.mp4');
    
    const options = {
      watermark: {
        text: 'CENTER',
        position: 'center',
        fontColor: 'white',
        fontSize: 36,
        opacity: 0.5
      },
      overwrite: true
    };
    
    const result = await transcode(inputPath, outputPath, options);
    
    expect(result).to.have.property('outputPath');
    expect(fs.existsSync(result.outputPath)).to.be.true;
  });
  
  it('should continue transcoding if watermark image does not exist', async function() {
    const outputPath = path.join(outputDir, 'test-invalid-watermark.mp4');
    
    const options = {
      watermark: {
        image: 'non-existent-image.png',
        position: 'bottomRight'
      },
      overwrite: true
    };
    
    // This should not throw an error, but continue without the watermark
    const result = await transcode(inputPath, outputPath, options);
    
    // Verify transcoding was successful
    expect(result).to.have.property('outputPath');
    expect(fs.existsSync(result.outputPath)).to.be.true;
  });
  
  it('should throw an error if neither image nor text is provided', async function() {
    const outputPath = path.join(outputDir, 'test-invalid-watermark.mp4');
    
    const options = {
      watermark: {
        position: 'bottomRight'
      },
      overwrite: true
    };
    
    try {
      await transcode(inputPath, outputPath, options);
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error.message).to.include('Watermark must have either image or text property');
    }
  });
});