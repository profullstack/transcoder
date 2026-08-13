/**
 * @profullstack/transcoder - Google Generative Media Provider
 * Gemini Image, Veo, Gemini speech and Lyria, over the Generative Language and
 * Vertex REST APIs. No SDK: every call is plain fetch against a documented endpoint.
 */

import { requestJson, requestBuffer, delay } from '../http.js';
import { GeneratedMedia, pcmToWav, parsePcmMimeType } from '../media.js';
import {
  GenMediaError,
  MissingCredentialsError,
  GenerationTimeoutError
} from '../errors.js';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Default models. Google renames these often, so every generate call accepts a
 * `model` option and these are only the starting point.
 */
export const GOOGLE_DEFAULT_MODELS = {
  image: 'gemini-2.5-flash-image',
  video: 'veo-3.1-generate-preview',
  speech: 'gemini-2.5-flash-preview-tts',
  music: 'lyria-002'
};

export const GOOGLE_CAPABILITIES = ['image', 'video', 'speech', 'music'];

/**
 * Resolves the API key from options or the environment
 *
 * @param {Object} options - Call options
 * @returns {string} - The API key
 */
function resolveApiKey(options) {
  const key =
    options.apiKey ??
    process.env.GOOGLE_API_KEY ??
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_GENAI_API_KEY;

  if (!key) {
    throw new MissingCredentialsError('google', 'GOOGLE_API_KEY');
  }
  return key;
}

/**
 * Builds the headers every Generative Language call needs
 *
 * @param {string} apiKey - API key
 * @returns {Object} - Header map
 */
function jsonHeaders(apiKey) {
  return {
    'content-type': 'application/json',
    'x-goog-api-key': apiKey
  };
}

/**
 * Pulls the first inline binary part out of a generateContent response
 *
 * @param {Object} payload - Parsed generateContent response
 * @param {string} model - Model name, for error messages
 * @returns {Object} - The inlineData object with mimeType and base64 data
 */
function firstInlinePart(payload, model) {
  const parts = payload?.candidates?.[0]?.content?.parts ?? [];
  const inline = parts.find(part => part.inlineData?.data);

  if (!inline) {
    const blockReason = payload?.promptFeedback?.blockReason;
    const finishReason = payload?.candidates?.[0]?.finishReason;
    const detail = blockReason
      ? `request was blocked (${blockReason})`
      : `no inline media in response (finishReason: ${finishReason ?? 'unknown'})`;
    throw new GenMediaError(`Google returned no media for ${model}: ${detail}`, {
      provider: 'google',
      model,
      blockReason,
      finishReason
    });
  }

  return inline.inlineData;
}

/**
 * Generates an image with Gemini Image
 *
 * @param {Object} options - Generation options
 * @param {string} options.prompt - Text prompt
 * @param {string} [options.model] - Model override
 * @param {Array<Object>} [options.referenceImages] - Reference images as {data, mimeType}
 *   for character or product consistency across a set of generations
 * @param {string} [options.aspectRatio] - Aspect ratio such as '16:9'
 * @returns {Promise<GeneratedMedia>} - The generated image
 */
export async function generateImage(options = {}) {
  const apiKey = resolveApiKey(options);
  const model = options.model ?? GOOGLE_DEFAULT_MODELS.image;

  if (!options.prompt) {
    throw new GenMediaError('generateImage requires a prompt', { provider: 'google', model });
  }

  // Reference images ride along in the same parts array as the prompt
  const parts = [{ text: options.prompt }];
  for (const reference of options.referenceImages ?? []) {
    parts.push({
      inlineData: {
        mimeType: reference.mimeType ?? 'image/png',
        data: Buffer.isBuffer(reference.data)
          ? reference.data.toString('base64')
          : reference.data
      }
    });
  }

  const generationConfig = { responseModalities: ['IMAGE'] };
  if (options.aspectRatio) {
    generationConfig.imageConfig = { aspectRatio: options.aspectRatio };
  }

  const payload = await requestJson(
    `${API_BASE}/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: jsonHeaders(apiKey),
      body: JSON.stringify({ contents: [{ parts }], generationConfig })
    },
    { ...options, provider: 'google' }
  );

  const inline = firstInlinePart(payload, model);

  return new GeneratedMedia({
    data: Buffer.from(inline.data, 'base64'),
    mimeType: inline.mimeType ?? 'image/png',
    provider: 'google',
    model,
    kind: 'image',
    meta: { aspectRatio: options.aspectRatio ?? null }
  });
}

/**
 * Generates a video with Veo.
 *
 * Veo is a long-running operation: the first call returns an operation name that
 * has to be polled. Veo also generates its own synchronized audio, which is why
 * callers can skip the separate voiceover and mux stages entirely.
 *
 * @param {Object} options - Generation options
 * @param {string} options.prompt - Text prompt
 * @param {string} [options.model] - Model override
 * @param {Object} [options.image] - Optional first-frame image as {data, mimeType}
 * @param {string} [options.negativePrompt] - What to avoid
 * @param {string} [options.aspectRatio='16:9'] - Aspect ratio
 * @param {string} [options.resolution] - Resolution hint such as '1080p'
 * @param {number} [options.pollInterval=10000] - Milliseconds between poll attempts
 * @param {number} [options.maxWait=600000] - Total milliseconds to wait before giving up
 * @returns {Promise<GeneratedMedia>} - The generated video
 */
export async function generateVideo(options = {}) {
  const apiKey = resolveApiKey(options);
  const model = options.model ?? GOOGLE_DEFAULT_MODELS.video;

  if (!options.prompt) {
    throw new GenMediaError('generateVideo requires a prompt', { provider: 'google', model });
  }

  const instance = { prompt: options.prompt };
  if (options.image) {
    instance.image = {
      bytesBase64Encoded: Buffer.isBuffer(options.image.data)
        ? options.image.data.toString('base64')
        : options.image.data,
      mimeType: options.image.mimeType ?? 'image/png'
    };
  }

  const parameters = { aspectRatio: options.aspectRatio ?? '16:9' };
  if (options.negativePrompt) parameters.negativePrompt = options.negativePrompt;
  if (options.resolution) parameters.resolution = options.resolution;

  const started = await requestJson(
    `${API_BASE}/models/${model}:predictLongRunning`,
    {
      method: 'POST',
      headers: jsonHeaders(apiKey),
      body: JSON.stringify({ instances: [instance], parameters })
    },
    { ...options, provider: 'google' }
  );

  if (!started?.name) {
    throw new GenMediaError('Veo did not return an operation name', { provider: 'google', model });
  }

  const operation = await pollOperation(started.name, apiKey, { ...options, model });
  const sample =
    operation?.response?.generateVideoResponse?.generatedSamples?.[0] ??
    operation?.response?.generatedSamples?.[0];

  if (!sample) {
    const filteredReason = operation?.response?.raiMediaFilteredReasons?.[0];
    throw new GenMediaError(
      `Veo returned no video${filteredReason ? `: ${filteredReason}` : ''}`,
      { provider: 'google', model, operation: operation?.name }
    );
  }

  // The sample is either an inline base64 blob or a URI that needs the key to fetch
  const data = sample.video?.bytesBase64Encoded
    ? Buffer.from(sample.video.bytesBase64Encoded, 'base64')
    : await requestBuffer(
        sample.video.uri,
        { headers: { 'x-goog-api-key': apiKey } },
        { ...options, provider: 'google' }
      );

  return new GeneratedMedia({
    data,
    mimeType: sample.video?.mimeType ?? 'video/mp4',
    provider: 'google',
    model,
    kind: 'video',
    meta: {
      operation: operation?.name ?? null,
      aspectRatio: parameters.aspectRatio,
      hasNativeAudio: true
    }
  });
}

/**
 * Polls a long-running operation until it reports completion
 *
 * @param {string} operationName - Fully qualified operation name
 * @param {string} apiKey - API key
 * @param {Object} options - Poll options
 * @returns {Promise<Object>} - The completed operation
 */
export async function pollOperation(operationName, apiKey, options = {}) {
  const pollInterval = options.pollInterval ?? 10000;
  const maxWait = options.maxWait ?? 600000;
  const startedAt = Date.now();

  for (;;) {
    const operation = await requestJson(
      `${API_BASE}/${operationName}`,
      { headers: { 'x-goog-api-key': apiKey } },
      { ...options, provider: 'google' }
    );

    if (operation?.done) {
      if (operation.error) {
        throw new GenMediaError(
          `Veo operation failed: ${operation.error.message ?? 'unknown error'}`,
          { provider: 'google', model: options.model, code: operation.error.code }
        );
      }
      return operation;
    }

    const elapsed = Date.now() - startedAt;
    if (elapsed >= maxWait) {
      throw new GenerationTimeoutError('google', elapsed);
    }

    if (typeof options.onProgress === 'function') {
      options.onProgress({ elapsed, operation: operationName });
    }

    await delay(pollInterval);
  }
}

/**
 * Generates speech with Gemini text-to-speech.
 *
 * The model returns headerless PCM, which is wrapped in a WAV container so the
 * result drops straight into transcodeAudio without extra format hints.
 *
 * @param {Object} options - Generation options
 * @param {string} options.text - Text to speak, may include style directions
 * @param {string} [options.voice='Kore'] - Prebuilt voice name
 * @param {Array<Object>} [options.speakers] - Multi-speaker config as {speaker, voice}
 * @param {string} [options.model] - Model override
 * @returns {Promise<GeneratedMedia>} - The generated speech
 */
export async function generateSpeech(options = {}) {
  const apiKey = resolveApiKey(options);
  const model = options.model ?? GOOGLE_DEFAULT_MODELS.speech;

  if (!options.text) {
    throw new GenMediaError('generateSpeech requires text', { provider: 'google', model });
  }

  // Multi-speaker turns a monologue into a two-host conversation in one call
  const speechConfig = Array.isArray(options.speakers) && options.speakers.length > 0
    ? {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: options.speakers.map(entry => ({
            speaker: entry.speaker,
            voiceConfig: { prebuiltVoiceConfig: { voiceName: entry.voice } }
          }))
        }
      }
    : {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: options.voice ?? 'Kore' } }
      };

  const payload = await requestJson(
    `${API_BASE}/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: jsonHeaders(apiKey),
      body: JSON.stringify({
        contents: [{ parts: [{ text: options.text }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig }
      })
    },
    { ...options, provider: 'google' }
  );

  const inline = firstInlinePart(payload, model);
  const raw = Buffer.from(inline.data, 'base64');
  const pcm = parsePcmMimeType(inline.mimeType);

  return new GeneratedMedia({
    data: pcm ? pcmToWav(raw, pcm) : raw,
    mimeType: pcm ? 'audio/wav' : inline.mimeType ?? 'audio/wav',
    provider: 'google',
    model,
    kind: 'speech',
    meta: {
      voice: options.voice ?? 'Kore',
      multiSpeaker: Array.isArray(options.speakers) && options.speakers.length > 0,
      sourceMimeType: inline.mimeType ?? null
    }
  });
}

/**
 * Generates music with Lyria.
 *
 * Lyria is served from Vertex AI rather than the Generative Language API, so it
 * needs a project id and an OAuth access token instead of an API key. The usual
 * way to get one on a workstation is `gcloud auth print-access-token`.
 *
 * @param {Object} options - Generation options
 * @param {string} options.prompt - Description of the music
 * @param {string} [options.negativePrompt] - What to avoid
 * @param {number} [options.seed] - Deterministic seed
 * @param {string} [options.projectId] - GCP project, defaults to GOOGLE_CLOUD_PROJECT
 * @param {string} [options.location='us-central1'] - Vertex region
 * @param {string} [options.accessToken] - OAuth token, defaults to GOOGLE_ACCESS_TOKEN
 * @param {string} [options.model] - Model override
 * @returns {Promise<GeneratedMedia>} - The generated music
 */
export async function generateMusic(options = {}) {
  const model = options.model ?? GOOGLE_DEFAULT_MODELS.music;
  const projectId = options.projectId ?? process.env.GOOGLE_CLOUD_PROJECT;
  const accessToken = options.accessToken ?? process.env.GOOGLE_ACCESS_TOKEN;
  const location = options.location ?? process.env.GOOGLE_CLOUD_LOCATION ?? 'us-central1';

  if (!options.prompt) {
    throw new GenMediaError('generateMusic requires a prompt', { provider: 'google', model });
  }
  if (!projectId) {
    throw new MissingCredentialsError('google', 'GOOGLE_CLOUD_PROJECT');
  }
  if (!accessToken) {
    throw new MissingCredentialsError('google', 'GOOGLE_ACCESS_TOKEN');
  }

  const instance = { prompt: options.prompt };
  if (options.negativePrompt) instance.negative_prompt = options.negativePrompt;
  if (Number.isFinite(options.seed)) instance.seed = options.seed;

  const url =
    `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}` +
    `/locations/${location}/publishers/google/models/${model}:predict`;

  const payload = await requestJson(
    url,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ instances: [instance], parameters: {} })
    },
    { ...options, provider: 'google' }
  );

  const prediction = payload?.predictions?.[0];
  if (!prediction?.bytesBase64Encoded) {
    throw new GenMediaError('Lyria returned no audio', { provider: 'google', model });
  }

  return new GeneratedMedia({
    data: Buffer.from(prediction.bytesBase64Encoded, 'base64'),
    mimeType: prediction.mimeType ?? 'audio/wav',
    provider: 'google',
    model,
    kind: 'music',
    meta: { seed: options.seed ?? null, location }
  });
}

export const googleProvider = {
  name: 'google',
  capabilities: GOOGLE_CAPABILITIES,
  defaultModels: GOOGLE_DEFAULT_MODELS,
  envVars: ['GOOGLE_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_GENAI_API_KEY'],
  generateImage,
  generateVideo,
  generateSpeech,
  generateMusic
};
