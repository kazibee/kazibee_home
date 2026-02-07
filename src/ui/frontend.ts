import { client } from '@noego/app/client';
import { initDatabase } from '../server/repo/boot';

// Default export: (app, config) => void
export default async function boot(app: import('express').Express, config: any) {
  await initDatabase();
  await client.boot();
}

// Keep old createApp for backward compatibility during transition
export async function createApp(app: import('express').Express) {
  return boot(app, { root: process.cwd() });
}
