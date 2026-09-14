import { Component, Inject, LoadAs } from "@noego/ioc";
import Env from "./env";
import ConnectGoogleTokenInfoClient from "./connect_google_token_info_client";

export interface GoogleIdentity {
  subject: string;
  email: string;
}

@Component({ scope: LoadAs.Singleton })
export default class ConnectGoogleTokenVerifier {
  constructor(
    @Inject(Env) private readonly env: Env,
    @Inject(ConnectGoogleTokenInfoClient) private readonly tokenInfo: ConnectGoogleTokenInfoClient,
  ) {}

  async verify(credential: string): Promise<GoogleIdentity | null> {
    const clientId = this.env.string("GOOGLE_CLIENT_ID");
    if (!clientId) throw new Error("Google authentication is not configured");
    const response = await this.tokenInfo.request(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
    );
    if (!response.ok) {
      await response.body?.cancel();
      return null;
    }
    const claims = await response.json() as Record<string, unknown>;
    const email = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
    const subject = typeof claims.sub === "string" ? claims.sub : "";
    const verified = claims.email_verified === true || claims.email_verified === "true";
    return claims.aud === clientId && subject && verified ? { subject, email } : null;
  }
}
