/**
 * @profullstack/transcoder - OpenAI Generative Media Provider
 * Images and speech over the OpenAI REST API. This is the provider most of the
 * existing pipelines already use, kept here so nothing has to be rewritten to
 * adopt the shared layer.
 */

import { requestJson, requestBuffer } from '../http.js';
import { GeneratedMedia } from '../media.js';
import { GenMediaError, MissingCredentialsError } from '../errors.js';

const API_BASE = 'https://api.openai.com/v1';

export const OPENAI_DEFAULT_MODELS = {
  image: 'gpt-image-1',
  speech: 'gpt-4o-mini-tts'
};

export const OPENAI_CAPABILITIES = ['image', 'speech'];

/**
 * Resolves the API key from options or the environment
 *
 * @param {Object} options - Call options
 * @returns {string} - The API key
 */
function resolveApiKey(options) {
  const key = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!key) {
    throw new MissingCredentialsError('openai', 'OPENAI_API_KEY');
  }
  return key;
}

/**
 * Builds the auth headers for a JSON request
 *
 * @param {string} apiKey - API key
 * @returns {Object} - Header map
 */
function jsonHeaders(apiKey) {
  return {
    'content-type': 'application/json',
    authorization: `Bearer ${apiKey}`
  };
}

/**
 * Generates an image with the OpenAI image API
 *
 * @param {Object} options - Generation options
 * @param {string} options.prompt - Text prompt
 * @param {string} [options.model] - Model override
 * @param {string} [options.size='1024x1024'] - Output size
 * @param {string} [options.quality] - Quality hint
 * @param {string} [options.background] - Background handling, e.g. 'transparent'
 * @returns {Promise<GeneratedMedia>} - The generated image
 */
export async function generateImage(options = {}) {
  const apiKey = resolveApiKey(options);
  const model = options.model ?? OPENAI_DEFAULT_MODELS.image;

  if (!options.prompt) {
    throw new GenMediaError('generateImage requires a prompt', { provider: 'openai', model });
  }

  const body = {
    model,
    prompt: options.prompt,
    size: options.size ?? '1024x1024',
    n: 1
  };
  if (options.quality) body.quality = options.quality;
  if (options.background) body.background = options.background;
  if (options.outputFormat) body.output_format = options.outputFormat;

  const payload = await requestJson(
    `${API_BASE}/images/generations`,
    { method: 'POST', headers: jsonHeaders(apiKey), body: JSON.stringify(body) },
    { ...options, provider: 'openai' }
  );

  const first = payload?.data?.[0];
  if (!first?.b64_json) {
    throw new GenMediaError('OpenAI returned no image data', { provider: 'openai', model });
  }

  const format = options.outputFormat ?? 'png';

  return new GeneratedMedia({
    data: Buffer.from(first.b64_json, 'base64'),
    mimeType: `image/${format === 'jpg' ? 'jpeg' : format}`,
    provider: 'openai',
    model,
    kind: 'image',
    meta: { size: body.size, revisedPrompt: first.revised_prompt ?? null }
  });
}

/**
 * Generates speech with the OpenAI audio API
 *
 * @param {Object} options - Generation options
 * @param {string} options.text - Text to speak
 * @param {string} [options.voice='alloy'] - Voice name
 * @param {string} [options.instructions] - Delivery instructions
 * @param {string} [options.format='mp3'] - Output container
 * @param {string} [options.model] - Model override
 * @returns {Promise<GeneratedMedia>} - The generated speech
 */
export async function generateSpeech(options = {}) {
  const apiKey = resolveApiKey(options);
  const model = options.model ?? OPENAI_DEFAULT_MODELS.speech;

  if (!options.text) {
    throw new GenMediaError('generateSpeech requires text', { provider: 'openai', model });
  }

  const format = options.format ?? 'mp3';
  const body = {
    model,
    input: options.text,
    voice: options.voice ?? 'alloy',
    response_format: format
  };
  if (options.instructions) body.instructions = options.instructions;

  const data = await requestBuffer(
    `${API_BASE}/audio/speech`,
    { method: 'POST', headers: jsonHeaders(apiKey), body: JSON.stringify(body) },
    { ...options, provider: 'openai' }
  );

  return new GeneratedMedia({
    data,
    mimeType: format === 'mp3' ? 'audio/mpeg' : `audio/${format}`,
    provider: 'openai',
    model,
    kind: 'speech',
    meta: { voice: body.voice }
  });
}

export const openaiProvider = {
  name: 'openai',
  capabilities: OPENAI_CAPABILITIES,
  defaultModels: OPENAI_DEFAULT_MODELS,
  envVars: ['OPENAI_API_KEY'],
  generateImage,
  generateSpeech
};
