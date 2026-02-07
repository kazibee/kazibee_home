#!/usr/bin/env tsx
/**
 * Remove background from generated bee image
 *
 * Usage:
 *   tsx edit-bee-background.ts
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const imageGen = require('@kazibee/image-gen');

const INPUT_PATH = './src/ui/resources/images/kazibee-mascot.png';
const OUTPUT_PATH = './src/ui/resources/images/kazibee-mascot-transparent.png';

async function removeBeeBackground() {
  console.log('🎨 Removing background from bee image...');

  const prompt = `
Remove all background, keep only the bee.
Make the background completely transparent.
Preserve all details of the bee character - body, wings, antennae, legs, eyes.
Clean edges, no artifacts or background remnants.
High quality transparent PNG output suitable for logos and overlays.
`.trim();

  try {
    const result = await imageGen.editImage(
      INPUT_PATH,
      prompt,
      OUTPUT_PATH,
      {
        imageSize: '2K',
        mimeType: 'image/png',
        includeText: false,
      }
    );

    console.log('\n✅ Background removed successfully!');
    console.log(`📁 Output: ${result.outputPath}`);
    console.log(`🎨 MIME type: ${result.mimeType}`);
    console.log(`🤖 Model: ${result.model}`);

    if (result.textResponse) {
      console.log(`\n💬 Model notes: ${result.textResponse}`);
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Background removal failed:', message);

    console.log('\n📝 Make sure the input image exists:');
    console.log(`   ${INPUT_PATH}`);

    process.exit(1);
  }
}

removeBeeBackground();
