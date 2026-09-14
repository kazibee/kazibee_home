import { Component, LoadAs } from "@noego/ioc";

/**
 * Outbound HTTP boundary for Client ID Metadata Document (CIMD) resolution.
 * Fetches the https client_id URL; validation/caching belongs to
 * OAuthClientService.
 */
@Component({ scope: LoadAs.Singleton })
export default class OAuthClientMetadataClient {
  request(url: string): Promise<Response> {
    return fetch(url, { headers: { accept: "application/json" } });
  }
}
