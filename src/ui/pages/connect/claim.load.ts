interface RequestDataLike {
  params?: Record<string, string>;
  url?: string;
}

export default async function load(request: RequestDataLike) {
  const fallback = new URL(request.url ?? 'http://localhost/connect/claim/', 'http://localhost').pathname.split('/').pop();
  return { claimId: request.params?.claimId ?? fallback ?? '' };
}

