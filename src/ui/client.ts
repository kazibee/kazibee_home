import { createApp } from '@noego/forge/client';
import { clientLogger } from '$lib/logger';

// Default export: the framework will call this function automatically
// It reads window.__CONFIGURATION__ (injected by Forge HTML renderer)
export default async function initApp() {
  // Get configuration from window (injected by Forge HTML renderer)
  const options = (window as any).__CONFIGURATION__;
  if (!options) {
    clientLogger.warn('window.__CONFIGURATION__ not found. Forge app may not initialize correctly.');
    return;
  }

  // Find root element
  const root = document.getElementById('app');
  if (!root) {
    clientLogger.warn('Root element with id="app" not found.');
    return;
  }

  // Initialize the app
  await createApp(root, options);
}
