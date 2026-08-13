/**
 * @profullstack/transcoder - Generated Media
 * The single result shape every provider returns, plus the helpers needed to get
 * that result onto disk and into the existing ffmpeg pipeline.
 */

import fs from 'fs';
import path from 'path';
import { GenMediaError } from './errors.js';

/** File extensions for the mime types the providers actually return */
const EXTENSION_BY_MIME = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/wave': '.wav',
  'audio/opus': '.opus',
  'audio/ogg': '.ogg',
  'audio/aac': '.aac',
  'audio/flac': '.flac'
};

/**
 * Maps a mime type to a file extension
 *
 * @param {string} mimeType - Mime type, optionally with parameters
 * @param {string} [fallback='.bin'] - Extension to use when the type is unknown
 * @returns {string} - File extension including the leading dot
 */
export function extensionForMimeType(mimeType, fallback = '.bin') {
  if (!mimeType) return fallback;
  const base = String(mimeType).split(';')[0].trim().toLowerCase();
  return EXTENSION_BY_MIME[base] ?? fallback;
}

/**
 * Wraps raw little-endian PCM samples in a RIFF/WAVE container.
 *
 * Google's speech and music models return headerless PCM. ffmpeg will happily
 * read that, but only if it is told the sample rate and channel count out of
 * band, so it is far less error-prone to add the 44-byte header here.
 *
 * @param {Buffer} pcm - Raw PCM sample data
 * @param {Object} [options={}] - PCM description
 * @param {number} [options.sampleRate=24000] - Samples per second
 * @param {number} [options.channels=1] - Channel count
 * @param {number} [options.bitsPerSample=16] - Bit depth
 * @returns {Buffer} - A complete WAV file
 */
export function pcmToWav(pcm, options = {}) {
  const sampleRate = options.sampleRate ?? 24000;
  const channels = options.channels ?? 1;
  const bitsPerSample = options.bitsPerSample ?? 16;

  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM subchunk size
  header.writeUInt16LE(1, 20); // Audio format 1 = PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

/**
 * Parses the `audio/L16;rate=24000` style mime types Google returns for PCM
 *
 * @param {string} mimeType - Mime type to inspect
 * @returns {Object|null} - PCM parameters, or null when the type is not raw PCM
 */
export function parsePcmMimeType(mimeType) {
  if (!mimeType) return null;
  const [base, ...params] = String(mimeType).split(';').map(part => part.trim());
  if (!/^audio\/l\d+$/i.test(base)) return null;

  const bitsPerSample = Number(base.slice('audio/l'.length)) || 16;
  const rateParam = params.find(param => param.toLowerCase().startsWith('rate='));
  const sampleRate = rateParam ? Number(rateParam.split('=')[1]) : 24000;
  const channelsParam = params.find(param => param.toLowerCase().startsWith('channels='));
  const channels = channelsParam ? Number(channelsParam.split('=')[1]) : 1;

  return {
    bitsPerSample,
    sampleRate: Number.isFinite(sampleRate) ? sampleRate : 24000,
    channels: Number.isFinite(channels) ? channels : 1
  };
}

/**
 * A generated asset, returned by every generate* function.
 */
export class GeneratedMedia {
  /**
   * @param {Object} params - Asset description
   * @param {Buffer} params.data - Raw asset bytes
   * @param {string} params.mimeType - Mime type of the asset
   * @param {string} params.provider - Provider that produced it
   * @param {string} params.model - Model that produced it
   * @param {string} params.kind - One of image, video, speech, music
   * @param {Object} [params.meta={}] - Provider specific extras
   */
  constructor({ data, mimeType, provider, model, kind, meta = {} }) {
    if (!Buffer.isBuffer(data)) {
      throw new GenMediaError('GeneratedMedia requires a Buffer', { provider, model });
    }
    this.data = data;
    this.mimeType = mimeType;
    this.provider = provider;
    this.model = model;
    this.kind = kind;
    this.meta = meta;
  }

  /** @returns {string} - The conventional file extension for this asset */
  get extension() {
    return extensionForMimeType(this.mimeType);
  }

  /** @returns {number} - Size of the asset in bytes */
  get size() {
    return this.data.length;
  }

  /**
   * Writes the asset to disk, creating parent directories as needed.
   *
   * When the path has no extension, the one implied by the mime type is added,
   * which keeps ffmpeg's format detection working downstream.
   *
   * @param {string} outputPath - Destination path
   * @returns {Promise<string>} - The path actually written
   */
  async toFile(outputPath) {
    const hasExtension = path.extname(outputPath) !== '';
    const target = hasExtension ? outputPath : `${outputPath}${this.extension}`;

    await fs.promises.mkdir(path.dirname(path.resolve(target)), { recursive: true });
    await fs.promises.writeFile(target, this.data);

    return target;
  }

  /**
   * @param {string} [prefix='data'] - Ignored, present for symmetry with toFile
   * @returns {string} - The asset as a data URI
   */
  toDataUri() {
    return `data:${this.mimeType};base64,${this.data.toString('base64')}`;
  }
}
