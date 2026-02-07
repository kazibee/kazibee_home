import { createImageRenderer } from '@noego/forge/test';
import { TAILWIND_TEMPLATE } from '../helpers/templates';
import { LAYOUT_PROPS } from '../helpers/mock-data';

async function main() {
  const imageRenderer = await createImageRenderer({
    outputDir: './test/output/screenshots/product-site',
    stitchConfig: './src/ui/stitch.yaml',
    componentDir: './src/ui',
    template: TAILWIND_TEMPLATE,
  });

  const resolutions = [
    { name: 'desktop', width: 1920, height: 1080 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 812 },
  ];

  const routes = [
    { name: 'home', path: '/', view: {}, layout: LAYOUT_PROPS },
    { name: 'technical-details', path: '/technical-details', view: {}, layout: LAYOUT_PROPS },
    { name: 'plugins', path: '/plugins', view: {}, layout: LAYOUT_PROPS },
  ];

  try {
    for (const route of routes) {
      for (const res of resolutions) {
        await imageRenderer.capture(`${route.name}-${res.name}`, route.path, {
          width: res.width,
          height: res.height,
          view: route.view,
          layout: route.layout,
        });
      }
    }
  } finally {
    await imageRenderer.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
