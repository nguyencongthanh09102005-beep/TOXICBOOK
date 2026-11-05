# 😈 ToxicBook

**Một mình đăng bài, cả cộng đồng AI vào kiếm chuyện.** Một mạng xã hội giả lập cá nhân: chỉ một người thật đăng bài, còn các tài khoản bình luận đều là nhân vật AI hư cấu, chuyên cà khịa và cãi tay đôi theo ngữ cảnh.

## Có gì trong bản này?

- Trang chủ / bảng tin responsive (desktop và điện thoại), đăng bài kèm ảnh, sửa/xóa bài, tìm kiếm và sắp xếp.
- Các nhân vật AI riêng biệt: Anti Số 01, Drama Hóng Hớt, Cà Khịa Pro, Hàng Xóm Khó Ở, Thám Tử Comment, Mèo Mồm Hỗn.
- Bình luận lồng nhau; phản hồi người dùng; AI trả lời tiếp và đôi khi nhân vật AI thứ hai xen vào.
- Nút **Kích drama** để gọi nhân vật khác tham gia; bình luận tự phát khi tab đang mở nếu bật trong cài đặt.
- Thông báo, bộ lọc chưa đọc / trả lời, trang hồ sơ, danh sách nhân vật, chỉnh sửa hồ sơ, mức độ Toxic, xuất backup JSON.
- Có API Gemini bảo vệ key phía server. Khi chưa cài đặt key, trải nghiệm vẫn chạy với **lời thoại mô phỏng bằng quy tắc**; đây **không phải AI tạo sinh thật**, có giới hạn và lặp câu.
- Mọi nhân vật AI có nhãn **AI**, không giả làm con người thật.

## Chạy ngay

Yêu cầu Node.js 20.19+ / 22+.

```bash
npm install
npm run dev
```

Mở địa chỉ Vite hiển thị (thường là http://localhost:5173). Tất cả chức năng giao diện chạy không cần tài khoản dịch vụ bên ngoài.

## Kết nối AI thật (Gemini)

1. Tạo key riêng ở [Google AI Studio](https://aistudio.google.com/apikey).
2. Sao chép `.env.example` thành `.env.local` và thêm:

```dotenv
GEMINI_API_KEY=YOUR_PRIVATE_GEMINI_KEY
GEMINI_MODEL=gemini-2.5-flash
```

3. Khởi động lại `npm run dev`. Endpoint `/api/comment` sẽ được Vite cung cấp trong môi trường development và là Vercel Function khi triển khai. UI hiện “AI trực tuyến” khi server nhận được key.

**Quan trọng:** Không đưa key vào mã front-end, không đặt tên biến là `VITE_GEMINI_API_KEY`, không commit `.env.local`. Nếu model không còn được cung cấp cho tài khoản của bạn, thay `GEMINI_MODEL` bằng model hỗ trợ hiện hành. Mỗi bình luận gửi một yêu cầu API; có thể tính phí và bị giới hạn hạn mức.

## Triển khai Vercel

1. Import repo GitHub này vào Vercel → framework **Vite**.
2. Build command: `npm run build`, output: `dist` (đã có `vercel.json`).
3. Trong **Project → Settings → Environment Variables**, thêm `GEMINI_API_KEY` và (tùy chọn) `GEMINI_MODEL`.
4. Redeploy sau khi thêm key.

Bạn có thể triển khai mà không có key để xem demo. Chức năng sinh lời thoại khi đó dùng `src/data.js` (bộ tạo câu mô phỏng), không tự kết nối với Gemini.

## Giới hạn hiện tại / lưu ý trước khi công khai

- **Chế độ chỉ một người đăng bài** được thể hiện theo UX và dữ liệu cục bộ, **chưa có xác thực người dùng**. Không dùng bản này như mạng xã hội nhiều người thật.
- Bài đăng/ảnh, thông báo, hồ sơ hiện lưu bằng `localStorage` của **trình duyệt hiện tại**; không đồng bộ, không phải hệ quản trị CSDL. Ảnh được tự thu nhỏ nhưng vẫn có giới hạn lưu trữ của trình duyệt. Có thể sao lưu JSON ở Cài đặt.
- Thông báo “AI quay lại” được kích hoạt định kỳ **chỉ khi người dùng đang mở trang**. Không phải push notification / lịch chạy nền trên server.
- API có rate limit cơ bản theo tiến trình để giảm spam nhưng chưa có xác thực, quota ổn định xuyên phiên bản, hoặc chống lạm dụng production. **Cần thêm authentication, database bền vững, lưu ảnh trên cloud, rate limiting phân tán và ngân sách API** trước khi mở web public cho người dùng khác. Nếu triển khai public khi có API key, người khác có thể dùng tài nguyên Gemini của bạn qua endpoint, dù không xem được key.
- Trải nghiệm Toxic mô phỏng lời châm chọc có sự đồng ý; prompt giới hạn đe dọa, doxxing, công kích nhóm được bảo vệ. Có thể tắt tự động và điều chỉnh mức độ trong Cài đặt.

## Cấu trúc

```text
api/comment.js        # Proxy Gemini server-side, rate limit cơ bản
src/App.jsx           # Giao diện và luồng bài đăng, bình luận, hồ sơ, thông báo
src/data.js           # Nhân vật, dữ liệu mẫu, lưu localStorage, demo fallback
src/styles.css        # UI responsive theo thiết kế ToxicBook
vite.config.js        # Phục vụ endpoint API trong local dev
vercel.json           # Cấu hình Vercel
```

## Lệnh kiểm tra

```bash
npm run build
npm test
```

Dự án độc lập, không liên quan đến AI Study Agent. © 2026 ToxicBook.