import { Component, LoadAs } from "@noego/ioc";

export interface GoogleIdentity {
  subject: string;
  email: string;
}

@Component({ scope: LoadAs.Singleton })
export default class ConnectGoogleTokenVerifier {
  async verify(credential: string): Promise<GoogleIdentity | null> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new Error("Google authentication is not configured");
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
    );
    if (!response.ok) return null;
    const claims = await response.json() as Record<string, unknown>;
    const email = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
    const subject = typeof claims.sub === "string" ? claims.sub : "";
    const verified = claims.email_verified === true || claims.email_verified === "true";
    return claims.aud === clientId && subject && verified ? { subject, email } : null;
  }
}
