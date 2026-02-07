#!/usr/bin/env tsx
import { createImageRenderer } from '@noego/forge/test';

const TAILWIND_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              honey: {
                50: '#fef9ee',
                100: '#fef3d7',
                200: '#fde4a7',
                300: '#fbcf6e',
                400: '#f9b13b',
                500: '#f79620',
                600: '#e87513',
                700: '#c05412',
                800: '#994217',
                900: '#7b3716',
              },
              ink: {
                DEFAULT: '#18181b',
                light: '#27272a',
                muted: '#52525b',
                faint: '#a1a1aa',
              }
            }
          }
        }
      }
    </script>
    {{{HEAD}}}
    <style>{{{CSS}}}</style>
</head>
<body>
    <div id="app">{{{APP}}}</div>
</body>
</html>`;

async function main() {
  const imageRenderer = await createImageRenderer({
    outputDir: './test-screenshots',
    stitchConfig: './src/ui/stitch.yaml',
    componentDir: './src/ui',
    template: TAILWIND_TEMPLATE,
    width: 1920,
    height: 1080,
  });

  try {
    console.log('📸 Capturing home page...');
    await imageRenderer.capture('home-page', '/', {
      view: {}
    });
    console.log('✅ Screenshot saved to ./test-screenshots/home-page@1920x1080.png');
  } finally {
    await imageRenderer.close();
  }
}

main().catch(console.error);
