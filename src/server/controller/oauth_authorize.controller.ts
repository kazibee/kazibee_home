import { Component, Inject } from "@noego/ioc";
import type {
  CompatRequest as Request,
  CompatResponse as Response,
} from "@noego/dinner";
import ConnectExecutorActorResolver from "../services/connect_executor_actor_resolver";
import OAuthAuthorizeService, {
  type OAuthAuthorizationFailure,
  type OAuthAuthorizationParams,
  type OAuthExecutorSelection,
} from "../services/oauth_authorize_service";

type ActionArgs = { req: Request; res: Response };

const OAUTH_PARAM_NAMES = [
  "response_type",
  "client_id",
  "redirect_uri",
  "state",
  "code_challenge",
  "code_challenge_method",
  "scope",
  "resource",
] as const;

function recordString(source: unknown, name: string): string {
  if (!source || typeof source !== "object") return "";
  const value = (source as Record<string, unknown>)[name];
  return typeof value === "string" ? value : "";
}

function authorizationParams(source: unknown): OAuthAuthorizationParams {
  return Object.fromEntries(
    OAUTH_PARAM_NAMES.map((name) => [name, recordString(source, name)]),
  ) as unknown as OAuthAuthorizationParams;
}

/** Accepts `machines: {executor_id, workspace_id, scope?}[]`. */
function bodySelections(req: Request): OAuthExecutorSelection[] {
  const body = req.body && typeof req.body === "object"
    ? req.body as Record<string, unknown>
    : {};
  if (!Array.isArray(body.machines)) return [];
  return body.machines.flatMap((entry): OAuthExecutorSelection[] => {
    if (!entry || typeof entry !== "object") return [];
    const value = entry as Record<string, unknown>;
    if (typeof value.executor_id !== "string" || typeof value.workspace_id !== "string") return [];
    return [{
      executor_id: value.executor_id,
      workspace_id: value.workspace_id,
      ...(value.scope === "read" || value.scope === "read_write"
        ? { scope: value.scope }
        : {}),
    }];
  });
}

@Component()
export default class OAuthAuthorizeController {
  constructor(
    @Inject(OAuthAuthorizeService)
    private readonly oauth: OAuthAuthorizeService,
    @Inject(ConnectExecutorActorResolver)
    private readonly actors: ConnectExecutorActorResolver,
  ) {}

  /** Public OAuth authorization endpoint. */
  async authorize({ req, res }: ActionArgs) {
    const params = authorizationParams(req.query);
    try {
      const validation = await this.oauth.validate(params);
      if (!validation.ok) return this.authorizationError(res, validation);

      return res
        .status(200)
        .setHeader("Cache-Control", "no-store")
        .setHeader("Content-Type", "text/html; charset=utf-8")
        .send(consentShell());
    } catch {
      return this.plainError(
        res,
        500,
        "server_error",
        "The authorization request could not be processed.",
      );
    }
  }

  /** Session-authenticated client and machine context for the consent UI. */
  async context({ req, res }: ActionArgs) {
    const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId : "";
    const actor = await this.actors.browser(req, sessionId, false);
    if (!actor.ok) return this.authError(res, actor.reason);

    try {
      const result = await this.oauth.consentContext(
        (actor.actor as { userId: string }).userId,
        authorizationParams(req.query),
      );
      if (!result.ok) return this.jsonOAuthError(res, result);
      return res
        .status(200)
        .setHeader("Cache-Control", "no-store")
        .json(result.context);
    } catch {
      return res.status(500).json({
        error: "server_error",
        message: "Could not load authorization context",
      });
    }
  }

  /** Creates a connection and short-lived authorization code after live re-checks. */
  async approve({ req, res }: ActionArgs) {
    const sessionId = recordString(req.body, "sessionId");
    const actor = await this.actors.browser(req, sessionId, true);
    if (!actor.ok) return this.authError(res, actor.reason);

    try {
      const result = await this.oauth.approve(
        (actor.actor as { userId: string }).userId,
        authorizationParams(req.body),
        bodySelections(req),
        recordString(req.body, "approved_scope"),
      );
      if (!result.ok) return this.jsonOAuthError(res, result);
      return res.status(200).setHeader("Cache-Control", "no-store").json({
        redirect_to: result.redirectTo,
      });
    } catch {
      return res.status(500).json({
        error: "server_error",
        message: "Could not approve authorization",
      });
    }
  }

  /** Returns a validated access_denied redirect without creating a connection. */
  async deny({ req, res }: ActionArgs) {
    const sessionId = recordString(req.body, "sessionId");
    const actor = await this.actors.browser(req, sessionId, true);
    if (!actor.ok) return this.authError(res, actor.reason);

    try {
      const result = await this.oauth.deny(authorizationParams(req.body));
      if (!result.ok) return this.jsonOAuthError(res, result);
      return res.status(200).setHeader("Cache-Control", "no-store").json({
        redirect_to: result.redirectTo,
      });
    } catch {
      return res.status(500).json({
        error: "server_error",
        message: "Could not deny authorization",
      });
    }
  }

  private authorizationError(
    res: Response,
    failure: OAuthAuthorizationFailure,
  ) {
    const redirect = this.oauth.errorRedirect(failure);
    if (redirect) {
      return res
        .status(302)
        .setHeader("Cache-Control", "no-store")
        .setHeader("Location", redirect)
        .end();
    }
    return this.plainError(res, 400, failure.error, failure.message);
  }

  private plainError(
    res: Response,
    status: number,
    code: string,
    message: string,
  ) {
    return res
      .status(status)
      .setHeader("Cache-Control", "no-store")
      .setHeader("Content-Type", "text/html; charset=utf-8")
      .send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>OAuth error — Kazibee</title>
</head>
<body>
  <main>
    <h1>Authorization request failed</h1>
    <p><strong>${escapeHtml(code)}</strong></p>
    <p>${escapeHtml(message)}</p>
  </main>
</body>
</html>`);
  }

  private jsonOAuthError(
    res: Response,
    failure: OAuthAuthorizationFailure,
  ) {
    return res.status(400).setHeader("Cache-Control", "no-store").json({
      error: failure.error,
      message: failure.message,
    });
  }

  private authError(res: Response, reason: "unauthorized" | "csrf") {
    const status = reason === "csrf" ? 403 : 401;
    return res.status(status).setHeader("Cache-Control", "no-store").json({
      error: true,
      message: reason === "csrf" ? "CSRF validation failed" : "Not signed in",
    });
  }
}

function consentShell(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Authorize access — Kazibee</title>
  <link rel="stylesheet" href="/css/app.css">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/app.js"></script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}
