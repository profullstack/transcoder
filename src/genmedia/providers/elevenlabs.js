/**
 * @profullstack/transcoder - ElevenLabs Generative Media Provider
 * Speech only. Present because it is the incumbent voice provider across the
 * existing pipelines and switching cost should be zero in either direction.
 */

import { requestBuffer } from '../http.js';
import { GeneratedMedia } from '../media.js';
import { GenMediaError, MissingCredentialsError } from '../errors.js';

const API_BASE = 'https://api.elevenlabs.io/v1';

/** Rachel, ElevenLabs' long-standing default voice */
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

export const ELEVENLABS_DEFAULT_MODELS = {
  speech: 'eleven_turbo_v2_5'
};

export const ELEVENLABS_CAPABILITIES = ['speech'];

/**
 * Resolves the API key from options or the environment
 *
 * @param {Object} options - Call options
 * @returns {string} - The API key
 */
function resolveApiKey(options) {
  const key = options.apiKey ?? process.env.ELEVENLABS_API_KEY;
  if (!key) {
    throw new MissingCredentialsError('elevenlabs', 'ELEVENLABS_API_KEY');
  }
  return key;
}

/**
 * Generates speech with ElevenLabs text-to-speech
 *
 * @param {Object} options - Generation options
 * @param {string} options.text - Text to speak
 * @param {string} [options.voice] - Voice id
 * @param {string} [options.model] - Model override
 * @param {Object} [options.voiceSettings] - Stability and similarity settings
 * @param {string} [options.outputFormat='mp3_44100_128'] - ElevenLabs output format
 * @returns {Promise<GeneratedMedia>} - The generated speech
 */
export async function generateSpeech(options = {}) {
  const apiKey = resolveApiKey(options);
  const model = options.model ?? ELEVENLABS_DEFAULT_MODELS.speech;
  const voiceId = options.voice ?? process.env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE_ID;

  if (!options.text) {
    throw new GenMediaError('generateSpeech requires text', { provider: 'elevenlabs', model });
  }

  const outputFormat = options.outputFormat ?? 'mp3_44100_128';
  const body = { text: options.text, model_id: model };
  if (options.voiceSettings) body.voice_settings = options.voiceSettings;

  const data = await requestBuffer(
    `${API_BASE}/text-to-speech/${voiceId}?output_format=${encodeURIComponent(outputFormat)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'xi-api-key': apiKey },
      body: JSON.stringify(body)
    },
    { ...options, provider: 'elevenlabs' }
  );

  return new GeneratedMedia({
    data,
    mimeType: outputFormat.startsWith('mp3') ? 'audio/mpeg' : 'audio/wav',
    provider: 'elevenlabs',
    model,
    kind: 'speech',
    meta: { voice: voiceId, outputFormat }
  });
}

export const elevenlabsProvider = {
  name: 'elevenlabs',
  capabilities: ELEVENLABS_CAPABILITIES,
  defaultModels: ELEVENLABS_DEFAULT_MODELS,
  envVars: ['ELEVENLABS_API_KEY'],
  generateSpeech
};
