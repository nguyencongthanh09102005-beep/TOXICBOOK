import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Home, Bell, UserRound, PenSquare, Flame, MessageCircle, Heart, Share2, MoreHorizontal,
  Search, Send, ImagePlus, X, Plus, Settings2, Sparkles, ChevronRight, ArrowLeft,
  Trash2, Pencil, Copy, Check, Eye, Clock, Crown, SlidersHorizontal, RefreshCw,
  Zap, ShieldCheck, AlertCircle, Volume2, VolumeX, CheckCheck, Download,
  Camera, Menu, CircleHelp, RotateCcw, Bot, MessageSquareText, Smile, TrendingUp
} from 'lucide-react';
import { AGENTS, agent, fmt, relativeTime, uid, INITIAL_STATE, normalizeState } from './data.js';
import { runInitialComments } from './autoComments.js';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const dateDesc = (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
const topPost = post => post.comments.filter(c => c.aiId).length;

function Mascot({ size = 72, className = '' }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Mascot ToxicBook">
    <defs><linearGradient id="mascotGradient" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ff6587"/><stop offset="1" stopColor="#f92d61"/></linearGradient></defs>
    <path d="M19 29 Q11 21 13 10 Q26 12 32 22 M68 22 Q74 12 87 10 Q89 21 81 29" fill="url(#mascotGradient)" stroke="#cb184a" strokeWidth="3" strokeLinejoin="round"/>
    <rect x="9" y="22" width="82" height="67" rx="24" fill="url(#mascotGradient)"/>
    <rect x="17" y="32" width="66" height="47" rx="17" fill="#221a2b"/>
    <path d="M27 54 L44 59 L43 66 L29 63 Z M73 54 L56 59 L57 66 L71 63 Z" fill="#ff5279"/>
    <rect x="3" y="42" width="11" height="27" rx="5" fill="#ffbad0"/><rect x="86" y="42" width="11" height="27" rx="5" fill="#ffbad0"/>
    <path d="M46 72 Q50 75 54 72" fill="none" stroke="#f85f85" strokeWidth="2" strokeLinecap="round"/>
  </svg>;
}
function AgentAvatar({ id, size = 'md', showRing = false }) {
  const a = agent(id);
  return <div className={`agent-avatar avatar-${a.color} avatar-${size} ${showRing ? 'avatar-ring' : ''}`} title={a.name}>
    {a.id === 'meo' ? <span className="avatar-emoji">🐈</span> : <><Mascot size={size === 'lg' ? 58 : size === 'sm' ? 28 : 39} />{a.id !== 'anti' && <span className="agent-accessory">{a.emoji}</span>}</>}
  </div>;
}
function MeAvatar({ profile, size = 'md' }) {
  return <div className={`me-avatar avatar-${size}`}>{profile.avatar ? <img src={profile.avatar} alt="Ảnh đại diện của bạn"/> : <span>{(profile.name || 'B').slice(0, 1).toUpperCase()}</span>}</div>;
}
function MiniBadge({ children, tone = 'pink', icon: Icon }) { return <span className={`mini-badge tone-${tone}`}>{Icon && <Icon size={12}/>} {children}</span>; }
function Empty({ icon: Icon = MessageCircle, title, text }) { return <div className="empty-state"><div className="empty-icon"><Icon size={24}/></div><h3>{title}</h3><p>{text}</p></div>; }
async function compressImage(file) {
  if (!file.type.startsWith('image/')) throw new Error('Chỉ hỗ trợ ảnh.');
  if (file.size > 12 * 1024 * 1024) throw new Error('Ảnh lớn quá (tối đa 12MB).');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });
    const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
    let canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    // Keep image payload comfortably below the API request cap so Gemini
    // receives actual image bytes, not a caption-only fallback.
    let quality = 0.76;
    let encoded = canvas.toDataURL('image/jpeg', quality);
    for (let attempt = 0; encoded.length > 1_180_000 && attempt < 8; attempt++) {
      if (quality > 0.45) {
        quality = Math.max(0.45, quality - 0.10);
      } else {
        const resized = document.createElement('canvas');
        resized.width = Math.max(1, Math.round(canvas.width * 0.8));
        resized.height = Math.max(1, Math.round(canvas.height * 0.8));
        resized.getContext('2d').drawImage(canvas, 0, 0, resized.width, resized.height);
        canvas = resized;
      }
      encoded = canvas.toDataURL('image/jpeg', quality);
    }
    if (encoded.length > 1_400_000) throw new Error('Không thể nén ảnh để AI phân tích. Thử ảnh nhỏ hơn.');
    return encoded;
  } finally { URL.revokeObjectURL(url); }
}
function IconButton({ icon: Icon, title, onClick, className = '', disabled = false }) { return <button className={`icon-btn ${className}`} onClick={onClick} title={title} aria-label={title} disabled={disabled}><Icon size={19}/></button>; }
function Sidebar({ page, navigate, close, unread }) {
  const links = [
    { id: 'home', title: 'Trang chủ', Icon: Home },
    { id: 'posts', title: 'Bài đăng', Icon: PenSquare },
    { id: 'notifications', title: 'Thông báo', Icon: Bell, count: unread },
    { id: 'profile', title: 'Hồ sơ', Icon: UserRound },
    { id: 'settings', title: 'Cài đặt', Icon: Settings2 },
  ];
  return <aside className="sidebar">
    <nav className="nav-list" aria-label="Điều hướng chính">
      {links.map(({ id, title, Icon, count }) => <button key={id} className={`nav-link ${page === id || (page === 'post' && id === 'home') ? 'selected' : ''}`} onClick={() => { navigate(id); close?.(); }}><Icon size={21} strokeWidth={2.1}/><span>{title}</span>{!!count && <b className="nav-count">{count > 99 ? '99+' : count}</b>}</button>)}
    </nav>
    <div className="sidebar-fun"><div className="mascot-glow"><Mascot size={122}/><span className="energy-mark">⚡</span></div><p>Một mình đăng bài.<br/><strong>Cả cõi mạng vào<br/>kiếm chuyện!</strong> 🔥</p></div>
    <div className="sidebar-note"><ShieldCheck size={16}/><span>100% tài khoản bình luận là AI hư cấu.</span></div>
  </aside>;
}
function RightBar({ posts, onOpenPost, onCreate, currentPost, live, onAgents }) {
  const hotPosts = [...posts].sort((a, b) => topPost(b) - topPost(a));
  const tally = Object.fromEntries(AGENTS.map(a => [a.id, posts.reduce((n, p) => n + p.comments.filter(c => c.aiId === a.id).length, 0)]));
  const ranked = [...AGENTS].sort((a, b) => tally[b.id] - tally[a.id]).slice(0, 4);
  return <aside className="rightbar">
    <div className="welcome-card"><div className="welcome-header"><div><span className="eyebrow light">WELCOME TO</span><h2>Toxic<span>Book!</span></h2><p>Chỗ này hơi nhiều chuyện.</p></div><Mascot size={92}/></div><div className="welcome-list"><span><Check size={15}/> Chỉ bạn được đăng bài</span><span><Check size={15}/> Cư dân mạng đều là AI</span><span><Check size={15}/> Cãi tay đôi không hồi kết</span></div></div>
    {currentPost && <div className="side-card memory-card"><h3><Sparkles size={18}/> AI nhớ cuộc tranh luận</h3><p>Nhân vật phản hồi dựa trên caption và bình luận trước đó của bài viết.</p><div className="memory-foot"><MessageCircle size={15}/> {currentPost.comments.length} lượt trong cuộc trò chuyện</div></div>}
    <div className="side-card"><div className="side-head"><h3><Flame className="hot-icon" size={20}/> Drama đang nổi</h3><button className="text-link" onClick={onCreate}>Đăng bài <ChevronRight size={15}/></button></div>{hotPosts.length ? hotPosts.slice(0, 3).map((post, i) => <button className="hot-post" key={post.id} onClick={() => onOpenPost(post.id)}><span className="hot-rank">{i + 1}</span>{post.image && <img src={post.image} alt=""/>}<span className="hot-post-info"><strong>{post.text.replace(/\n/g, ' ').slice(0, 58)}</strong><small><MessageCircle size={13}/> {post.comments.length} bình luận</small></span></button>) : <p className="muted">Chưa có bài đăng nào.</p>}</div>
    <div className="side-card"><div className="side-head"><h3><Zap size={20}/> Hội hay kiếm chuyện</h3><button className="text-link" onClick={onAgents}>Xem hết <ChevronRight size={15}/></button></div>{ranked.slice(0, 3).map((a, i) => <div className="side-agent" key={a.id}><span className="rank-n">0{i + 1}</span><AgentAvatar id={a.id} size="sm"/><div><strong>{a.name}</strong><small>{a.label}</small></div><MiniBadge tone="pink">AI</MiniBadge></div>)}</div>
    <div className="right-foot"><span className="status-dot"/> {live ? 'Gemini đã cấu hình' : 'Chưa kết nối Gemini'}<p>Không có tài khoản người thật nào khác.</p></div>
  </aside>;
}
function CreateModal({ initial, onClose, onSave, saving, notify }) {
  const [text, setText] = useState(initial?.text || '');
  const [image, setImage] = useState(initial?.image || '');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const onFile = async e => { const f = e.target.files?.[0]; if (!f) return; setUploading(true); try { setImage(await compressImage(f)); } catch (err) { notify(err.message); } finally { setUploading(false); e.target.value = ''; } };
  return <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className="modal post-modal" role="dialog" aria-modal="true" aria-label={initial ? 'Chỉnh sửa bài đăng' : 'Tạo bài đăng'}>
    <div className="modal-head"><h2>{initial ? 'Chỉnh sửa bài đăng' : 'Tạo bài đăng'}</h2><IconButton icon={X} title="Đóng" onClick={onClose}/></div>
    <div className="modal-body"><p className="modal-who"><span className="little-person">B</span><span><strong>Bạn · Chủ thớt</strong><small><Eye size={13}/> Chỉ hiển thị với AI hư cấu</small></span></p>
    <textarea autoFocus rows={5} className="post-editor" maxLength={3000} value={text} onChange={e => setText(e.target.value)} placeholder="Có chuyện gì muốn lên mạng để người ta kiếm chuyện? 😏"/>
    {image && <div className="upload-preview"><img src={image} alt="Ảnh đính kèm"/><IconButton icon={X} title="Xóa ảnh" onClick={() => setImage('')} className="remove-image"/></div>}
    <div className="upload-line"><button className="upload-btn" onClick={() => fileRef.current?.click()} disabled={uploading}><ImagePlus size={20}/>{uploading ? 'Đang xử lý ảnh…' : image ? 'Thay ảnh khác' : 'Thêm ảnh / meme'}</button><span>{text.length}/3000</span><input type="file" hidden accept="image/*" ref={fileRef} onChange={onFile}/></div>
    <div className="post-hint"><Sparkles size={17}/> Đăng xong AI sẽ tự xem ảnh, soi chi tiết và bình luận cà khịa. Không cần bấm Kích drama.</div></div>
    <div className="modal-footer"><button className="btn btn-plain" onClick={onClose}>Hủy</button><button className="btn btn-primary" onClick={() => onSave(text.trim(), image)} disabled={saving || uploading || (!text.trim() && !image)}><Send size={17}/>{initial ? 'Lưu thay đổi' : 'Đăng lên ToxicBook'}</button></div>
  </div></div>;
}
function ProfileModal({ profile, onClose, onSave, notify }) {
  const [form, setForm] = useState(profile);
  const [uploading, setUploading] = useState(false);
  const pick = async e => { const f = e.target.files?.[0]; if (!f) return; setUploading(true); try { const avatar = await compressImage(f); setForm(x => ({ ...x, avatar })); } catch (err) { notify(err.message); } finally { setUploading(false); } };
  return <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className="modal" role="dialog" aria-modal="true" aria-label="Sửa hồ sơ"><div className="modal-head"><h2>Chỉnh sửa hồ sơ</h2><IconButton icon={X} title="Đóng" onClick={onClose}/></div><div className="modal-body profile-form"><label className="profile-picture"><MeAvatar profile={form} size="lg"/><span><Camera size={16}/> Đổi ảnh đại diện<input type="file" accept="image/*" onChange={pick} hidden/></span></label><label>Tên hiển thị<input maxLength={40} value={form.name} onChange={e => setForm(x => ({ ...x, name: e.target.value }))}/></label><label>Tên người dùng<input maxLength={30} value={form.username} onChange={e => setForm(x => ({ ...x, username: e.target.value }))}/></label><label>Giới thiệu<textarea rows={3} maxLength={180} value={form.bio} onChange={e => setForm(x => ({ ...x, bio: e.target.value }))}/></label></div><div className="modal-footer"><button className="btn btn-plain" onClick={onClose}>Hủy</button><button className="btn btn-primary" disabled={uploading || !form.name.trim()} onClick={() => onSave({ ...form, name: form.name.trim() })}><Check size={17}/> Lưu hồ sơ</button></div></div></div>;
}
function ReplyComposer({ profile, onSend, onCancel, busy, placeholder }) {
  const [text, setText] = useState('');
  const submit = e => { e?.preventDefault(); if (!text.trim() || busy) return; onSend(text.trim()); setText(''); };
  return <form className="reply-compose" onSubmit={submit}><MeAvatar profile={profile} size="sm"/><input aria-label="Bình luận" value={text} onChange={e => setText(e.target.value)} placeholder={placeholder || 'Viết bình luận để đáp trả AI…'} maxLength={900}/>{onCancel && <IconButton icon={X} title="Hủy trả lời" onClick={onCancel}/>}<button className="send-btn" disabled={!text.trim() || busy} title="Gửi bình luận" type="submit"><Send size={17}/></button></form>;
}
function Comment({ comment, children, profile, onReply, onLike, liked, onDelete, replyActive, sendReply, clearReply, busy }) {
  const isAI = !!comment.aiId;
  const a = isAI ? agent(comment.aiId) : null;
  return <div className="comment-node"><div className="comment-row">{isAI ? <AgentAvatar id={a.id} size="sm"/> : <MeAvatar profile={profile} size="sm"/>}<div className="comment-content"><div className={`comment-bubble ${isAI ? '' : 'mine'}`}><div className="comment-name">{isAI ? a.name : profile.name}{isAI ? <span className="ai-badge">AI</span> : <span className="you-badge">Chủ thớt</span>}</div><p>{comment.text}</p></div><div className="comment-actions"><span>{relativeTime(comment.createdAt)}</span><button className={liked ? 'pressed' : ''} onClick={() => onLike(comment.id)}><Heart size={12} fill={liked ? 'currentColor' : 'none'}/> {fmt(comment.likes || 0)}</button><button onClick={() => onReply(comment)}><MessageCircle size={12}/> Trả lời</button>{!isAI && <button className="subtle-delete" title="Xóa bình luận" onClick={() => onDelete(comment.id)}><Trash2 size={12}/></button>}</div></div></div>{replyActive && <div className="nested-reply"><ReplyComposer profile={profile} onSend={sendReply} onCancel={clearReply} busy={busy} placeholder={`Đáp trả ${isAI ? a.name : profile.name}…`}/></div>}{children?.length > 0 && <div className="nested-thread">{children}</div>}</div>;
}
function CommentTree({ post, profile, onReply, onLike, onDelete, replyTarget, sendReply, clearReply, busy, likedComments }) {
  const nodes = useMemo(() => {
    const all = [...post.comments].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const ids = new Set(all.map(c => c.id));
    const groups = new Map();
    all.forEach(c => { const parent = ids.has(c.parentId) && c.parentId !== c.id ? c.parentId : null; groups.set(parent, [...(groups.get(parent) || []), c]); });
    return groups;
  }, [post.comments]);
  const render = (parent = null, depth = 0, visited = new Set()) => (nodes.get(parent) || []).filter(c => !visited.has(c.id)).map(c => <Comment key={c.id} comment={c} profile={profile} onReply={onReply} onLike={onLike} onDelete={onDelete} liked={likedComments.includes(c.id)} replyActive={replyTarget?.postId === post.id && replyTarget?.parentId === c.id} sendReply={sendReply} clearReply={clearReply} busy={busy}>{depth < 12 ? render(c.id, depth + 1, new Set([...visited, c.id])) : []}</Comment>);
  return <div className="comment-list">{render()}</div>;
}
function PostCard({ post, profile, expanded, onOpen, onEdit, onDelete, onLike, onReply, onComment, onRetryAI, aiJob, busy, replyTarget, clearReply, likeComment, deleteComment, likedComments, showToast }) {
  const [menu, setMenu] = useState(false);
  const count = post.comments.length;
  return <article className={`post-card ${expanded ? 'post-expanded' : ''}`}>
    <div className="post-card-top"><MeAvatar profile={profile}/><div className="post-author"><strong>{profile.name} <span>(Chủ thớt)</span></strong><div className="post-meta">{relativeTime(post.createdAt)} <span>·</span><Eye size={13}/> Chỉ AI xem</div></div><div className="post-menu-wrap"><IconButton icon={MoreHorizontal} title="Tùy chọn bài viết" onClick={() => setMenu(x => !x)}/>{menu && <div className="dropdown-menu"><button onClick={() => { setMenu(false); onEdit(post); }}><Pencil size={16}/> Sửa bài viết</button><button onClick={() => { setMenu(false); navigator.clipboard?.writeText(post.text).then(() => showToast('Đã sao chép caption!')).catch(() => showToast('Không thể sao chép.')); }}><Copy size={16}/> Sao chép caption</button><button className="danger-text" onClick={() => { setMenu(false); onDelete(post.id); }}><Trash2 size={16}/> Xóa bài viết</button></div>}</div></div>
    <div className="post-caption">{post.text}</div>{post.image && <div className="post-photo" onClick={() => onOpen(post.id)} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') onOpen(post.id); }}><img src={post.image} alt="Ảnh bài đăng" loading="lazy"/></div>}
    <div className="post-metrics"><span className="like-mark"><Heart size={14} fill="currentColor"/></span> {fmt(post.likes)}<button onClick={() => onOpen(post.id)}><MessageCircle size={16}/> {fmt(count)} bình luận</button><span className="metric-ai"><Bot size={15}/> AI hư cấu · lời thoại tạo sinh</span></div>
    <div className="post-interactions"><button className={post.liked ? 'pressed' : ''} onClick={() => onLike(post.id)}><Heart size={18} fill={post.liked ? 'currentColor' : 'none'}/> Thích</button><button onClick={() => onOpen(post.id)}><MessageCircle size={18}/> Bình luận</button>{busy && <span className="auto-ai-status"><Bot size={18}/> {post.image ? 'AI đang soi ảnh và bình luận…' : 'AI đang viết bình luận…'}</span>}</div>
    {aiJob && (aiJob.status === 'loading' || aiJob.status === 'error' || aiJob.status === 'partial') && <div className={`ai-progress ai-progress-${aiJob.status}`} role="status">
      {aiJob.status === 'loading' ? <><Bot size={17}/><span>Gemini đang tạo bình luận {aiJob.current || 1}/{aiJob.total || 3}{post.image ? ' từ ảnh thật' : ''}… Mỗi lượt có thể mất thời gian.</span></> :
        <><AlertCircle size={17}/><span>{aiJob.posted ? `Đã có ${aiJob.posted} bình luận, nhưng ${aiJob.failed} lượt Gemini lỗi: ${aiJob.error}` : `Chưa tạo được bình luận AI: ${aiJob.error}`}</span>
          {!aiJob.posted && <button type="button" onClick={() => onRetryAI(post.id)}>Thử lại</button>}</>}
    </div>}
    {expanded && <section className="post-comments"><div className="comments-title"><h3>Bình luận <span>({fmt(count)})</span></h3><MiniBadge icon={Bot}>Cộng đồng AI</MiniBadge></div>{count ? <CommentTree post={post} profile={profile} onReply={c => onReply(post.id, c)} onLike={id => likeComment(post.id, id)} onDelete={id => deleteComment(post.id, id)} replyTarget={replyTarget} clearReply={clearReply} sendReply={text => onComment(post.id, text, replyTarget)} busy={!!busy} likedComments={likedComments}/> : <Empty icon={MessageCircle} title={busy ? 'AI đang xem bài đăng…' : 'Chưa có bình luận'} text={busy ? 'AI đang phân tích ảnh và caption để tự cà khịa, không cần bấm nút.' : 'Gemini sẽ tự bình luận sau khi đăng. Nếu chưa xuất hiện, kiểm tra thông báo lỗi hoặc kết nối Gemini.'}/>}<div className="comment-bottom">{!replyTarget || replyTarget.postId !== post.id ? <ReplyComposer profile={profile} onSend={text => onComment(post.id, text, null)} busy={!!busy}/> : <span className="replying-help"><MessageCircle size={15}/> Bạn đang trả lời trong hội thoại phía trên. <button onClick={clearReply}>Hủy</button></span>}</div></section>}
    {!expanded && count > 0 && <div className="comment-preview"><div className="preview-avatars">{[...new Set(post.comments.filter(c => c.aiId).map(c => c.aiId))].slice(0, 3).map(id => <AgentAvatar key={id} id={id} size="sm"/>)}</div><button onClick={() => onOpen(post.id)}>Xem tất cả {count} bình luận <ChevronRight size={16}/></button></div>}
  </article>;
}
function Notifications({ items, posts, navigate, markAllRead, unread, filter, setFilter }) {
  const shown = items.filter(n => filter === 'all' ? true : filter === 'unread' ? !n.read : filter === 'reply' ? n.type === 'reply' : n.type === 'drama');
  return <div className="page-section"><div className="section-top"><div><div className="eyebrow">ACTIVITY CENTER</div><h1>Thông báo <span className="title-count">{unread}</span></h1><p>Ai vừa kiếm chuyện với bạn thế? 👀</p></div><button className="btn btn-outline" onClick={markAllRead}><CheckCheck size={16}/> Đánh dấu đã đọc</button></div><div className="filter-pills">{[['all','Tất cả'], ['unread','Chưa đọc'], ['reply','Trả lời'], ['drama','Drama 🔥']].map(([id, label]) => <button key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>{label}</button>)}</div><div className="notification-list">{shown.length ? [...shown].sort(dateDesc).map(n => <button className={`notification-item ${n.read ? '' : 'unread'}`} key={n.id} onClick={() => navigate(n.postId, n.id)}><AgentAvatar id={n.aiId} size="md"/><div className="notification-body"><div><strong>{agent(n.aiId).name}</strong> <span className="ai-badge">AI</span> {n.text}</div><p>“{n.preview}”</p><small><MessageCircle size={13}/> Trong bài: {posts.find(p => p.id === n.postId)?.text.slice(0, 43) || 'Bài đã xóa'}…</small></div><span className="notif-time">{relativeTime(n.createdAt)}</span>{!n.read && <i className="notif-dot"/>}</button>) : <Empty icon={Bell} title="Không có thông báo" text="Khi AI vào kiếm chuyện, bạn sẽ thấy ở đây."/>}</div></div>;
}
function Profile({ profile, posts, onEditProfile, onCreate, onOpen, onEdit, onDelete, onLike, onMoreDrama, busy, onToast, filter, setFilter }) {
  const count = posts.reduce((x, p) => x + p.comments.filter(c => c.aiId).length, 0);
  const sorted = [...posts].sort((a,b) => filter === 'hot' ? b.comments.length - a.comments.length : dateDesc(a,b));
  return <div className="page-section profile-page"><div className="profile-cover"><div className="cover-sticker"><Mascot size={92}/></div><span className="cover-word">TOXIC! ⚡</span></div><div className="profile-intro"><MeAvatar profile={profile} size="lg"/><div className="profile-main"><h1>{profile.name} <span className="owner-tag">Chủ thớt</span></h1><small>{profile.username} · <Eye size={12}/> Chỉ mình bạn đăng bài</small><p>{profile.bio}</p></div><button className="btn btn-outline" onClick={onEditProfile}><Pencil size={16}/> Sửa hồ sơ</button></div><div className="profile-stat-row"><div><PenSquare size={20}/><strong>{posts.length}</strong><span>bài đăng</span></div><div><MessageCircle size={20}/><strong>{count}</strong><span>bình luận AI</span></div><div><Flame size={20}/><strong>{posts.length ? Math.max(...posts.map(p=>p.comments.length)) : 0}</strong><span>drama cao nhất</span></div></div><div className="profile-list-head"><div><span className="eyebrow">MY POSTS</span><h2>Bài đăng của bạn</h2></div><button className="btn btn-primary" onClick={onCreate}><Plus size={18}/> Tạo bài đăng</button></div><div className="filter-pills"><button className={filter === 'new' ? 'active' : ''} onClick={() => setFilter('new')}><Clock size={15}/> Mới nhất</button><button className={filter === 'hot' ? 'active' : ''} onClick={() => setFilter('hot')}><Flame size={15}/> Bị cà khịa nhiều nhất</button></div>{!posts.length ? <Empty icon={PenSquare} title="Chưa đăng bài nào" text="Tạo bài viết đầu tiên để các AI vào kiếm chuyện."/> : sorted.map(post => <div key={post.id} className="profile-post"><button className="profile-post-open" onClick={() => onOpen(post.id)}>{post.image ? <img src={post.image} alt=""/> : <div className="profile-post-placeholder"><MessageSquareText/></div>}<span><strong>{post.text.slice(0, 100) || 'Bài viết có ảnh'}</strong><small>{relativeTime(post.createdAt)} · {post.comments.length} bình luận AI</small><span className="profile-tags"><MiniBadge icon={Flame} tone="orange">Drama {post.comments.length > 8 ? 'cao' : 'vừa'}</MiniBadge>{post.comments.length > 0 && <MiniBadge tone="green">Đang tranh luận</MiniBadge>}</span></span></button><div className="profile-post-controls"><IconButton icon={Pencil} title="Sửa bài" onClick={() => onEdit(post)}/><IconButton icon={Trash2} title="Xóa bài" onClick={() => onDelete(post.id)}/></div></div>)}</div>;
}
function Settings({ settings, setSettings, onReset, onExport, live }) {
  return <div className="page-section"><div className="section-top"><div><div className="eyebrow">PERSONALIZE YOUR CHAOS</div><h1>Cài đặt</h1><p>Bạn là người kiểm soát độ ồn của cả cõi mạng.</p></div><Settings2 className="settings-main-icon" size={36}/></div><div className="settings-panel"><h2><Flame size={21}/> Chế độ Toxic</h2><p className="settings-description">ToxicBook chỉ có một chế độ: AI vào cà khịa và cãi tay đôi. Chọn mức độ phù hợp với bạn.</p><div className="level-grid">{[{id:'mild',title:'🌶️ Cà khịa nhẹ',desc:'Hài hước, không chửi tục'},{id:'medium',title:'🔥 Toxic vừa',desc:'Gắt, mỉa mai và bắt bẻ'},{id:'spicy',title:'💀 Toxic cực mạnh',desc:'Đáp trả sắc, có thể chửi tục'}].map(x => <button key={x.id} className={settings.roastLevel === x.id ? 'level active' : 'level'} onClick={() => setSettings({ roastLevel: x.id })}><strong>{x.title}</strong><small>{x.desc}</small>{settings.roastLevel === x.id && <Check size={16}/>}</button>)}</div><p className="privacy-reminder"><ShieldCheck size={16}/> Vẫn có giới hạn: AI không đe dọa, tiết lộ đời tư hay công kích đặc điểm nhạy cảm.</p></div><div className="settings-panel"><h2><Bot size={21}/> Cộng đồng AI</h2><label className="settings-row"><span><strong>Số AI tham gia khi đăng bài</strong><small>Mỗi nhân vật có tính cách và avatar riêng</small></span><select value={settings.numberOfAgents} onChange={e => setSettings({ numberOfAgents: +e.target.value })}><option value="1">1 AI</option><option value="3">3 AI</option><option value="5">5 AI</option></select></label><label className="settings-row"><span><strong>AI tự bình luận bổ sung</strong><small>Không cần bấm Kích drama: AI tự vào bài mới và có thể quay lại bài cũ mỗi 4 phút khi tab đang mở. Mỗi lượt dùng API Gemini.</small></span><input type="checkbox" checked={settings.autoDrama} onChange={e => setSettings({ autoDrama: e.target.checked })}/></label><label className="settings-row"><span><strong>Âm thanh thông báo</strong><small>Kêu nhẹ mỗi khi nhận bình luận mới</small></span><input type="checkbox" checked={settings.sounds} onChange={e => setSettings({ sounds: e.target.checked })}/></label></div><div className="settings-panel"><h2><ShieldCheck size={21}/> Dữ liệu và kết nối</h2><div className="connection-state"><span className={`status-dot ${live ? 'live' : ''}`}/><div><strong>{live ? 'Gemini đã cấu hình' : 'Gemini chưa được cấu hình'}</strong><small>{live ? 'Lời bình mới được gọi từ Gemini; khi API lỗi sẽ hiển thị lỗi, không dựng câu mẫu.' : 'Thêm GEMINI_API_KEY vào .env.local ở server rồi khởi động lại web.'}</small></div></div><div className="settings-cta"><button className="btn btn-outline" onClick={onExport}><Download size={16}/> Xuất dữ liệu JSON</button><button className="btn btn-danger" onClick={onReset}><RotateCcw size={16}/> Đặt lại dữ liệu</button></div><p className="settings-disclaimer">Dữ liệu được lưu ở server: file JSON khi chạy trên máy, hoặc Supabase khi triển khai cloud. Web chỉ dành cho một chủ tài khoản; bảo vệ bằng mật khẩu trước khi công khai.</p></div></div>;
}
function AgentsPage({ onBack, posts }) {
  return <div className="page-section"><button className="back-link" onClick={onBack}><ArrowLeft size={18}/> Quay lại</button><div className="section-top"><div><div className="eyebrow">THE TROUBLEMAKERS</div><h1>Hội đồng cà khịa 😈</h1><p>Không ai giống ai, mà ai cũng có chuyện để nói.</p></div></div><div className="agent-gallery">{AGENTS.map(a => <div key={a.id} className="agent-profile-card"><AgentAvatar id={a.id} size="lg" showRing/><div><h3>{a.name} <span className="ai-badge">AI</span></h3><p className="agent-handle">{a.handle}</p><p>{a.label}</p><div className="agent-profile-bottom"><MessageCircle size={15}/> {posts.reduce((x,p)=>x+p.comments.filter(c=>c.aiId===a.id).length,0)} bình luận</div></div></div>)}</div></div>;
}
export default function App() {
  const [data, setData] = useState(() => structuredClone(INITIAL_STATE));
  const dataRef = useRef(data);
  const [page, setPage] = useState('home');
  const [activePostId, setActivePostId] = useState(null);
  const [modal, setModal] = useState(null);
  const [replyTarget, setReplyTarget] = useState(null);
  const [busyPosts, setBusyPosts] = useState({});
  const [aiJobs, setAiJobs] = useState({});
  const initialAttempted = useRef(new Set());
  const seedRunning = useRef(new Set());
  const recoveryChecked = useRef(false);
  const [likedComments, setLikedComments] = useState([]);
  const [toast, setToast] = useState('');
  const [live, setLive] = useState(false);
  const [startup, setStartup] = useState('loading');
  const [startupError, setStartupError] = useState('');
  const [owner, setOwner] = useState({authorized: false, authRequired: true});
  const [loginPassword, setLoginPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const hydrated = useRef(false);
  const saveQueue = useRef(Promise.resolve());
  const [sort, setSort] = useState('recent');
  const [search, setSearch] = useState('');
  const [notificationsFilter, setNotificationsFilter] = useState('all');
  const [profileFilter, setProfileFilter] = useState('new');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pulse, setPulse] = useState(0);
  const toastTimer = useRef();
  const notify = useCallback(message => { setToast(message); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 3400); }, []);
  useEffect(() => { dataRef.current = data; }, [data]);
  const bootstrap = useCallback(async (skipSession = false) => {
    setStartup('loading'); setStartupError(''); hydrated.current = false;
    try {
      if (!skipSession) {
        const authResponse = await fetch('/api/session', {credentials:'same-origin'});
        if (!authResponse.ok) throw new Error('Không kết nối được máy chủ đăng nhập.');
        const auth = await authResponse.json(); setOwner(auth);
        if (!auth.authorized) { setStartup('login'); return; }
      }
      const [stateResponse, aiResponse] = await Promise.all([
        fetch('/api/state',{credentials:'same-origin'}), fetch('/api/comment',{credentials:'same-origin'})
      ]);
      const saved = await stateResponse.json();
      if (!stateResponse.ok) throw new Error(saved.error || 'Không tải được dữ liệu trên server.');
      const ai = await aiResponse.json().catch(()=>({configured:false}));
      setLive(aiResponse.ok && !!ai.configured && !!ai.authorized);
      const loaded = normalizeState(saved.state);
      dataRef.current = loaded; setData(loaded); hydrated.current = true;
      setStartup('ready');
    } catch(error) { setStartupError(error.message || 'Không thể tải trang.'); setStartup('error'); }
  }, []);
  useEffect(() => { bootstrap(); }, [bootstrap]);
  useEffect(() => {
    if (!hydrated.current || startup !== 'ready') return;
    const snapshot = JSON.stringify(data);
    // Serialize writes so a slower older response cannot overwrite a newer one.
    saveQueue.current = saveQueue.current.catch(()=>{}).then(async () => {
      const response = await fetch('/api/state', {method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:snapshot});
      if (!response.ok) { const result = await response.json().catch(()=>({}));throw new Error(result.error || 'Lưu bài đăng lên server thất bại.'); }
      setSaveError('');
    }).catch(e => {setSaveError(e.message); console.error(e);});
  }, [data, startup]);
  const submitLogin = async e => {
    e.preventDefault();setLoginBusy(true);setStartupError('');
    try {
      const response = await fetch('/api/session',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:loginPassword})});
      const result=await response.json();
      if (!response.ok) throw new Error(result.error || 'Đăng nhập thất bại.');
      setOwner(result);setLoginPassword('');await bootstrap(true);
    } catch(error) { setStartupError(error.message); } finally {setLoginBusy(false);}
  };
  const unread = data.notifications.filter(n => !n.read).length;
  const activePost = data.posts.find(p => p.id === activePostId);
  const write = fn => setData(prev => { const next = fn(prev); return next || prev; });
  const changeSettings = changes => write(prev => ({ ...prev, settings: { ...prev.settings, ...changes } }));
  const navigate = which => { setPage(which); setActivePostId(null); setReplyTarget(null); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openPost = (id, notifId) => { write(prev => notifId ? ({ ...prev, notifications: prev.notifications.map(n => n.id === notifId ? { ...n, read: true } : n) }) : prev); setActivePostId(id); setPage('post'); setReplyTarget(null); setSidebarOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const generate = useCallback(async ({ agentId, post, history = [], mode = 'seed' }) => {
    if (!live) throw new Error('Chưa kết nối Gemini. Thêm GEMINI_API_KEY vào .env.local và khởi động lại server.');
    let response;
    try {
      response = await fetch('/api/comment', { method: 'POST', credentials:'same-origin', headers: {'Content-Type':'application/json'}, body: JSON.stringify({agentId, postText: post.text, postImage: post.image?.startsWith('data:image/') ? post.image : null, history: history.slice(-30), mode, roastLevel: dataRef.current.settings.roastLevel}) });
    } catch { throw new Error('Không kết nối được máy chủ. Kiểm tra kết nối mạng.'); }
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.text || result.source !== 'gemini') {
      const error=new Error(result.error || 'AI không tạo được bình luận.');
      error.code=result.code || 'GEMINI_ERROR';
      throw error;
    }
    return result;
  }, [live]);
  const addAgentComment = useCallback((postId, { agentId, text, parentId = null, source = 'gemini', notifyUser = true }) => {
    const comment = { id: uid(), aiId: agentId, text, parentId, source, createdAt: new Date().toISOString(), likes: 0 };
    write(prev => ({ ...prev, posts: prev.posts.map(p => p.id === postId ? { ...p, comments: [...p.comments, comment] } : p), notifications: notifyUser ? [{ id: uid(), postId, aiId: agentId, text: parentId ? 'đã trả lời trong một cuộc tranh cãi' : 'đã bình luận bài đăng của bạn', preview: text.slice(0, 130), createdAt: comment.createdAt, read: false, type: parentId ? 'reply' : 'comment' }, ...prev.notifications].slice(0, 250) : prev.notifications }));
    return comment;
  }, []);
  const startSeed = async post => {
    // Prevent overlapping AI requests for the same post, including React Strict Mode.
    if (seedRunning.current.has(post.id)) return;
    seedRunning.current.add(post.id);
    initialAttempted.current.add(post.id);
    setBusyPosts(old => ({ ...old, [post.id]: true }));
    setAiJobs(old => ({ ...old, [post.id]: {status:'loading', current:1, total:dataRef.current.settings.numberOfAgents, posted:0, failed:0} }));
    try {
      const result = await runInitialComments({
        post,
        agents: AGENTS,
        numberOfAgents: dataRef.current.settings.numberOfAgents,
        generate,
        addComment: addAgentComment,
        postStillExists: () => dataRef.current.posts.some(item => item.id === post.id),
        onProgress: progress => {
          if (progress.phase !== 'finished') {
            setAiJobs(old => ({
              ...old,
              [post.id]: {...old[post.id], status:'loading', current:progress.current, total:progress.total, posted:progress.posted, failed:progress.failed}
            }));
          }
        }
      });
      const status = result.failed ? (result.posted ? 'partial' : 'error') : 'done';
      setAiJobs(old => ({ ...old, [post.id]: {status, posted:result.posted, failed:result.failed, error:result.firstError, total:dataRef.current.settings.numberOfAgents} }));
      if (result.failed) {
        notify(result.posted
          ? `Đã có ${result.posted} AI bình luận; ${result.failed} AI gặp lỗi. Xem chi tiết dưới bài viết.`
          : 'Gemini chưa bình luận được. Xem lỗi ngay dưới bài viết.');
      }
    } catch (error) {
      setAiJobs(old => ({ ...old, [post.id]: {status:'error', posted:0, failed:1, error:error.message || 'Không rõ nguyên nhân'} }));
      notify('Gemini bị lỗi. Xem chi tiết dưới bài viết.');
    } finally {
      seedRunning.current.delete(post.id);
      setBusyPosts(old => ({ ...old, [post.id]: false }));
    }
  };
  const savePost = (text, image) => {
    if (modal?.post) { const id = modal.post.id; write(prev => ({ ...prev, posts: prev.posts.map(p => p.id === id ? { ...p, text, image } : p) })); notify('Đã cập nhật bài đăng!'); }
    else { const post = {id: uid(), text, image, createdAt: new Date().toISOString(), likes: 0, liked: false, comments: []}; write(prev => ({ ...prev, posts: [post, ...prev.posts] })); if (live) { initialAttempted.current.add(post.id); setTimeout(() => startSeed(post), 250); } notify(live ? (image ? 'Đã đăng ảnh! AI đang tự soi ảnh để chê… 😈' : 'Đã đăng bài! AI đang tự vào bình luận… 😈') : 'Đã đăng bài, nhưng Gemini chưa được cấu hình. Không tạo bình luận mẫu.'); }
    setModal(null); setPage('home'); setActivePostId(null);
  };
  const deletePost = id => { if (!window.confirm('Xóa bài này cùng tất cả bình luận và drama?')) return; write(prev => ({...prev,posts:prev.posts.filter(p=>p.id!==id), notifications:prev.notifications.filter(n=>n.postId!==id)})); if (activePostId === id) navigate('home'); notify('Đã xóa bài đăng.'); };
  const likePost = id => write(prev => ({...prev,posts:prev.posts.map(p=>p.id===id?{...p,liked:!p.liked,likes:Math.max(0,p.likes+(p.liked?-1:1))}:p)}));
  const likeComment = (postId, commentId) => { const already = likedComments.includes(commentId); setLikedComments(prev=>already?prev.filter(x=>x!==commentId):[...prev,commentId]); write(prev=>({...prev,posts:prev.posts.map(p=>p.id===postId?{...p,comments:p.comments.map(c=>c.id===commentId?{...c,likes:Math.max(0,(c.likes||0)+(already?-1:1))}:c)}:p)})); };
  const deleteComment = (postId, commentId) => { if (!window.confirm('Xóa bình luận này? Các câu trả lời sẽ vẫn được giữ lại.')) return; write(prev => ({...prev,posts:prev.posts.map(p=>p.id===postId?{...p,comments:p.comments.filter(c=>c.id!==commentId).map(c=>c.parentId===commentId?{...c,parentId:null}:c)}:p)})); };
  const sendComment = async (postId, text, target) => {
    const post = dataRef.current.posts.find(p=>p.id===postId); if (!post) return;
    const yourComment = {id:uid(),aiId:null,text,parentId:target?.parentId||null,createdAt:new Date().toISOString(),likes:0,source:'user'};
    write(prev=>({...prev,posts:prev.posts.map(p=>p.id===postId?{...p,comments:[...p.comments,yourComment]}:p)}));
    setReplyTarget(null);
    setBusyPosts(old=>({...old,[postId]:true}));
    const responder = target?.aiId || ['anti','khia','hong'][Math.floor(Math.random()*3)];
    // Follow this specific reply chain, so the same AI remembers the argument.
    const byId = new Map([...post.comments, yourComment].map(c => [c.id, c]));
    const thread = []; const seen = new Set(); let cursor = yourComment;
    while (cursor && thread.length < 24 && !seen.has(cursor.id)) {seen.add(cursor.id);thread.unshift(cursor);cursor=byId.get(cursor.parentId);}
    const history = thread.map(c=>({role:c.aiId?'ai':'user',name:c.aiId?agent(c.aiId).name:'Chủ thớt',text:c.text}));
    try {
      await sleep(850);
      const response = await generate({agentId:responder,post,history,mode:'reply'});
      const first = addAgentComment(postId,{agentId:responder,text:response.text,parentId:yourComment.id,source:response.source});
      if(Math.random()<0.3 && dataRef.current.settings.numberOfAgents>1) {
        await sleep(650);
        const interrupter = AGENTS.filter(a=>a.id!==responder)[Math.floor(Math.random()*(AGENTS.length-1))];
        const follow = await generate({agentId:interrupter.id,post,history:[...history,{role:'ai',name:agent(responder).name,text:first.text}],mode:'reply'});
        addAgentComment(postId,{agentId:interrupter.id,text:follow.text,parentId:first.id,source:follow.source});
      }
    } catch(error) {notify(`Gemini chưa thể đáp trả: ${error.message}`);} finally { setBusyPosts(old=>({...old,[postId]:false})); }
  };
  const moreDrama = async postId => {
    if(busyPosts[postId]) return; const post=dataRef.current.posts.find(p=>p.id===postId); if(!post) return;
    setBusyPosts(old=>({...old,[postId]:true}));
    try { const used = post.comments.filter(c=>c.aiId).map(c=>c.aiId); const available=AGENTS.filter(a=>!used.includes(a.id)); const chosen=available.length?available[Math.floor(Math.random()*available.length)]:AGENTS[Math.floor(Math.random()*AGENTS.length)];
      const history=post.comments.slice(-20).map(c=>({role:c.aiId?'ai':'user',name:c.aiId?agent(c.aiId).name:'Chủ thớt',text:c.text}));
      const response=await generate({agentId:chosen.id,post,history,mode:post.comments.length?'reply':'seed'});
      addAgentComment(postId,{agentId:chosen.id,text:response.text,parentId:null,source:response.source});
      notify(`${chosen.name} vừa vào kiếm chuyện! 🍿`);
    } catch(error) {notify(`Không tạo được bình luận AI: ${error.message}`);} finally {setBusyPosts(old=>({...old,[postId]:false}));}
  };
  // Recover the newest previously-empty post automatically when a user opens
  // a version that fixed Gemini integration. Only one recovery attempt per page
  // load prevents background quota storms and retries are user-initiated after errors.
  useEffect(() => {
    if (startup !== 'ready' || !live || !hydrated.current || recoveryChecked.current) return;
    recoveryChecked.current = true;
    const newestEmpty = [...dataRef.current.posts].sort(dateDesc).find(post =>
      post.comments.every(c => !c.aiId) && !initialAttempted.current.has(post.id));
    if (!newestEmpty) return;
    initialAttempted.current.add(newestEmpty.id);
    void startSeed(newestEmpty);
  }, [startup, live, data.posts]);
  // Periodic drama only works while the tab is open; no hidden cron/push claims.
  useEffect(() => {if (!data.settings.autoDrama || !live || startup !== 'ready') return; const interval = window.setInterval(() => {if (document.visibilityState !== 'visible') return; const posts=dataRef.current.posts;if (!posts.length) return; const idx=Math.floor(Math.random()*Math.min(posts.length,3)); const post=posts[idx]; if (!busyPosts[post.id]) moreDrama(post.id);}, 240000); return ()=>clearInterval(interval);}, [data.settings.autoDrama, busyPosts, live, startup]);
  useEffect(()=>{ if(page==='notifications' && unread && notificationsFilter==='all') { /* keep unread until opened */ } },[page,unread,notificationsFilter]);
  const sortedPosts = useMemo(() => [...data.posts].filter(p => (p.text + ' ' + data.profile.name).toLowerCase().includes(search.trim().toLowerCase())).sort(sort==='hot'?(a,b)=>b.comments.length-a.comments.length:dateDesc),[data.posts,data.profile.name,search,sort]);
  const onExport = () => { const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download='toxicbook-backup.json';document.body.append(a);a.click();a.remove();URL.revokeObjectURL(href);notify('Đã xuất dữ liệu!'); };
  const onReset = () => { if(!window.confirm('Xóa TOÀN BỘ bài đăng, ảnh, bình luận và cài đặt trên trình duyệt này?')) return; setData(structuredClone(INITIAL_STATE));navigate('home');notify('Đã xóa dữ liệu và làm mới ToxicBook.'); };
  if (startup === 'loading') return <div className="auth-splash"><Mascot size={72}/><h1>ToxicBook</h1><p>Đang kết nối máy chủ…</p></div>;
  if (startup === 'login') return <div className="auth-splash"><Mascot size={82}/><h1>ToxicBook 😈</h1><p>Chỉ chủ web mới được đăng bài và gọi AI.</p><form className="owner-login" onSubmit={submitLogin}><label htmlFor="owner-password">Mật khẩu chủ web</label><input id="owner-password" type="password" autoComplete="current-password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} required placeholder="Nhập mật khẩu của bạn"/><button className="btn btn-primary" disabled={loginBusy}>{loginBusy?'Đang đăng nhập…':'Vào ToxicBook'}</button>{startupError&&<small role="alert">{startupError}</small>}</form></div>;
  if (startup === 'error') return <div className="auth-splash"><Mascot size={72}/><h1>Chưa kết nối được</h1><p role="alert">{startupError}</p><button className="btn btn-primary" onClick={()=>bootstrap()}>Thử lại</button><small>Kiểm tra API server, mật khẩu và cấu hình Supabase nếu đang chạy online.</small></div>;
  return <div className="app-shell">
    <header className="topbar"><div className="topbar-inner"><IconButton icon={Menu} title="Mở menu" className="mobile-menu" onClick={()=>setSidebarOpen(x=>!x)}/><button className="brand" onClick={()=>navigate('home')}><Mascot size={47}/><strong>Toxic<span>Book</span></strong><i>✦</i></button><div className="top-slogan">Một mình đăng bài, cả cộng đồng AI vào kiếm chuyện. <span>⌁</span></div><div className="top-actions"><span className={`api-pill ${live ? 'is-live' : ''}`}><span className="status-dot"/>{live ? 'Gemini sẵn sàng' : 'Chưa kết nối AI'}</span><button className="top-icon" onClick={()=>navigate('notifications')} aria-label="Thông báo"><Bell size={21}/>{unread>0&&<span className="top-notif"/>}</button><button className="header-user" onClick={()=>navigate('profile')} aria-label="Hồ sơ"><MeAvatar profile={data.profile} size="sm"/></button></div></div></header>
    {saveError && <div className="save-alert" role="alert"><AlertCircle size={16}/>{saveError} <button onClick={()=>setSaveError('')}>Đóng</button></div>}
    <div className="layout">{sidebarOpen && <div className="mobile-shade" onClick={()=>setSidebarOpen(false)}/>}<div className={`sidebar-container ${sidebarOpen?'show':''}`}><Sidebar page={page} navigate={navigate} unread={unread} close={()=>setSidebarOpen(false)}/></div>
      <main className="main-content">
        {(page==='home'||page==='posts') && <><div className="page-hero"><div><span className="eyebrow"><span className="eyebrow-bar"/> WELCOME TO THE CHAOS</span><h1>{page==='posts'?'Bài đăng của bạn':'Bảng tin ToxicBook'} <span className="hero-flame">🔥</span></h1><p>Đăng một câu vu vơ. Để cả cõi AI vào suy diễn.</p></div><button className="btn btn-primary" onClick={()=>setModal({type:'post'})}><Plus size={19}/> Tạo bài đăng</button></div>
        <button className="quick-compose" onClick={()=>setModal({type:'post'})}><MeAvatar profile={data.profile} size="md"/><span>Hôm nay muốn bị cộng đồng AI soi chuyện gì?</span><span className="quick-plus"><ImagePlus size={21}/></span></button>
        <div className="feed-toolbar"><div className="feed-title"><Flame size={18}/> {page==='posts'?'Toàn bộ bài viết':'Drama mới nhất'} <span className="feed-count">{sortedPosts.length}</span></div><div className="feed-tools"><div className="search-field"><Search size={17}/><input aria-label="Tìm bài đăng" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm bài viết…"/></div><button className={`sort-toggle ${sort==='recent'?'active':''}`} onClick={()=>setSort('recent')}><Clock size={15}/> Mới</button><button className={`sort-toggle ${sort==='hot'?'active':''}`} onClick={()=>setSort('hot')}><Flame size={15}/> Hot</button></div></div>
        <div className="feed-list">{sortedPosts.length?sortedPosts.map(post=><PostCard key={post.id} post={post} profile={data.profile} expanded={true} onOpen={openPost} onEdit={p=>setModal({type:'post',post:p})} onDelete={deletePost} onLike={likePost} onReply={(postId,c)=>setReplyTarget({postId,parentId:c.id,aiId:c.aiId})} onComment={sendComment} onRetryAI={id => { const post = dataRef.current.posts.find(p => p.id === id); if (post) void startSeed(post); }} aiJob={aiJobs[post.id]} busy={busyPosts[post.id]} replyTarget={replyTarget} clearReply={()=>setReplyTarget(null)} likeComment={likeComment} deleteComment={deleteComment} likedComments={likedComments} showToast={notify}/>):<Empty icon={Search} title="Không tìm thấy bài viết" text="Thử một từ khác hoặc tạo bài đăng mới nha."/>}</div></>}
        {page==='post' && (activePost ? <><button className="back-link" onClick={()=>navigate('home')}><ArrowLeft size={18}/> Trở về bảng tin</button><div className="detail-heading"><span className="eyebrow">DRAMA THREAD</span><h1>Cuộc khẩu chiến <Flame size={28} fill="currentColor"/></h1><p>Các AI sẽ phản hồi dựa trên ngữ cảnh của chuỗi bình luận.</p></div><PostCard key={activePost.id} post={activePost} profile={data.profile} expanded={true} onOpen={openPost} onEdit={p=>setModal({type:'post',post:p})} onDelete={deletePost} onLike={likePost} onReply={(postId,c)=>setReplyTarget({postId,parentId:c.id,aiId:c.aiId})} onComment={sendComment} onRetryAI={id => { const post = dataRef.current.posts.find(p => p.id === id); if (post) void startSeed(post); }} aiJob={aiJobs[activePost.id]} busy={busyPosts[activePost.id]} replyTarget={replyTarget} clearReply={()=>setReplyTarget(null)} likeComment={likeComment} deleteComment={deleteComment} likedComments={likedComments} showToast={notify}/></> : <Empty title="Bài viết không tồn tại" text="Có thể bài này đã bị xóa."/>)}
        {page==='notifications' && <Notifications items={data.notifications} posts={data.posts} navigate={openPost} markAllRead={()=>write(prev=>({...prev,notifications:prev.notifications.map(n=>({...n,read:true}))}))} unread={unread} filter={notificationsFilter} setFilter={setNotificationsFilter}/>}
        {page==='profile' && <Profile profile={data.profile} posts={data.posts} onEditProfile={()=>setModal({type:'profile'})} onCreate={()=>setModal({type:'post'})} onOpen={openPost} onEdit={p=>setModal({type:'post',post:p})} onDelete={deletePost} onLike={likePost} busy={busyPosts} onToast={notify} filter={profileFilter} setFilter={setProfileFilter}/>}
        {page==='settings' && <Settings settings={data.settings} setSettings={changeSettings} onReset={onReset} onExport={onExport} live={live}/>}
        {page==='agents' && <AgentsPage onBack={()=>navigate('home')} posts={data.posts}/>}
        <footer className="main-footer"><Mascot size={25}/> ToxicBook © 2026 · Nhân vật là AI hư cấu, lời bình do Gemini tạo. Không có người thật khác tham gia.</footer>
      </main><div className="rightbar-container"><RightBar posts={data.posts} onOpenPost={openPost} onCreate={()=>setModal({type:'post'})} currentPost={page==='post'?activePost:null} live={live} onAgents={()=>navigate('agents')}/></div>
    </div>
    <nav className="bottom-nav"><button className={page==='home'?'selected':''} onClick={()=>navigate('home')}><Home/><span>Trang chủ</span></button><button className={page==='posts'?'selected':''} onClick={()=>navigate('posts')}><PenSquare/><span>Bài đăng</span></button><button className="bottom-compose" onClick={()=>setModal({type:'post'})}><Plus/></button><button className={page==='notifications'?'selected':''} onClick={()=>navigate('notifications')}><Bell/><span>Thông báo</span>{unread>0&&<i/>}</button><button className={page==='profile'?'selected':''} onClick={()=>navigate('profile')}><UserRound/><span>Hồ sơ</span></button></nav>
    {modal?.type==='post'&&<CreateModal initial={modal.post} onClose={()=>setModal(null)} onSave={savePost} saving={false} notify={notify}/>}
    {modal?.type==='profile'&&<ProfileModal profile={data.profile} onClose={()=>setModal(null)} onSave={profile=>{write(prev=>({...prev,profile}));setModal(null);notify('Đã lưu hồ sơ!');}} notify={notify}/>}
    {toast&&<div className="toast" role="status"><Sparkles size={18}/>{toast}<button onClick={()=>setToast('')} aria-label="Đóng thông báo"><X size={15}/></button></div>}
  </div>;
}