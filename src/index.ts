import dotenv from "dotenv";
dotenv.config({ override: true });

import express from "express";
import { configureLogging as configLogger } from '@noego/logger';

// Configure logging asynchronously (called during server boot)
export async function configureLogging(): Promise<void> {
  configLogger({ serviceName: 'kazibee' });
}

// buildConfig expects a synchronous function that returns Express
// Logging is configured separately in bootServer
export default function (_config: unknown) {
  return express();
}
