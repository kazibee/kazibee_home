import { Component, Inject } from "@noego/ioc";
import OAuthClientService, {
  type OAuthClientMetadata,
} from "../services/oauth_client_service";
import OAuthFlowService, {
  type OAuthTokenError,
  type OAuthTokenResult,
} from "../services/oauth_flow_service";
import OAuthOrigins from "../services/oauth_origins";
import {
  OAUTH_READ_SCOPE,
  OAUTH_WRITE_SCOPE,
} from "../services/oauth_scopes";

interface CompatRequest {
  body?: unknown;
}

interface CompatResponse {
  status(code: number): CompatResponse;
  json(value: unknown): CompatResponse;
  setHeader(name: string, value: string): CompatResponse;
}

type ActionArgs = { req: CompatRequest; res: CompatResponse };

function fields(value: unknown): Record<string, unknown> {
  if (value instanceof URLSearchParams) return Object.fromEntries(value.entries());
  if (typeof value === "string") {
    return Object.fromEntries(new URLSearchParams(value).entries());
  }
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function oauthError(
  res: CompatResponse,
  error: OAuthTokenError | "unsupported_grant_type",
) {
  return res.status(error === "invalid_client" ? 401 : 400).json({ error });
}

@Component()
export default class OAuthController {
  constructor(
    @Inject(OAuthFlowService) private readonly flow: OAuthFlowService,
    @Inject(OAuthClientService) private readonly clients: OAuthClientService,
    @Inject(OAuthOrigins) private readonly origins: OAuthOrigins,
  ) {}

  protectedResourceMetadata({ res }: ActionArgs) {
    return res.json({
      resource: this.origins.resource,
      authorization_servers: [this.origins.issuer],
      scopes_supported: [OAUTH_READ_SCOPE, OAUTH_WRITE_SCOPE],
      bearer_methods_supported: ["header"],
    });
  }

  authorizationServerMetadata({ res }: ActionArgs) {
    return res.json({
      issuer: this.origins.issuer,
      authorization_endpoint: this.origins.authorizationEndpoint,
      token_endpoint: `${this.origins.issuer}/oauth/token`,
      registration_endpoint: `${this.origins.issuer}/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: [OAUTH_READ_SCOPE, OAUTH_WRITE_SCOPE],
      // RFC 9207: authorization responses carry an iss parameter. Required by
      // Codex >= 0.150 because our authorization_endpoint (kazibee.com) is on
      // a different origin than the issuer (mcp.kazibee.com).
      authorization_response_iss_parameter_supported: true,
    });
  }

  async token({ req, res }: ActionArgs) {
    res.setHeader("Cache-Control", "no-store");
    const body = fields(req.body);
    const grantType = str(body.grant_type);
    let result: OAuthTokenResult;

    if (grantType === "authorization_code") {
      result = await this.flow.exchangeCode({
        code: str(body.code),
        codeVerifier: str(body.code_verifier),
        clientId: str(body.client_id),
        redirectUri: str(body.redirect_uri),
        resource: str(body.resource),
      });
    } else if (grantType === "refresh_token") {
      result = await this.flow.refresh({
        refreshToken: str(body.refresh_token),
        clientId: str(body.client_id),
        resource: str(body.resource),
      });
    } else if (!grantType) {
      return oauthError(res, "invalid_request");
    } else {
      return oauthError(res, "unsupported_grant_type");
    }

    if (!result.ok) return oauthError(res, result.error);
    return res.json(result);
  }

  async register({ req, res }: ActionArgs) {
    const metadata = fields(req.body) as OAuthClientMetadata;
    const result = await this.clients.registerClient(metadata);
    if (!result.ok) return res.status(400).json({ error: result.error });

    const registered = result.client.metadata
      && typeof result.client.metadata === "object"
      ? result.client.metadata
      : metadata;
    return res.status(201).json({
      ...registered,
      client_id: result.client.client_id,
    });
  }
}
