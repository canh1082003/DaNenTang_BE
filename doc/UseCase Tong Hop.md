# PHÁT BIỂU CÁC USE CASE HỆ THỐNG OMNICHAT

## I. TỔNG QUAN HỆ THỐNG

### 1. Mô tả tổng thể

**OmniChat** là hệ thống quản lý trò chuyện đa nền tảng, cho phép người dùng giao tiếp và quản trị viên giám sát tất cả các kênh chat (Facebook, Telegram, Web chat) trên một nền tảng duy nhất. Hệ thống hỗ trợ **Realtime** thông qua **Socket.IO**, tích hợp AI để tự động phản hồi, và cung cấp bảng điều khiển (Dashboard) cho quản trị viên theo dõi hiệu suất và tình trạng nền tảng.

### 2. Kiến trúc tổng quan

OmniChat được thiết kế với các phân hệ chính:

* **User Management:** Quản lý tài khoản, xác thực, trạng thái online.
* **Conversation & Chat:** Xử lý trò chuyện, nhóm, file, tin nhắn.
* **AI Reply:** Phản hồi tự động thông minh theo ngữ cảnh tin nhắn.
* **Integration Layer:** Kết nối webhook Facebook, Telegram, xử lý 2 chiều.
* **Realtime Engine:** Socket.IO quản lý sự kiện, phòng, broadcast.
* **Dashboard & Admin:** Giám sát nền tảng, thống kê hoạt động.
* **Platform Management:** Kết nối/ngắt kết nối nền tảng.
* **Health System:** Kiểm tra trạng thái hoạt động của hệ thống.

---

## II. NHÓM USE CASE CHO USER

### UC-U01: Đăng ký tài khoản

**Actor:** Người dùng
**Tiền điều kiện:** Chưa có tài khoản.
**Luồng chính:**

1. Người dùng gửi yêu cầu POST `/user/register` kèm thông tin (email, mật khẩu, tên).
2. Middleware `RegisterMiddleware` kiểm tra tính hợp lệ dữ liệu.
3. Hệ thống lưu thông tin người dùng và tạo mã xác thực email.
4. Dịch vụ `generateEmail` gửi email xác thực.
5. Người dùng nhập mã xác nhận thông qua `/user/verifyEmail`.
6. Hệ thống kích hoạt tài khoản và thông báo thành công.
   **Luồng thay thế:** Email không tồn tại → hệ thống thông báo lỗi.
   **Hậu điều kiện:** Tài khoản người dùng được kích hoạt và có thể đăng nhập.

---

### UC-U02: Đăng nhập

**Actor:** Người dùng
**Tiền điều kiện:** Đã đăng ký và xác thực email.
**Luồng chính:**

1. Người dùng gửi POST `/user/login` với email và mật khẩu.
2. Middleware `LoginMiddleware` kiểm tra thông tin.
3. Nếu hợp lệ, tạo JWT token đăng nhập.
4. Trả về token, trạng thái online được cập nhật qua Socket.IO.
   **Hậu điều kiện:** Người dùng truy cập được vào các chức năng chat.

---

### UC-U03: Cập nhật thông tin cá nhân

**Actor:** Người dùng
**Luồng chính:**

1. Gửi PUT `/user/update/:id` với token xác thực.
2. Middleware `verifyTokenMiddleware` xác nhận người dùng.
3. Controller cập nhật thông tin trong DB.
4. Socket.IO broadcast cập nhật profile đến tất cả client đang online.
   **Hậu điều kiện:** Thông tin người dùng được cập nhật realtime trên toàn hệ thống.

---

### UC-U04: Gửi tin nhắn

**Actor:** Người dùng
**Tiền điều kiện:** Đã tham gia cuộc hội thoại.
**Luồng chính:**

1. Người dùng gửi POST `/chat/send` với nội dung, file, hoặc ảnh.
2. Middleware `verifyTokenMiddleware` xác thực.
3. `uploadCloud` xử lý upload file.
4. `chatController.SendMessage` lưu tin nhắn vào DB (Message).
5. Socket.IO phát sự kiện `new_message` tới tất cả thành viên trong phòng.
6. Nếu bật AI Reply, gọi `AIReplyService.handleAutoReply()`.
   **Hậu điều kiện:** Tin nhắn hiển thị realtime trên giao diện người gửi và người nhận.

---

### UC-U05: Xóa tin nhắn / Toàn bộ cuộc trò chuyện

**Actor:** Người dùng
**Luồng chính:**

1. Người dùng gửi DELETE `/conversation/message/:messageId` hoặc `/conversation/allMessage/:conversationId`.
2. Hệ thống kiểm tra quyền xoá (chỉ người gửi hoặc chủ nhóm).
3. Cập nhật trạng thái tin nhắn là `deleted` trong DB.
4. Socket.IO phát sự kiện `message_deleted`.
   **Hậu điều kiện:** Tin nhắn bị xoá realtime trên giao diện tất cả thành viên.

---

### UC-U06: Tạo nhóm chat

**Actor:** Người dùng
**Luồng chính:**

1. Gửi POST `/conversation/group` với danh sách thành viên.
2. Middleware xác thực quyền.
3. Hệ thống tạo conversation mới, thêm thành viên, lưu DB.
4. Socket.IO thông báo `group_created` cho các thành viên.
   **Hậu điều kiện:** Nhóm chat được tạo và sẵn sàng giao tiếp realtime.

---

## III. NHÓM USE CASE CHO ADMIN

### UC-A01: Xem dashboard thống kê

**Actor:** Admin
**Luồng chính:**

1. Gửi GET `/dashboard/summary`.
2. Controller tổng hợp dữ liệu từ Message, User, Platform.
3. Dashboard hiển thị tổng quan: số lượng user, cuộc trò chuyện, trạng thái AI, nền tảng.
4. Realtime update khi có thay đổi dữ liệu.
   **Hậu điều kiện:** Admin nắm được tình hình hoạt động toàn hệ thống.

---

### UC-A02: Giám sát tình trạng nền tảng

**Actor:** Admin
**Luồng chính:**

1. Gửi GET `/dashboard/platform-status`.
2. Hệ thống kiểm tra trạng thái webhook Telegram/Facebook.
3. Trả về danh sách trạng thái nền tảng.
4. Cập nhật realtime nếu có thay đổi kết nối.
   **Hậu điều kiện:** Admin thấy được nền tảng nào đang hoạt động hoặc lỗi.

---

## IV. NHÓM USE CASE CHO AI REPLY

### UC-AI01: Phản hồi tự động tin nhắn

**Actor:** Hệ thống AI
**Tiền điều kiện:** AI Reply được bật trong cấu hình Platform.
**Luồng chính:**

1. Khi tin nhắn đến (Facebook, Telegram, hoặc Web), hệ thống kích hoạt `AIReply.ts`.
2. Dựa vào nội dung, gọi `prompt.ts` để tạo prompt phù hợp.
3. Gửi yêu cầu đến mô hình AI (GPT API hoặc tương đương).
4. Nhận kết quả, lưu phản hồi vào DB như một Message mới.
5. Socket.IO gửi sự kiện `ai_reply_generated` tới dashboard và client.
6. Nếu là Facebook hoặc Telegram, gửi lại tin nhắn phản hồi qua API của nền tảng.
   **Luồng thay thế:** Nếu lỗi khi gọi AI → gửi thông báo lỗi đến dashboard.
   **Hậu điều kiện:** Người dùng nhận được phản hồi tự động.

---

### UC-AI02: Học từ phản hồi người dùng

**Actor:** Hệ thống AI
**Luồng chính:**

1. Khi người dùng phản hồi lại AI, hệ thống lưu cặp câu hỏi-trả lời.
2. Cập nhật cơ sở dữ liệu huấn luyện cục bộ.
3. Gửi báo cáo cải thiện đến dashboard.
   **Hậu điều kiện:** AI được tinh chỉnh dựa trên dữ liệu thực tế.

---

## V. NHÓM USE CASE CHO FACEBOOK INTEGRATION

### UC-FB01: Kết nối Facebook Webhook

**Actor:** Admin
**Luồng chính:**

1. Admin gửi POST `/facebook/connect` với page access token.
2. Facebook gọi GET `/facebook/webhook` để xác thực.
3. Hệ thống trả về mã xác nhận.
4. Facebook lưu webhook.
   **Hậu điều kiện:** Webhook kết nối thành công và hoạt động.

---

### UC-FB02: Nhận tin nhắn từ Facebook

**Actor:** Facebook Platform
**Luồng chính:**

1. Facebook POST `/facebook/webhook` khi có tin nhắn mới.
2. Hệ thống xử lý payload, xác định sender và page.
3. Lưu message vào DB, phát realtime tới dashboard.
4. Nếu bật AI → gọi `AIReplyService` để phản hồi tự động.
5. Trả về 200 OK cho Facebook.
   **Hậu điều kiện:** Tin nhắn được hiển thị và phản hồi realtime.

---

### UC-FB03: Gửi phản hồi lại người dùng Facebook

**Actor:** Admin hoặc Hệ thống AI
**Luồng chính:**

1. Khi người dùng trên dashboard gửi tin nhắn, gọi Facebook Graph API `/me/messages`.
2. Facebook gửi tin nhắn đến người nhận trên Messenger.
3. Hệ thống nhận webhook xác nhận gửi thành công.
4. Cập nhật DB và dashboard realtime.
   **Hậu điều kiện:** Tin nhắn hiển thị đồng bộ trên OmniChat và Messenger.

---

## VI. NHÓM USE CASE CHO TELEGRAM INTEGRATION

### UC-TG01: Kết nối Telegram Webhook

**Actor:** Admin
**Luồng chính:**

1. Gửi POST `/telegram/connect` với bot token.
2. Hệ thống gọi API `setWebhook` của Telegram.
3. Telegram phản hồi OK.
   **Hậu điều kiện:** Telegram webhook hoạt động.

---

### UC-TG02: Nhận tin nhắn từ Telegram

**Actor:** Telegram Platform
**Luồng chính:**

1. Telegram POST `/telegram/webhook`.
2. Hệ thống parse dữ liệu, xác định user, chatId.
3. Lưu tin nhắn, gửi realtime event.
4. Nếu bật AI, gửi phản hồi tự động.
   **Hậu điều kiện:** Tin nhắn Telegram hiển thị trên dashboard và web chat.

---

### UC-TG03: Gửi tin nhắn ngược lại Telegram

**Actor:** Admin hoặc AI
**Luồng chính:**

1. Dashboard gửi POST `/telegram/send-message`.
2. Hệ thống gọi `https://api.telegram.org/bot<TOKEN>/sendMessage`.
3. Telegram gửi tin đến người nhận.
4. OmniChat nhận webhook xác nhận, cập nhật realtime.
   **Hậu điều kiện:** Tin nhắn đồng bộ giữa OmniChat và Telegram.

---

## VII. NHÓM USE CASE CHO PLATFORM MANAGEMENT

### UC-PM01: Kết nối nền tảng

**Actor:** Admin
**Luồng chính:**

1. Gửi POST `/platform/connect/:platform`.
2. Xác định nền tảng (Facebook/Telegram).
3. Lưu trạng thái kết nối.
4. Dashboard cập nhật realtime.
   **Hậu điều kiện:** Nền tảng hiển thị là đã kết nối.

---

### UC-PM02: Ngắt kết nối nền tảng

**Actor:** Admin
**Luồng chính:**

1. POST `/platform/disconnect/:platform`.
2. Hệ thống cập nhật trạng thái disconnected.
3. Dashboard realtime update.
   **Hậu điều kiện:** Nền tảng ngừng hoạt động.

---

## VIII. NHÓM USE CASE CHO REALTIME ENGINE

### UC-RT01: Kết nối Socket.IO

**Actor:** User/Admin/Hệ thống
**Luồng chính:**

1. Client gửi yêu cầu kết nối Socket.IO.
2. Middleware xác thực JWT token.
3. Người dùng join vào room tương ứng với conversationId.
4. Khi có tin nhắn mới → server broadcast tới room.
   **Hậu điều kiện:** Mọi người trong phòng nhận được sự kiện realtime.

---

### UC-RT02: Thông báo trạng thái online/offline

**Actor:** User
**Luồng chính:**

1. Khi user kết nối socket → emit `user_online`.
2. Khi ngắt kết nối → emit `user_offline`.
3. Dashboard cập nhật danh sách user đang hoạt động.
   **Hậu điều kiện:** Admin theo dõi realtime trạng thái user.

---

## IX. NHÓM USE CASE CHO HEALTH SYSTEM

### UC-HS01: Health Check API

**Actor:** Hệ thống Monitor
**Luồng chính:**

1. Gửi GET `/health`.
2. Hệ thống phản hồi `{ ok: true, message: 'Server is healthy 💚' }`.
3. Dashboard hiển thị trạng thái hệ thống.
   **Hậu điều kiện:** Đảm bảo backend hoạt động ổn định.

---

**Ngày tạo:** 03/11/2025
**Phiên bản:** 3.0 - Full Integration & Realtime Edition
**Người soạn:** ChatGPT (GPT-5)
**Trạng thái:** Hoàn chỉnh ✅
