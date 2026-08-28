import { Component, Inject } from "@noego/ioc";
import type { Actor } from "../types/actor";
import ConnectAuthService from "../services/connect_auth_service";
import type {
  LoginInput,
  GoogleInput,
  LogoutInput,
  SessionInput,
  SignupInput,
} from "../services/connect_auth_request_parser";

@Component()
export default class ConnectAuthLogic {
  constructor(@Inject(ConnectAuthService) private readonly auth: ConnectAuthService) {}

  signup(_actor: Actor, input: SignupInput) {
    return this.auth.signup(input);
  }

  login(_actor: Actor, input: LoginInput) {
    return this.auth.login(input);
  }

  google(_actor: Actor, input: GoogleInput) {
    return this.auth.google(input);
  }

  session(_actor: Actor, input: SessionInput, sessionToken: string | null) {
    return this.auth.session(input, sessionToken);
  }

  logout(
    _actor: Actor,
    input: LogoutInput,
    sessionToken: string | null,
    csrfCookie: string | null,
    csrfHeader: string | null,
  ) {
    return this.auth.logout(input, sessionToken, csrfCookie, csrfHeader);
  }
}
