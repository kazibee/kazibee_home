/**
 * Vitest Setup File
 *
 * This file runs before each test file. It configures:
 * - reflect-metadata for decorators
 * - Environment variables for testing
 * - Test isolation settings
 */
import 'reflect-metadata';
import dotenv from 'dotenv';

// Set NODE_ENV to test BEFORE loading dotenv
process.env.NODE_ENV = 'test';

// Load environment variables from .env file
try {
  if (typeof dotenv?.config === 'function') {
    dotenv.config();
  }
} catch {
  // Ignore when dotenv is not installed or fails to load
}

// Ensure test environment after dotenv load (dotenv may override NODE_ENV)
process.env.NODE_ENV = 'test';

// Configure test-specific environment variables
// These can be overridden in individual test files if needed

// Use in-memory database for tests (handled by test-db helper)
// The test helpers will configure the database connection

// Disable any production-only features in tests
process.env.DISABLE_RATE_LIMITING = '1';
