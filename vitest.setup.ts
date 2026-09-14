/**
 * Vitest Setup File
 *
 * This file runs before each test file. It configures:
 * - reflect-metadata for decorators
 * - Environment variables for testing
 * - Test isolation settings
 */
import 'reflect-metadata';
// Test inputs come from explicit fixtures, never production .env files.
process.env.NODE_ENV = 'test';

// Configure test-specific environment variables
// These can be overridden in individual test files if needed

// Use in-memory database for tests (handled by test-db helper)
// The test helpers will configure the database connection

// Disable any production-only features in tests
process.env.DISABLE_RATE_LIMITING = '1';
