/**
 * Mock Data and Test Resolutions for Forge Visual Testing
 *
 * Provides common test data and resolution configurations
 * for visual regression testing with Playwright.
 */

/**
 * Standard test resolutions covering common device sizes
 */
export const TEST_RESOLUTIONS = {
  mobile: { width: 375, height: 667, name: 'mobile' },
  tablet: { width: 768, height: 1024, name: 'tablet' },
  desktop: { width: 1440, height: 900, name: 'desktop' },
} as const;

export type ResolutionName = keyof typeof TEST_RESOLUTIONS;
export type Resolution = typeof TEST_RESOLUTIONS[ResolutionName];

/**
 * Get all resolutions as an array for iteration
 */
export function getAllResolutions(): Resolution[] {
  return Object.values(TEST_RESOLUTIONS);
}

/**
 * Mock user data for authenticated state testing
 */
export const MOCK_USERS = {
  admin: {
    id: 1,
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
  },
  user: {
    id: 2,
    email: 'user@example.com',
    name: 'Regular User',
    role: 'user',
  },
  guest: {
    id: 0,
    email: '',
    name: 'Guest',
    role: 'guest',
  },
} as const;

/**
 * Mock status response for API testing
 */
export const MOCK_STATUS_RESPONSE = {
  status: 'OK',
  version: '1.0.0',
  environment: 'test',
};

/**
 * Default layout props for visual testing
 * Pass this to the layout parameter in imageRenderer.capture()
 */
export const LAYOUT_PROPS = [
  { user: MOCK_USERS.user }
];

/**
 * Generate a unique test ID for screenshot naming
 */
export function generateTestId(testName: string, resolution: string): string {
  const timestamp = Date.now();
  return `${testName}-${resolution}-${timestamp}`;
}

/**
 * Screenshot output path helper
 */
export function getScreenshotPath(testName: string, resolution: string): string {
  return `test/output/screenshots/${testName}-${resolution}.png`;
}
