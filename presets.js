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
  'mobile': MOBILE_PRESET
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