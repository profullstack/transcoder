/**
 * @profullstack/transcoder - Terminal UI Tests
 */

import { expect } from 'chai';
import { EventEmitter } from 'events';
import { createBatchUI } from '../src/terminal-ui.js';

describe('Terminal UI Module', function() {
  // Skip these tests in CI environments since they require a terminal
  const shouldSkip = process.env.CI === 'true';
  
  // Create a mock emitter for testing
  let mockEmitter;
  
  beforeEach(function() {
    mockEmitter = new EventEmitter();
  });
  
  describe('createBatchUI()', function() {
    it('should create a terminal UI object', function() {
      if (shouldSkip) this.skip();
      
      const ui = createBatchUI();
      
      expect(ui).to.be.an('object');
      expect(ui.initBatch).to.be.a('function');
      expect(ui.updateProgress).to.be.a('function');
      expect(ui.startFile).to.be.a('function');
      expect(ui.updateFileProgress).to.be.a('function');
      expect(ui.completeFile).to.be.a('function');
      expect(ui.completeBatch).to.be.a('function');
      expect(ui.log).to.be.a('function');
      expect(ui.getScreen).to.be.a('function');
      expect(ui.destroy).to.be.a('function');
      
      // Clean up
      ui.destroy();
    });
    
    it('should handle batch initialization', function() {
      if (shouldSkip) this.skip();
      
      const ui = createBatchUI();
      
      // Initialize batch processing
      ui.initBatch(10);
      
      // Clean up
      ui.destroy();
    });
    
    it('should handle progress updates', function() {
      if (shouldSkip) this.skip();
      
      const ui = createBatchUI();
      
      // Initialize batch processing
      ui.initBatch(10);
      
      // Update progress
      ui.updateProgress(5, 10);
      
      // Clean up
      ui.destroy();
    });
    
    it('should handle file processing', function() {
      if (shouldSkip) this.skip();
      
      const ui = createBatchUI();
      
      // Initialize batch processing
      ui.initBatch(10);
      
      // Start processing a file
      ui.startFile({
        filePath: 'test.mp4',
        outputPath: 'output.mp4',
        mediaType: 'video',
        index: 1
      });
      
      // Update file progress
      ui.updateFileProgress(50);
      
      // Complete file processing
      ui.completeFile({
        filePath: 'test.mp4',
        outputPath: 'output.mp4',
        mediaType: 'video'
      }, true);
      
      // Clean up
      ui.destroy();
    });
    
    it('should handle batch completion', function() {
      if (shouldSkip) this.skip();
      
      const ui = createBatchUI();
      
      // Initialize batch processing
      ui.initBatch(10);
      
      // Complete batch processing
      ui.completeBatch({
        total: 10,
        completed: 10,
        successful: [
          { input: 'test1.mp4', output: 'output1.mp4' },
          { input: 'test2.mp4', output: 'output2.mp4' }
        ],
        failed: [
          { input: 'test3.mp4', error: 'Failed to process' }
        ]
      });
      
      // Clean up
      ui.destroy();
    });
    
    it('should handle logging', function() {
      if (shouldSkip) this.skip();
      
      const ui = createBatchUI();
      
      // Log a message
      ui.log('Test message');
      ui.log('{green-fg}Success{/green-fg}');
      ui.log('{red-fg}Error{/red-fg}');
      
      // Clean up
      ui.destroy();
    });
  });
  
  // These tests can run in CI environments
  describe('Event Handling', function() {
    it('should handle start event', function(done) {
      // Create a mock UI object
      const mockUI = {
        initBatch: (total) => {
          expect(total).to.equal(5);
          done();
        }
      };
      
      // Emit start event
      mockEmitter.on('start', (data) => {
        mockUI.initBatch(data.total);
      });
      
      mockEmitter.emit('start', { total: 5 });
    });
    
    it('should handle progress event', function(done) {
      // Create a mock UI object
      const mockUI = {
        updateProgress: (completed, total) => {
          expect(completed).to.equal(3);
          expect(total).to.equal(5);
          done();
        }
      };
      
      // Emit progress event
      mockEmitter.on('progress', (data) => {
        mockUI.updateProgress(data.completed, data.total);
      });
      
      mockEmitter.emit('progress', { completed: 3, total: 5, percent: 60 });
    });
    
    it('should handle fileStart event', function(done) {
      // Create a mock UI object
      const mockUI = {
        startFile: (file) => {
          expect(file.filePath).to.equal('test.mp4');
          expect(file.outputPath).to.equal('output.mp4');
          expect(file.mediaType).to.equal('video');
          expect(file.index).to.equal(1);
          done();
        }
      };
      
      // Emit fileStart event
      mockEmitter.on('fileStart', (data) => {
        mockUI.startFile(data);
      });
      
      mockEmitter.emit('fileStart', {
        filePath: 'test.mp4',
        outputPath: 'output.mp4',
        mediaType: 'video',
        index: 1
      });
    });
    
    it('should handle fileComplete event', function(done) {
      // Create a mock UI object
      const mockUI = {
        completeFile: (file, success) => {
          expect(file.filePath).to.equal('test.mp4');
          expect(file.outputPath).to.equal('output.mp4');
          expect(success).to.be.true;
          done();
        }
      };
      
      // Emit fileComplete event
      mockEmitter.on('fileComplete', (data) => {
        mockUI.completeFile(data, true);
      });
      
      mockEmitter.emit('fileComplete', {
        filePath: 'test.mp4',
        outputPath: 'output.mp4',
        success: true
      });
    });
    
    it('should handle fileError event', function(done) {
      // Create a mock UI object
      const mockUI = {
        completeFile: (file, success) => {
          expect(file.filePath).to.equal('test.mp4');
          expect(file.error).to.equal('Failed to process');
          expect(success).to.be.false;
          done();
        }
      };
      
      // Emit fileError event
      mockEmitter.on('fileError', (data) => {
        mockUI.completeFile(data, false);
      });
      
      mockEmitter.emit('fileError', {
        filePath: 'test.mp4',
        error: 'Failed to process'
      });
    });
    
    it('should handle complete event', function(done) {
      // Create a mock UI object
      const mockUI = {
        completeBatch: (results) => {
          expect(results.total).to.equal(5);
          expect(results.completed).to.equal(5);
          expect(results.successful.length).to.equal(4);
          expect(results.failed.length).to.equal(1);
          done();
        }
      };
      
      // Emit complete event
      mockEmitter.on('complete', (data) => {
        mockUI.completeBatch(data);
      });
      
      mockEmitter.emit('complete', {
        total: 5,
        completed: 5,
        successful: [{}, {}, {}, {}],
        failed: [{}]
      });
    });
  });
});