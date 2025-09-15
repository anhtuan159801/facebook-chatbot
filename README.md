# 🤖 Facebook Chatbot tích hợp Google Gemini

## 🎯 Tổng Quan

Chatbot Messenger được xây dựng với Node.js, tích hợp trực tiếp với mô hình ngôn ngữ Google Gemini để mang lại trải nghiệm trò chuyện thông minh và tự nhiên. Chatbot có khả năng ghi nhớ lịch sử hội thoại để cuộc trò chuyện liền mạch hơn.

### ✨ Tính Năng Chính

- 🧠 **Tích hợp Google Gemini**: Sử dụng mô hình `gemini-2.0-flash-exp` để xử lý và trả lời tin nhắn.
- 💬 **Tích hợp Facebook Messenger**: Hoạt động hoàn toàn trên nền tảng Facebook Messenger.
- 🗃️ **Lưu trữ Lịch sử Hội thoại**: Sử dụng PostgreSQL để lưu lại các cuộc trò chuyện, giúp AI có ngữ cảnh tốt hơn.
- 🚀 **API Endpoints**: Cung cấp các endpoint để kiểm tra trạng thái và gỡ lỗi.
- 🔧 **Dễ dàng Cấu hình**: Quản lý cấu hình qua file `.env`.

## 🛠️ Setup và Cài Đặt

### 1. Yêu Cầu Hệ Thống

- Node.js >= 18.0.0
- PostgreSQL Database
- Facebook Page và Facebook App
- Google Gemini API Key

### 2. Clone và Cài Đặt

```bash
# Clone repository
git clone https://github.com/anhtuan159801/facebook-chatbot.git
cd facebook-chatbot

# Cài đặt dependencies
npm install
```

### 3. Cấu Hình Environment

Tạo một file tên là `.env` ở thư mục gốc và điền các thông tin sau:

```env
# Facebook Messenger Configuration
PAGE_ACCESS_TOKEN=your_facebook_page_access_token
VERIFY_TOKEN=your_custom_verify_token

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Database Configuration
DB_HOST=your_postgresql_host
DB_PORT=5432
DB_USER=your_db_username
DB_PASSWORD=your_db_password
DB_NAME=your_database_name

# Server Configuration
PORT=3000
NODE_ENV=production
```

### 4. Chuẩn Bị Database

Kết nối vào database PostgreSQL của bạn và chạy câu lệnh SQL sau để tạo bảng cần thiết:

```sql
-- Tạo bảng conversations
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    message TEXT,
    bot_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index để tối ưu query
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at);
```

## 🚀 Khởi Động

### Chế độ Development

```bash
npm run dev
```

### Chế độ Production

```bash
npm start
```

## 📊 API Endpoints

| Method | Endpoint             | Mô Tả                               | 
|--------|----------------------|-------------------------------------| 
| `GET`  | `/health`            | Kiểm tra trạng thái của server      | 
| `GET`  | `/webhook`           | Dùng cho Facebook webhook verification | 
| `POST` | `/webhook`           | Xử lý tin nhắn từ Facebook Messenger | 
| `GET`  | `/test`              | Endpoint test chung của server      | 
| `POST` | `/test-webhook`      | Test nhận dữ liệu webhook thủ công  | 
| `POST` | `/test-message`      | Test xử lý một tin nhắn giả lập     | 
| `POST` | `/send-test-message` | Test gửi tin nhắn qua Send API      | 

## 🔧 Cách Sử Dụng

### 1. Tích hợp Facebook

1.  Truy cập [Facebook Developers](https://developers.facebook.com/) và tạo một App.
2.  Thiết lập Messenger Platform, lấy `PAGE_ACCESS_TOKEN` cho Fanpage của bạn.
3.  Cấu hình Webhook:
    *   **Webhook URL**: `https://your-domain.com/webhook` (thay `your-domain.com` bằng URL server của bạn).
    *   **Verify Token**: Điền giá trị bạn đã đặt trong file `.env`.
    *   **Subscribe to events**: Chọn `messages` và `messaging_postbacks`.

### 2. Test Gửi Tin Nhắn

Bạn có thể dùng endpoint `/test-message` để kiểm tra luồng xử lý tin nhắn mà không cần gửi từ Facebook.

```bash
curl -X POST http://localhost:3000/test-message \
  -H "Content-Type: application/json" \
  -d 
'{ 
    "psid": "test_user_123",
    "message": "Xin chào, bạn có thể giúp gì cho tôi?"
  }'
```

## 📈 Monitoring và Debugging

### Health Check

Truy cập endpoint `/health` để kiểm tra "sức khỏe" của ứng dụng.

```bash
curl http://localhost:3000/health
```

Phản hồi mẫu:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "activeRequests": 0,
  "uptime": 123.45,
  "memory": {
    "rss": 51453952,
    "heapTotal": 34340864,
    "heapUsed": 27057352,
    "external": 16777216,
    "arrayBuffers": 10301
  }
}
```

## 🚧 Deployment

### Render.com

```bash
# Build command
npm install

# Start command
npm start
```
Sau đó, vào mục **Environment** và cài đặt các biến môi trường như trong file `.env`.

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --production

COPY . .
EXPOSE 3000

CMD ["npm", "start"]
```

## 🤝 Contributing

1.  Fork repository
2.  Tạo feature branch
3.  Commit changes
4.  Push to branch
5.  Create Pull Request

## 📄 License

MIT License.

## 🙋‍♂️ Support

- 📧 Email: anhtuan15082001@gmail.com
- 💬 Zalo: 0778649573 - Mr. Tuan
- 🐛 Issues: [GitHub Issues](https://github.com/anhtuan159801/facebook-chatbot/issues)