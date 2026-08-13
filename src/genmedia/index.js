/**
 * @profullstack/transcoder - Generative Media
 *
 * One interface for generating images, video, speech and music, sitting next to
 * the ffmpeg presets so a generated asset can be transcoded without leaving the
 * module. Providers are swappable per call; nothing here is Google specific.
 *
 * @example
 * import { generateVideo, transcode } from '@profullstack/transcoder';
 *
 * const clip = await generateVideo({ prompt: 'a slow dolly across an empty studio' });
 * const raw = await clip.toFile('./out/clip.mp4');
 * await transcode(raw, './out/clip.web.mp4', { preset: 'web' });
 */

import { invoke, resolveProvider, describeProviders, hasCredentials } from './registry.js';

/**
 * Generates an image
 *
 * @param {Object} options - Generation options
 * @param {string} options.prompt - Text prompt
 * @param {string} [options.provider] - Force a specific provider
 * @param {string} [options.model] - Model override
 * @returns {Promise<import('./media.js').GeneratedMedia>} - The generated image
 */
export function generateImage(options = {}) {
  return invoke('image', options);
}

/**
 * Generates a video.
 *
 * With Veo the result already contains synchronized audio, so the usual
 * generate-voiceover-then-mux stage can be skipped entirely.
 *
 * @param {Object} options - Generation options
 * @param {string} options.prompt - Text prompt
 * @param {string} [options.provider] - Force a specific provider
 * @returns {Promise<import('./media.js').GeneratedMedia>} - The generated video
 */
export function generateVideo(options = {}) {
  return invoke('video', options);
}

/**
 * Generates spoken audio
 *
 * @param {Object} options - Generation options
 * @param {string} options.text - Text to speak
 * @param {string} [options.voice] - Provider specific voice identifier
 * @param {string} [options.provider] - Force a specific provider
 * @returns {Promise<import('./media.js').GeneratedMedia>} - The generated speech
 */
export function generateSpeech(options = {}) {
  return invoke('speech', options);
}

/**
 * Generates music.
 *
 * Generated beds sidestep the licensing problem that blocks most user-facing
 * video products from shipping with a soundtrack at all.
 *
 * @param {Object} options - Generation options
 * @param {string} options.prompt - Description of the music
 * @param {string} [options.provider] - Force a specific provider
 * @returns {Promise<import('./media.js').GeneratedMedia>} - The generated music
 */
export function generateMusic(options = {}) {
  return invoke('music', options);
}

/**
 * Generates several assets concurrently, with a bounded number in flight.
 *
 * Every provider rate limits, so an unbounded Promise.all over a storyboard is
 * the fastest way to get 429s. This keeps the concurrency explicit and returns
 * results in the order the requests were given.
 *
 * @param {Array<Object>} requests - Requests as {kind, ...options}
 * @param {Object} [options={}] - Batch options
 * @param {number} [options.concurrency=3] - Maximum requests in flight
 * @param {Function} [options.onProgress] - Called with {index, total, error}
 * @returns {Promise<Array<Object>>} - Results as {index, media, error}
 */
export async function generateBatch(requests, options = {}) {
  const concurrency = Math.max(1, options.concurrency ?? 3);
  const results = new Array(requests.length);
  let cursor = 0;
  let completed = 0;

  const generators = {
    image: generateImage,
    video: generateVideo,
    speech: generateSpeech,
    music: generateMusic
  };

  async function worker() {
    for (;;) {
      const index = cursor++;
      if (index >= requests.length) return;

      const { kind, ...rest } = requests[index];
      const generate = generators[kind];

      if (!generate) {
        results[index] = { index, media: null, error: new Error(`Unknown kind "${kind}"`) };
      } else {
        try {
          results[index] = { index, media: await generate(rest), error: null };
        } catch (error) {
          results[index] = { index, media: null, error };
        }
      }

      completed++;
      if (typeof options.onProgress === 'function') {
        options.onProgress({
          index,
          total: requests.length,
          completed,
          error: results[index].error
        });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, requests.length) }, () => worker())
  );

  return results;
}

export { resolveProvider, describeProviders, hasCredentials };
export {
  registerProvider,
  getProvider,
  listProviders,
  supports,
  CAPABILITIES,
  PROVIDER_PREFERENCE
} from './registry.js';
export { GeneratedMedia, pcmToWav, parsePcmMimeType, extensionForMimeType } from './media.js';
export {
  GenMediaError,
  MissingCredentialsError,
  UnsupportedCapabilityError,
  ProviderResponseError,
  GenerationTimeoutError
} from './errors.js';
export { googleProvider } from './providers/google.js';
export { openaiProvider } from './providers/openai.js';
export { elevenlabsProvider } from './providers/elevenlabs.js';
