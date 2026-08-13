/**
 * Tests for the generative media layer.
 *
 * Every provider call is exercised through an injected fetch, so the suite runs
 * offline and without credentials.
 */

import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
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
  MissingCredentialsError,
  UnsupportedCapabilityError,
  ProviderResponseError,
  PROVIDER_PREFERENCE
} from '../src/genmedia/index.js';

import { backoffDelay, request, DEFAULT_HTTP_OPTIONS } from '../src/genmedia/http.js';

/** Env vars the layer reads, cleared between tests so the host machine cannot leak in */
const MANAGED_ENV = [
  'GOOGLE_API_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_GENAI_API_KEY',
  'GOOGLE_CLOUD_PROJECT',
  'GOOGLE_ACCESS_TOKEN',
  'GOOGLE_CLOUD_LOCATION',
  'OPENAI_API_KEY',
  'ELEVENLABS_API_KEY',
  'ELEVENLABS_VOICE_ID',
  'GENMEDIA_PROVIDER'
];

let savedEnv = {};

/**
 * Builds a fetch stub that returns a queue of canned responses and records calls
 *
 * @param {Array<Object>} responses - Responses as {status, json, buffer, text, headers}
 * @returns {Function} - A fetch implementation with a `calls` array attached
 */
function stubFetch(responses) {
  const queue = [...responses];
  const impl = async (url, init) => {
    impl.calls.push({ url, init, body: init?.body ? JSON.parse(init.body) : null });
    const next = queue.shift() ?? responses[responses.length - 1];
    const status = next.status ?? 200;
    const headers = new Map(Object.entries(next.headers ?? {}));

    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: key => headers.get(key) ?? null },
      json: async () => next.json,
      text: async () => next.text ?? JSON.stringify(next.json ?? ''),
      arrayBuffer: async () => {
        const buffer = next.buffer ?? Buffer.from('');
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      }
    };
  };
  impl.calls = [];
  return impl;
}

beforeEach(function () {
  savedEnv = {};
  for (const key of MANAGED_ENV) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(function () {
  for (const key of MANAGED_ENV) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
});

describe('GenMedia Media Helpers', function () {
  describe('pcmToWav()', function () {
    it('should prepend a valid 44-byte RIFF header', function () {
      const pcm = Buffer.alloc(100, 7);
      const wav = pcmToWav(pcm, { sampleRate: 24000, channels: 1, bitsPerSample: 16 });

      expect(wav.length).to.equal(144);
      expect(wav.toString('ascii', 0, 4)).to.equal('RIFF');
      expect(wav.toString('ascii', 8, 12)).to.equal('WAVE');
      expect(wav.toString('ascii', 36, 40)).to.equal('data');
      expect(wav.readUInt32LE(4)).to.equal(136);
      expect(wav.readUInt32LE(40)).to.equal(100);
    });

    it('should compute byte rate and block align from the format', function () {
      const wav = pcmToWav(Buffer.alloc(8), { sampleRate: 48000, channels: 2, bitsPerSample: 16 });

      expect(wav.readUInt16LE(22)).to.equal(2); // channels
      expect(wav.readUInt32LE(24)).to.equal(48000); // sample rate
      expect(wav.readUInt32LE(28)).to.equal(192000); // byte rate
      expect(wav.readUInt16LE(32)).to.equal(4); // block align
    });

    it('should default to 24kHz mono 16-bit', function () {
      const wav = pcmToWav(Buffer.alloc(4));
      expect(wav.readUInt32LE(24)).to.equal(24000);
      expect(wav.readUInt16LE(22)).to.equal(1);
      expect(wav.readUInt16LE(34)).to.equal(16);
    });
  });

  describe('parsePcmMimeType()', function () {
    it('should parse rate and bit depth out of an L16 type', function () {
      expect(parsePcmMimeType('audio/L16;rate=24000')).to.deep.equal({
        bitsPerSample: 16,
        sampleRate: 24000,
        channels: 1
      });
    });

    it('should read an explicit channel count', function () {
      expect(parsePcmMimeType('audio/L16; rate=44100; channels=2')).to.deep.equal({
        bitsPerSample: 16,
        sampleRate: 44100,
        channels: 2
      });
    });

    it('should return null for container formats', function () {
      expect(parsePcmMimeType('audio/wav')).to.equal(null);
      expect(parsePcmMimeType('audio/mpeg')).to.equal(null);
      expect(parsePcmMimeType('')).to.equal(null);
      expect(parsePcmMimeType(null)).to.equal(null);
    });
  });

  describe('extensionForMimeType()', function () {
    it('should map known media types', function () {
      expect(extensionForMimeType('image/png')).to.equal('.png');
      expect(extensionForMimeType('video/mp4')).to.equal('.mp4');
      expect(extensionForMimeType('audio/mpeg')).to.equal('.mp3');
      expect(extensionForMimeType('audio/wav')).to.equal('.wav');
    });

    it('should ignore mime parameters and casing', function () {
      expect(extensionForMimeType('IMAGE/PNG; charset=binary')).to.equal('.png');
    });

    it('should fall back for unknown types', function () {
      expect(extensionForMimeType('application/x-thing')).to.equal('.bin');
      expect(extensionForMimeType(undefined)).to.equal('.bin');
    });
  });

  describe('GeneratedMedia', function () {
    const sample = () =>
      new GeneratedMedia({
        data: Buffer.from('hello'),
        mimeType: 'image/png',
        provider: 'test',
        model: 'test-model',
        kind: 'image'
      });

    it('should expose size and extension', function () {
      const media = sample();
      expect(media.size).to.equal(5);
      expect(media.extension).to.equal('.png');
    });

    it('should reject a non-Buffer payload', function () {
      expect(() => new GeneratedMedia({ data: 'nope', mimeType: 'image/png' })).to.throw(
        /requires a Buffer/
      );
    });

    it('should build a data URI', function () {
      expect(sample().toDataUri()).to.equal(`data:image/png;base64,${Buffer.from('hello').toString('base64')}`);
    });

    it('should write to disk and create parent directories', async function () {
      const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'genmedia-'));
      const target = path.join(dir, 'nested', 'deeper', 'out.png');

      const written = await sample().toFile(target);

      expect(written).to.equal(target);
      expect(fs.readFileSync(target).toString()).to.equal('hello');
      await fs.promises.rm(dir, { recursive: true, force: true });
    });

    it('should append the mime-implied extension when the path has none', async function () {
      const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'genmedia-'));
      const written = await sample().toFile(path.join(dir, 'out'));

      expect(written).to.equal(path.join(dir, 'out.png'));
      expect(fs.existsSync(written)).to.equal(true);
      await fs.promises.rm(dir, { recursive: true, force: true });
    });
  });
});

describe('GenMedia HTTP', function () {
  describe('backoffDelay()', function () {
    it('should honour Retry-After when present', function () {
      expect(backoffDelay(0, DEFAULT_HTTP_OPTIONS, 2)).to.equal(2000);
    });

    it('should clamp Retry-After to the maximum delay', function () {
      expect(backoffDelay(0, DEFAULT_HTTP_OPTIONS, 9999)).to.equal(DEFAULT_HTTP_OPTIONS.maxRetryDelay);
    });

    it('should stay within the exponential ceiling', function () {
      for (let attempt = 0; attempt < 6; attempt++) {
        const value = backoffDelay(attempt, DEFAULT_HTTP_OPTIONS);
        expect(value).to.be.at.least(0);
        expect(value).to.be.at.most(DEFAULT_HTTP_OPTIONS.maxRetryDelay);
      }
    });
  });

  describe('request()', function () {
    it('should retry a 429 and then succeed', async function () {
      const fetchImpl = stubFetch([
        { status: 429, text: 'slow down', headers: { 'retry-after': '0' } },
        { status: 200, json: { ok: true } }
      ]);

      const response = await request('https://example.test', {}, {
        fetchImpl,
        provider: 'test',
        retryBaseDelay: 1
      });

      expect(response.status).to.equal(200);
      expect(fetchImpl.calls).to.have.length(2);
    });

    it('should not retry a 400', async function () {
      const fetchImpl = stubFetch([{ status: 400, text: 'bad prompt' }]);

      try {
        await request('https://example.test', {}, { fetchImpl, provider: 'test', retryBaseDelay: 1 });
        expect.fail('should have thrown');
      } catch (error) {
        expect(error).to.be.instanceOf(ProviderResponseError);
        expect(error.status).to.equal(400);
        expect(fetchImpl.calls).to.have.length(1);
      }
    });

    it('should give up after the retry budget', async function () {
      const fetchImpl = stubFetch([{ status: 503, text: 'unavailable' }]);

      try {
        await request('https://example.test', {}, {
          fetchImpl,
          provider: 'test',
          retries: 2,
          retryBaseDelay: 1
        });
        expect.fail('should have thrown');
      } catch (error) {
        expect(error.status).to.equal(503);
        expect(fetchImpl.calls).to.have.length(3);
      }
    });

    it('should retry network faults', async function () {
      let attempts = 0;
      const fetchImpl = async () => {
        attempts++;
        if (attempts < 2) throw new Error('ECONNRESET');
        return {
          ok: true,
          status: 200,
          headers: { get: () => null },
          json: async () => ({ ok: true })
        };
      };

      const response = await request('https://example.test', {}, {
        fetchImpl,
        provider: 'test',
        retryBaseDelay: 1
      });

      expect(response.status).to.equal(200);
      expect(attempts).to.equal(2);
    });
  });
});

describe('GenMedia Registry', function () {
  it('should register the three built-in providers', function () {
    expect(listProviders()).to.include.members(['google', 'openai', 'elevenlabs']);
  });

  it('should report capabilities per provider', function () {
    expect(getProvider('google').capabilities).to.include.members(['image', 'video', 'speech', 'music']);
    expect(getProvider('elevenlabs').capabilities).to.deep.equal(['speech']);
    expect(supports(getProvider('openai'), 'video')).to.equal(false);
  });

  it('should detect credentials from the environment', function () {
    expect(hasCredentials('openai')).to.equal(false);
    process.env.OPENAI_API_KEY = 'sk-test';
    expect(hasCredentials('openai')).to.equal(true);
  });

  it('should prefer a configured provider over an unconfigured one', function () {
    process.env.OPENAI_API_KEY = 'sk-test';
    expect(resolveProvider('image').name).to.equal('openai');

    process.env.GOOGLE_API_KEY = 'g-test';
    expect(resolveProvider('image').name).to.equal('google');
  });

  it('should fall back to the first preferred provider when nothing is configured', function () {
    expect(resolveProvider('image').name).to.equal(PROVIDER_PREFERENCE.image[0]);
  });

  it('should honour an explicit provider option', function () {
    expect(resolveProvider('speech', { provider: 'openai' }).name).to.equal('openai');
  });

  it('should honour GENMEDIA_PROVIDER', function () {
    process.env.GENMEDIA_PROVIDER = 'openai';
    expect(resolveProvider('image').name).to.equal('openai');
  });

  it('should reject a provider that cannot do the job', function () {
    expect(() => resolveProvider('video', { provider: 'elevenlabs' })).to.throw(
      UnsupportedCapabilityError
    );
  });

  it('should reject an unknown provider by name', function () {
    expect(() => resolveProvider('image', { provider: 'nope' })).to.throw(/Unknown provider/);
  });

  it('should describe configuration state for every provider', function () {
    process.env.ELEVENLABS_API_KEY = 'el-test';
    const described = describeProviders();
    const elevenlabs = described.find(entry => entry.name === 'elevenlabs');

    expect(elevenlabs.configured).to.equal(true);
    expect(described.find(entry => entry.name === 'google').configured).to.equal(false);
  });

  it('should accept a custom provider', async function () {
    registerProvider({
      name: 'stub',
      capabilities: ['image'],
      envVars: [],
      generateImage: async () =>
        new GeneratedMedia({
          data: Buffer.from('x'),
          mimeType: 'image/png',
          provider: 'stub',
          model: 'stub-1',
          kind: 'image'
        })
    });

    const media = await generateImage({ provider: 'stub', prompt: 'hi' });
    expect(media.provider).to.equal('stub');
  });

  it('should fall back to a configured provider when the preferred one has no key', async function () {
    process.env.OPENAI_API_KEY = 'sk-test';

    const fetchImpl = stubFetch([
      { status: 200, json: { data: [{ b64_json: Buffer.from('img').toString('base64') }] } }
    ]);

    // Google is preferred for images but unconfigured, so this must land on OpenAI
    const media = await generateImage({ prompt: 'a cat', fetchImpl });

    expect(media.provider).to.equal('openai');
  });

  it('should not silently fall back when a provider was named explicitly', async function () {
    process.env.OPENAI_API_KEY = 'sk-test';

    try {
      await generateImage({ prompt: 'a cat', provider: 'google' });
      expect.fail('should have thrown');
    } catch (error) {
      expect(error).to.be.instanceOf(MissingCredentialsError);
      expect(error.provider).to.equal('google');
    }
  });
});

describe('GenMedia Google Provider', function () {
  beforeEach(function () {
    process.env.GOOGLE_API_KEY = 'g-test';
  });

  it('should generate an image from inline response data', async function () {
    const fetchImpl = stubFetch([
      {
        status: 200,
        json: {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { mimeType: 'image/png', data: Buffer.from('png-bytes').toString('base64') } }]
              }
            }
          ]
        }
      }
    ]);

    const media = await generateImage({ prompt: 'a studio', aspectRatio: '16:9', fetchImpl });

    expect(media.provider).to.equal('google');
    expect(media.kind).to.equal('image');
    expect(media.data.toString()).to.equal('png-bytes');
    expect(media.extension).to.equal('.png');
    expect(fetchImpl.calls[0].init.headers['x-goog-api-key']).to.equal('g-test');
    expect(fetchImpl.calls[0].body.generationConfig.imageConfig.aspectRatio).to.equal('16:9');
  });

  it('should send reference images alongside the prompt', async function () {
    const fetchImpl = stubFetch([
      {
        status: 200,
        json: {
          candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'AA==' } }] } }]
        }
      }
    ]);

    await generateImage({
      prompt: 'same character, new scene',
      referenceImages: [{ data: Buffer.from('ref'), mimeType: 'image/jpeg' }],
      fetchImpl
    });

    const parts = fetchImpl.calls[0].body.contents[0].parts;
    expect(parts).to.have.length(2);
    expect(parts[1].inlineData.mimeType).to.equal('image/jpeg');
    expect(parts[1].inlineData.data).to.equal(Buffer.from('ref').toString('base64'));
  });

  it('should surface a blocked prompt clearly', async function () {
    const fetchImpl = stubFetch([
      { status: 200, json: { promptFeedback: { blockReason: 'SAFETY' }, candidates: [] } }
    ]);

    try {
      await generateImage({ prompt: 'nope', fetchImpl });
      expect.fail('should have thrown');
    } catch (error) {
      expect(error.message).to.match(/blocked \(SAFETY\)/);
    }
  });

  it('should poll a Veo operation until it completes', async function () {
    const fetchImpl = stubFetch([
      { status: 200, json: { name: 'models/veo/operations/abc' } },
      { status: 200, json: { done: false } },
      {
        status: 200,
        json: {
          done: true,
          name: 'models/veo/operations/abc',
          response: {
            generateVideoResponse: {
              generatedSamples: [
                { video: { bytesBase64Encoded: Buffer.from('mp4-bytes').toString('base64'), mimeType: 'video/mp4' } }
              ]
            }
          }
        }
      }
    ]);

    const media = await generateVideo({ prompt: 'a dolly shot', fetchImpl, pollInterval: 1 });

    expect(media.kind).to.equal('video');
    expect(media.data.toString()).to.equal('mp4-bytes');
    expect(media.meta.hasNativeAudio).to.equal(true);
    expect(fetchImpl.calls).to.have.length(3);
  });

  it('should download a Veo result served as a URI', async function () {
    const fetchImpl = stubFetch([
      { status: 200, json: { name: 'ops/1' } },
      {
        status: 200,
        json: {
          done: true,
          response: {
            generateVideoResponse: {
              generatedSamples: [{ video: { uri: 'https://files.test/v.mp4', mimeType: 'video/mp4' } }]
            }
          }
        }
      },
      { status: 200, buffer: Buffer.from('downloaded-mp4') }
    ]);

    const media = await generateVideo({ prompt: 'x', fetchImpl, pollInterval: 1 });

    expect(media.data.toString()).to.equal('downloaded-mp4');
    expect(fetchImpl.calls[2].url).to.equal('https://files.test/v.mp4');
  });

  it('should fail when a Veo operation reports an error', async function () {
    const fetchImpl = stubFetch([
      { status: 200, json: { name: 'ops/1' } },
      { status: 200, json: { done: true, error: { code: 3, message: 'invalid prompt' } } }
    ]);

    try {
      await generateVideo({ prompt: 'x', fetchImpl, pollInterval: 1 });
      expect.fail('should have thrown');
    } catch (error) {
      expect(error.message).to.match(/invalid prompt/);
    }
  });

  it('should wrap PCM speech in a WAV container', async function () {
    const pcm = Buffer.alloc(64, 3);
    const fetchImpl = stubFetch([
      {
        status: 200,
        json: {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { mimeType: 'audio/L16;rate=24000', data: pcm.toString('base64') } }]
              }
            }
          ]
        }
      }
    ]);

    const media = await generateSpeech({ text: 'hello there', provider: 'google', fetchImpl });

    expect(media.mimeType).to.equal('audio/wav');
    expect(media.extension).to.equal('.wav');
    expect(media.data.length).to.equal(pcm.length + 44);
    expect(media.data.toString('ascii', 0, 4)).to.equal('RIFF');
    expect(media.meta.sourceMimeType).to.equal('audio/L16;rate=24000');
  });

  it('should build a multi-speaker speech config', async function () {
    const fetchImpl = stubFetch([
      {
        status: 200,
        json: {
          candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/wav', data: 'AA==' } }] } }]
        }
      }
    ]);

    await generateSpeech({
      text: 'Host: hi\nGuest: hello',
      provider: 'google',
      speakers: [
        { speaker: 'Host', voice: 'Kore' },
        { speaker: 'Guest', voice: 'Puck' }
      ],
      fetchImpl
    });

    const config = fetchImpl.calls[0].body.generationConfig.speechConfig;
    expect(config.multiSpeakerVoiceConfig.speakerVoiceConfigs).to.have.length(2);
    expect(config.multiSpeakerVoiceConfig.speakerVoiceConfigs[1].voiceConfig.prebuiltVoiceConfig.voiceName).to.equal('Puck');
  });

  it('should require project and token for Lyria', async function () {
    try {
      await generateMusic({ prompt: 'gospel choir over a hip hop beat' });
      expect.fail('should have thrown');
    } catch (error) {
      expect(error).to.be.instanceOf(MissingCredentialsError);
      expect(error.envVar).to.equal('GOOGLE_CLOUD_PROJECT');
    }
  });

  it('should generate music from a Vertex prediction', async function () {
    process.env.GOOGLE_CLOUD_PROJECT = 'proj';
    process.env.GOOGLE_ACCESS_TOKEN = 'ya29.test';

    const fetchImpl = stubFetch([
      { status: 200, json: { predictions: [{ bytesBase64Encoded: Buffer.from('wav-bytes').toString('base64') }] } }
    ]);

    const media = await generateMusic({ prompt: 'uplifting gospel', seed: 42, fetchImpl });

    expect(media.kind).to.equal('music');
    expect(media.data.toString()).to.equal('wav-bytes');
    expect(media.meta.seed).to.equal(42);
    expect(fetchImpl.calls[0].url).to.match(/us-central1-aiplatform\.googleapis\.com/);
    expect(fetchImpl.calls[0].init.headers.authorization).to.equal('Bearer ya29.test');
    expect(fetchImpl.calls[0].body.instances[0].seed).to.equal(42);
  });

  it('should require a prompt', async function () {
    try {
      await generateImage({ provider: 'google' });
      expect.fail('should have thrown');
    } catch (error) {
      expect(error.message).to.match(/requires a prompt/);
    }
  });
});

describe('GenMedia OpenAI Provider', function () {
  beforeEach(function () {
    process.env.OPENAI_API_KEY = 'sk-test';
  });

  it('should generate an image', async function () {
    const fetchImpl = stubFetch([
      { status: 200, json: { data: [{ b64_json: Buffer.from('img').toString('base64'), revised_prompt: 'a cat, detailed' }] } }
    ]);

    const media = await generateImage({ prompt: 'a cat', provider: 'openai', size: '1536x1024', fetchImpl });

    expect(media.provider).to.equal('openai');
    expect(media.mimeType).to.equal('image/png');
    expect(media.meta.revisedPrompt).to.equal('a cat, detailed');
    expect(fetchImpl.calls[0].body.size).to.equal('1536x1024');
  });

  it('should generate speech as binary audio', async function () {
    const fetchImpl = stubFetch([{ status: 200, buffer: Buffer.from('mp3-bytes') }]);

    const media = await generateSpeech({ text: 'hello', provider: 'openai', voice: 'nova', fetchImpl });

    expect(media.mimeType).to.equal('audio/mpeg');
    expect(media.data.toString()).to.equal('mp3-bytes');
    expect(fetchImpl.calls[0].body.voice).to.equal('nova');
  });

  it('should require credentials', async function () {
    delete process.env.OPENAI_API_KEY;

    try {
      await generateImage({ prompt: 'x', provider: 'openai' });
      expect.fail('should have thrown');
    } catch (error) {
      expect(error).to.be.instanceOf(MissingCredentialsError);
      expect(error.envVar).to.equal('OPENAI_API_KEY');
    }
  });
});

describe('GenMedia ElevenLabs Provider', function () {
  beforeEach(function () {
    process.env.ELEVENLABS_API_KEY = 'el-test';
  });

  it('should generate speech with the default voice', async function () {
    const fetchImpl = stubFetch([{ status: 200, buffer: Buffer.from('mp3') }]);

    const media = await generateSpeech({ text: 'hi', fetchImpl });

    expect(media.provider).to.equal('elevenlabs');
    expect(media.mimeType).to.equal('audio/mpeg');
    expect(fetchImpl.calls[0].url).to.match(/21m00Tcm4TlvDq8ikWAM/);
    expect(fetchImpl.calls[0].init.headers['xi-api-key']).to.equal('el-test');
  });

  it('should use a voice id from the environment', async function () {
    process.env.ELEVENLABS_VOICE_ID = 'custom-voice';
    const fetchImpl = stubFetch([{ status: 200, buffer: Buffer.from('mp3') }]);

    await generateSpeech({ text: 'hi', fetchImpl });

    expect(fetchImpl.calls[0].url).to.match(/custom-voice/);
  });
});

describe('GenMedia Batch', function () {
  beforeEach(function () {
    process.env.OPENAI_API_KEY = 'sk-test';
  });

  it('should preserve request order and bound concurrency', async function () {
    let inFlight = 0;
    let peak = 0;

    registerProvider({
      name: 'counter',
      capabilities: ['image'],
      envVars: [],
      generateImage: async options => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await new Promise(resolve => setTimeout(resolve, 5));
        inFlight--;
        return new GeneratedMedia({
          data: Buffer.from(options.prompt),
          mimeType: 'image/png',
          provider: 'counter',
          model: 'counter-1',
          kind: 'image'
        });
      }
    });

    const requests = ['a', 'b', 'c', 'd', 'e'].map(prompt => ({
      kind: 'image',
      provider: 'counter',
      prompt
    }));

    const results = await generateBatch(requests, { concurrency: 2 });

    expect(results.map(entry => entry.media.data.toString())).to.deep.equal(['a', 'b', 'c', 'd', 'e']);
    expect(peak).to.be.at.most(2);
  });

  it('should capture per-item errors without failing the batch', async function () {
    const results = await generateBatch([
      { kind: 'image', provider: 'openai', prompt: '' },
      { kind: 'nonsense', prompt: 'x' }
    ]);

    expect(results[0].media).to.equal(null);
    expect(results[0].error.message).to.match(/requires a prompt/);
    expect(results[1].error.message).to.match(/Unknown kind/);
  });

  it('should report progress', async function () {
    const seen = [];
    await generateBatch([{ kind: 'nonsense' }, { kind: 'nonsense' }], {
      onProgress: event => seen.push(event.completed)
    });

    expect(seen).to.deep.equal([1, 2]);
  });
});
