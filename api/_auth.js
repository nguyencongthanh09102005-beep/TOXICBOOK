import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

const cookieName = 'tb_owner';
const required = () => Boolean(process.env.TOXICBOOK_OWNER_PASSWORD) || Boolean(process.env.VERCEL);
const secret = () => process.env.TOXICBOOK_SESSION_SECRET || createHash('sha256').update('toxicbook-session-v1:' + (process.env.TOXICBOOK_OWNER_PASSWORD || '')).digest('hex');
const sign = value => createHmac('sha256', secret()).update(value).digest('base64url');
export const secureEqual = (a, b) => {
  const one = Buffer.from(String(a)); const two = Buffer.from(String(b));
  return one.length === two.length && timingSafeEqual(one, two);
};
export function hasOwnerSession(req) {
  if (!required()) return true; // local development without password only
  if (!process.env.TOXICBOOK_OWNER_PASSWORD) return false; // production fail closed
  const cookie = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  if (!cookie) return false;
  const [payload, signature] = cookie.split('.');
  if (!payload || !signature || !secureEqual(sign(payload), signature)) return false;
  try { const token = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); return token.exp > Date.now() && token.v === 1; } catch { return false; }
}
export function sessionCookie() {
  const payload = Buffer.from(JSON.stringify({ v: 1, exp: Date.now() + 7 * 86400000 })).toString('base64url');
  return `${cookieName}=${payload}.${sign(payload)}; HttpOnly; Path=/; Max-Age=604800; SameSite=Strict${process.env.VERCEL ? '; Secure' : ''}`;
}
export function clearSessionCookie() { return `${cookieName}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict${process.env.VERCEL ? '; Secure' : ''}`; }
export function ownerStatus(req) { return { authorized: hasOwnerSession(req), authRequired: required(), passwordConfigured: Boolean(process.env.TOXICBOOK_OWNER_PASSWORD) }; }
export function sendJSON(res, status, payload) { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control','no-store'); res.setHeader('X-Content-Type-Options','nosniff'); res.end(JSON.stringify(payload)); }
export async function readJSON(req, maxBytes = 1_900_000) {
  if (req.body && typeof req.body === 'object') { if (Buffer.byteLength(JSON.stringify(req.body)) > maxBytes) throw Object.assign(new Error('Payload too large'), {status:413}); return req.body; }
  if (typeof req.body === 'string') { if (Buffer.byteLength(req.body) > maxBytes) throw Object.assign(new Error('Payload too large'), {status:413}); return JSON.parse(req.body); }
  let input = '', size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > maxBytes) throw Object.assign(new Error('Payload too large'), {status:413}); input += chunk.toString('utf8'); }
  return JSON.parse(input || '{}');
}
export function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // server-side and test clients
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}
