import { Component, LoadAs } from "@noego/ioc";

/** Outbound Google HTTP boundary; claim validation belongs to the verifier. */
@Component({ scope: LoadAs.Singleton })
export default class ConnectGoogleTokenInfoClient {
  request(url: string): Promise<Response> {
    return fetch(url);
  }
}
