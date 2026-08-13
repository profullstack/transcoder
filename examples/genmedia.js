/**
 * Generative media example for the transcode module
 *
 * This example demonstrates generating an image, a voiceover, a music bed and a
 * video clip through one interface, then handing the results to the existing
 * ffmpeg pipeline. Nothing runs without credentials, so the script reports which
 * providers are configured first and skips whatever it cannot reach.
 */

// In a real project, you would import from the package:
// import { generateImage, generateSpeech, transcode } from '@profullstack/transcoder';
// For this example, we're importing directly from the local file:
import {
  generateImage,
  generateVideo,
  generateSpeech,
  generateMusic,
  generateBatch,
  describeProviders,
  hasCredentials
} from '../index.js';
import fs from 'fs';

const outputDir = './test-videos/output/genmedia';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Example 1: See what is actually usable in this environment
console.log('Example 1: Provider capabilities');
for (const provider of describeProviders()) {
  const state = provider.configured ? 'configured' : `needs ${provider.envVars[0]}`;
  console.log(`  ${provider.name.padEnd(12)} ${provider.capabilities.join(', ').padEnd(28)} ${state}`);
}

// Example 2: An image, written straight to disk
async function imageExample() {
  console.log('\nExample 2: Image generation');
  if (!hasCredentials('google') && !hasCredentials('openai')) {
    console.log('  Skipped: no image provider configured');
    return;
  }

  const image = await generateImage({
    prompt: 'A wide editorial photo of an empty recording studio at golden hour',
    aspectRatio: '16:9'
  });

  const written = await image.toFile(`${outputDir}/studio`);
  console.log(`  ${image.provider}/${image.model} -> ${written} (${image.size} bytes)`);
}

// Example 3: A voiceover, then transcode it to a web-friendly format
async function speechExample() {
  console.log('\nExample 3: Voiceover');
  if (!hasCredentials('elevenlabs') && !hasCredentials('openai') && !hasCredentials('google')) {
    console.log('  Skipped: no speech provider configured');
    return;
  }

  const speech = await generateSpeech({
    text: 'Here is what changed in this release, in about forty five seconds.'
  });

  const written = await speech.toFile(`${outputDir}/voiceover`);
  console.log(`  ${speech.provider}/${speech.model} -> ${written} (${speech.size} bytes)`);

  // The result is a normal audio file, so the existing pipeline takes it from here:
  // await transcodeAudio(written, `${outputDir}/voiceover.mp3`, { preset: 'audio-high' });
}

// Example 4: Two hosts in a single call, no editing between them
async function podcastExample() {
  console.log('\nExample 4: Multi-speaker dialogue');
  if (!hasCredentials('google')) {
    console.log('  Skipped: GOOGLE_API_KEY is not set');
    return;
  }

  const dialogue = await generateSpeech({
    provider: 'google',
    text: 'Host: So what actually shipped this week?\nGuest: The shared media layer, finally.',
    speakers: [
      { speaker: 'Host', voice: 'Kore' },
      { speaker: 'Guest', voice: 'Puck' }
    ]
  });

  console.log(`  -> ${await dialogue.toFile(`${outputDir}/dialogue`)}`);
}

// Example 5: A music bed. Generated audio sidesteps the licensing problem that
// otherwise stops user-facing video products from shipping with any soundtrack.
async function musicExample() {
  console.log('\nExample 5: Music bed');
  if (!process.env.GOOGLE_CLOUD_PROJECT || !process.env.GOOGLE_ACCESS_TOKEN) {
    console.log('  Skipped: Lyria needs GOOGLE_CLOUD_PROJECT and GOOGLE_ACCESS_TOKEN');
    return;
  }

  const music = await generateMusic({
    prompt: 'An understated, optimistic instrumental bed with light percussion',
    seed: 42
  });

  console.log(`  -> ${await music.toFile(`${outputDir}/bed`)}`);
}

// Example 6: A video clip. Veo returns synchronized audio, so the usual
// generate-voiceover-then-mux stage is unnecessary here.
async function videoExample() {
  console.log('\nExample 6: Video generation');
  if (!hasCredentials('google')) {
    console.log('  Skipped: GOOGLE_API_KEY is not set');
    return;
  }

  const clip = await generateVideo({
    prompt: 'Slow dolly across a quiet workshop, dust in the light, ambient room tone',
    aspectRatio: '16:9',
    onProgress: ({ elapsed }) => console.log(`  still rendering (${Math.round(elapsed / 1000)}s)`)
  });

  const written = await clip.toFile(`${outputDir}/clip.mp4`);
  console.log(`  ${clip.model} -> ${written} (${clip.size} bytes, native audio: ${clip.meta.hasNativeAudio})`);
}

// Example 7: A storyboard, generated concurrently but politely
async function batchExample() {
  console.log('\nExample 7: Batch storyboard');
  if (!hasCredentials('google') && !hasCredentials('openai')) {
    console.log('  Skipped: no image provider configured');
    return;
  }

  const scenes = [
    'Scene 1: a closed laptop on a workbench, morning light',
    'Scene 2: the same workbench, tools laid out in a row',
    'Scene 3: a wide shot of the finished piece'
  ];

  const results = await generateBatch(
    scenes.map(prompt => ({ kind: 'image', prompt })),
    {
      concurrency: 2,
      onProgress: ({ completed, total }) => console.log(`  ${completed}/${total}`)
    }
  );

  for (const result of results) {
    if (result.error) {
      console.log(`  scene ${result.index + 1} failed: ${result.error.message}`);
      continue;
    }
    console.log(`  scene ${result.index + 1} -> ${await result.media.toFile(`${outputDir}/scene-${result.index + 1}`)}`);
  }
}

async function main() {
  const examples = [imageExample, speechExample, podcastExample, musicExample, videoExample, batchExample];

  for (const example of examples) {
    try {
      await example();
    } catch (error) {
      console.error(`  Error: ${error.message}`);
    }
  }

  console.log('\nDone.');
}

main();
