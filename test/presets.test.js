/**
 * Tests for the Smart Presets feature
 */

import { strict as assert } from 'assert';
import { expect } from 'chai';
import { transcode, DEFAULT_OPTIONS } from '../index.js';
import { getPreset, PRESETS } from '../presets.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Smart Presets', function() {
  describe('getPreset function', function() {
    it('should return the correct preset for a valid preset name', function() {
      const instagramPreset = getPreset('instagram');
      expect(instagramPreset).to.be.an('object');
      expect(instagramPreset).to.have.property('width', 1080);
      expect(instagramPreset).to.have.property('height', 1080);
      
      const youtubeHdPreset = getPreset('youtube-hd');
      expect(youtubeHdPreset).to.be.an('object');
      expect(youtubeHdPreset).to.have.property('width', 1920);
      expect(youtubeHdPreset).to.have.property('height', 1080);
    });
    
    it('should handle case-insensitive preset names', function() {
      const preset1 = getPreset('INSTAGRAM');
      const preset2 = getPreset('Instagram');
      const preset3 = getPreset('instagram');
      
      expect(preset1).to.deep.equal(preset3);
      expect(preset2).to.deep.equal(preset3);
    });
    
    it('should return null for invalid preset names', function() {
      const invalidPreset = getPreset('invalid-preset-name');
      expect(invalidPreset).to.be.null;
    });
    
    it('should return null for non-string preset names', function() {
      const nullPreset = getPreset(null);
      expect(nullPreset).to.be.null;
      
      const undefinedPreset = getPreset(undefined);
      expect(undefinedPreset).to.be.null;
      
      const numberPreset = getPreset(123);
      expect(numberPreset).to.be.null;
    });
  });
  
  describe('PRESETS object', function() {
    it('should contain all the expected presets', function() {
      const expectedPresets = [
        'instagram',
        'instagram-stories',
        'youtube-hd',
        'youtube-4k',
        'twitter',
        'facebook',
        'tiktok',
        'vimeo-hd',
        'web',
        'mobile'
      ];
      
      expectedPresets.forEach(presetName => {
        expect(PRESETS).to.have.property(presetName);
        expect(PRESETS[presetName]).to.be.an('object');
      });
    });
    
    it('should have valid properties for each preset', function() {
      Object.values(PRESETS).forEach(preset => {
        expect(preset).to.have.property('videoCodec').that.is.a('string');
        expect(preset).to.have.property('audioCodec').that.is.a('string');
        expect(preset).to.have.property('videoBitrate').that.is.a('string');
        expect(preset).to.have.property('audioBitrate').that.is.a('string');
        expect(preset).to.have.property('preset').that.is.a('string');
      });
    });
  });
  
  describe('transcode function with presets', function() {
    // This test directly tests the preset application logic without spawning FFmpeg
    it('should apply preset settings when a valid preset is provided', function() {
      // Create a simplified version of the transcode function to test preset application
      const applyPreset = (options) => {
        let mergedOptions = { ...options };
        
        // If a preset name is provided, get the preset configuration
        if (options.preset && typeof options.preset === 'string' && PRESETS[options.preset.toLowerCase()]) {
          const presetConfig = getPreset(options.preset);
          if (presetConfig) {
            // Merge preset with user options (user options take precedence over preset)
            mergedOptions = { ...presetConfig, ...options };
            
            // Remove the preset name to avoid confusion with ffmpeg's preset parameter
            if (mergedOptions.preset === options.preset) {
              // If the preset name is the same as the original options.preset,
              // restore the ffmpeg preset value from the preset config
              mergedOptions.preset = presetConfig.preset;
            }
          }
        }
        
        // Merge default options with user options (including preset if applicable)
        return { ...DEFAULT_OPTIONS, ...mergedOptions };
      };
      
      // Test with instagram preset
      const instagramSettings = applyPreset({ preset: 'instagram' });
      
      // Verify that the instagram preset settings were applied
      expect(instagramSettings.width).to.equal(1080);
      expect(instagramSettings.height).to.equal(1080);
      expect(instagramSettings.videoBitrate).to.equal('3500k');
      
      // Test with youtube-hd preset
      const youtubeSettings = applyPreset({ preset: 'youtube-hd' });
      
      // Verify that the youtube-hd preset settings were applied
      expect(youtubeSettings.width).to.equal(1920);
      expect(youtubeSettings.height).to.equal(1080);
      expect(youtubeSettings.videoBitrate).to.equal('8000k');
    });
    
    it('should override preset settings with user options', function() {
      // Create a simplified version of the transcode function to test preset application
      const applyPreset = (options) => {
        let mergedOptions = { ...options };
        
        // If a preset name is provided, get the preset configuration
        if (options.preset && typeof options.preset === 'string' && PRESETS[options.preset.toLowerCase()]) {
          const presetConfig = getPreset(options.preset);
          if (presetConfig) {
            // Merge preset with user options (user options take precedence over preset)
            mergedOptions = { ...presetConfig, ...options };
            
            // Remove the preset name to avoid confusion with ffmpeg's preset parameter
            if (mergedOptions.preset === options.preset) {
              // If the preset name is the same as the original options.preset,
              // restore the ffmpeg preset value from the preset config
              mergedOptions.preset = presetConfig.preset;
            }
          }
        }
        
        // Merge default options with user options (including preset if applicable)
        return { ...DEFAULT_OPTIONS, ...mergedOptions };
      };
      
      // Test with instagram preset and custom videoBitrate
      const customOptions = {
        preset: 'instagram',
        videoBitrate: '10000k'
      };
      
      const result = applyPreset(customOptions);
      
      // Verify that the preset was applied but the custom videoBitrate overrides the preset
      expect(result.width).to.equal(1080);
      expect(result.height).to.equal(1080);
      expect(result.videoBitrate).to.equal('10000k'); // Custom value, not the preset value
    });
  });
});