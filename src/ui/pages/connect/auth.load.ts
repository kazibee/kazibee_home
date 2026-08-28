interface FrontendExecutionInputLike {
  request: { url: string };
}

export default async function load(input: FrontendExecutionInputLike) {
  const url = new URL(input.request.url);
  return {
    mode: url.pathname.endsWith('/signup') ? 'signup' : 'login',
    returnTo: url.searchParams.get('returnTo') ?? '/connect',
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  };
}
