import type { RequestData } from '@noego/forge/server';

export default async function load(_req: RequestData) {
  // Pairing is initiated client-side; no server data needed
  return {};
}
