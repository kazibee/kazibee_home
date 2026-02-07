#!/usr/bin/env tsx
/**
 * Generate a professional bee mascot for Kazibee
 *
 * Usage:
 *   # With reference image (your sketch):
 *   tsx generate-bee.ts --reference ./path/to/bee-sketch.png
 *
 *   # Without reference (text-to-image):
 *   tsx generate-bee.ts
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const imageGen = require('@kazibee/image-gen');

const REFERENCE_PATH = process.argv.includes('--reference')
  ? process.argv[process.argv.indexOf('--reference') + 1]
  : null;

const OUTPUT_PATH = './src/ui/resources/images/kazibee-mascot.png';

async function generateBee() {
  console.log('🐝 Generating Kazibee mascot...');

  const prompt = `
A professional, friendly bee mascot character looking directly at the camera.
Front-facing view, centered composition.

Style: Clean, modern, slightly cartoonish but not overly cute.
The bee should have:
- Large expressive eyes looking forward at camera
- Prominent antennae
- Clear yellow and black striped body
- Translucent wings visible
- Friendly, approachable expression
- Six legs visible in natural pose

Background: Pure transparent or solid white background for easy extraction.
Lighting: Soft, even lighting with subtle highlights on the body.
Quality: High detail, clean edges, suitable for logo/branding use.

The overall style should convey: trustworthy, intelligent, efficient, team-oriented.
Perfect for a tech platform mascot.
`.trim();

  try {
    let result;

    if (REFERENCE_PATH) {
      console.log(`📎 Using reference image: ${REFERENCE_PATH}`);
      result = await imageGen.generateFromReferences(
        [REFERENCE_PATH],
        prompt,
        OUTPUT_PATH,
        {
          aspectRatio: '1:1',
          imageSize: '2K',
          mimeType: 'image/png',
          includeText: false,
        }
      );
    } else {
      console.log('✏️  Generating from text prompt only...');
      result = await imageGen.generateImage(
        prompt,
        OUTPUT_PATH,
        {
          aspectRatio: '1:1',
          imageSize: '2K',
          mimeType: 'image/png',
          includeText: false,
        }
      );
    }

    console.log('\n✅ Bee generated successfully!');
    console.log(`📁 Output: ${result.outputPath}`);
    console.log(`🎨 MIME type: ${result.mimeType}`);
    console.log(`🤖 Model: ${result.model}`);

    if (result.textResponse) {
      console.log(`\n💬 Model notes: ${result.textResponse}`);
    }

    console.log('\n🔍 Next steps:');
    console.log('1. Check if background is transparent');
    console.log('2. If not, use editImage to remove background:');
    console.log(`   tsx edit-bee-background.ts`);

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Generation failed:', message);

    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check GEMINI_API_KEY is set:');
    console.log('   kazibee env image-gen --set GEMINI_API_KEY=your_key');
    console.log('2. List available models:');
    console.log('   const models = await imageGen.listModels({ imageOnly: true });');

    process.exit(1);
  }
}

generateBee();
