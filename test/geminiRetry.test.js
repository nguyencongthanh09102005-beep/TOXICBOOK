import test from 'node:test';
import assert from 'node:assert/strict';
import { requestGemini } from '../api/_geminiRetry.js';

test('slow primary is aborted per attempt; fallback still runs and completes', async () => {
  const called=[];
  const fetchMock=async (url, options) => {
    called.push(url);
    if(called.length===1) return new Promise((_resolve,reject)=>{
      options.signal.addEventListener('abort',()=>{
        const error=new Error('aborted');
        error.name='AbortError';
        reject(error);
      },{once:true});
    });
    return {ok:true,status:200,json:async()=>({candidates:[{content:{parts:[{text:'Gemini Lite xem ảnh rồi chê đây'}]}}]})};
  };
  const result=await requestGemini({
    primaryModel:'gemini-3.8-flash',fallbackModel:'gemini-3.5-flash-lite',
    apiKey:'fake-key', makePayload:()=>({contents:[{parts:[{text:'ảnh'}]}]}),
    requestFetch:fetchMock, limits:[12,80,30], sleep:async()=>{}, log:()=>{}
  });
  assert.equal(result.ok,true);
  assert.equal(result.model,'gemini-3.5-flash-lite');
  assert.equal(called.length,2);
  assert.equal(result.attempts[0].timeout,true);
  assert.equal(result.attempts[1].status,200);
});

test('primary 503 switches to fallback immediately without reusing same deadline',async()=>{
  const called=[];
  const result=await requestGemini({
    primaryModel:'gemini-3.8-flash',fallbackModel:'gemini-3.5-flash-lite',
    apiKey:'fake-key', makePayload:()=>({contents:[]}),
    requestFetch:async url=>{
      called.push(url);
      if(called.length===1)return {ok:false,status:503,text:async()=>'{"message":"overloaded"}'};
      return {ok:true,status:200,json:async()=>({candidates:[]})};
    },
    sleep:async()=>{},log:()=>{}
  });
  assert.equal(result.ok,true);
  assert.equal(called.length,2);
  assert.ok(called[1].includes('gemini-3.5-flash-lite'));
});

test('Gemini 429 never triggers fallback or retries',async()=>{
  let calls=0;
  const result=await requestGemini({
    primaryModel:'gemini-3.8-flash',fallbackModel:'gemini-3.5-flash-lite',apiKey:'fake-key',
    makePayload:()=>({contents:[]}),
    requestFetch:async()=>{calls++;return {ok:false,status:429,text:async()=>'{"message":"quota"}'};},
    sleep:async()=>{},log:()=>{}
  });
  assert.equal(result.ok,false);
  assert.equal(result.failure.status,429);
  assert.equal(calls,1);
});
