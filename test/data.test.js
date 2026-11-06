import test from 'node:test';
import assert from 'node:assert/strict';
import { AGENTS, INITIAL_STATE, normalizeState, agent, fmt, relativeTime } from '../src/data.js';
import commentHandler from '../api/comment.js';
import sessionHandler from '../api/session.js';
import stateHandler from '../api/state.js';
function response() {return {statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},end(payload){this.body=JSON.parse(payload);}};}
function request(method='GET',body,headers={}){return {method,headers:{host:'localhost:5173',...headers},body};}
test('6 AI persona identities have unique IDs',()=>{
  assert.equal(AGENTS.length,6);
  assert.equal(new Set(AGENTS.map(x=>x.id)).size,AGENTS.length);
  for(const a of AGENTS)assert.equal(agent(a.id).name,a.name);
});
test('new users see empty feed instead of fabricated AI conversations',()=>{
  assert.equal(INITIAL_STATE.posts.length,0);
  assert.equal(INITIAL_STATE.notifications.length,0);
  assert.equal(INITIAL_STATE.settings.autoDrama,true);
});
test('normalizeState preserves persisted posts',()=>{
  const data=normalizeState({posts:[{id:'real'}],notifications:[],profile:{name:'Tôi'},settings:{numberOfAgents:5}});
  assert.equal(data.posts.length,1);assert.equal(data.profile.name,'Tôi');assert.equal(data.settings.numberOfAgents,5);assert.equal(data.settings.autoDrama,true);
});
test('formatting utility works',()=>{assert.equal(fmt(0),'0');assert.equal(fmt(99),'99');assert.ok(fmt(2000).includes('2'));assert.ok(relativeTime(new Date().toISOString()).includes('Vừa'));});
test('AI endpoint status does not reveal key',async()=>{const res=response();await commentHandler(request(),res);assert.equal(res.statusCode,200);assert.equal(typeof res.body.configured,'boolean');assert.ok(!JSON.stringify(res.body).includes(process.env.GEMINI_API_KEY||'fake-secret-0000'));});
test('AI endpoint never produces a canned response with no key',async()=>{const old=process.env.GEMINI_API_KEY;delete process.env.GEMINI_API_KEY;try{const res=response();await commentHandler(request('POST',{agentId:'anti',postText:'test',history:[],mode:'seed',roastLevel:'medium'}),res);assert.equal(res.statusCode,503);assert.ok(!res.body.text);}finally{if(old)process.env.GEMINI_API_KEY=old;}});
test('AI endpoint rejects unsupported method',async()=>{const res=response();await commentHandler(request('DELETE'),res);assert.equal(res.statusCode,405);});
test('owner session status works',async()=>{const res=response();await sessionHandler(request(),res);assert.equal(res.statusCode,200);assert.equal(typeof res.body.authorized,'boolean');});
test('remote state refuses anonymous when password configured',async()=>{const old=process.env.TOXICBOOK_OWNER_PASSWORD;process.env.TOXICBOOK_OWNER_PASSWORD='my-test-password';try{const res=response();await stateHandler(request(),res);assert.equal(res.statusCode,401);}finally{if(old)process.env.TOXICBOOK_OWNER_PASSWORD=old;else delete process.env.TOXICBOOK_OWNER_PASSWORD;}});
test('request origin protection',async()=>{const res=response();await sessionHandler(request('POST',{password:'wrong'},{origin:'https://attacker.example'}),res);assert.equal(res.statusCode,403);});
test('Gemini generates real reply through server, includes image bytes and thread context',async()=>{
  const oldKey=process.env.GEMINI_API_KEY,oldModel=process.env.GEMINI_MODEL,oldFetch=globalThis.fetch;
  process.env.GEMINI_API_KEY='test-only-not-real';
  process.env.GEMINI_MODEL='gemini-3.8-flash';
  let body;
  globalThis.fetch=async(url,options)=>{
    assert.ok(url.includes('generativelanguage.googleapis.com'));
    assert.equal(options.headers['x-goog-api-key'],'test-only-not-real');
    body=JSON.parse(options.body);
    return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'Ủa cãi lại hả? Tui nhìn thấy cái ly rõ mà =))'}]}}]})};
  };
  try{
    const res=response();
    await commentHandler(request('POST',{agentId:'anti',postText:'Ảnh này đẹp không',postImage:'data:image/png;base64,aGVsbG8=',history:[{role:'user',name:'Chủ thớt',text:'Mày thấy cái ly không?'}],mode:'reply',roastLevel:'medium'}),res);
    assert.equal(res.statusCode,200);
    assert.equal(res.body.source,'gemini');
    assert.equal(body.generationConfig.thinkingConfig.thinkingLevel,'low');
    assert.equal(body.generationConfig.maxOutputTokens,1024);
    assert.equal(body.contents[0].parts[1].inlineData.mimeType,'image/png');
    assert.equal(body.contents[0].parts[1].inlineData.data,'aGVsbG8=');
    assert.ok(body.contents[0].parts[0].text.includes('Mày thấy cái ly không?'));
    assert.ok(body.contents[0].parts[0].text.includes('"hasImage":true'));
    assert.ok(body.systemInstruction.parts[0].text.includes('BẮT BUỘC phân tích nội dung ảnh thật'));
  }finally{globalThis.fetch=oldFetch;if(oldKey)process.env.GEMINI_API_KEY=oldKey;else delete process.env.GEMINI_API_KEY;if(oldModel)process.env.GEMINI_MODEL=oldModel;else delete process.env.GEMINI_MODEL;}
});
test('login cookie signs owner session without leaking owner password',async()=>{
  const old=process.env.TOXICBOOK_OWNER_PASSWORD;process.env.TOXICBOOK_OWNER_PASSWORD='a-long-unique-test-password';
  try{
    const res=response();await sessionHandler(request('POST',{password:'a-long-unique-test-password'}),res);
    assert.equal(res.statusCode,200);
    const cookie=res.headers['Set-Cookie'];
    assert.ok(cookie.includes('HttpOnly'));assert.ok(!cookie.includes('a-long-unique-test-password'));
    const again=response();await sessionHandler(request('GET',null,{cookie:cookie.split(';')[0]}),again);
    assert.equal(again.body.authorized,true);
  }finally{if(old)process.env.TOXICBOOK_OWNER_PASSWORD=old;else delete process.env.TOXICBOOK_OWNER_PASSWORD;}
});
