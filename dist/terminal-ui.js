/**
 * @profullstack/transcoder - Terminal UI Module
 * Contains functionality for displaying a nice terminal UI for batch processing
 */

import blessed from 'blessed';
import path from 'path';
import { formatTime, formatFileSize } from './cli.js';

/**
 * Creates a terminal UI for batch processing
 * 
 * @param {Object} options - Terminal UI options
 * @returns {Object} - Terminal UI components and methods
 */
export function createBatchUI(options = {}) {
  // Create a screen object
  const screen = blessed.screen({
    smartCSR: true,
    title: 'Transcoder Batch Processing',
    dockBorders: true,
    fullUnicode: true
  });

  // Create a box for the header
  const header = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: 3,
    content: ' Transcoder Batch Processing ',
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      fg: 'white',
      bg: 'blue',
      border: {
        fg: 'white'
      }
    }
  });

  // Create a box for overall progress
  const overallProgress = blessed.progressbar({
    top: 3,
    left: 0,
    width: '100%',
    height: 3,
    border: {
      type: 'line'
    },
    style: {
      fg: 'blue',
      bg: 'black',
      bar: {
        bg: 'green',
        fg: 'black'
      },
      border: {
        fg: 'white'
      }
    },
    ch: '█',
    orientation: 'horizontal',
    filled: 0
  });

  // Create a box for current file progress
  const currentFileProgress = blessed.progressbar({
    top: 6,
    left: 0,
    width: '100%',
    height: 3,
    border: {
      type: 'line'
    },
    style: {
      fg: 'blue',
      bg: 'black',
      bar: {
        bg: 'cyan',
        fg: 'black'
      },
      border: {
        fg: 'white'
      }
    },
    ch: '█',
    orientation: 'horizontal',
    filled: 0
  });

  // Create a box for file information
  const fileInfo = blessed.box({
    top: 9,
    left: 0,
    width: '100%',
    height: 5,
    content: ' Current File: None ',
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      fg: 'white',
      border: {
        fg: 'white'
      }
    }
  });

  // Create a box for statistics
  const stats = blessed.box({
    top: 14,
    left: 0,
    width: '100%',
    height: 5,
    content: ' Statistics ',
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      fg: 'white',
      border: {
        fg: 'white'
      }
    }
  });

  // Create a log box
  const log = blessed.log({
    top: 19,
    left: 0,
    width: '100%',
    height: '100%-19',
    content: ' Log ',
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      fg: 'white',
      border: {
        fg: 'white'
      }
    },
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: ' ',
      style: {
        bg: 'blue'
      }
    }
  });

  // Append our boxes to the screen
  screen.append(header);
  screen.append(overallProgress);
  screen.append(currentFileProgress);
  screen.append(fileInfo);
  screen.append(stats);
  screen.append(log);

  // Quit on Escape, q, or Ctrl+C
  screen.key(['escape', 'q', 'C-c'], function() {
    return process.exit(0);
  });

  // Focus on the log box by default
  log.focus();

  // Render the screen
  screen.render();

  // Statistics
  const statistics = {
    startTime: Date.now(),
    endTime: null,
    totalFiles: 0,
    completedFiles: 0,
    successfulFiles: 0,
    failedFiles: 0,
    currentFile: null,
    currentFileStartTime: null
  };

  // Update statistics display
  function updateStats() {
    const elapsedTime = statistics.endTime ? 
      (statistics.endTime - statistics.startTime) / 1000 : 
      (Date.now() - statistics.startTime) / 1000;
    
    const filesPerSecond = statistics.completedFiles / (elapsedTime || 1);
    const estimatedTimeRemaining = statistics.totalFiles > 0 ? 
      (statistics.totalFiles - statistics.completedFiles) / (filesPerSecond || 0.001) : 
      0;

    stats.setContent(
      ` {bold}Statistics{/bold}\n` +
      ` Total Files: ${statistics.totalFiles}  |  ` +
      `Completed: ${statistics.completedFiles}  |  ` +
      `Successful: ${statistics.successfulFiles}  |  ` +
      `Failed: ${statistics.failedFiles}\n` +
      ` Elapsed Time: ${formatTime(elapsedTime)}  |  ` +
      `Estimated Time Remaining: ${formatTime(estimatedTimeRemaining)}`
    );
    
    screen.render();
  }

  // Update file info display
  function updateFileInfo(file) {
    if (!file) {
      fileInfo.setContent(' {bold}Current File:{/bold} None');
      return;
    }

    const fileName = path.basename(file.filePath);
    const fileExt = path.extname(file.filePath).toLowerCase();
    const mediaType = file.mediaType || 'unknown';
    
    fileInfo.setContent(
      ` {bold}Current File (${file.index || '?'}/${statistics.totalFiles}):{/bold} ${fileName}\n` +
      ` {bold}Type:{/bold} ${mediaType}  |  ` +
      `{bold}Extension:{/bold} ${fileExt}  |  ` +
      `{bold}Output:{/bold} ${path.basename(file.outputPath || 'unknown')}`
    );
    
    screen.render();
  }

  // Methods for updating the UI
  const ui = {
    // Initialize batch processing
    initBatch(total) {
      statistics.startTime = Date.now();
      statistics.totalFiles = total;
      statistics.completedFiles = 0;
      statistics.successfulFiles = 0;
      statistics.failedFiles = 0;
      
      header.setContent(` {center}{bold}Transcoder Batch Processing - ${total} Files{/bold}{/center}`);
      overallProgress.setProgress(0);
      currentFileProgress.setProgress(0);
      updateStats();
      updateFileInfo(null);
      
      log.log(`{green-fg}Starting batch processing of ${total} files...{/green-fg}`);
      screen.render();
    },
    
    // Update overall progress
    updateProgress(completed, total) {
      statistics.completedFiles = completed;
      const percent = Math.round((completed / total) * 100);
      
      overallProgress.setProgress(percent);
      header.setContent(` {center}{bold}Transcoder Batch Processing - ${completed}/${total} Files (${percent}%){/bold}{/center}`);
      
      updateStats();
      screen.render();
    },
    
    // Start processing a file
    startFile(file) {
      statistics.currentFile = file;
      statistics.currentFileStartTime = Date.now();
      
      updateFileInfo(file);
      currentFileProgress.setProgress(0);
      
      log.log(`{yellow-fg}Processing: ${path.basename(file.filePath)} (${file.index}/${statistics.totalFiles}){/yellow-fg}`);
      screen.render();
    },
    
    // Update current file progress
    updateFileProgress(percent) {
      currentFileProgress.setProgress(percent);
      screen.render();
    },
    
    // Complete processing a file
    completeFile(file, success) {
      if (success) {
        statistics.successfulFiles++;
        log.log(`{green-fg}✓ Completed: ${path.basename(file.filePath)}{/green-fg}`);
      } else {
        statistics.failedFiles++;
        log.log(`{red-fg}✗ Failed: ${path.basename(file.filePath)} - ${file.error || 'Unknown error'}{/red-fg}`);
      }
      
      updateStats();
      screen.render();
    },
    
    // Complete batch processing
    completeBatch(results) {
      statistics.endTime = Date.now();
      const duration = (statistics.endTime - statistics.startTime) / 1000;
      
      header.setContent(` {center}{bold}Batch Processing Complete - ${results.successful.length} Successful, ${results.failed.length} Failed{/bold}{/center}`);
      overallProgress.setProgress(100);
      currentFileProgress.setProgress(100);
      
      updateStats();
      
      log.log(`{green-fg}Batch processing completed in ${formatTime(duration)}{/green-fg}`);
      log.log(`{green-fg}Successfully processed ${results.successful.length} files{/green-fg}`);
      
      if (results.failed.length > 0) {
        log.log(`{red-fg}Failed to process ${results.failed.length} files{/red-fg}`);
        results.failed.forEach((failure, index) => {
          log.log(`{red-fg}  ${index + 1}. ${path.basename(failure.input)}: ${failure.error}{/red-fg}`);
        });
      }
      
      screen.render();
    },
    
    // Log a message
    log(message) {
      log.log(message);
      screen.render();
    },
    
    // Get the screen object
    getScreen() {
      return screen;
    },
    
    // Destroy the UI
    destroy() {
      screen.destroy();
    }
  };
  
  return ui;
}

/**
 * Attaches a terminal UI to a batch process emitter
 * 
 * @param {Object} emitter - Batch process emitter
 * @param {Object} options - Terminal UI options
 * @returns {Object} - Terminal UI object
 */
export function attachBatchUI(emitter, options = {}) {
  const ui = createBatchUI(options);
  
  // Listen for batch processing events
  emitter.on('start', (data) => {
    ui.initBatch(data.total);
  });
  
  emitter.on('progress', (data) => {
    ui.updateProgress(data.completed, data.total);
  });
  
  emitter.on('fileStart', (data) => {
    ui.startFile(data);
  });
  
  emitter.on('fileProgress', (data) => {
    ui.updateFileProgress(data.percent);
  });
  
  emitter.on('fileComplete', (data) => {
    ui.completeFile(data, true);
  });
  
  emitter.on('fileError', (data) => {
    ui.completeFile(data, false);
  });
  
  emitter.on('complete', (results) => {
    ui.completeBatch(results);
  });
  
  emitter.on('log', (message) => {
    ui.log(message);
  });
  
  return ui;
}