/**
 * Tests for the responsive video profiles functionality
 */

import { strict as assert } from 'assert';
import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { transcodeResponsive, transcode } from '../index.js';
import { RESPONSIVE_PROFILES, getResponsiveProfileSet } from '../presets.js';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Responsive Video Profiles', function() {
  // Increase timeout for async tests
  this.timeout(30000);
  
  const inputPath = './test-videos/input/test-video.mov';
  const outputDir = './test-videos/output/responsive';
  
  // Skip actual transcoding tests in CI environments
  const runTranscodingTests = process.env.CI !== 'true' && fs.existsSync(inputPath);
  
  describe('getResponsiveProfileSet function', function() {
    it('should return the correct profile set for a valid name', function() {
      const standardSet = getResponsiveProfileSet('standard');
      expect(standardSet).to.deep.equal(['mobile', 'web', 'hd']);
      
      const minimalSet = getResponsiveProfileSet('minimal');
      expect(minimalSet).to.deep.equal(['mobile', 'web']);
      
      const comprehensiveSet = getResponsiveProfileSet('comprehensive');
      expect(comprehensiveSet).to.deep.equal(['low-bandwidth', 'mobile', 'tablet', 'web', 'hd']);
    });
    
    it('should return null for an invalid profile set name', function() {
      const result = getResponsiveProfileSet('nonexistent');
      expect(result).to.be.null;
    });
    
    it('should return null for non-string inputs', function() {
      expect(getResponsiveProfileSet(null)).to.be.null;
      expect(getResponsiveProfileSet(undefined)).to.be.null;
      expect(getResponsiveProfileSet(123)).to.be.null;
      expect(getResponsiveProfileSet({})).to.be.null;
    });
  });
  
  describe('transcodeResponsive function', function() {
    it('should validate input path', async function() {
      try {
        await transcodeResponsive(null);
        assert.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Input path is required');
      }
      
      try {
        await transcodeResponsive('nonexistent-file.mp4');
        assert.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('does not exist');
      }
    });
    
    it('should validate profiles', async function() {
      try {
        await transcodeResponsive(inputPath, { profiles: [] });
        assert.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('At least one profile must be specified');
      }
      
      try {
        await transcodeResponsive(inputPath, { profiles: ['nonexistent-profile'] });
        assert.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('not a valid preset');
      }
    });
    
    // Removed deprecated test that was previously skipped
  });
  
  (runTranscodingTests ? describe : describe.skip)('transcodeResponsive with actual files', function() {
    // Clean up output files before each test
    beforeEach(function() {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
    });
    
    it('should generate multiple versions of a video with different profiles', async function() {
      // Clean up any existing output files first
      const mobileOutput = path.join(outputDir, 'test-mobile.mp4');
      const webOutput = path.join(outputDir, 'test-web.mp4');
      
      if (fs.existsSync(mobileOutput)) {
        fs.unlinkSync(mobileOutput);
      }
      
      if (fs.existsSync(webOutput)) {
        fs.unlinkSync(webOutput);
      }
      
      const result = await transcodeResponsive(inputPath, {
        profiles: ['mobile', 'web'],
        outputDir,
        filenamePattern: 'test-%s.mp4',
        transcodeOptions: {
          overwrite: true // Add overwrite option to avoid file existence errors
        }
      });
      
      expect(result.outputs).to.have.property('mobile');
      expect(result.outputs).to.have.property('web');
      
      expect(fs.existsSync(result.outputs.mobile.outputPath)).to.be.true;
      expect(fs.existsSync(result.outputs.web.outputPath)).to.be.true;
    });
  });
});