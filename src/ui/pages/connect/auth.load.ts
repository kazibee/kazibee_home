interface RequestDataLike {
  url?: string;
}

export default async function load(request: RequestDataLike) {
  const url = new URL(request.url ?? 'http://localhost/connect/login', 'http://localhost');
  return {
    mode: url.pathname.endsWith('/signup') ? 'signup' : 'login',
    returnTo: url.searchParams.get('returnTo') ?? '/connect',
  };
}

