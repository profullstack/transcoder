/**
 * @profullstack/transcoder - Smart Presets
 * 
 * This file contains pre-configured settings optimized for specific platforms and use cases.
 * These presets make it easy to transcode videos for different platforms with a single setting.
 */

/**
 * Instagram Preset
 * - Max video length: 60 seconds (feed), 15 seconds (stories)
 * - Recommended resolution: 1080x1080 (square), 1080x1920 (vertical)
 * - Aspect ratio: 1:1 (square), 4:5 (vertical), 16:9 (horizontal)
 * - Video codec: H.264
 * - Audio codec: AAC
 * - Max file size: 100MB
 */
export const INSTAGRAM_PRESET = {
  videoCodec: 'libx264',
  audioCodec: 'aac',
  videoBitrate: '3500k',
  audioBitrate: '128k',
  preset: 'medium',
  profile: 'main',
  level: '4.0',
  pixelFormat: 'yuv420p',
  movflags: '+faststart',
  // Square format by default (can be overridden)
  width: 1080,
  height: 1080
};

/**
 * Instagram Stories Preset
 * - Max video length: 15 seconds
 * - Recommended resolution: 1080x1920 (vertical)
 * - Aspect ratio: 9:16
 * - Video codec: H.264
 * - Audio codec: AAC
 */
export const INSTAGRAM_STORIES_PRESET = {
  ...INSTAGRAM_PRESET,
  width: 1080,
  height: 1920
};

/**
 * YouTube HD Preset
 * - Recommended resolution: 1920x1080 (1080p)
 * - Aspect ratio: 16:9
 * - Video codec: H.264
 * - Audio codec: AAC
 * - Recommended bitrate: 8000-12000 kbps
 */
export const YOUTUBE_HD_PRESET = {
  videoCodec: 'libx264',
  audioCodec: 'aac',
  videoBitrate: '8000k',
  audioBitrate: '384k',
  preset: 'slow', // Higher quality encoding
  profile: 'high',
  level: '4.2',
  pixelFormat: 'yuv420p',
  movflags: '+faststart',
  width: 1920,
  height: 1080,
  fps: 30
};

/**
 * YouTube 4K Preset
 * - Recommended resolution: 3840x2160 (4K)
 * - Aspect ratio: 16:9
 * - Video codec: H.264
 * - Audio codec: AAC
 * - Recommended bitrate: 35000-45000 kbps
 */
export const YOUTUBE_4K_PRESET = {
  videoCodec: 'libx264',
  audioCodec: 'aac',
  videoBitrate: '40000k',
  audioBitrate: '384k',
  preset: 'slow', // Higher quality encoding
  profile: 'high',
  level: '5.1',
  pixelFormat: 'yuv420p',
  movflags: '+faststart',
  width: 3840,
  height: 2160,
  fps: 30
};

/**
 * Twitter Preset
 * - Max video length: 140 seconds
 * - Recommended resolution: 1280x720
 * - Aspect ratio: 16:9
 * - Video codec: H.264
 * - Audio codec: AAC
 * - Max file size: 512MB
 */
export const TWITTER_PRESET = {
  videoCodec: 'libx264',
  audioCodec: 'aac',
  videoBitrate: '5000k',
  audioBitrate: '128k',
  preset: 'medium',
  profile: 'main',
  level: '4.0',
  pixelFormat: 'yuv420p',
  movflags: '+faststart',
  width: 1280,
  height: 720,
  fps: 30
};

/**
 * Facebook Preset
 * - Recommended resolution: 1280x720
 * - Aspect ratio: 16:9
 * - Video codec: H.264
 * - Audio codec: AAC
 * - Recommended bitrate: 3000-4000 kbps
 */
export const FACEBOOK_PRESET = {
  videoCodec: 'libx264',
  audioCodec: 'aac',
  videoBitrate: '4000k',
  audioBitrate: '128k',
  preset: 'medium',
  profile: 'main',
  level: '4.0',
  pixelFormat: 'yuv420p',
  movflags: '+faststart',
  width: 1280,
  height: 720,
  fps: 30
};

/**
 * TikTok Preset
 * - Recommended resolution: 1080x1920 (vertical)
 * - Aspect ratio: 9:16
 * - Video codec: H.264
 * - Audio codec: AAC
 */
export const TIKTOK_PRESET = {
  videoCodec: 'libx264',
  audioCodec: 'aac',
  videoBitrate: '5000k',
  audioBitrate: '128k',
  preset: 'medium',
  profile: 'main',
  level: '4.0',
  pixelFormat: 'yuv420p',
  movflags: '+faststart',
  width: 1080,
  height: 1920,
  fps: 30
};

/**
 * Vimeo HD Preset
 * - Recommended resolution: 1920x1080 (1080p)
 * - Aspect ratio: 16:9
 * - Video codec: H.264
 * - Audio codec: AAC
 * - Recommended bitrate: 8000-10000 kbps
 */
export const VIMEO_HD_PRESET = {
  videoCodec: 'libx264',
  audioCodec: 'aac',
  videoBitrate: '10000k',
  audioBitrate: '320k',
  preset: 'slow', // Higher quality encoding
  profile: 'high',
  level: '4.2',
  pixelFormat: 'yuv420p',
  movflags: '+faststart',
  width: 1920,
  height: 1080,
  fps: 30
};

/**
 * Web Optimized Preset
 * - Recommended resolution: 1280x720
 * - Aspect ratio: 16:9
 * - Video codec: H.264
 * - Audio codec: AAC
 * - Optimized for fast loading and streaming
 */
export const WEB_PRESET = {
  videoCodec: 'libx264',
  audioCodec: 'aac',
  videoBitrate: '2500k',
  audioBitrate: '128k',
  preset: 'fast',
  profile: 'main',
  level: '4.0',
  pixelFormat: 'yuv420p',
  movflags: '+faststart',
  width: 1280,
  height: 720,
  fps: 30
};

/**
 * Mobile Optimized Preset
 * - Recommended resolution: 640x360
 * - Aspect ratio: 16:9
 * - Video codec: H.264
 * - Audio codec: AAC
 * - Optimized for mobile devices and slower connections
 */
export const MOBILE_PRESET = {
  videoCodec: 'libx264',
  audioCodec: 'aac',
  videoBitrate: '1000k',
  audioBitrate: '96k',
  preset: 'fast',
  profile: 'baseline',
  level: '3.0',
  pixelFormat: 'yuv420p',
  movflags: '+faststart',
  width: 640,
  height: 360,
  fps: 30
};

/**
 * HD Optimized Preset
 * - Recommended resolution: 1920x1080
 * - Aspect ratio: 16:9
 * - Video codec: H.264
 * - Audio codec: AAC
 * - Optimized for high-quality playback on large screens
 */
export const HD_PRESET = {
  videoCodec: 'libx264',
  audioCodec: 'aac',
  videoBitrate: '6000k',
  audioBitrate: '192k',
  preset: 'medium',
  profile: 'high',
  level: '4.1',
  pixelFormat: 'yuv420p',
  movflags: '+faststart',
  width: 1920,
  height: 1080,
  fps: 30
};

/**
 * Tablet Optimized Preset
 * - Recommended resolution: 1280x720
 * - Aspect ratio: 16:9
 * - Video codec: H.264
 * - Audio codec: AAC
 * - Optimized for tablet devices with medium-speed connections
 */
export const TABLET_PRESET = {
  videoCodec: 'libx264',
  audioCodec: 'aac',
  videoBitrate: '2000k',
  audioBitrate: '128k',
  preset: 'medium',
  profile: 'main',
  level: '3.1',
  pixelFormat: 'yuv420p',
  movflags: '+faststart',
  width: 1280,
  height: 720,
  fps: 30
};

/**
 * Low Bandwidth Preset
 * - Recommended resolution: 480x270
 * - Aspect ratio: 16:9
 * - Video codec: H.264
 * - Audio codec: AAC
 * - Optimized for very slow connections
 */
export const LOW_BANDWIDTH_PRESET = {
  videoCodec: 'libx264',
  audioCodec: 'aac',
  videoBitrate: '500k',
  audioBitrate: '64k',
  preset: 'fast',
  profile: 'baseline',
  level: '3.0',
  pixelFormat: 'yuv420p',
  movflags: '+faststart',
  width: 480,
  height: 270,
  fps: 24
};

/**
 * Audio Presets for different quality levels and use cases
 */

/**
 * High Quality Audio Preset
 * - Audio codec: AAC
 * - Bitrate: 320k
 * - Sample rate: 48000 Hz
 * - Channels: 2 (stereo)
 * - Optimized for high-quality music and professional audio
 */
export const AUDIO_HIGH_QUALITY_PRESET = {
  audioCodec: 'aac',
  audioBitrate: '320k',
  audioSampleRate: 48000,
  audioChannels: 2,
  audioProfile: 'aac_low',
  normalize: false
};

/**
 * Medium Quality Audio Preset
 * - Audio codec: AAC
 * - Bitrate: 192k
 * - Sample rate: 44100 Hz
 * - Channels: 2 (stereo)
 * - Good balance between quality and file size
 */
export const AUDIO_MEDIUM_QUALITY_PRESET = {
  audioCodec: 'aac',
  audioBitrate: '192k',
  audioSampleRate: 44100,
  audioChannels: 2,
  audioProfile: 'aac_low',
  normalize: false
};

/**
 * Low Quality Audio Preset
 * - Audio codec: AAC
 * - Bitrate: 96k
 * - Sample rate: 44100 Hz
 * - Channels: 2 (stereo)
 * - Optimized for smaller file size
 */
export const AUDIO_LOW_QUALITY_PRESET = {
  audioCodec: 'aac',
  audioBitrate: '96k',
  audioSampleRate: 44100,
  audioChannels: 2,
  audioProfile: 'aac_low',
  normalize: false
};

/**
 * Voice Optimized Audio Preset
 * - Audio codec: AAC
 * - Bitrate: 128k
 * - Sample rate: 44100 Hz
 * - Channels: 1 (mono)
 * - Optimized for voice recordings, podcasts, etc.
 */
export const AUDIO_VOICE_PRESET = {
  audioCodec: 'aac',
  audioBitrate: '128k',
  audioSampleRate: 44100,
  audioChannels: 1,
  audioProfile: 'aac_low',
  normalize: true
};

/**
 * MP3 High Quality Preset
 * - Audio codec: libmp3lame
 * - Bitrate: 320k
 * - Sample rate: 44100 Hz
 * - Channels: 2 (stereo)
 * - Optimized for high-quality MP3 files
 */
export const MP3_HIGH_QUALITY_PRESET = {
  audioCodec: 'libmp3lame',
  audioBitrate: '320k',
  audioSampleRate: 44100,
  audioChannels: 2,
  normalize: false
};

/**
 * MP3 Medium Quality Preset
 * - Audio codec: libmp3lame
 * - Bitrate: 192k
 * - Sample rate: 44100 Hz
 * - Channels: 2 (stereo)
 * - Good balance between quality and file size for MP3
 */
export const MP3_MEDIUM_QUALITY_PRESET = {
  audioCodec: 'libmp3lame',
  audioBitrate: '192k',
  audioSampleRate: 44100,
  audioChannels: 2,
  normalize: false
};

/**
 * MP3 Low Quality Preset
 * - Audio codec: libmp3lame
 * - Bitrate: 96k
 * - Sample rate: 44100 Hz
 * - Channels: 2 (stereo)
 * - Optimized for smaller file size MP3
 */
export const MP3_LOW_QUALITY_PRESET = {
  audioCodec: 'libmp3lame',
  audioBitrate: '96k',
  audioSampleRate: 44100,
  audioChannels: 2,
  normalize: false
};

/**
 * Image Presets for different quality levels and use cases
 */

/**
 * High Quality JPEG Preset
 * - Format: JPEG
 * - Quality: 95
 * - Optimized for high-quality images with minimal compression artifacts
 */
export const JPEG_HIGH_QUALITY_PRESET = {
  format: 'jpg',
  quality: 95,
  optimize: true
};

/**
 * Medium Quality JPEG Preset
 * - Format: JPEG
 * - Quality: 85
 * - Good balance between quality and file size
 */
export const JPEG_MEDIUM_QUALITY_PRESET = {
  format: 'jpg',
  quality: 85,
  optimize: true
};

/**
 * Low Quality JPEG Preset
 * - Format: JPEG
 * - Quality: 70
 * - Optimized for smaller file size
 */
export const JPEG_LOW_QUALITY_PRESET = {
  format: 'jpg',
  quality: 70,
  optimize: true
};

/**
 * WebP High Quality Preset
 * - Format: WebP
 * - Quality: 90
 * - Optimized for high-quality images with better compression than JPEG
 */
export const WEBP_HIGH_QUALITY_PRESET = {
  format: 'webp',
  quality: 90,
  optimize: true
};

/**
 * WebP Medium Quality Preset
 * - Format: WebP
 * - Quality: 80
 * - Good balance between quality and file size
 */
export const WEBP_MEDIUM_QUALITY_PRESET = {
  format: 'webp',
  quality: 80,
  optimize: true
};

/**
 * WebP Low Quality Preset
 * - Format: WebP
 * - Quality: 65
 * - Optimized for smaller file size
 */
export const WEBP_LOW_QUALITY_PRESET = {
  format: 'webp',
  quality: 65,
  optimize: true
};

/**
 * PNG Preset
 * - Format: PNG
 * - Lossless compression
 * - Optimized for images with transparency or sharp edges
 */
export const PNG_PRESET = {
  format: 'png',
  compressionLevel: 6,
  optimize: true
};

/**
 * PNG Optimized Preset
 * - Format: PNG
 * - Higher compression level for smaller file size
 * - Still lossless, but slower encoding
 */
export const PNG_OPTIMIZED_PRESET = {
  format: 'png',
  compressionLevel: 9,
  optimize: true
};

/**
 * AVIF High Quality Preset
 * - Format: AVIF
 * - Quality: 80
 * - Modern image format with excellent compression
 */
export const AVIF_HIGH_QUALITY_PRESET = {
  format: 'avif',
  quality: 80,
  speed: 4,
  optimize: true
};

/**
 * AVIF Medium Quality Preset
 * - Format: AVIF
 * - Quality: 60
 * - Good balance between quality and file size
 */
export const AVIF_MEDIUM_QUALITY_PRESET = {
  format: 'avif',
  quality: 60,
  speed: 6,
  optimize: true
};

/**
 * Thumbnail Preset
 * - Format: JPEG
 * - Quality: 80
 * - Resize to 300x300 (maintaining aspect ratio)
 * - Optimized for thumbnails
 */
export const THUMBNAIL_PRESET = {
  format: 'jpg',
  quality: 80,
  resize: { width: 300, height: 300, fit: 'inside' },
  optimize: true
};

/**
 * Social Media Preset
 * - Format: JPEG
 * - Quality: 90
 * - Resize to 1200x630 (common social media size)
 * - Optimized for social media sharing
 */
export const SOCIAL_MEDIA_PRESET = {
  format: 'jpg',
  quality: 90,
  resize: { width: 1200, height: 630, fit: 'cover' },
  optimize: true
};

/**
 * Square Image Preset
 * - Format: PNG (to support transparency)
 * - Quality: High
 * - Converts any image to square format with padding
 * - Maintains original aspect ratio
 * - Adds transparent padding where needed
 */
export const SQUARE_PRESET = {
  format: 'png',
  squarePad: true,
  padColor: 'transparent',
  optimize: true
};

/**
 * Square Image with White Background Preset
 * - Format: JPEG
 * - Quality: 90
 * - Converts any image to square format with padding
 * - Maintains original aspect ratio
 * - Adds white padding where needed
 */
export const SQUARE_WHITE_PRESET = {
  format: 'jpg',
  quality: 90,
  squarePad: true,
  padColor: 'white',
  optimize: true
};

/**
 * Instagram Square Preset
 * - Format: JPEG
 * - Quality: 90
 * - Size: 1080x1080 (Instagram square format)
 * - Maintains original aspect ratio with padding
 * - Optimized for Instagram
 */
export const INSTAGRAM_SQUARE_PRESET = {
  format: 'jpg',
  quality: 90,
  width: 1080,
  height: 1080,
  squarePad: true,
  padColor: 'white',
  optimize: true
};

/**
 * Map of preset names to preset configurations
 */
export const PRESETS = {
  'instagram': INSTAGRAM_PRESET,
  'instagram-stories': INSTAGRAM_STORIES_PRESET,
  'youtube-hd': YOUTUBE_HD_PRESET,
  'youtube-4k': YOUTUBE_4K_PRESET,
  'twitter': TWITTER_PRESET,
  'facebook': FACEBOOK_PRESET,
  'tiktok': TIKTOK_PRESET,
  'vimeo-hd': VIMEO_HD_PRESET,
  'web': WEB_PRESET,
  'mobile': MOBILE_PRESET,
  'hd': HD_PRESET,
  'tablet': TABLET_PRESET,
  'low-bandwidth': LOW_BANDWIDTH_PRESET,
  // Audio presets
  'audio-high': AUDIO_HIGH_QUALITY_PRESET,
  'audio-medium': AUDIO_MEDIUM_QUALITY_PRESET,
  'audio-low': AUDIO_LOW_QUALITY_PRESET,
  'audio-voice': AUDIO_VOICE_PRESET,
  'mp3-high': MP3_HIGH_QUALITY_PRESET,
  'mp3-medium': MP3_MEDIUM_QUALITY_PRESET,
  'mp3-low': MP3_LOW_QUALITY_PRESET,
  // Image presets
  'jpeg-high': JPEG_HIGH_QUALITY_PRESET,
  'jpeg-medium': JPEG_MEDIUM_QUALITY_PRESET,
  'jpeg-low': JPEG_LOW_QUALITY_PRESET,
  'webp-high': WEBP_HIGH_QUALITY_PRESET,
  'webp-medium': WEBP_MEDIUM_QUALITY_PRESET,
  'webp-low': WEBP_LOW_QUALITY_PRESET,
  'png': PNG_PRESET,
  'png-optimized': PNG_OPTIMIZED_PRESET,
  'avif-high': AVIF_HIGH_QUALITY_PRESET,
  'avif-medium': AVIF_MEDIUM_QUALITY_PRESET,
  'thumbnail': THUMBNAIL_PRESET,
  'social-media': SOCIAL_MEDIA_PRESET,
  'square': SQUARE_PRESET,
  'square-white': SQUARE_WHITE_PRESET,
  'instagram-square': INSTAGRAM_SQUARE_PRESET
};

/**
 * Responsive profile sets for different use cases
 */
export const RESPONSIVE_PROFILES = {
  'standard': ['mobile', 'web', 'hd'],
  'comprehensive': ['low-bandwidth', 'mobile', 'tablet', 'web', 'hd'],
  'minimal': ['mobile', 'web'],
  'social': ['mobile', 'instagram', 'twitter', 'facebook'],
  'professional': ['web', 'vimeo-hd', 'youtube-hd']
};

/**
 * Get a preset configuration by name
 * 
 * @param {string} presetName - The name of the preset to retrieve
 * @returns {Object|null} - The preset configuration or null if not found
 */
export function getPreset(presetName) {
  if (!presetName || typeof presetName !== 'string') {
    return null;
  }
  
  const normalizedName = presetName.toLowerCase();
  return PRESETS[normalizedName] || null;
}

/**
 * Get a responsive profile set by name
 *
 * @param {string} profileSetName - The name of the responsive profile set to retrieve
 * @returns {Array<string>|null} - Array of profile names or null if not found
 */
export function getResponsiveProfileSet(profileSetName) {
  if (!profileSetName || typeof profileSetName !== 'string') {
    return null;
  }
  
  const normalizedName = profileSetName.toLowerCase();
  return RESPONSIVE_PROFILES[normalizedName] || null;
}