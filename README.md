# 😈 ToxicBook — AI thật, không dùng bình luận mẫu

**Một mình đăng bài. Cả cộng đồng AI vào kiếm chuyện.** ToxicBook là web cá nhân: một chủ web đăng caption/ảnh và 6 nhân vật AI Gemini bình luận, cà khịa, cãi lại qua nhiều lượt. Các tài khoản AI đều được dán nhãn rõ; không có người thật nào khác bình luận.

## Tính năng hoạt động

- React + Vite: bảng tin, đăng bài/ảnh, sửa/xóa, hồ sơ, tìm kiếm, thông báo, bình luận dạng cây, giao diện mobile.
- **AI tự vào bình luận sau khi đăng:** tự chọn 1–5 nhân vật (mặc định 3), từng AI gọi Gemini thật để nhận xét ảnh/caption, không có nút "Kích drama". Khi một AI lỗi, các AI còn lại vẫn được thử; khi bạn trả lời, AI tiếp tục cãi đúng chuỗi.
- **Gemini tự xem và chê ảnh:** ảnh được nén vừa giới hạn request rồi gửi cho Gemini qua server; mỗi bình luận đầu tiên được hướng dẫn dựa trên một chi tiết thật trong ảnh (góc chụp, bố cục, trang phục, ánh sáng...), không được bịa chi tiết hoặc chỉ nhận xét caption.
- **Nhớ ngữ cảnh:** chuỗi cãi nhau được gửi cho Gemini trong mỗi lượt, không tạo các câu chửi ngẫu nhiên có sẵn.
- **Không fallback:** không có AI key, AI lỗi, hết quota hoặc mạng mất thì hiển thị lỗi rõ; **không tạo câu giả**.
- **Owner password:** chỉ người đăng nhập bằng mật khẩu chủ web mới truy cập và gọi AI. Trên Vercel luôn bắt buộc cấu hình mật khẩu.
- **Lưu dữ liệu trên server:** chạy local lưu ở `.toxicbook/state.json`; trên Vercel dùng Supabase Postgres; không phụ thuộc `localStorage`.
- 6 nhân vật AI, 3 mức độ toxic. Không đe dọa, kỳ thị đặc điểm nhạy cảm hay tiết lộ thông tin riêng tư.

## Chạy trên máy Windows

Cần Node.js 20.19+ hoặc 22+ và npm. Trong PowerShell:

```powershell
# Lần đầu tải repo:
git clone https://github.com/nguyencongthanh09102005-beep/TOXICBOOK.git
cd TOXICBOOK
npm install

# Tạo file môi trường riêng (KHÔNG đưa lên GitHub):
Copy-Item .env.example .env.local
notepad .env.local
```

Lấy Gemini API key ở [Google AI Studio](https://aistudio.google.com/apikey). Điền vào `.env.local`:

```dotenv
GEMINI_API_KEY=day_la_key_thuc_cua_ban
GEMINI_MODEL=gemini-3.8-flash
TOXICBOOK_OWNER_PASSWORD=mat_khau_manh_cua_rieng_ban
```

Sau đó chạy:

```powershell
npm run dev
```

Mở **http://localhost:5173** rồi đăng nhập bằng `TOXICBOOK_OWNER_PASSWORD`. Lần sau cập nhật: `git pull origin main`, `npm install`, `npm run dev`. Thay đổi `.env.local` thì phải tắt/chạy lại server. **Không gửi API key/mật khẩu trong chat hoặc commit GitHub.**

### Test nhanh AI thật

1. Đăng một tấm ảnh có caption "Ảnh tui chụp nè, đẹp không?".
2. Đợi AI bình luận từ Gemini. Bình luận này phải dựa trên thứ **thực sự có trong ảnh**.
3. Nhấn **Trả lời** vào Anti Số 01 và nhắn "Mày nói ai xấu?"; AI sẽ được hỏi Gemini lại với ngữ cảnh của chính chuỗi bình luận đó.
4. Nếu lỗi, màn hình sẽ báo rõ lỗi; không sinh văn bản dựng sẵn.

**Lưu ý:** mỗi bình luận AI tiêu thụ một request Gemini, có hạn mức/chi phí tùy tài khoản. Tính năng AI tự quay lại bình luận **mặc định bật** (mỗi 4 phút khi tab đang mở, có thể tắt trong Cài đặt để tiết kiệm quota); không có tác vụ nền khi đóng web. Sau khi đăng bài, AI tự bình luận dù không bật/tắt tính năng quay lại bài cũ.

## Triển khai website lên Vercel + Supabase (để dùng trên nhiều thiết bị)

**Không chỉ import GitHub là đủ.** Bản production cần cấu hình 3 dịch vụ:

1. **Supabase:** tạo project, vào **SQL Editor** chạy file [`supabase/schema.sql`](supabase/schema.sql). Không tạo chính sách public đọc/ghi. Lấy Project URL và **service_role secret key** (chỉ dùng phía server).
2. **Vercel:** import repository, Framework Preset **Vite**, build `npm run build`, output `dist`. Thêm environment variables cho Production (và Preview nếu dùng):

   - `GEMINI_API_KEY` — Gemini API key từ Google AI Studio.
   - `GEMINI_MODEL` — ví dụ `gemini-3.8-flash` (model cần có trên tài khoản).
   - `TOXICBOOK_OWNER_PASSWORD` — mật khẩu mạnh riêng cho chủ web; bắt buộc khi deploy.
   - `TOXICBOOK_SESSION_SECRET` — chuỗi bí mật ngẫu nhiên dài, dùng ký cookie đăng nhập.
   - `SUPABASE_URL` — Project URL.
   - `SUPABASE_SERVICE_ROLE_KEY` — secret key Supabase. **Tuyệt đối không dùng tiền tố `VITE_` cho biến này.**

3. Redeploy và vào URL của Vercel. Đăng nhập, đăng ảnh, thử cho AI bình luận và refresh để kiểm tra bài còn tồn tại.

ToxicBook lưu tất cả thông tin của một chủ web vào hàng `id='owner'` của bảng `toxicbook_state` bằng Supabase REST, với service key chỉ chạy trên server. Hàng này không cho phép người dùng ẩn danh đọc/ghi nhờ RLS và không có public policy. Cách lưu JSONB này phù hợp cho quy mô cá nhân nhỏ, **không** dành cho mạng xã hội hàng nghìn tài khoản. Ảnh nén được lưu trong JSON; để mở rộng hơn cần tách ảnh sang Supabase Storage.

### Xác thực và API

- `/api/session` — GET xem trạng thái, POST login, DELETE logout (cookie HttpOnly/SameSite=Strict).
- `/api/state` — GET/PUT dữ liệu trên server, chỉ chủ web được phép truy cập.
- `/api/comment` — GET trạng thái, POST tạo bình luận Gemini thực sự, chỉ chủ web được phép gọi.

API có giới hạn số request cơ bản trong tiến trình; để chịu tải lớn cần bổ sung rate-limit tập trung và quản lý ngân sách Gemini. Không cung cấp khóa API cho front-end.

## Kiểm thử

```bash
npm test
npm run build
```

Các test Node kiểm tra persona, trạng thái rỗng ban đầu, không tạo comment giả khi thiếu key, xác thực và bảo vệ endpoint. **Không thể xác minh Gemini trả lời thật nếu chưa cấu hình một API key hợp lệ và gọi request live.**

## Thông tin triển khai

Không có push notification nền: thông báo được tạo trong web khi Gemini bình luận; tự gọi lại bài cũ chỉ xảy ra khi tab đang mở và bật Auto drama. Dữ liệu local cũ nằm trong `localStorage` của bản mô phỏng không tự đưa vào server nhằm không nhập nhầm comment mẫu vào bản thật. Hãy xuất bản sao lưu trước khi nâng cấp nếu cần giữ dữ liệu cũ.
