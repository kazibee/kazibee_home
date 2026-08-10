import path from 'path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { assets } from '@noego/dinner/assets';
import { boot as bootBackend } from '@noego/app/client';
import { configureLogging } from '../index';
import { getLogger } from '@noego/logger';
const baseLogger = getLogger('kazibee');
import { initDatabase } from "./repo/boot";
import cookiePaser from '../middleware/auth/cookie';
import TraceAdapter from './observability/trace_adapter';
import container from './container';
import ConnectValidationErrorMapper from './middleware/connect_validation_error_mapper';

// Export constants (for backward compatibility)
const SERVER_ROOT = path.resolve(process.cwd(), 'server');
export const STITCH_PATH = path.join(SERVER_ROOT, 'stitch.yaml');

// Default export: (app, config) => void
export default async function boot(app: express.Express, config: any) {
  // Configure logging
  await configureLogging();
  TraceAdapter.configureWebsiteProcess();
  await initDatabase(config.database);

  // Configure Express middleware
  app.use(express.json({ limit: '50mb' }));
  app.use((error: unknown, req: Request, res: Response, next: NextFunction) => {
    const errorType = typeof error === "object" && error !== null && "type" in error
      ? error.type : null;
    const parseFailure = error instanceof SyntaxError && errorType === "entity.parse.failed";
    const oversized = errorType === "entity.too.large";
    if ((!parseFailure && !oversized) || !req.path.startsWith("/v1/connect/")) {
      next(error);
      return;
    }
    res.setHeader("x-kazi-protocol-version", "1.0");
    res.status(oversized ? 413 : 400).json({
      kind: "error",
      protocolVersion: "1.0",
      code: "invalid-envelope",
      message: "Invalid request envelope",
      retryable: false,
      correlationId: "cor_invalid000",
    });
  });
  app.use(cookiePaser);
  const connectValidationErrors = await container.instance(ConnectValidationErrorMapper);
  app.use((req, res, next) => connectValidationErrors.capture(req, res, next));

  const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITEST;

  // Build asset mappings from config.root
  const imagesPath = path.join(config.root, 'src/ui/resources/images');
  const cssPath = path.join(config.root, 'src/ui/resources/css');
  const robotsPath = path.join(config.root, 'src/ui/resources/robots.txt');
  const faviconPath = path.join(imagesPath, 'favicon.ico');
  app.get('/favicon.ico', (_req, res) => {
    res.sendFile(faviconPath);
  });
  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').sendFile(robotsPath);
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

  // Process-level handlers belong to the production server lifecycle. Test apps are
  // booted repeatedly in one Vitest process, so registering them there would leak
  // listeners across otherwise isolated app instances.
  if (!isTest) {
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM', 0));
    process.on('SIGINT', () => gracefulShutdown('SIGINT', 0));

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
