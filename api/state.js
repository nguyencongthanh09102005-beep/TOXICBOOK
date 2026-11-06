/** Owner-only durable state. Local: .toxicbook/state.json; production: Supabase Postgres. */
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { hasOwnerSession, sendJSON, readJSON, sameOrigin } from './_auth.js';
const useSupabase = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const storePath = () => join(process.cwd(), '.toxicbook', 'state.json');
function assertConfigured() { if (process.env.VERCEL && !useSupabase()) throw Object.assign(new Error('Chưa cấu hình Supabase để lưu dữ liệu trên web.'),{status:503}); }
async function supabase(method, data) {
  const endpoint = new URL('/rest/v1/toxicbook_state', process.env.SUPABASE_URL.replace(/\/$/, '') + '/');
  endpoint.search = method === 'GET' ? '?id=eq.owner&select=payload' : '?on_conflict=id';
  if (endpoint.protocol !== 'https:') throw new Error('Supabase URL must use HTTPS');
  const res = await fetch(endpoint, {method:method === 'GET' ? 'GET' : 'POST',headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:method==='GET'?undefined:JSON.stringify([{id:'owner',payload:data}])});
  if (!res.ok) { console.error('Supabase state request failed:',res.status); throw Object.assign(new Error('Không truy cập được bảng toxicbook_state. Kiểm tra Supabase và SQL khởi tạo.'),{status:502}); }
  return method === 'GET' ? (await res.json())[0]?.payload ?? null : null;
}
async function getLocal() { try {return JSON.parse(await readFile(storePath(),'utf8'));} catch(e) {if(e.code==='ENOENT')return null;throw e;} }
async function setLocal(data) { const p=storePath(); await mkdir(join(process.cwd(),'.toxicbook'),{recursive:true}); const temp=p+'.tmp'; await writeFile(temp,JSON.stringify(data),'utf8'); await rename(temp,p); }
function validState(body) {
  return body && typeof body === 'object' && !Array.isArray(body) && Array.isArray(body.posts) && body.posts.length <= 200 && Array.isArray(body.notifications) && body.notifications.length <= 300 && body.profile && typeof body.profile === 'object' && body.settings && typeof body.settings === 'object' && body.posts.every(p => typeof p.id==='string' && p.id.length < 100 && typeof p.text==='string' && p.text.length<=3000 && (!p.image || (typeof p.image==='string' && p.image.length<1_300_000)) && Array.isArray(p.comments) && p.comments.length < 400 && p.comments.every(c=>typeof c.text==='string' && c.text.length<=900));
}
export default async function handler(req,res) {
  if (!hasOwnerSession(req)) return sendJSON(res,401,{error:'Hãy đăng nhập bằng mật khẩu chủ web.'});
  if (!['GET','PUT'].includes(req.method))return sendJSON(res,405,{error:'Method not allowed'});
  if(req.method==='PUT'&&!sameOrigin(req))return sendJSON(res,403,{error:'Nguồn yêu cầu không hợp lệ.'});
  try {
    assertConfigured();
    if (req.method==='GET') { const result=useSupabase()?await supabase('GET'):await getLocal(); return sendJSON(res,200,{state:result,storage:useSupabase()?'cloud':'local'}); }
    const body=await readJSON(req,3_900_000);
    if(!validState(body))return sendJSON(res,400,{error:'Dữ liệu lưu không hợp lệ hoặc vượt hạn mức. Hãy giảm kích thước ảnh/bình luận.'});
    if(useSupabase())await supabase('PUT',body);else await setLocal(body);
    return sendJSON(res,200,{saved:true});
  }catch(error){return sendJSON(res,error.status||500,{error:error.message||'Không thể lưu dữ liệu.'});}
}
