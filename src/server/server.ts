import path from 'path';
import express from 'express';
import { assets } from '@noego/dinner/assets';
import { boot as bootBackend } from '@noego/app/client';
import { configureLogging } from '../index';
import { getLogger } from '@noego/logger';
const baseLogger = getLogger('kazibee');
import { initDatabase } from "./repo/boot";
import cookiePaser from '../middleware/auth/cookie';

// Export constants (for backward compatibility)
const SERVER_ROOT = path.resolve(process.cwd(), 'server');
export const STITCH_PATH = path.join(SERVER_ROOT, 'stitch.yaml');
const CONTROLLER_PATH = path.join(SERVER_ROOT, 'controller');
const MIDDLEWARE_PATH = path.resolve(process.cwd(), 'middleware');

// Default export: (app, config) => void
export default async function boot(app: express.Express, config: any) {
  // Configure logging
  await configureLogging();
  await initDatabase(config.database);

  // Configure Express middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(cookiePaser);

  const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITEST;

  // Build asset mappings from config.root
  const imagesPath = path.join(config.root, 'src/ui/resources/images');
  const cssPath = path.join(config.root, 'src/ui/resources/css');
  const faviconPath = path.join(imagesPath, 'favicon.ico');
  app.get('/favicon.ico', (_req, res) => {
    res.sendFile(faviconPath);
  });

  const assetMappings = assets({
    '/images': [imagesPath],
    '/css': [cssPath],
  });

  // Boot backend - framework automatically handles IoC container integration
  const server = await bootBackend(assetMappings);

  // Graceful shutdown handler
  const gracefulShutdown = async (signal: string, exitCode = 0) => {
    baseLogger.info(`Received ${signal}, starting graceful shutdown...`);

    try {
      if (server?.close) {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            baseLogger.warn('Server close timeout exceeded, forcing shutdown');
            resolve();
          }, 5000);

          server.close((err: any) => {
            clearTimeout(timeout);
            if (err) {
              baseLogger.error('Error closing server:', err);
              reject(err);
            } else {
              baseLogger.info('Server closed successfully');
              resolve();
            }
          });
        });
      }

      baseLogger.info('Graceful shutdown complete');
      process.exit(exitCode);
    } catch (error) {
      baseLogger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  // Handle process termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM', 0));
  process.on('SIGINT', () => gracefulShutdown('SIGINT', 0));

  // Handle uncaught exceptions and unhandled rejections (skip in test to avoid vitest conflicts)
  if (!isTest) {
    process.on('uncaughtException', (error) => {
      baseLogger.fatal('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException', 1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      baseLogger.fatal('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection', 1);
    });
  }

  return server;
}
