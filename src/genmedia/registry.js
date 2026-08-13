/**
 * @profullstack/transcoder - Generative Media Registry
 * Keeps track of which providers exist, what each can do, and which one to use
 * when the caller does not name one.
 */

import { googleProvider } from './providers/google.js';
import { openaiProvider } from './providers/openai.js';
import { elevenlabsProvider } from './providers/elevenlabs.js';
import { UnsupportedCapabilityError, GenMediaError, MissingCredentialsError } from './errors.js';

/** Every capability the layer knows about */
export const CAPABILITIES = ['image', 'video', 'speech', 'music'];

/**
 * Provider preference per capability, most preferred first.
 *
 * Speech leads with ElevenLabs because it is the incumbent across the existing
 * pipelines and swapping it silently would change the sound of shipped products.
 * Image leads with Google because Gemini Image renders legible text and holds
 * character consistency across a set, which is what the asset pipelines need.
 */
export const PROVIDER_PREFERENCE = {
  image: ['google', 'openai'],
  video: ['google'],
  speech: ['elevenlabs', 'google', 'openai'],
  music: ['google']
};

/** The method each capability maps to on a provider */
const METHOD_BY_CAPABILITY = {
  image: 'generateImage',
  video: 'generateVideo',
  speech: 'generateSpeech',
  music: 'generateMusic'
};

const registry = new Map();

/**
 * Registers a provider, replacing any existing one with the same name
 *
 * @param {Object} provider - Provider implementation
 * @returns {Object} - The registered provider
 */
export function registerProvider(provider) {
  if (!provider?.name) {
    throw new GenMediaError('A provider must have a name');
  }
  registry.set(provider.name, provider);
  return provider;
}

/**
 * @param {string} name - Provider name
 * @returns {Object|undefined} - The provider, if registered
 */
export function getProvider(name) {
  return registry.get(name);
}

/**
 * @returns {Array<string>} - Names of all registered providers
 */
export function listProviders() {
  return [...registry.keys()];
}

/**
 * Reports whether a provider has credentials available in the environment
 *
 * @param {string} name - Provider name
 * @returns {boolean} - True when at least one of its env vars is set
 */
export function hasCredentials(name) {
  const provider = registry.get(name);
  if (!provider) return false;
  return (provider.envVars ?? []).some(envVar => Boolean(process.env[envVar]));
}

/**
 * Describes every provider, what it can generate, and whether it is usable now.
 * Useful for a `--capabilities` style CLI flag or a startup health check.
 *
 * @returns {Array<Object>} - One entry per registered provider
 */
export function describeProviders() {
  return listProviders().map(name => {
    const provider = registry.get(name);
    return {
      name,
      capabilities: provider.capabilities ?? [],
      defaultModels: provider.defaultModels ?? {},
      envVars: provider.envVars ?? [],
      configured: hasCredentials(name)
    };
  });
}

/**
 * Picks the provider to use for a capability.
 *
 * Resolution order: an explicit option, then the GENMEDIA_PROVIDER environment
 * variable, then the first preferred provider that actually has credentials,
 * and finally the first preferred provider at all so the caller gets a clear
 * MissingCredentialsError rather than a confusing "no provider" error.
 *
 * @param {string} capability - One of image, video, speech, music
 * @param {Object} [options={}] - Call options
 * @param {string} [options.provider] - Explicit provider name
 * @returns {Object} - The resolved provider
 */
export function resolveProvider(capability, options = {}) {
  if (!CAPABILITIES.includes(capability)) {
    throw new GenMediaError(`Unknown capability "${capability}"`, { capability });
  }

  const explicit = options.provider ?? process.env.GENMEDIA_PROVIDER;

  if (explicit) {
    const provider = registry.get(explicit);
    if (!provider) {
      throw new GenMediaError(
        `Unknown provider "${explicit}". Registered: ${listProviders().join(', ')}`,
        { provider: explicit }
      );
    }
    if (!supports(provider, capability)) {
      throw new UnsupportedCapabilityError(explicit, capability);
    }
    return provider;
  }

  const preference = PROVIDER_PREFERENCE[capability] ?? [];
  const candidates = preference
    .map(name => registry.get(name))
    .filter(provider => provider && supports(provider, capability));

  if (candidates.length === 0) {
    throw new GenMediaError(`No registered provider can generate ${capability}`, { capability });
  }

  return candidates.find(provider => hasCredentials(provider.name)) ?? candidates[0];
}

/**
 * @param {Object} provider - Provider implementation
 * @param {string} capability - Capability to check
 * @returns {boolean} - True when the provider implements the capability
 */
export function supports(provider, capability) {
  const method = METHOD_BY_CAPABILITY[capability];
  return typeof provider?.[method] === 'function';
}

/**
 * Invokes a capability on the resolved provider
 *
 * @param {string} capability - Capability to invoke
 * @param {Object} [options={}] - Options forwarded to the provider
 * @returns {Promise<import('./media.js').GeneratedMedia>} - The generated asset
 */
export async function invoke(capability, options = {}) {
  const provider = resolveProvider(capability, options);
  const method = METHOD_BY_CAPABILITY[capability];

  if (options.fallback === false) {
    return provider[method](options);
  }

  try {
    return await provider[method](options);
  } catch (error) {
    // A provider with no key configured is a setup problem, not a runtime one:
    // fall through to the next preferred provider that is actually usable.
    if (!(error instanceof MissingCredentialsError) || options.provider) {
      throw error;
    }

    const alternative = (PROVIDER_PREFERENCE[capability] ?? [])
      .map(name => registry.get(name))
      .find(
        candidate =>
          candidate &&
          candidate.name !== provider.name &&
          supports(candidate, capability) &&
          hasCredentials(candidate.name)
      );

    if (!alternative) throw error;
    return alternative[method](options);
  }
}

registerProvider(googleProvider);
registerProvider(openaiProvider);
registerProvider(elevenlabsProvider);
