/**
 * @profullstack/transcoder - Generative Media HTTP
 * A small fetch wrapper with timeouts, retries and consistent error reporting.
 * Uses the global fetch shipped with Node 20+, so the module adds no dependencies.
 */

import { ProviderResponseError } from './errors.js';

/** Status codes that are worth retrying: rate limits and transient upstream faults */
const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

export const DEFAULT_HTTP_OPTIONS = {
  timeout: 120000,
  retries: 3,
  retryBaseDelay: 500,
  maxRetryDelay: 8000
};

/**
 * Sleeps for a number of milliseconds
 *
 * @param {number} ms - Duration to wait
 * @returns {Promise<void>}
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Computes an exponential backoff delay with full jitter
 *
 * @param {number} attempt - Zero-based attempt number
 * @param {Object} settings - Merged HTTP settings
 * @param {number} [retryAfterSeconds] - Value of a Retry-After header, when present
 * @returns {number} - Delay in milliseconds
 */
export function backoffDelay(attempt, settings, retryAfterSeconds) {
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.min(retryAfterSeconds * 1000, settings.maxRetryDelay);
  }
  const ceiling = Math.min(settings.retryBaseDelay * 2 ** attempt, settings.maxRetryDelay);
  return Math.round(Math.random() * ceiling);
}

/**
 * Reads a Retry-After header as a number of seconds
 *
 * @param {Response} response - Fetch response
 * @returns {number|undefined} - Seconds to wait, or undefined when absent
 */
function parseRetryAfter(response) {
  const raw = response.headers?.get?.('retry-after');
  if (!raw) return undefined;
  const seconds = Number(raw);
  return Number.isFinite(seconds) ? seconds : undefined;
}

/**
 * Performs an HTTP request with timeout and retry handling
 *
 * @param {string} url - Request URL
 * @param {Object} [init={}] - Fetch init options
 * @param {Object} [options={}] - Behaviour options
 * @param {string} [options.provider='unknown'] - Provider name used in error messages
 * @param {Function} [options.fetchImpl] - Fetch implementation, injectable for tests
 * @param {number} [options.timeout] - Per-attempt timeout in milliseconds
 * @param {number} [options.retries] - Number of retries after the first attempt
 * @returns {Promise<Response>} - Resolves with a successful response
 */
export async function request(url, init = {}, options = {}) {
  const settings = { ...DEFAULT_HTTP_OPTIONS, ...options };
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const provider = options.provider ?? 'unknown';

  if (typeof fetchImpl !== 'function') {
    throw new TypeError('No fetch implementation available. Node 20+ or a fetchImpl option is required.');
  }

  let lastError = null;

  for (let attempt = 0; attempt <= settings.retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), settings.timeout);
    let response = null;
    let networkError = null;

    try {
      response = await fetchImpl(url, { ...init, signal: controller.signal });
    } catch (error) {
      networkError = error;
    } finally {
      clearTimeout(timer);
    }

    // Network faults and timeouts stay retryable until the budget runs out
    if (networkError) {
      lastError = networkError;
      if (attempt === settings.retries) throw networkError;
      await delay(backoffDelay(attempt, settings));
      continue;
    }

    if (response.ok) {
      return response;
    }

    // Read the body once so the error message is useful, then decide on a retry
    const body = await response.text().catch(() => '');
    const truncated = body.length > 500 ? `${body.slice(0, 500)}...` : body;
    lastError = new ProviderResponseError(provider, response.status, truncated);

    // A 400 or a 401 will fail identically on every attempt, so fail fast
    if (!RETRYABLE_STATUS.has(response.status) || attempt === settings.retries) {
      throw lastError;
    }

    await delay(backoffDelay(attempt, settings, parseRetryAfter(response)));
  }

  throw lastError ?? new ProviderResponseError(provider, 0, 'Request failed with no response');
}

/**
 * Performs a request and parses the response as JSON
 *
 * @param {string} url - Request URL
 * @param {Object} [init={}] - Fetch init options
 * @param {Object} [options={}] - Behaviour options
 * @returns {Promise<Object>} - Parsed JSON body
 */
export async function requestJson(url, init = {}, options = {}) {
  const response = await request(url, init, options);
  return response.json();
}

/**
 * Performs a request and returns the response body as a Buffer
 *
 * @param {string} url - Request URL
 * @param {Object} [init={}] - Fetch init options
 * @param {Object} [options={}] - Behaviour options
 * @returns {Promise<Buffer>} - Response body
 */
export async function requestBuffer(url, init = {}, options = {}) {
  const response = await request(url, init, options);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
