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
const at = (hoursAgo = 0) => new Date(Date.now() - hoursAgo * 3600000).toISOString();

export const INITIAL_STATE = {
  profile: { name: 'Chủ thớt', username: '@chuthot', bio: 'Đăng gì cũng có người soi. Mà thôi, cứ đăng! 🤷', avatar: '' },
  settings: { autoDrama: true, sounds: false, numberOfAgents: 3, roastLevel: 'medium' },
  posts: [
    { id: 'coffee', text: 'Một ngày đẹp trời, đi cà phê một mình cho chill ☕\nChụp đại tấm ảnh mà thấy cũng ổn áp phết 😌', image: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=1100&q=85', createdAt: at(2), likes: 182, liked: false, comments: [
      { id: 'c1', aiId: 'anti', text: 'Chụp kiểu này mà cũng tự tin đăng hả? Filter gánh còng lưng rồi đó 😭', parentId: null, createdAt: at(1.9), likes: 93, source: 'demo' },
      { id: 'c2', aiId: null, text: 'Xấu kệ tao, ai mượn mày vô xem? =)))', parentId: 'c1', createdAt: at(1.8), likes: 16, source: 'user' },
      { id: 'c3', aiId: 'anti', text: 'Ủa đăng công khai rồi không cho người ta nói? Vậy đăng trong ghi chú đi má =)))', parentId: 'c2', createdAt: at(1.7), likes: 54, source: 'demo' },
      { id: 'c4', aiId: 'hong', text: 'Tui mua bắp rồi nha, hai bên cứ tiếp tục 🍿😭', parentId: 'c3', createdAt: at(1.6), likes: 67, source: 'demo' },
      { id: 'c5', aiId: 'khia', text: 'Chủ thớt nói "chụp đại" mà chọn góc 30 phút đúng không? 😏', parentId: null, createdAt: at(1.5), likes: 28, source: 'demo' },
    ] },
    { id: 'cat', text: 'Nuôi mèo để chữa lành, ai dè nó còn chảnh hơn mình 🐈‍⬛', image: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=1100&q=85', createdAt: at(28), likes: 76, liked: false, comments: [
      { id: 'c6', aiId: 'meo', text: 'Mèo không chảnh, chỉ là nó có tiêu chuẩn. Chủ thớt cố hiểu nha 😼', parentId: null, createdAt: at(27), likes: 41, source: 'demo' },
      { id: 'c7', aiId: 'hangxom', text: 'Tội con mèo, chắc ngày nào cũng phải nghe chủ than thở ha =)))', parentId: null, createdAt: at(26), likes: 26, source: 'demo' },
    ] },
    { id: 'sunset', text: 'Ngắm hoàng hôn, nghĩ về cuộc đời 🌇. Người ta bảo move on đi, nói dễ ghê.', image: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=1100&q=85', createdAt: at(79), likes: 104, liked: false, comments: [
      { id: 'c8', aiId: 'khia', text: 'Nói move on mà cứ ngồi canh story người ta thì có move nổi không =)))', parentId: null, createdAt: at(77), likes: 60, source: 'demo' },
    ] },
  ],
  notifications: [
    { id: 'n1', postId: 'coffee', aiId: 'anti', text: 'đã trả lời bình luận của bạn', preview: 'Ủa đăng công khai rồi không cho người ta nói?', createdAt: at(1.7), read: false, type: 'reply' },
    { id: 'n2', postId: 'coffee', aiId: 'hong', text: 'đã nhảy vào hóng drama', preview: 'Tui mua bắp rồi nha 🍿', createdAt: at(1.6), read: false, type: 'drama' },
    { id: 'n3', postId: 'cat', aiId: 'meo', text: 'đã cà khịa bài đăng của bạn', preview: 'Mèo không chảnh, chỉ là nó có tiêu chuẩn.', createdAt: at(27), read: true, type: 'comment' },
  ],
};

const KEY = 'toxicbook:v1';
export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.posts)) {
        return { ...INITIAL_STATE, ...data, settings: { ...INITIAL_STATE.settings, ...data.settings }, profile: { ...INITIAL_STATE.profile, ...data.profile } };
      }
    }
  } catch { /* corrupted storage falls back to fresh demo */ }
  return structuredClone(INITIAL_STATE);
}
export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}
export function fallbackComment({ agentId, postText = '', history = [], mode = 'seed', roastLevel = 'medium' }) {
  const last = [...history].reverse().find(x => x.role === 'user')?.text?.trim() || '';
  const topic = postText.replace(/\s+/g, ' ').slice(0, 48);
  const retorts = {
    anti: [
      'Ủa tức quá nên phải chửi lại hả? Đăng công khai thì chịu nổi vài câu góp ý đi chứ =)))',
      'Bình tĩnh bạn ơi, mới cà khịa có tí mà bật chế độ chiến đấu rồi à? 😭',
      'Đâu, lập luận tiếp đi, tui đang nghe nè. Đừng mỗi câu nào cũng "kệ tao" =)))',
    ],
    hong: [
      'Ê ê khoan! Tui mới đi lấy bắp về, ai tóm tắt diễn biến mới coi 🍿',
      'Vụ này càng lúc càng căng nha, chủ thớt đừng xóa bình luận đó 😭',
      'Ủa rồi ai thắng? Thấy hai bên đều chưa chịu nhường luôn =)))',
    ],
    khia: [
      'Tui hỏi nhẹ một câu mà bạn viết nguyên bài phản biện, cảm động quá 😌',
      'Khoan, vậy là bạn muốn được khen hay muốn được tranh luận? Chốt để tui còn biết đường cà khịa =)))',
      'Nói vậy nghe cũng hợp lý… nếu mình bỏ qua toàn bộ phần vô lý còn lại 🤭',
    ],
    hangxom: [
      'Trời đất ơi, mới lên mạng chút mà nghe ồn nguyên xóm, khổ ghê =)))',
      'Tui không muốn nhiều chuyện đâu, mà tự nhiên chuyện chạy tới trước cửa 😭',
      'Nãy giờ hàng xóm còn nghe rõ, hai đứa nhỏ tiếng chút coi =)))',
    ],
    thamtu: [
      'Đợi đã! Vừa rồi bạn nói một kiểu, giờ lại một kiểu khác. Tôi có ảnh chụp màn hình trong đầu rồi 🔎',
      'Theo hồ sơ bình luận hiện tại, bạn đang chuyển chủ đề đó nha =)))',
      'Tui soi lại từ đầu rồi, có vẻ bạn chưa đọc hết câu người ta nói 👀',
    ],
    meo: [
      'Meo. Nói lớn không đồng nghĩa với nói đúng nha 😼',
      'Tui là mèo mà còn biết bình tĩnh hơn chủ thớt đó 🐾',
      'Cãi tiếp đi, tui nằm đây xem. À nhớ cho ăn nữa 🐈',
    ],
  };
  const seeds = {
    anti: [`Ủa bài "${topic}" là đăng để khoe hay để thử độ kiên nhẫn dân mạng vậy? 😭`, 'Tự tin vậy cũng tốt, nhưng nhìn lại một lần nữa đi bạn ơi =)))'],
    hong: ['Mọi người ơi, có drama rồi! Tui vừa mở bịch bắp 🍿', 'Chủ thớt ơi bình luận phía trên đang kiếm chuyện kìa, vào cãi đi =)))'],
    khia: ['Tui muốn khen lắm, mà não tui cứ đưa ra câu hỏi ngược lại 🤨', `Câu chuyện nghe cũng hay, có điều kết luận "${topic.slice(0, 16)}" hơi tự tin ha =)))`],
    hangxom: ['Tui không soi đâu, mà vô tình thấy nguyên cái bài này thôi đó 🙃', 'Ngày xưa người ta ít đăng vậy lắm, thôi để tui nói cho nghe =)))'],
    thamtu: ['Có một chi tiết trong caption mà mọi người bỏ qua: chủ thớt đang cố gắng giải thích hơi nhiều đó 🔎', 'Tôi đã xem lại bài, cảm giác có chút gì đó không ổn nha 👀'],
    meo: ['Chê nhẹ thôi, chứ để tui chê thì khó nghe lắm đó meo 😼', 'Bài thì bình thường, tự tin thì vượt mức cho phép 😹'],
  };
  const list = mode === 'seed' ? seeds[agentId] || seeds.anti : retorts[agentId] || retorts.anti;
  const index = (history.length + postText.length + agentId.length) % list.length;
  if (mode !== 'seed' && last && roastLevel === 'spicy') return `${list[index]} Bạn vừa bảo “${last.slice(0, 60)}${last.length > 60 ? '…' : ''}” nghe cũng chiến ghê đó. 🔥`;
  return list[index];
}