import test from 'node:test';
import assert from 'node:assert/strict';
import { AGENTS, INITIAL_STATE, fallbackComment, agent, fmt, relativeTime } from '../src/data.js';
import handler from '../api/comment.js';

test('six fictional AI personas have unique ids', () => {
  assert.equal(AGENTS.length, 6);
  assert.equal(new Set(AGENTS.map(x => x.id)).size, AGENTS.length);
  for (const a of AGENTS) assert.equal(agent(a.id).name, a.name);
});

test('demo comments are nonempty and context reacts differently per mode', () => {
  for (const a of AGENTS) {
    const seed = fallbackComment({ agentId: a.id, postText: 'Hôm nay chụp ảnh selfie', history: [], mode: 'seed' });
    const reply = fallbackComment({ agentId: a.id, postText: 'Hôm nay chụp ảnh selfie', history: [{ role: 'user', text: 'Cãi gì mà cãi?' }], mode: 'reply', roastLevel: 'spicy' });
    assert.ok(seed.length > 5);
    assert.ok(reply.length > 5);
    assert.notEqual(seed, reply);
  }
});

test('seeded posts have valid parent comment relationships', () => {
  for (const post of INITIAL_STATE.posts) {
    const ids = new Set(post.comments.map(c => c.id));
    for (const comment of post.comments) {
      assert.ok(!comment.parentId || ids.has(comment.parentId));
      assert.ok(comment.aiId === null || AGENTS.some(a => a.id === comment.aiId));
    }
  }
});

test('formatters return predictable Vietnamese-friendly output', () => {
  assert.equal(fmt(0), '0');
  assert.equal(fmt(99), '99');
  assert.ok(fmt(2000).includes('2'));
  assert.ok(relativeTime(new Date().toISOString()).includes('Vừa'));
});

function response() {
  return { statusCode: 0, headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(payload) { this.body = JSON.parse(payload); } };
}
test('AI endpoint is server-only and shows configuration without exposing key', async () => {
  const req = { method: 'GET', headers: {} };
  const res = response();
  await handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.ok(!JSON.stringify(res.body).includes('secret'));
  assert.equal(typeof res.body.configured, 'boolean');
});
test('AI endpoint rejects unsupported methods', async () => {
  const req = { method: 'DELETE', headers: {} };
  const res = response();
  await handler(req, res);
  assert.equal(res.statusCode, 405);
});
