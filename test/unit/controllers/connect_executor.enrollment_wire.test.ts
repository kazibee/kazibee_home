import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import Controller from '../../../src/server/controller/connect_executor.controller';
import Parser from '../../../src/server/services/connect_executor_request_parser';
import Policy from '../../../src/server/services/connect_executor_policy';
import Env from '../../../src/server/services/env';
const schema = JSON.parse(readFileSync(path.resolve(__dirname, '../../../packages/kazi-connect-protocol/schemas/kazi-connect-v1.schema.json'), 'utf8'));
const ajv = new Ajv2020({strict:true, allErrors:true}); ajv.addSchema(schema);
const parser = new Parser(new Policy(new Env()));
const claimId='clm_abcdefgh', correlationId='cor_abcdefgh';
const challenge={claimId,executorId:'exe_abcdefgh',deviceId:'dev_abcdefgh',claimUrl:'https://dev.kazibee.com/connect/claim/'+claimId,shortCode:'ABCD-EFGH',displayName:'Build Box',platform:'macos',architecture:'arm64',executorVersion:'1.2.3',keyFingerprint:'a'.repeat(64),expiresAt:'2999-01-01T00:00:00.000Z'};
function response() { const headers=new Headers(); const r={headers,statusCode:200,payload:null as unknown,setHeader(k:string,v:string){headers.set(k,v);return r},status(n:number){r.statusCode=n;return r},json(p:unknown){r.payload=p;return r}};return r; }
function validate(def:string,r:ReturnType<typeof response>) {const v=ajv.getSchema(schema.$id+'#/$defs/'+def)!;expect(v(r.payload),JSON.stringify(v.errors)).toBe(true);expect(r.headers.get('x-kazi-protocol-version')).toBe('1.0');}
describe('enrollment wire contract',()=>{
 for(const outcome of ['created','retry']) it('challenge '+outcome,async()=>{
  const c=new Controller({createClaim:async()=>({outcome,challenge})} as any,parser,{} as any);const res=response();
  await c.createClaim({req:{headers:{'x-kazi-bootstrap-token':'B'.repeat(43)},body:{kind:'executor.claim.create.request',protocolVersion:'1.0',claimId,executorId:challenge.executorId,deviceId:challenge.deviceId,actorRole:'executor_device',displayName:challenge.displayName,platform:challenge.platform,architecture:challenge.architecture,executorVersion:challenge.executorVersion,keyFingerprint:challenge.keyFingerprint,idempotencyKey:'idem_0123456789abcdef',correlationId}} as any,res:res as any});
  expect(res.statusCode).toBe(outcome==='created'?201:200);validate('claimChallenge',res);
 });
 for(const status of ['pending','accepted']) it('status '+status,async()=>{
  const c=new Controller({claimStatus:async()=>({outcome:'ok',status,websiteDeploymentId:'wdp_'+'a'.repeat(32),executorId:challenge.executorId,deviceId:challenge.deviceId,credentialGeneration:1,websiteAccountId:'usr_owner001'})} as any,parser,{} as any);const res=response();
  await c.claimStatus({req:{params:{claimId},query:{correlationId},headers:{'x-kazi-bootstrap-token':'B'.repeat(43)}} as any,res:res as any});validate('claimStatusResponse',res);
 });
});
