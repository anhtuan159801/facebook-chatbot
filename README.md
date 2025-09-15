# 🤖 Facebook Chatbot với RAG System

## 🎯 Tổng Quan

Chatbot hỗ trợ dịch vụ công Việt Nam được nâng cấp với **RAG (Retrieval-Augmented Generation)**, giúp cung cấp câu trả lời chính xác dựa trên tài liệu kiến thức thực tế.

### ✨ Tính Năng Chính

- 🧠 **AI-Powered**: Sử dụng Google Gemini 2.0 Flash
- 📚 **RAG System**: Tích hợp kiến thức từ tài liệu DOCX
- 🔍 **Intelligent Search**: Tìm kiếm context thông minh  
- 💬 **Facebook Integration**: Tích hợp hoàn toàn với Messenger
- 🗃️ **Database Storage**: Lưu trữ lịch sử hội thoại
- 📱 **Mobile Friendly**: Tối ưu cho giao diện mobile

## 🛠️ Setup và Cài Đặt

### 1. Yêu Cầu Hệ Thống

- Node.js >= 18.0.0
- PostgreSQL Database
- Facebook Page và App
- Google Gemini API Key
- Tài liệu data.docx

### 2. Clone và Cài Đặt

```bash
# Clone repository  
git clone https://github.com/anhtuan159801/facebook-chatbot-rag.git
cd facebook-chatbot-rag

# Cài đặt dependencies
npm install

# Tạo file environment
cp .env.example .env
```

### 3. Cấu Hình Environment

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

### 5. Chuẩn Bị Tài Liệu

- Đặt file `data.docx` vào thư mục gốc
- Đảm bảo cấu trúc như sau:

```
Chương 1: VNeID
1.1. Giới thiệu VNeID
1.2. Cách đăng ký tài khoản
[Nội dung chi tiết...]

Chương 2: Cổng Dịch Vụ Công Quốc Gia  
2.1. Giới thiệu tổng quan
2.2. Hướng dẫn đăng ký
[Nội dung chi tiết...]
```

## 🚀 Khởi Động

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

### Test RAG System

```bash
npm test
# hoặc
node test-rag.js
```

## 📊 API Endpoints

### Core Endpoints

| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| `GET` | `/health` | Kiểm tra trạng thái hệ thống |
| `GET` | `/webhook` | Facebook webhook verification |
| `POST` | `/webhook` | Xử lý tin nhắn từ Facebook |

### RAG System Endpoints

| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| `POST` | `/test-rag` | Test tìm kiếm RAG |
| `GET` | `/rag/chapters` | Danh sách chương |
| `GET` | `/rag/stats` | Thống kê RAG system |
| `POST` | `/rag/search-detailed` | Tìm kiếm chi tiết |
| `POST` | `/rag/preview-context` | Xem preview context |
| `POST` | `/rag/reload` | Reload tài liệu |

### Testing Endpoints

| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| `POST` | `/test-message` | Test xử lý tin nhắn |
| `POST` | `/send-test-message` | Test gửi tin nhắn |

## 🔧 Cách Sử Dụng RAG System

### 1. Test Tìm Kiếm

```bash
curl -X POST http://localhost:3000/test-rag \
  -H "Content-Type: application/json" \
  -d '{
    "query": "cách đăng ký VNeID",
    "topK": 5
  }'
```

### 2. Xem Thống Kê

```bash
curl http://localhost:3000/rag/stats
```

### 3. Test Toàn Bộ Flow

```bash
curl -X POST http://localhost:3000/test-message \
  -H "Content-Type: application/json" \  
  -d '{
    "psid": "test_user_123",
    "message": "hướng dẫn sử dụng cổng dịch vụ công"
  }'
```

## 📚 Cấu Trúc RAG System

### Document Chunking

```
data.docx
├── Chương 1: VNeID
│   ├── 1.1. Giới thiệu → Chunk 1
│   ├── 1.2. Đăng ký → Chunk 2  
│   └── [Content] → Chunk 3
├── Chương 2: Cổng DV Công
│   ├── 2.1. Tổng quan → Chunk 4
│   └── [Content] → Chunk 5
└── ...
```

### Search Algorithm

```javascript
// Scoring system
Chapter title match: +3 points
Section title match: +2 points
Content match: +1 point

// App-specific bonus
VNeID match: +5 points
Cổng dịch vụ match: +5 points
Sổ tay đảng match: +5 points

// Penalties
Short content (<50 chars): ×0.5
```

### Context Integration

```
User: "Cách đăng ký VNeID?"

RAG Search → Top 3 chunks
↓
Context Generation:
"RELEVANT CONTEXT FROM DOCUMENTATION:
CONTEXT 1: [VNeID Chapter content]
CONTEXT 2: [Registration steps]
---
USER QUESTION: Cách đăng ký VNeID?"

AI Response → Accurate answer based on docs
```

## 🎯 Facebook Integration

### 1. Tạo Facebook App

1. Truy cập [Facebook Developers](https://developers.facebook.com/)
2. Tạo app mới → Messenger Platform
3. Lấy Page Access Token
4. Thiết lập Webhook URL

### 2. Cấu Hình Webhook

```
Webhook URL: https://your-domain.com/webhook
Verify Token: your_custom_verify_token
Events: messages, messaging_postbacks
```

### 3. Test Integration

```bash
# Kiểm tra webhook
curl "https://your-domain.com/webhook?hub.mode=subscribe&hub.challenge=test&hub.verify_token=your_verify_token"

# Kết quả mong đợi: "test"
```

## 📈 Monitoring và Debugging

### Health Check

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "activeRequests": 0,
  "ragSystem": {
    "initialized": true,
    "totalChunks": 150,
    "availableChapters": 5
  }
}
```

### Logs Monitoring

```bash
# Xem logs realtime
tail -f logs/app.log

# Lọc RAG processing
grep "RAG" logs/app.log

# Lọc errors
grep "ERROR" logs/app.log
```

### Performance Metrics

- **Document Loading**: ~500ms
- **Search Time**: ~50ms per query  
- **End-to-End Response**: <3 seconds
- **Memory Usage**: ~200MB for 1000 chunks

## ⚠️ Troubleshooting

### Lỗi Thường Gặp

#### 1. File data.docx không tìm thấy

```
Error: ENOENT: no such file or directory
```

**Giải pháp:**
```bash
# Kiểm tra file tồn tại
ls -la data.docx

# Đảm bảo đúng tên và vị trí
mv your-document.docx data.docx
```

#### 2. Database connection failed

```
Error: connect ECONNREFUSED
```

**Giải pháp:**
```bash
# Kiểm tra PostgreSQL running
pg_isready -h localhost -p 5432

# Test connection
psql -h $DB_HOST -U $DB_USER -d $DB_NAME
```

#### 3. Gemini API timeout

```
Error: Gemini API timeout
```

**Giải pháp:**
- Kiểm tra API key
- Giảm topK chunks (5→3)
- Tăng timeout (30s→60s)

#### 4. Facebook webhook verification failed

```
Error: Token mismatch
```

**Giải pháp:**
- Kiểm tra VERIFY_TOKEN trong .env
- Đảm bảo URL webhook chính xác
- Kiểm tra HTTPS cho production

### Debug Commands

```bash
# Test RAG system
node test-rag.js basic

# Performance test  
node test-rag.js performance

# All tests
node test-rag.js all

# Reload document
curl -X POST http://localhost:3000/rag/reload
```

## 🚧 Deployment

### Render.com

```bash
# Build command
npm install

# Start command  
npm start

# Environment variables
PAGE_ACCESS_TOKEN=***
VERIFY_TOKEN=***
GEMINI_API_KEY=***
DB_HOST=***
# ...
```

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

### Health Checks

```bash
# Docker health check
HEALTHCHECK --interval=30s --timeout=10s \
  CMD curl -f http://localhost:3000/health || exit 1
```

## 📝 Best Practices

### 1. Document Structure

- Sử dụng heading nhất quán
- Tránh nội dung quá dài trong 1 section
- Đảm bảo keyword phong phú

### 2. Performance Optimization

- Giới hạn topK = 3-5 chunks
- Cache search results
- Optimize chunk size (500-1500 chars)

### 3. Error Handling

- Graceful degradation khi RAG fails
- Fallback to general knowledge
- User-friendly error messages

### 4. Security

- Validate all inputs
- Rate limiting
- Secure environment variables

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push to branch  
5. Create Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file.

## 🙋‍♂️ Support

- 📧 Email: anhtuan15082001@gmail.com
- 💬 Zalo: 0778649573 - Mr. Tuan
- 🐛 Issues: [GitHub Issues](https://github.com/your-repo/issues)

---

**Made with ❤️ for Vietnamese Public Service**