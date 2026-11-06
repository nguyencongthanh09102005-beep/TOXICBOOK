import { ownerStatus, secureEqual, sessionCookie, clearSessionCookie, sendJSON, readJSON, sameOrigin } from './_auth.js';
export default async function handler(req, res) {
  if (req.method === 'GET') return sendJSON(res, 200, ownerStatus(req));
  if (!sameOrigin(req)) return sendJSON(res,403,{error:'Nguồn yêu cầu không hợp lệ.'});
  if (req.method === 'DELETE') { res.setHeader('Set-Cookie', clearSessionCookie()); return sendJSON(res,200,{authorized:false}); }
  if (req.method !== 'POST') return sendJSON(res,405,{error:'Method not allowed'});
  if (!process.env.TOXICBOOK_OWNER_PASSWORD) return sendJSON(res,503,{error:'Chưa cấu hình TOXICBOOK_OWNER_PASSWORD cho chủ web.'});
  try {
    const { password } = await readJSON(req, 1000);
    if (!secureEqual(password || '',process.env.TOXICBOOK_OWNER_PASSWORD)) return sendJSON(res,401,{error:'Sai mật khẩu chủ web.'});
    res.setHeader('Set-Cookie',sessionCookie()); return sendJSON(res,200,{authorized:true,authRequired:true,passwordConfigured:true});
  } catch (error) { return sendJSON(res,error.status || 400,{error:'Yêu cầu không hợp lệ.'}); }
}
