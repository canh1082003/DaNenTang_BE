# ACTIVITY DIAGRAMS – HỆ THỐNG OMNICHAT

---

## I. USER MODULE

### Đăng ký tài khoản

```plantuml
@startuml
|User|
start
:Nhập thông tin đăng ký;
:POST /user/register;
|System|
:Kiểm tra hợp lệ dữ liệu;
:Gửi email xác thực;
|User|
:Nhập mã xác nhận;
|System|
:Tạo tài khoản, kích hoạt;
:Phát sự kiện socket "user_registered";
stop
@enduml
```

### Đăng nhập

```plantuml
@startuml
|User|
start
:POST /user/login;
|System|
:Kiểm tra thông tin;
:Phát token đăng nhập;
:Emit sự kiện online;
stop
@enduml
```

### Cập nhật thông tin

```plantuml
@startuml
|User|
start
:Gửi PUT /user/update/:id;
|System|
:Kiểm tra token;
:Cập nhật dữ liệu DB;
:Emit update_profile;
stop
@enduml
```

### Gửi tin nhắn

```plantuml
@startuml
|User|
start
:POST /chat/send;
|Middleware|
:verifyTokenMiddleware;
:uploadCloud;
|System|
:Lưu message vào DB;
:Emit new_message;
|AI|
:Kiểm tra trigger AI Reply;
if (Cần phản hồi AI?) then (Yes)
  :Gọi AIReplyService;
  :Sinh phản hồi AI;
  :Emit ai_reply_generated;
endif
stop
@enduml
```

### Xóa tin nhắn

```plantuml
@startuml
|User|
start
:DELETE /conversation/message/:messageId;
|System|
:Kiểm tra quyền xoá;
:Cập nhật trạng thái message;
:Emit message_deleted;
stop
@enduml
```

### Tạo nhóm chat

```plantuml
@startuml
|User|
start
:POST /conversation/group;
|System|
:Tạo conversation;
:Thêm danh sách thành viên;
:Emit group_created;
stop
@enduml
```

---

## II. ADMIN MODULE

### Dashboard Summary

```plantuml
@startuml
|Admin|
start
:GET /dashboard/summary;
|System|
:Truy vấn dữ liệu thống kê;
:Tổng hợp user, conversation, platform;
:Trả về kết quả JSON;
:Emit dashboard_update;
stop
@enduml
```

### Platform Status

```plantuml
@startuml
|Admin|
start
:GET /dashboard/platform-status;
|System|
:Lấy trạng thái webhook;
:Cập nhật dashboard realtime;
stop
@enduml
```

---

## III. AI REPLY MODULE

### Phản hồi tự động tin nhắn

```plantuml
@startuml
|System|
start
:Nhận tin nhắn mới;
|AI|
:Gọi prompt.ts để sinh prompt;
:Gọi API mô hình AI;
:Nhận phản hồi;
|System|
:Lưu phản hồi vào DB;
:Emit ai_reply_generated;
if (Tin nhắn từ Facebook/Telegram?) then (Yes)
  |Integration|
  :Gửi phản hồi qua API nền tảng;
endif
stop
@enduml
```

### Học từ phản hồi người dùng

```plantuml
@startuml
|User|
start
:Trả lời tin nhắn của AI;
|System|
:Lưu dữ liệu phản hồi;
|AI|
:Cập nhật cơ sở huấn luyện;
:Emit ai_training_update;
stop
@enduml
```

---

## IV. FACEBOOK MODULE

### Kết nối Webhook

```plantuml
@startuml
|Admin|
start
:POST /facebook/connect;
|Facebook|
:Gửi GET xác thực webhook;
|System|
:Trả về mã xác nhận;
stop
@enduml
```

### Nhận tin nhắn Facebook

```plantuml
@startuml
|Facebook|
start
:POST /facebook/webhook;
|System|
:Phân tích payload;
:Lưu message;
:Emit new_message;
|AI|
:Phản hồi tự động (nếu có);
|Facebook|
:Trả lại 200 OK;
stop
@enduml
```

### Gửi phản hồi đến người dùng Messenger

```plantuml
@startuml
|Admin|
start
:Gửi tin nhắn từ dashboard;
|System|
:Gọi Graph API /me/messages;
|Facebook|
:Gửi tin đến người dùng;
|System|
:Nhận xác nhận webhook;
:Emit message_sent;
stop
@enduml
```

---

## V. TELEGRAM MODULE

### Kết nối Webhook

```plantuml
@startuml
|Admin|
start
:POST /telegram/connect;
|Telegram|
:setWebhook API;
|System|
:Trả về OK;
stop
@enduml
```

### Nhận tin nhắn Telegram

```plantuml
@startuml
|Telegram|
start
:POST /telegram/webhook;
|System|
:Phân tích dữ liệu;
:Lưu tin nhắn;
:Emit new_message;
|AI|
:Phản hồi tự động (nếu có);
|Telegram|
:Trả về OK;
stop
@enduml
```

### Gửi tin nhắn ngược lại Telegram

```plantuml
@startuml
|Admin|
start
:POST /telegram/send-message;
|System|
:Gọi https://api.telegram.org/bot<TOKEN>/sendMessage;
|Telegram|
:Gửi tin đến người nhận;
|System|
:Nhận callback xác nhận;
:Emit message_sent;
stop
@enduml
```

---

## VI. PLATFORM MANAGEMENT

### Connect Platform

```plantuml
@startuml
|Admin|
start
:POST /platform/connect/:platform;
|System|
:Kiểm tra platform hợp lệ;
:Lưu trạng thái DB;
:Emit platform_connected;
stop
@enduml
```

### Disconnect Platform

```plantuml
@startuml
|Admin|
start
:POST /platform/disconnect/:platform;
|System|
:Cập nhật trạng thái disconnected;
:Emit platform_disconnected;
stop
@enduml
```

---

## VII. REALTIME MODULE

### Socket Connect

```plantuml
@startuml
|Client|
start
:Kết nối Socket.IO;
|System|
:Xác thực JWT;
:Join room theo conversationId;
:Emit user_online;
stop
@enduml
```

### Truyền tin nhắn realtime

```plantuml
@startuml
|System|
start
:Nhận message mới;
:Emit new_message đến room;
|Clients|
:Cập nhật giao diện chat;
stop
@enduml
```

### Online/Offline Tracking

```plantuml
@startuml
|User|
start
:Kết nối socket;
|System|
:Emit user_online;
:Ngắt kết nối;
:Emit user_offline;
|Dashboard|
:Cập nhật danh sách user online;
stop
@enduml
```

---

## VIII. HEALTH SYSTEM

```plantuml
@startuml
|Monitor|
start
:GET /health;
|System|
:Kiểm tra database, socket, API;
:Trả về {ok: true};
|Dashboard|
:Hiển thị trạng thái hệ thống;
stop
@enduml
```
