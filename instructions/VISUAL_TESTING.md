# Visual Testing Guide

This guide explains how to write visual tests for UI components using Forge.

---

## Quick Start

### Basic Visual Test

```typescript
import { createImageRenderer } from '@noego/forge/test';
import { TAILWIND_TEMPLATE } from '../helpers/templates';

async function main() {
  const imageRenderer = await createImageRenderer({
    outputDir: './test/output/screenshots/my-component',
    stitchConfig: './src/ui/stitch.yaml',
    componentDir: './src/ui',
    template: TAILWIND_TEMPLATE,
  });

  try {
    await imageRenderer.capture('my-page-desktop', '/', {
      width: 1920,
      height: 1080,
      view: {},
      layout: {}
    });
  } finally {
    await imageRenderer.close();
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
```

---

## File Structure

### Naming Convention

Visual test files use the `.forge.ts` extension:

```
test/
  ui/
    dashboard.forge.ts    # Dashboard page visual tests
    home.forge.ts         # Home page visual tests
    login.forge.ts        # Login page visual tests
  output/
    screenshots/          # Generated screenshots
      dashboard/
      home/
```

---

## Testing at Multiple Resolutions

### Standard Resolutions

Always test at mobile, tablet, and desktop resolutions:

```typescript
import { createImageRenderer } from '@noego/forge/test';
import { TAILWIND_TEMPLATE } from '../helpers/templates';
import { TEST_RESOLUTIONS, getAllResolutions } from '../helpers/mock-data';

async function main() {
  const imageRenderer = await createImageRenderer({
    outputDir: './test/output/screenshots/dashboard',
    stitchConfig: './src/ui/stitch.yaml',
    componentDir: './src/ui',
    template: TAILWIND_TEMPLATE,
  });

  try {
    const resolutions = getAllResolutions();

    for (const res of resolutions) {
      console.log(`Capturing ${res.name}...`);
      await imageRenderer.capture(`dashboard-${res.name}`, '/dashboard', {
        width: res.width,
        height: res.height,
        view: { user: { name: 'Test User' } },
        layout: {}
      });
    }
  } finally {
    await imageRenderer.close();
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
```

### Resolution Reference

```typescript
// Available from helpers/mock-data.ts
export const TEST_RESOLUTIONS = {
  mobile: { width: 375, height: 667, name: 'mobile' },
  tablet: { width: 768, height: 1024, name: 'tablet' },
  desktop: { width: 1440, height: 900, name: 'desktop' },
};
```

---

## Test Helpers

### TAILWIND_TEMPLATE

Use this template for components that use Tailwind CSS:

```typescript
import { TAILWIND_TEMPLATE } from '../helpers/templates';

const imageRenderer = await createImageRenderer({
  // ...
  template: TAILWIND_TEMPLATE,
});
```

### Mock Data

Use mock data helpers for consistent test data:

```typescript
import { MOCK_USERS, MOCK_DASHBOARD_DATA } from '../helpers/mock-data';

await imageRenderer.capture('dashboard-admin', '/dashboard', {
  width: 1440,
  height: 900,
  view: {
    user: MOCK_USERS.admin,
    stats: MOCK_DASHBOARD_DATA.stats,
  },
  layout: {}
});
```

---

## Running Visual Tests

### Commands

```bash
# Run all visual tests
npm run test:ui

# Run a specific visual test
npx forge test/ui/dashboard.forge.ts

# Run with watch mode (re-run on changes)
npx forge test/ui/dashboard.forge.ts --watch
```

---

## Output Location

Screenshots are saved to:

```
test/output/screenshots/
  <component-name>/
    <page>-desktop.png
    <page>-tablet.png
    <page>-mobile.png
```

This directory is git-ignored. Screenshots are regenerated on each test run.

---

## Testing Different States

### Empty State

```typescript
await imageRenderer.capture('dashboard-empty', '/dashboard', {
  width: 1440,
  height: 900,
  view: {
    items: [],
    loading: false,
  },
  layout: {}
});
```

### Loading State

```typescript
await imageRenderer.capture('dashboard-loading', '/dashboard', {
  width: 1440,
  height: 900,
  view: {
    loading: true,
  },
  layout: {}
});
```

### Error State

```typescript
await imageRenderer.capture('dashboard-error', '/dashboard', {
  width: 1440,
  height: 900,
  view: {
    error: 'Failed to load data. Please try again.',
    loading: false,
  },
  layout: {}
});
```

### Authenticated vs Guest

```typescript
import { MOCK_USERS } from '../helpers/mock-data';

// Authenticated state
await imageRenderer.capture('home-authenticated', '/', {
  width: 1440,
  height: 900,
  view: {},
  layout: { user: MOCK_USERS.user }
});

// Guest state
await imageRenderer.capture('home-guest', '/', {
  width: 1440,
  height: 900,
  view: {},
  layout: { user: null }
});
```

---

## Complete Example

```typescript
/**
 * Dashboard Visual Test - Forge Visual Testing
 *
 * Captures screenshots of the dashboard at multiple resolutions
 * and different states.
 *
 * Run with: npx forge test/ui/dashboard.forge.ts
 */

import { createImageRenderer } from '@noego/forge/test';
import { TAILWIND_TEMPLATE } from '../helpers/templates';
import { TEST_RESOLUTIONS, MOCK_USERS, MOCK_DASHBOARD_DATA } from '../helpers/mock-data';

async function main() {
  console.log('Starting visual tests...');

  const imageRenderer = await createImageRenderer({
    outputDir: './test/output/screenshots/dashboard',
    stitchConfig: './src/ui/stitch.yaml',
    componentDir: './src/ui',
    template: TAILWIND_TEMPLATE,
  });

  try {
    const resolutions = Object.values(TEST_RESOLUTIONS);

    // Test normal state at all resolutions
    for (const res of resolutions) {
      console.log(`Capturing dashboard-${res.name}...`);
      await imageRenderer.capture(`dashboard-${res.name}`, '/dashboard', {
        width: res.width,
        height: res.height,
        view: {
          stats: MOCK_DASHBOARD_DATA.stats,
          activity: MOCK_DASHBOARD_DATA.recentActivity,
        },
        layout: { user: MOCK_USERS.user }
      });
    }

    // Test empty state (desktop only)
    console.log('Capturing empty state...');
    await imageRenderer.capture('dashboard-empty', '/dashboard', {
      width: 1440,
      height: 900,
      view: {
        stats: { totalUsers: 0, activeToday: 0, newThisWeek: 0 },
        activity: [],
      },
      layout: { user: MOCK_USERS.user }
    });

    // Test loading state (desktop only)
    console.log('Capturing loading state...');
    await imageRenderer.capture('dashboard-loading', '/dashboard', {
      width: 1440,
      height: 900,
      view: {
        loading: true,
      },
      layout: { user: MOCK_USERS.user }
    });

    console.log('Done! Screenshots saved to ./test/output/screenshots/dashboard/');
  } finally {
    await imageRenderer.close();
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
```

---

## Best Practices

1. **Test all resolutions** - Mobile, tablet, and desktop
2. **Test different states** - Empty, loading, error, success
3. **Use consistent mock data** - Import from helpers
4. **Name screenshots descriptively** - Include page and state in filename
5. **Close the renderer** - Always call `imageRenderer.close()` in a finally block
6. **Keep tests focused** - One visual test file per page or component group
7. **Use TAILWIND_TEMPLATE** - For consistent styling with your app
