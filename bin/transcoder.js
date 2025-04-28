#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import cliProgress from 'cli-progress';
import colors from 'ansi-colors';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { getPreset, PRESETS } from '../presets.js';
import { DEFAULT_OPTIONS, transcode } from '../index.js';

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 <input> <output> [options]')
  .example('$0 input.mp4 output.mp4 --preset youtube-hd', 'Transcode a video using the youtube-hd preset')
  .example('$0 input.mp4 output.mp4 --thumbnails 3', 'Transcode a video and generate 3 thumbnails')
  .example('$0 input.mp4 output.mp4 --width 1280 --height 720', 'Transcode a video to 720p resolution')
  .example('$0 --thumbnails-only input.mp4 --count 5', 'Generate 5 thumbnails without transcoding')
  
  // Input and output arguments
  .positional('input', {
    describe: 'Input video file',
    type: 'string'
  })
  .positional('output', {
    describe: 'Output video file',
    type: 'string'
  })
  
  // Transcoding options
  .option('preset', {
    alias: 'p',
    describe: 'Use a predefined preset (e.g., youtube-hd, twitter, instagram)',
    type: 'string'
  })
  .option('width', {
    alias: 'w',
    describe: 'Output video width',
    type: 'number'
  })
  .option('height', {
    alias: 'h',
    describe: 'Output video height',
    type: 'number'
  })
  .option('bitrate', {
    alias: 'b',
    describe: 'Output video bitrate (e.g., 1M, 5M)',
    type: 'string'
  })
  .option('fps', {
    alias: 'f',
    describe: 'Output video frame rate',
    type: 'number'
  })
  .option('codec', {
    alias: 'c',
    describe: 'Video codec to use (e.g., h264, h265)',
    type: 'string'
  })
  .option('audio-codec', {
    alias: 'a',
    describe: 'Audio codec to use (e.g., aac, mp3)',
    type: 'string'
  })
  .option('audio-bitrate', {
    describe: 'Audio bitrate (e.g., 128k, 256k)',
    type: 'string'
  })
  
  // Thumbnail options
  .option('thumbnails', {
    alias: 't',
    describe: 'Number of thumbnails to generate during transcoding',
    type: 'number'
  })
  .option('thumbnails-only', {
    describe: 'Generate thumbnails without transcoding',
    type: 'boolean'
  })
  .option('count', {
    describe: 'Number of thumbnails to generate (for thumbnails-only mode)',
    type: 'number',
    default: 3
  })
  .option('format', {
    describe: 'Thumbnail format (jpg or png)',
    type: 'string',
    choices: ['jpg', 'png'],
    default: 'jpg'
  })
  .option('timestamps', {
    describe: 'Specific timestamps for thumbnails (comma-separated, in seconds or HH:MM:SS format)',
    type: 'string'
  })
  .option('thumbnail-output', {
    describe: 'Output pattern for thumbnails (e.g., "thumb-%d.jpg")',
    type: 'string'
  })
  
  // Watermark options
  .option('watermark-image', {
    describe: 'Path to image file to use as watermark',
    type: 'string'
  })
  .option('watermark-text', {
    describe: 'Text to use as watermark',
    type: 'string'
  })
  .option('watermark-position', {
    describe: 'Position of the watermark',
    type: 'string',
    choices: ['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'center'],
    default: 'bottomRight'
  })
  .option('watermark-opacity', {
    describe: 'Opacity of the watermark (0.0 to 1.0)',
    type: 'number',
    default: 1.0
  })
  .option('watermark-margin', {
    describe: 'Margin from the edge in pixels',
    type: 'number',
    default: 20
  })
  .option('watermark-font-size', {
    describe: 'Font size for text watermark in pixels',
    type: 'number',
    default: 72
  })
  .option('watermark-font-color', {
    describe: 'Font color for text watermark',
    type: 'string',
    default: 'yellow'
  })
  .option('watermark-font', {
    describe: 'Path to font file for text watermark (if not specified, will try to find a system font)',
    type: 'string'
  })
  .option('watermark-box-color', {
    describe: 'Background box color for text watermark (e.g., "black@0.9" for nearly opaque black)',
    type: 'string',
    default: 'black@0.9'
  })
  
  // Trim options
  .option('trim', {
    describe: 'Enable video trimming',
    type: 'boolean'
  })
  .option('start', {
    describe: 'Start time for trimming (in seconds or HH:MM:SS format)',
    type: 'string'
  })
  .option('end', {
    describe: 'End time for trimming (in seconds or HH:MM:SS format)',
    type: 'string'
  })
  
  // Other options
  .option('verbose', {
    alias: 'v',
    describe: 'Show detailed progress information',
    type: 'boolean',
    default: false
  })
  .option('help', {
    alias: '?',
    describe: 'Show help',
    type: 'boolean'
  })
  .demandCommand(0)
  .help()
  .argv;

// Format time as HH:MM:SS
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Format file size in human-readable format
function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

// Parse FFmpeg progress output
function parseProgress(data) {
  const progressData = {};
  
  // Extract time information (e.g., time=00:00:04.00)
  const timeMatch = data.match(/time=(\d+:\d+:\d+\.\d+)/);
  if (timeMatch && timeMatch[1]) {
    const timeParts = timeMatch[1].split(':');
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    const seconds = parseFloat(timeParts[2]);
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    progressData.time = totalSeconds;
  }
  
  // Extract frame information
  const frameMatch = data.match(/frame=\s*(\d+)/);
  if (frameMatch && frameMatch[1]) {
    progressData.frame = parseInt(frameMatch[1], 10);
  }
  
  // Extract fps information
  const fpsMatch = data.match(/fps=\s*(\d+)/);
  if (fpsMatch && fpsMatch[1]) {
    progressData.fps = parseInt(fpsMatch[1], 10);
  }
  
  // Extract bitrate information
  const bitrateMatch = data.match(/bitrate=\s*([\d\.]+)kbits\/s/);
  if (bitrateMatch && bitrateMatch[1]) {
    progressData.bitrate = parseFloat(bitrateMatch[1]);
  }
  
  // Extract size information
  const sizeMatch = data.match(/size=\s*(\d+)kB/);
  if (sizeMatch && sizeMatch[1]) {
    progressData.size = parseInt(sizeMatch[1], 10) * 1024; // Convert to bytes
  }
  
  // Extract speed information
  const speedMatch = data.match(/speed=\s*([\d\.]+)x/);
  if (speedMatch && speedMatch[1]) {
    progressData.speed = parseFloat(speedMatch[1]);
  }
  
  return Object.keys(progressData).length > 0 ? progressData : null;
}

// Get video duration using ffprobe
function getVideoDuration(inputPath, callback) {
  const args = [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    inputPath
  ];
  
  const ffprobeProcess = spawn('ffprobe', args);
  
  let output = '';
  let errorOutput = '';
  
  ffprobeProcess.stdout.on('data', (data) => {
    output += data.toString();
  });
  
  ffprobeProcess.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });
  
  ffprobeProcess.on('close', (code) => {
    if (code === 0) {
      const duration = parseFloat(output.trim());
      callback(null, duration);
    } else {
      callback(new Error(`FFprobe failed with code ${code}: ${errorOutput}`));
    }
  });
  
  ffprobeProcess.on('error', (err) => {
    callback(new Error(`Failed to start FFprobe process: ${err.message}`));
  });
}

// Generate thumbnails - more efficient version using a single FFmpeg command
function generateThumbnails(inputPath, options, callback) {
  const settings = {
    count: 3,
    format: 'jpg',
    filenamePattern: 'thumbnail-%d',
    timestamps: false,
    timestampList: [],
    ...options
  };
  
  // Ensure output directory exists
  const outputDir = path.dirname(options.outputPattern || 'thumbnail-%d.jpg');
  if (!fs.existsSync(outputDir)) {
    try {
      fs.mkdirSync(outputDir, { recursive: true });
    } catch (err) {
      return callback(new Error(`Failed to create output directory: ${err.message}`));
    }
  }
  
  // Get video duration to calculate thumbnail positions
  getVideoDuration(inputPath, (err, duration) => {
    if (err) {
      return callback(err);
    }
    
    console.log(colors.green('Generating thumbnails...'));
    
    // Create a progress bar
    const progressBar = new cliProgress.SingleBar({
      format: colors.cyan('{bar}') + ' | ' + colors.yellow('Generating thumbnails'),
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });
    
    progressBar.start(100, 0);
    
    let args = [];
    let outputPattern = '';
    let thumbnailCount = 0;
    
    if (settings.timestamps && settings.timestampList && settings.timestampList.length > 0) {
      // For timestamp-based thumbnails, we'll use a more efficient approach
      // by creating a filtergraph with multiple outputs
      thumbnailCount = settings.timestampList.length;
      outputPattern = path.join(outputDir, `${settings.filenamePattern}.${settings.format}`);
      
      // Build a complex filter for multiple timestamps
      let filterComplex = '';
      let outputs = '';
      
      for (let i = 0; i < thumbnailCount; i++) {
        filterComplex += `[0:v]select=eq(t\\,${settings.timestampList[i]}),setpts=PTS-STARTPTS[v${i}];`;
        outputs += `[v${i}]`;
      }
      
      args = [
        '-i', inputPath,
        '-filter_complex', filterComplex,
        '-map', outputs,
        '-q:v', '2',
        '-vsync', '0',
        outputPattern
      ];
    } else {
      // For evenly spaced thumbnails, use fps filter
      thumbnailCount = settings.count;
      outputPattern = path.join(outputDir, `${settings.filenamePattern}.${settings.format}`);
      
      args = [
        '-i', inputPath,
        '-vf', `fps=1/${Math.ceil(duration/thumbnailCount)}`,
        '-q:v', '2',
        '-vsync', '0',
        outputPattern
      ];
    }
    
    const ffmpegProcess = spawn('ffmpeg', args);
    
    let errorOutput = '';
    
    ffmpegProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      // Update progress bar based on ffmpeg output
      const progress = parseProgress(data.toString());
      if (progress && progress.time) {
        const percentage = Math.min(100, Math.round((progress.time / duration) * 100));
        progressBar.update(percentage);
      }
    });
    
    ffmpegProcess.on('close', (code) => {
      progressBar.update(100);
      progressBar.stop();
      
      if (code === 0) {
        // Generate the list of thumbnail paths
        const thumbnailPaths = [];
        for (let i = 1; i <= thumbnailCount; i++) {
          thumbnailPaths.push(outputPattern.replace('%d', i));
        }
        callback(null, thumbnailPaths);
      } else {
        callback(new Error(`FFmpeg thumbnail generation failed with code ${code}: ${errorOutput}`));
      }
    });
    
    ffmpegProcess.on('error', (err) => {
      progressBar.stop();
      callback(new Error(`Failed to start FFmpeg process: ${err.message}`));
    });
  });
}

// Transcode video
function transcodeVideo(inputPath, outputPath, options, callback) {
  // Handle platform-specific presets
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
  const settings = { ...DEFAULT_OPTIONS, ...mergedOptions };
  
  // Extract thumbnails option if present
  const thumbnailOptions = settings.thumbnails;
  delete settings.thumbnails;
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    try {
      fs.mkdirSync(outputDir, { recursive: true });
    } catch (err) {
      return callback(new Error(`Failed to create output directory: ${err.message}`));
    }
  }
  
  // Build ffmpeg arguments
  const ffmpegArgs = [];
  
  // Add input file
  ffmpegArgs.push('-i', inputPath);
  
  // Add video codec
  ffmpegArgs.push('-c:v', settings.videoCodec);
  
  // Add audio codec
  ffmpegArgs.push('-c:a', settings.audioCodec);
  
  // Add video bitrate if specified
  if (settings.videoBitrate) {
    ffmpegArgs.push('-b:v', settings.videoBitrate);
  }
  
  // Add audio bitrate if specified
  if (settings.audioBitrate) {
    ffmpegArgs.push('-b:a', settings.audioBitrate);
  }
  
  // Add resolution if specified
  if (settings.width > 0 && settings.height > 0) {
    ffmpegArgs.push('-vf', `scale=${settings.width}:${settings.height}`);
  } else if (settings.width > 0) {
    ffmpegArgs.push('-vf', `scale=${settings.width}:-1`);
  } else if (settings.height > 0) {
    ffmpegArgs.push('-vf', `scale=-1:${settings.height}`);
  }
  
  // Add fps if specified
  if (settings.fps > 0) {
    ffmpegArgs.push('-r', settings.fps.toString());
  }
  
  // Add preset
  ffmpegArgs.push('-preset', settings.preset);
  
  // Add profile
  ffmpegArgs.push('-profile:v', settings.profile);
  
  // Add level
  ffmpegArgs.push('-level', settings.level);
  
  // Add pixel format
  ffmpegArgs.push('-pix_fmt', settings.pixelFormat);
  
  // Add movflags for web optimization
  ffmpegArgs.push('-movflags', settings.movflags);
  
  // Add thread count
  ffmpegArgs.push('-threads', settings.threads.toString());
  
  // Add overwrite flag if needed
  if (settings.overwrite) {
    ffmpegArgs.push('-y');
  } else {
    ffmpegArgs.push('-n');
  }
  
  // Add output file
  ffmpegArgs.push(outputPath);
  
  // Get video duration for progress calculation
  getVideoDuration(inputPath, (err, duration) => {
    if (err) {
      console.warn(colors.yellow('Warning: Could not determine video duration. Progress percentage may be inaccurate.'));
      duration = 0;
    }
    
    // Create a progress bar
    const progressBar = new cliProgress.SingleBar({
      format: colors.cyan('{bar}') + ' | ' + colors.yellow('{percentage}%') + ' | ' + colors.green('{fps} fps') + ' | ' + colors.blue('Time: {time}') + ' | ' + colors.magenta('ETA: {eta}'),
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
      clearOnComplete: false,
      barsize: 30
    });
    
    // Start the progress bar
    progressBar.start(100, 0, {
      fps: '0',
      time: '0:00:00',
      eta: 'calculating...'
    });
    
    // Create the FFmpeg command string for logging
    const ffmpegCommand = `ffmpeg ${ffmpegArgs.join(' ')}`;
    
    // Spawn ffmpeg process
    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
    
    let errorOutput = '';
    
    // Handle stderr (progress information)
    ffmpegProcess.stderr.on('data', (data) => {
      const dataStr = data.toString();
      errorOutput += dataStr;
      
      // Parse progress information
      const progress = parseProgress(dataStr);
      if (progress) {
        const currentTime = progress.time || 0;
        const percentage = duration ? Math.min(100, (currentTime / duration) * 100) : 0;
        
        progressBar.update(percentage, {
          fps: progress.fps ? `${progress.fps}` : '0',
          time: formatTime(currentTime),
          eta: formatTime(duration ? (duration - currentTime) / (progress.speed || 1) : 0)
        });
      }
    });
    
    // Handle process exit
    ffmpegProcess.on('close', (code) => {
      progressBar.update(100);
      progressBar.stop();
      
      if (code === 0) {
        // Check if output file was created
        if (!fs.existsSync(outputPath)) {
          return callback(new Error('Transcoding failed: Output file was not created'));
        }
        
        // Generate thumbnails if requested - but do it synchronously with ffmpeg
        if (thumbnailOptions) {
          console.log(colors.green('\nGenerating thumbnails...'));
          
          // Use ffmpeg directly for thumbnail generation - much faster approach
          const thumbCount = thumbnailOptions.count || 3;
          const thumbFormat = thumbnailOptions.format || 'jpg';
          const thumbOutputPattern = path.join(outputDir, thumbnailOptions.outputPattern || `thumbnail-%d.${thumbFormat}`);
          
          // Generate thumbnails in a single ffmpeg command
          const thumbArgs = [
            '-i', inputPath,
            '-vf', `fps=1/${Math.ceil(duration/thumbCount)}`,
            '-q:v', '2',
            '-vframes', thumbCount.toString(),
            thumbOutputPattern
          ];
          
          const thumbProcess = spawn('ffmpeg', thumbArgs);
          
          thumbProcess.on('close', (thumbCode) => {
            if (thumbCode === 0) {
              // Generate the list of thumbnail paths
              const thumbnails = [];
              for (let i = 1; i <= thumbCount; i++) {
                thumbnails.push(thumbOutputPattern.replace('%d', i));
              }
              callback(null, { outputPath, thumbnails, ffmpegCommand });
            } else {
              console.error(colors.yellow('Warning: Thumbnail generation failed, but transcoding was successful.'));
              callback(null, { outputPath });
            }
          });
        } else {
          callback(null, { outputPath, ffmpegCommand });
        }
      } else {
        callback(new Error(`FFmpeg transcoding failed with code ${code}: ${errorOutput}`));
      }
    });
    
    // Handle process error
    ffmpegProcess.on('error', (err) => {
      progressBar.stop();
      callback(new Error(`Failed to start FFmpeg process: ${err.message}`));
    });
  });
}

// Main function
function main() {
  // Handle thumbnails-only mode
  if (argv.thumbnailsOnly) {
    const input = argv._[0];
    if (!input) {
      console.error(colors.red('Error: Input file is required for thumbnails-only mode'));
      process.exit(1);
    }
    
    if (!fs.existsSync(input)) {
      console.error(colors.red(`Error: Input file "${input}" does not exist`));
      process.exit(1);
    }
    
    // Get video duration first to provide better progress information
    getVideoDuration(input, (durationErr, duration) => {
      if (durationErr) {
        console.warn(colors.yellow(`Warning: Could not determine video duration: ${durationErr.message}`));
      } else {
        console.log(`Video duration: ${formatTime(duration)}`);
      }
      
      const options = {
        count: argv.count,
        format: argv.format,
        outputPattern: argv.thumbnailOutput || path.join(path.dirname(input), 'thumbnail-%d.' + argv.format)
      };
      
      if (argv.timestamps) {
        options.timestamps = true;
        options.timestampList = argv.timestamps.split(',').map(t => t.trim());
      }
      
      console.log(`Generating ${options.count} thumbnails from ${input}...`);
      
      generateThumbnails(input, options, (err, thumbnails) => {
        if (err) {
          console.error(colors.red('Error:'), err.message);
          process.exit(1);
        }
        
        console.log(colors.green('\nThumbnails generated successfully:'));
        thumbnails.forEach(thumbnail => console.log(`- ${colors.yellow(thumbnail)}`));
      });
    });
    
    return;
  }
  
  // Handle normal transcoding mode
  const input = argv._[0];
  const output = argv._[1];
  
  if (!input || !output) {
    console.error(colors.red('Error: Both input and output files are required'));
    process.exit(1);
  }
  
  if (!fs.existsSync(input)) {
    console.error(colors.red(`Error: Input file "${input}" does not exist`));
    process.exit(1);
  }
  
  // Prepare options
  const options = {};
  
  // Add preset if specified
  if (argv.preset) {
    options.preset = argv.preset;
  }
  
  // Add video options
  if (argv.width || argv.height) {
    options.width = argv.width || -1;
    options.height = argv.height || -1;
  }
  
  if (argv.bitrate) options.videoBitrate = argv.bitrate;
  if (argv.fps) options.fps = argv.fps;
  if (argv.codec) options.videoCodec = argv.codec;
  
  // Add audio options
  if (argv.audioCodec) options.audioCodec = argv.audioCodec;
  if (argv.audioBitrate) options.audioBitrate = argv.audioBitrate;
  
  // Add thumbnail options
  if (argv.thumbnails) {
    options.thumbnails = {
      count: argv.thumbnails,
      format: argv.format
    };
    
    if (argv.thumbnailOutput) {
      options.thumbnails.outputPattern = argv.thumbnailOutput;
    }
  }
  
  // Add watermark options
  if (argv.watermarkImage || argv.watermarkText) {
    options.watermark = {};
    
    if (argv.watermarkImage) {
      options.watermark.image = argv.watermarkImage;
    }
    
    if (argv.watermarkText) {
      options.watermark.text = argv.watermarkText;
    }
    
    options.watermark.position = argv.watermarkPosition;
    options.watermark.opacity = argv.watermarkOpacity;
    options.watermark.margin = argv.watermarkMargin;
    
    if (argv.watermarkText) {
      options.watermark.fontSize = argv.watermarkFontSize;
      options.watermark.fontColor = argv.watermarkFontColor;
      
      if (argv.watermarkBoxColor) {
        options.watermark.boxColor = argv.watermarkBoxColor;
      }
      
      if (argv.watermarkFont) {
        options.watermark.fontFile = argv.watermarkFont;
      }
    }
  }
  
  // Add trim options
  if (argv.trim && (argv.start || argv.end)) {
    options.trim = {};
    if (argv.start) options.trim.start = argv.start;
    if (argv.end) options.trim.end = argv.end;
  }
  
  // Add overwrite option
  options.overwrite = true;
  
  // Add verbose option
  if (argv.verbose) {
    options.verbose = true;
  }
  
  console.log(`Transcoding ${input} to ${output}...`);
  if (Object.keys(options).length > 0 && argv.verbose) {
    console.log('Options:', JSON.stringify(options, null, 2));
  }
  
  // Use the transcode function from index.js instead of the local transcodeVideo function
  transcode(input, output, options)
    .then((result) => {
      console.log(colors.green(`\nTranscoding completed successfully: ${result.outputPath}`));
      
      // Log the FFmpeg command
      if (result.ffmpegCommand) {
        console.log('\nEquivalent FFmpeg command:');
        console.log(colors.cyan(result.ffmpegCommand));
        
        // Check if the command includes video filters
        if (result.ffmpegCommand.includes('-vf')) {
          console.log('\nCommand includes video filters:');
          const vfIndex = result.ffmpegCommand.indexOf('-vf');
          const nextArgIndex = result.ffmpegCommand.indexOf(' ', vfIndex + 4);
          const filter = result.ffmpegCommand.substring(vfIndex + 4, nextArgIndex);
          console.log(colors.yellow(filter));
        } else {
          console.log('\nCommand does not include video filters');
        }
      }
      
      // Display metadata if available
      if (result.metadata) {
        console.log('\nVideo Metadata:');
        
        // Format metadata
        if (result.metadata.format) {
          console.log(colors.green('\nFormat:'));
          console.log(`  Format: ${colors.yellow(result.metadata.format.formatName || 'Unknown')}`);
          console.log(`  Duration: ${colors.yellow(formatTime(result.metadata.format.duration || 0))}`);
          console.log(`  Size: ${colors.yellow(formatFileSize(result.metadata.format.size || 0))}`);
          console.log(`  Bitrate: ${colors.yellow((result.metadata.format.bitrate / 1000).toFixed(2) + ' kbps' || 'Unknown')}`);
        }
        
        // Video stream metadata
        if (result.metadata.video && Object.keys(result.metadata.video).length > 0) {
          console.log(colors.green('\nVideo:'));
          console.log(`  Codec: ${colors.yellow(result.metadata.video.codec || 'Unknown')}`);
          console.log(`  Resolution: ${colors.yellow(result.metadata.video.width + 'x' + result.metadata.video.height || 'Unknown')}`);
          console.log(`  Aspect Ratio: ${colors.yellow(result.metadata.video.aspectRatio || 'Unknown')}`);
          console.log(`  Frame Rate: ${colors.yellow(result.metadata.video.fps?.toFixed(2) + ' fps' || 'Unknown')}`);
          console.log(`  Pixel Format: ${colors.yellow(result.metadata.video.pixelFormat || 'Unknown')}`);
          if (result.metadata.video.bitrate) {
            console.log(`  Bitrate: ${colors.yellow((result.metadata.video.bitrate / 1000).toFixed(2) + ' kbps' || 'Unknown')}`);
          }
        }
        
        // Audio stream metadata
        if (result.metadata.audio && Object.keys(result.metadata.audio).length > 0) {
          console.log(colors.green('\nAudio:'));
          console.log(`  Codec: ${colors.yellow(result.metadata.audio.codec || 'Unknown')}`);
          console.log(`  Sample Rate: ${colors.yellow(result.metadata.audio.sampleRate + ' Hz' || 'Unknown')}`);
          console.log(`  Channels: ${colors.yellow(result.metadata.audio.channels || 'Unknown')}`);
          console.log(`  Channel Layout: ${colors.yellow(result.metadata.audio.channelLayout || 'Unknown')}`);
          if (result.metadata.audio.bitrate) {
            console.log(`  Bitrate: ${colors.yellow((result.metadata.audio.bitrate / 1000).toFixed(2) + ' kbps' || 'Unknown')}`);
          }
        }
      }
      
      if (result.thumbnails && result.thumbnails.length > 0) {
        console.log('\nThumbnails generated:');
        result.thumbnails.forEach(thumbnail => console.log(`- ${colors.yellow(thumbnail)}`));
      }
    })
    .catch((err) => {
      console.error(colors.red('Error:'), err.message);
      process.exit(1);
    });
}

// Run the main function
main();