/** App data types and presentation helpers. No fabricated AI comments or demo feed. */
export const AGENTS = [
  { id: 'anti', name: 'Anti Số 01', handle: '@anti_so01', emoji: '😈', color: 'coral', label: 'Soi mói không trượt phát nào', personality: 'Gắt, thẳng thừng, hay soi ảnh và cà khịa nhưng không xúc phạm thuộc tính nhạy cảm.' },
  { id: 'hong', name: 'Drama Hóng Hớt', handle: '@honghot24h', emoji: '🍿', color: 'violet', label: 'Có drama là có mặt', personality: 'Hóng chuyện, châm dầu vào lửa, thích chen ngang và thêm emoji.' },
  { id: 'khia', name: 'Cà Khịa Pro', handle: '@caphe_cakhia', emoji: '👑', color: 'amber', label: 'Chuyên gia hỏi xoáy', personality: 'Cà khịa thông minh, cười cợt, thích bắt bẻ logic và hỏi xoáy.' },
  { id: 'hangxom', name: 'Hàng Xóm Khó Ở', handle: '@hangxom_online', emoji: '👀', color: 'teal', label: 'Chuyện ai cũng biết', personality: 'Giọng nói như bà hàng xóm khó tính, lắm chuyện, tỏ ra hiểu biết.' },
  { id: 'thamtu', name: 'Thám Tử Comment', handle: '@thamtumang', emoji: '🔎', color: 'blue', label: 'Đào lại bài cũ', personality: 'Soi chi tiết, lấy thông tin từ ngữ cảnh cuộc hội thoại, vạch mâu thuẫn hài hước.' },
  { id: 'meo', name: 'Mèo Mồm Hỗn', handle: '@meomomhon', emoji: '🐈', color: 'pink', label: 'Mặt ngây thơ, mỏ hỗn', personality: 'Nói ngắn gọn, tự tin, chọc quê có duyên, hài theo kiểu mèo.' },
];
export const uid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const agent = id => AGENTS.find(a => a.id === id) || AGENTS[0];
export function relativeTime(iso) {
  const n = Math.max(0, Date.now() - new Date(iso).getTime());
  const minute = Math.floor(n / 60000);
  if (minute < 1) return 'Vừa xong';
  if (minute < 60) return `${minute} phút trước`;
  if (minute < 1440) return `${Math.floor(minute / 60)} giờ trước`;
  if (minute < 10080) return `${Math.floor(minute / 1440)} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}
export const fmt = n => (n >= 1000 ? (n / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + 'K' : String(n || 0));
export const INITIAL_STATE = {
  profile: { name: 'Chủ thớt', username: '@chuthot', bio: 'Đăng gì cũng có người soi. Mà thôi, cứ đăng! 🤷', avatar: '' },
  settings: { autoDrama: true, autoDramaVersion: 2, sounds: false, numberOfAgents: 3, roastLevel: 'medium' },
  posts: [], notifications: [],
};
export function normalizeState(data) {
  if (!data || !Array.isArray(data.posts) || !Array.isArray(data.notifications)) return structuredClone(INITIAL_STATE);
  const settings = {...INITIAL_STATE.settings, ...data.settings};
  // Existing accounts created with the old opt-in-only drama setting get automatic
  // comments by default once; from then on the owner's toggle is respected.
  if (!data.settings?.autoDramaVersion) settings.autoDrama = true;
  settings.autoDramaVersion = 2;
  return {...INITIAL_STATE, ...data, profile:{...INITIAL_STATE.profile, ...data.profile}, settings};
}
