interface FrontendExecutionInputLike {
  params?: Record<string, string>;
  request: { url: string };
}

export default async function load(input: FrontendExecutionInputLike) {
  const fallback = new URL(input.request.url).pathname.split('/').pop();
  return { claimId: input.params?.claimId ?? fallback ?? '' };
}
