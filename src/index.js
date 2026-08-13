/**
 * @profullstack/transcoder - Main Module
 * Exports all functionality from the modular components
 */

// Export core functionality
export {
  TranscodeEmitter,
  DEFAULT_OPTIONS,
  DEFAULT_AUDIO_OPTIONS,
  DEFAULT_IMAGE_OPTIONS,
  checkFfmpeg,
  parseProgress
} from './core.js';

// Export video transcoding functionality
export {
  transcode,
  transcodeResponsive
} from './video.js';

// Export audio transcoding functionality
export {
  transcodeAudio,
  transcodeAudioBatch
} from './audio.js';

// Export image transcoding functionality
export {
  transcodeImage,
  transcodeImageBatch
} from './image.js';

// Export thumbnail generation functionality
export {
  generateThumbnails,
  generateThumbnailsEfficient
} from './thumbnails.js';

// Export utility functions
export {
  getVideoMetadata,
  getVideoDuration,
  getImageMetadata,
  validatePaths,
  ensureOutputDirectory
} from './utils.js';

// Export presets
export {
  getPreset,
  getResponsiveProfileSet,
  PRESETS,
  RESPONSIVE_PROFILES
} from '../presets.js';

// Export CLI utilities
export {
  formatTime,
  formatFileSize,
  expandTildePath,
  configureCommandLine,
  handleThumbnailsOnly,
  prepareTranscodeOptions,
  prepareBatchOptions,
  prepareScanOptions,
  displayTranscodeResults,
  displayBatchResults,
  createTranscodeProgressBar,
  createBatchProgressBar,
  updateProgressBar
} from './cli.js';

// Export batch processing functionality
export {
  BatchProcessEmitter,
  SUPPORTED_EXTENSIONS,
  scanDirectory,
  batchProcess,
  batchProcessDirectory
} from './batch.js';

// Export terminal UI functionality
export {
  createBatchUI,
  attachBatchUI
} from './terminal-ui.js';

// Export generative media functionality
export {
  generateImage,
  generateVideo,
  generateSpeech,
  generateMusic,
  generateBatch,
  registerProvider,
  getProvider,
  listProviders,
  describeProviders,
  resolveProvider,
  hasCredentials,
  supports,
  GeneratedMedia,
  pcmToWav,
  parsePcmMimeType,
  extensionForMimeType,
  GenMediaError,
  MissingCredentialsError,
  UnsupportedCapabilityError,
  ProviderResponseError,
  GenerationTimeoutError,
  CAPABILITIES,
  PROVIDER_PREFERENCE
} from './genmedia/index.js';

// Also available as a namespace: import { genmedia } from '@profullstack/transcoder'
export * as genmedia from './genmedia/index.js';