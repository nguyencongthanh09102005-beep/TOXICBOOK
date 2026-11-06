import test from 'node:test';
import assert from 'node:assert/strict';
import batchHandler, {parseBatchComments} from '../api/batch-comments.js';

function res(){
  return {statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},end(raw){this.body=JSON.parse(raw);}};
}
function req(body){
  return {method:'POST',headers:{host:'localhost:5173'},body};
}

test('batch parser rejects duplicates, unknown AI identities and empty comments',()=>{
  const raw=JSON.stringify({comments:[
    {agentId:'anti',text:'Soi góc ảnh này đúng là ngược đời.'},
    {agentId:'anti',text:'Soi góc ảnh này đúng là ngược đời.'},
    {agentId:'invalid',text:'Soi cái ảnh này đúng là quá lạ'},
    {agentId:'meo',text:'Cái ánh sáng này ai cứu nổi =))'},
  ]});
  assert.deepEqual(parseBatchComments(raw,[],10),[
    {agentId:'anti',text:'Soi góc ảnh này đúng là ngược đời.'},
    {agentId:'meo',text:'Cái ánh sáng này ai cứu nổi =))'},
  ]);
  assert.equal(parseBatchComments('not-json',[],10).length,0);
});

test('one genuine Gemini request can return ten comments grounded in one image',async()=>{
  const oldKey=process.env.GEMINI_API_KEY;
  const oldBatch=process.env.GEMINI_BATCH_MODEL;
  const oldFetch=globalThis.fetch;
  process.env.GEMINI_API_KEY='test-gemini-batch-key';
  process.env.GEMINI_BATCH_MODEL='gemini-3.5-flash-lite';
  const items=Array.from({length:10},(_,i)=>({
    agentId:['anti','khia','hong','meo','thamtu','hangxom'][i%6],
    text:`Bình luận thứ ${i+1}: ánh sáng với góc máy này nhìn cứ sai sai =)))`,
  }));
  const calls=[];
  globalThis.fetch=async(url,options)=>{
    calls.push({url,payload:JSON.parse(options.body)});
    return {ok:true,status:200,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({comments:items})}]}}]})};
  };
  try {
    const output=res();
    await batchHandler(req({
      postText:'Đẹp không nè',postImage:'data:image/jpeg;base64,aGVsbG8=',
      history:[],roastLevel:'medium',count:10
    }),output);
    assert.equal(output.statusCode,200);
    assert.equal(output.body.source,'gemini');
    assert.equal(output.body.comments.length,10);
    assert.equal(calls.length,1);
    assert.ok(calls[0].url.includes('gemini-3.5-flash-lite'));
    assert.equal(calls[0].payload.contents[0].parts[1].inlineData.mimeType,'image/jpeg');
    assert.equal(calls[0].payload.contents[0].parts[1].inlineData.data,'aGVsbG8=');
    assert.equal(calls[0].payload.generationConfig.responseMimeType,'application/json');
    assert.equal(calls[0].payload.generationConfig.responseSchema.properties.comments.type,'ARRAY');
  } finally {
    globalThis.fetch=oldFetch;
    if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;
    if(oldBatch===undefined)delete process.env.GEMINI_BATCH_MODEL;else process.env.GEMINI_BATCH_MODEL=oldBatch;
  }
});

test('batch endpoint refuses oversized comment requests',async()=>{
  const oldKey=process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY='test-gemini-batch-key';
  try{
    const output=res();
    await batchHandler(req({postText:'test',history:[],roastLevel:'medium',count:500}),output);
    assert.equal(output.statusCode,400);
    assert.equal(output.body.code,'INVALID_REQUEST');
  } finally {
    if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;
  }
});
