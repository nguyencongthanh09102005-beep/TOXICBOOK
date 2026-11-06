import test from 'node:test';
import assert from 'node:assert/strict';
import { runInitialComments } from '../src/autoComments.js';

const agents = [
  {id:'anti',name:'Anti Số 01'},
  {id:'khia',name:'Cà Khịa Pro'},
  {id:'hong',name:'Drama Hóng Hớt'},
];

test('automatic comments are generated on publish for image posts with no button', async () => {
  const requests = [];
  const comments = [];
  const progress = [];
  const result = await runInitialComments({
    post:{id:'photo-1',text:'',image:'data:image/jpeg;base64,YWJj'},
    agents,
    numberOfAgents:3,
    random:()=>0.999,
    generate:async request => {
      requests.push(request);
      return {source:'gemini',text:'Góc chụp cái cốc này kỳ ghê 😭'};
    },
    addComment:(postId,comment)=>comments.push({postId,...comment}),
    onProgress:state=>progress.push(state),
  });
  assert.equal(result.posted,3);
  assert.equal(result.failed,0);
  assert.equal(progress.filter(x=>x.phase==='generating').length,3);
  assert.equal(progress.filter(x=>x.phase==='comment').length,3);
  assert.equal(progress.at(-1).phase,'finished');
  assert.equal(requests.length,3);
  assert.ok(requests.every(x=>x.post.image.startsWith('data:image/jpeg;') && x.mode==='seed'));
  assert.equal(requests[1].history.length,1);
  assert.equal(requests[2].history.length,2);
  assert.ok(comments.every(c=>c.source==='gemini' && c.postId==='photo-1'));
});

test('one AI failure does not block the remaining commenters', async () => {
  let calls=0; const comments=[];
  const outcome=await runInitialComments({
    post:{id:'post-1',text:'Ảnh hôm nay',image:''},agents,numberOfAgents:3,random:()=>0.999,
    generate:async()=>{calls++;if(calls===1)throw new Error('Timeout');return {source:'gemini',text:'Đăng ảnh lên để người ta soi hả =)))'};},
    addComment:(id,c)=>comments.push(c),
    onProgress:state=>{if(state.phase==='failed')assert.equal(state.error,'Timeout');},
  });
  assert.equal(calls,3);
  assert.equal(outcome.posted,2);
  assert.equal(outcome.failed,1);
  assert.equal(outcome.firstError,'Timeout');
  assert.equal(comments.length,2);
});

test('auto commenting stops without posting when the owner deletes the post', async () => {
  let exists=true,comments=0;
  const result=await runInitialComments({
    post:{id:'gone'},agents,numberOfAgents:3,
    generate:async()=>{exists=false;return {source:'gemini',text:'hello'};},
    addComment:()=>{comments++;},
    postStillExists:()=>exists,
  });
  assert.equal(result.posted,0);
  assert.equal(comments,0);
});

test('do not spam other AI personas after provider outage or quota error', async()=>{
  for(const code of ['GEMINI_OVERLOADED','GEMINI_QUOTA']){
    let calls=0;
    const result=await runInitialComments({
      post:{id:'post-outage',image:''},agents,numberOfAgents:3,
      generate:async()=>{calls++;const error=new Error('Google service unavailable');error.code=code;throw error;},
      addComment:()=>assert.fail('No fake comment should be created'),
    });
    assert.equal(calls,1);
    assert.equal(result.posted,0);
    assert.equal(result.failed,1);
  }
});
