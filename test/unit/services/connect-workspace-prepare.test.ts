import { describe, expect, it } from "vitest";
import ConnectClientRelayRequestParser from "../../../src/server/services/connect_client_relay_request_parser";
const frame = {
 kind: "command.post", protocolVersion: "1.0", commandId: "cmd_prepare0001",
 correlationId: "cor_prepare0001", idempotencyKey: "idem_prepare_command_0001",
 websiteDeploymentId: "wdp_0123456789abcdef0123456789abcdef",
 executorId: "exe_prepare0001", deviceId: "dev_prepare0001", actorRole: "desktop_device",
 operation: "workspace.prepare", payload: { repositoryUrl: "git@github.com:kazibee/kazibee_home.git", branch: "main" },
};
describe("repository preparation relay input", () => {
 const parser = new ConnectClientRelayRequestParser();
 it("accepts preparation without a conversation identity", () => {
  expect(parser.command(frame)).toMatchObject({ok:true, value:{operation:"workspace.prepare",payload:frame.payload}});
 });
 it.each(["https://token@github.com/org/repo","https://user:secret@github.com/org/repo","https://github.com/org/repo?token=secret","/tmp/repo","ext::sh evil"])("rejects unsafe URL %s", repositoryUrl => {
  expect(parser.command({...frame,payload:{...frame.payload,repositoryUrl}})).toMatchObject({ok:false});
 });
 it("rejects extra credential, path and conversation fields", () => {
  for(const key of ["token","path","conversationId"]) expect(parser.command({...frame,payload:{...frame.payload,[key]:"forbidden"}})).toMatchObject({ok:false});
 });
});
