/**
 * @profullstack/transcoder - Generative Media Errors
 * Error types shared by every generative media provider
 */

/**
 * Base error for all generative media failures
 */
export class GenMediaError extends Error {
  /**
   * @param {string} message - Human readable description of the failure
   * @param {Object} [details={}] - Additional context (provider, model, status)
   */
  constructor(message, details = {}) {
    super(message);
    this.name = 'GenMediaError';
    this.provider = details.provider ?? null;
    this.model = details.model ?? null;
    this.details = details;
  }
}

/**
 * Thrown when no credentials are available for a provider
 */
export class MissingCredentialsError extends GenMediaError {
  constructor(provider, envVar) {
    super(
      `No credentials for provider "${provider}". Set ${envVar} or pass apiKey in options.`,
      { provider, envVar }
    );
    this.name = 'MissingCredentialsError';
    this.envVar = envVar;
  }
}

/**
 * Thrown when a provider cannot service the requested capability
 */
export class UnsupportedCapabilityError extends GenMediaError {
  constructor(provider, capability) {
    super(`Provider "${provider}" cannot generate ${capability}.`, { provider, capability });
    this.name = 'UnsupportedCapabilityError';
    this.capability = capability;
  }
}

/**
 * Thrown when a provider's HTTP API returns a non-success status
 */
export class ProviderResponseError extends GenMediaError {
  /**
   * @param {string} provider - Provider name
   * @param {number} status - HTTP status code
   * @param {string} body - Response body, truncated for readability
   */
  constructor(provider, status, body) {
    super(`Provider "${provider}" returned HTTP ${status}: ${body}`, { provider, status, body });
    this.name = 'ProviderResponseError';
    this.status = status;
    this.body = body;
  }
}

/**
 * Thrown when a long-running generation exceeds its poll budget
 */
export class GenerationTimeoutError extends GenMediaError {
  constructor(provider, elapsedMs) {
    super(`Provider "${provider}" did not finish within ${elapsedMs}ms.`, { provider, elapsedMs });
    this.name = 'GenerationTimeoutError';
    this.elapsedMs = elapsedMs;
  }
}
