import type { RequestData } from '@noego/forge/server';

export default async function load(req: RequestData) {
  try {
    const res = await fetch(`${req.url.startsWith('http') ? new URL(req.url).origin : 'http://localhost:3000'}/api/devices`, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      return { devices: [] };
    }

    const body = await res.json();
    return { devices: body.devices || [] };
  } catch {
    return { devices: [] };
  }
}
