import { Component, LoadAs } from "@noego/ioc";

/**
 * Per-request holder for the raw Fetch Request.
 *
 * The dinner pipeline passes its full context (including `request`) to the
 * app's contextBuilder; this scoped service captures it so controllers that
 * need the untouched Request — WebSocket upgrade forwarding to a Durable
 * Object, where the upgrade headers and the socket itself must survive intact
 * — can inject it. Null on code paths where no raw request exists.
 */
@Component({ scope: LoadAs.Scoped })
export default class RawRequest {
  private request: Request | null = null;

  set(request: Request | null | undefined): void {
    this.request = request ?? null;
  }

  get(): Request | null {
    return this.request;
  }
}
