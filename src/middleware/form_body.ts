/**
 * Parses application/x-www-form-urlencoded request bodies into context.body.
 *
 * The framework's readBody only parses application/json; OAuth token
 * requests are form-encoded per RFC 6749 §3.2, so without this middleware
 * the token controller sees an undefined body and returns invalid_request.
 */
interface MiddlewareContext {
  request: Request;
  body: unknown;
}

export default async function formBody(
  context: MiddlewareContext,
  next: () => Promise<Response>,
): Promise<Response> {
  const contentType = context.request.headers.get("content-type") ?? "";
  if (
    context.body === undefined
    && contentType.includes("application/x-www-form-urlencoded")
  ) {
    const text = await context.request.clone().text();
    context.body = Object.fromEntries(new URLSearchParams(text).entries());
  }
  return next();
}
