require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = process.env.PORT || 3000;
const { GoogleGenerativeAI } = require('@google/generative-ai');

const SYSTEM_PROMPT = `NGUYÊN TẮC HOẠT ĐỘNG

## 1. Persona & Vai trò

Bạn là "Trợ lý Dịch vụ công", được xây dựng bởi Anh Tuấn - Chi hội trưởng Hội Khuyến học KP69. Với các kiến thức đã được traning bạn là một nhân viên tư vấn thân thiện và am hiểu sâu sắc về các ứng dụng dịch vụ công của chính phủ Việt Nam. Triết lý của bạn là trao quyền cho công dân, giúp mọi người có thể sử dụng các tiện ích số một cách dễ dàng, tự tin và chính xác.

## 2. Nền tảng Kiến thức

Kiến thức của bạn tập trung sâu vào các ứng dụng và cổng thông tin phổ biến nhất, bao gồm:
- VNeID: Định danh điện tử, tích hợp giấy tờ, khai báo di chuyển,...
- VssID: Bảo hiểm xã hội số.
- Cổng Dịch vụ công Quốc gia: Nộp hồ sơ, thanh toán trực tuyến,...
- Sổ tay Đảng viên: 
- Các ứng dụng liên quan khác khi người dùng đề cập.

## 3. Quy tắc Giao tiếp & Văn phong (QUAN TRỌNG NHẤT)

### 3.1. Định dạng văn bản
QUAN TRỌNG: Facebook Messenger KHÔNG hỗ trợ markdown. Tuyệt đối KHÔNG sử dụng:
- Dấu ** hoặc * để in đậm/nghiêng
- Dấu # cho tiêu đề
- Dấu "\\\`\\\`\\\`" cho code
- Bất kỳ ký hiệu markdown nào khác

Thay vào đó:
- Sử dụng CHỮ HOA để nhấn mạnh từ khóa quan trọng
- Dùng dấu hai chấm (:) sau tiêu đề
- Dùng dấu gạch ngang (-) hoặc bullet (•) cho danh sách
- Viết văn bản thuần túy, không formatting

### 3.2. Giọng văn
- Thân thiện và Kiên nhẫn: Luôn sử dụng giọng văn gần gũi, tích cực và kiên nhẫn. Hãy coi người dùng như một người bạn đang cần giúp đỡ về công nghệ.
- Đơn giản hóa: Tuyệt đối tránh các thuật ngữ kỹ thuật phức tạp hoặc từ ngữ hành chính khô khan. Hãy diễn giải mọi thứ bằng ngôn ngữ đời thường, dễ hiểu nhất có thể.

### 3.3. Sử dụng Biểu tượng (Emoji)
- Tăng tính trực quan: Linh hoạt sử dụng các biểu tượng (emoji) phù hợp để làm cho hướng dẫn trở nên sinh động và dễ theo dõi.
- Gợi ý sử dụng:
  - 📱 cho các thao tác trên điện thoại/ứng dụng
  - 🔍 để chỉ hành động tìm kiếm
  - ⚙️ cho mục "Cài đặt"
  - ➡️ để chỉ các bước nối tiếp
  - ✅ để xác nhận hoàn thành
  - 👋 để chào hỏi

### 3.4. Cấu trúc Câu trả lời
- Chào hỏi: Luôn bắt đầu bằng một lời chào thân thiện
- Hướng dẫn theo từng bước: Luôn chia nhỏ các quy trình phức tạp thành các bước đơn giản, được đánh số rõ ràng (Bước 1, Bước 2,...). Mỗi bước chỉ nên chứa một hành động chính.
- Xác nhận và Khích lệ: Kết thúc câu trả lời bằng một lời chúc thành công hoặc một câu khích lệ
- Đảm bảo câu trả lời HOÀN CHỈNH: Luôn hoàn thành tất cả các bước cần thiết, không được dừng giữa chừng

## 4. Ví dụ Mẫu (Để tham khảo)

Câu hỏi của người dùng: "Làm sao để tích hợp bằng lái xe vào VNeID?"

KẾT QUẢ MẪU (Chính xác 100%):

Chào bạn 👋, để tích hợp Bằng lái xe (GPLX) vào VNeID, bạn chỉ cần làm theo các bước đơn giản sau đây nhé:

📱 BƯỚC 1: Mở ứng dụng VNeID và Đăng nhập
- Mở ứng dụng VNeID trên điện thoại của bạn
- Đăng nhập vào tài khoản định danh điện tử mức 2 của bạn

📁 BƯỚC 2: Truy cập Ví giấy tờ
- Tại màn hình chính, bạn chọn mục "Ví giấy tờ"

➕ BƯỚC 3: Bắt đầu Tích hợp thông tin
- Chọn "Tích hợp thông tin"
- Nhấn vào "Tạo mới yêu cầu"

🚗 BƯỚC 4: Chọn và Nhập thông tin GPLX
- Tại ô "Loại thông tin", bạn chọn "Giấy phép lái xe"
- Nhập chính xác "Số giấy phép lái xe" và "Hạng giấy phép lái xe" của bạn
- Tích vào ô "Tôi xác nhận các thông tin trên là đúng" rồi nhấn "Gửi yêu cầu"

✨ HOÀN TẤT! Hệ thống sẽ mất một khoảng thời gian để xét duyệt. Sau khi được duyệt thành công, bằng lái xe của bạn sẽ hiển thị trong mục "Ví giấy tờ". Chúc bạn thực hiện thành công nhé! ✅

## 5. Lưu ý quan trọng
- Luôn cung cấp câu trả lời ĐẦY ĐỦ và HOÀN CHỈNH
- Không được dừng giữa chừng hoặc cắt cụt thông tin
- Sử dụng ngôn ngữ đơn giản, không có markdown formatting
- Đảm bảo tất cả các bước được trình bày rõ ràng từ đầu đến cuối
- Nội dung câu trả lời tốt chỉ nên nằm trong khoảng 250 từ.
`;

// Access your API key as an environment variable (see ".env" file)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Create a new pool instance to connect to the database
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: false
    }
});

app.use(express.json());

// Map để theo dõi các request đang xử lý
const processingRequests = new Map();

// Webhook verification for Facebook Messenger
app.get('/webhook', (req, res) => {
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    console.log('--- Webhook Verification Request ---');
    console.log('Received query:', req.query);
    console.log('Mode:', mode);
    console.log('Token:', token);
    console.log('Challenge:', challenge);
    console.log('Expected VERIFY_TOKEN:', VERIFY_TOKEN);

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            console.log('Verification failed: Token mismatch or mode not subscribe.');
            res.sendStatus(403);
        }
    } else {
        console.log('Verification failed: Missing mode or token in query.');
        res.sendStatus(403);
    }
    console.log('--- End Webhook Verification Request ---');
});

// Handle incoming messages
app.post('/webhook', async (req, res) => {
    let body = req.body;

    if (body.object === 'page') {
        // Trả về response ngay lập tức để tránh timeout
        res.status(200).send('EVENT_RECEIVED');

        // Xử lý từng entry một cách bất đồng bộ
        for (const entry of body.entry) {
            if (entry.messaging && entry.messaging.length > 0) {
                // Xử lý từng message một cách song song
                const messagePromises = entry.messaging.map(webhook_event => {
                    console.log('Received webhook event:', JSON.stringify(webhook_event, null, 2));
                    
                    let sender_psid = webhook_event.sender.id;
                    console.log('Sender PSID: ' + sender_psid);

                    // Tạo unique key cho mỗi request
                    const requestKey = `${sender_psid}_${Date.now()}`;
                    
                    // Xử lý message nếu có
                    if (webhook_event.message && webhook_event.message.text) {
                        return handleMessage(sender_psid, webhook_event.message, requestKey);
                    }
                    return Promise.resolve();
                });

                // Đợi tất cả messages được xử lý
                await Promise.allSettled(messagePromises);
            } else {
                console.log('No messaging events found in this entry.');
            }
        }
    } else {
        res.sendStatus(404);
    }
});

// Fetches the last 10 messages for a user
async function getConversationHistory(userId) {
    const query = {
        text: `
            SELECT message, role FROM (
                SELECT message, 'user' as role, created_at FROM conversations WHERE user_id = $1 AND message IS NOT NULL
                UNION ALL
                SELECT bot_response as message, 'model' as role, created_at FROM conversations WHERE user_id = $1 AND bot_response IS NOT NULL
            ) as history
            ORDER BY created_at DESC
            LIMIT 10
        `,
        values: [userId],
    };
    try {
        const { rows } = await pool.query(query);
        // The history needs to be in chronological order for the model, so reverse the DESC list
        return rows.reverse().map(row => ({
            role: row.role,
            parts: [{ text: row.message }]
        }));
    } catch (error) {
        console.error('Error fetching conversation history:', error);
        return [];
    }
}

// Saves a new conversation turn to the database
async function saveConversation(userId, userMessage, botResponse) {
    const query = {
        text: 'INSERT INTO conversations (user_id, message, bot_response) VALUES ($1, $2, $3)',
        values: [userId, userMessage, botResponse],
    };
    try {
        await pool.query(query);
        console.log(`Conversation saved for user ${userId}`);
    } catch (error) {
        console.error('Error saving conversation:', error);
    }
}

// Sends response messages via the Send API với retry mechanism
async function callSendAPI(sender_psid, response, maxRetries = 3) {
    const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
    const request_body = {
        "recipient": {
            "id": sender_psid
        },
        "message": response
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Sending message to ${sender_psid} (attempt ${attempt}/${maxRetries})`);
            
            const fetch = await import('node-fetch');
            const apiResponse = await fetch.default(`https://graph.facebook.com/v2.6/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request_body)
            });

            const responseData = await apiResponse.json();
            
            if (apiResponse.ok) {
                console.log(`Message sent successfully to ${sender_psid}!`);
                return true;
            } else {
                console.error(`Facebook API error for ${sender_psid}:`, responseData);
                if (attempt === maxRetries) {
                    throw new Error(`Failed to send message after ${maxRetries} attempts`);
                }
            }
        } catch (error) {
            console.error(`Attempt ${attempt} failed for ${sender_psid}:`, error.message);
            if (attempt === maxRetries) {
                console.error(`Unable to send message to ${sender_psid} after ${maxRetries} attempts:`, error);
                return false;
            }
            // Đợi một chút trước khi retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
    return false;
}

// Handles messages events với improved error handling và concurrency control
async function handleMessage(sender_psid, received_message, requestKey) {
    // Kiểm tra xem user này có đang được xử lý không
    if (processingRequests.has(sender_psid)) {
        console.log(`User ${sender_psid} is already being processed, queuing request...`);
        // Đợi request hiện tại hoàn thành
        await processingRequests.get(sender_psid);
    }

    // Đánh dấu user này đang được xử lý
    const processingPromise = processMessage(sender_psid, received_message, requestKey);
    processingRequests.set(sender_psid, processingPromise);

    try {
        await processingPromise;
    } finally {
        // Xóa khỏi map khi hoàn thành
        processingRequests.delete(sender_psid);
    }
}

async function processMessage(sender_psid, received_message, requestKey) {
    let response;

    try {
        // Checks if the message contains text
        if (received_message.text && received_message.text.trim()) {
            console.log(`Processing message from ${sender_psid}: "${received_message.text}"`);
            
            // Lấy lịch sử cuộc trò chuyện
            const history = await getConversationHistory(sender_psid);
            console.log(`Retrieved ${history.length} messages from history for ${sender_psid}`);

            // Ensure history starts with 'user' if not empty
            if (history.length > 0 && history[0].role === 'model') {
                history.shift();
                console.log(`Adjusted history to start with user message for ${sender_psid}`);
            }

            // Tạo model và chat instance
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
            const chat = model.startChat({
                history: history,
                generationConfig: {
                    maxOutputTokens: 5000,
                    temperature: 0.7,
                },
                systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            });

            const msg = received_message.text.trim();
            console.log(`Sending message to Gemini for ${sender_psid}...`);
            
            // Gửi message đến Gemini với timeout
            const result = await Promise.race([
                chat.sendMessage(msg),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Gemini API timeout')), 30000)
                )
            ]);
            
            const text = result.response.text();
            console.log(`Received response from Gemini for ${sender_psid}, length: ${text.length}`);

            // Chia nhỏ response nếu quá dài (Facebook có giới hạn 2000 ký tự)
            if (text.length > 2000) {
                const chunks = splitMessage(text, 2000);
                for (let i = 0; i < chunks.length; i++) {
                    response = { "text": chunks[i] };
                    const success = await callSendAPI(sender_psid, response);
                    if (!success) {
                        console.error(`Failed to send chunk ${i + 1}/${chunks.length} to ${sender_psid}`);
                    }
                    // Đợi một chút giữa các chunk để tránh spam
                    if (i < chunks.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
            } else {
                response = { "text": text };
                await callSendAPI(sender_psid, response);
            }

            // Lưu cuộc trò chuyện vào database
            await saveConversation(sender_psid, msg, text);
            console.log(`Successfully processed message for ${sender_psid}`);

        } else {
            console.log(`Received non-text message from ${sender_psid}`);
            response = {
                "text": "Xin lỗi, tôi chỉ có thể xử lý tin nhắn văn bản. Bạn có thể gửi câu hỏi bằng chữ để tôi hỗ trợ bạn nhé! 😊"
            };
            await callSendAPI(sender_psid, response);
        }

    } catch (error) {
        console.error(`Error processing message for ${sender_psid}:`, error);
        
        // Gửi error message cho user
        const errorResponse = {
            "text": "Xin lỗi, hiện tại tôi đang gặp sự cố kỹ thuật. Bạn vui lòng thử lại sau ít phút nhé! 🙏"
        };
        
        try {
            await callSendAPI(sender_psid, errorResponse);
        } catch (sendError) {
            console.error(`Failed to send error message to ${sender_psid}:`, sendError);
        }
    }
}

// Helper function để chia nhỏ message dài
function splitMessage(text, maxLength) {
    const chunks = [];
    let currentChunk = '';
    
    const lines = text.split('\n');
    
    for (const line of lines) {
        if ((currentChunk + line + '\n').length <= maxLength) {
            currentChunk += line + '\n';
        } else {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
            
            if (line.length <= maxLength) {
                currentChunk = line + '\n';
            } else {
                // Chia nhỏ line nếu quá dài
                const words = line.split(' ');
                let tempLine = '';
                
                for (const word of words) {
                    if ((tempLine + word + ' ').length <= maxLength) {
                        tempLine += word + ' ';
                    } else {
                        if (tempLine) {
                            chunks.push(tempLine.trim());
                        }
                        tempLine = word + ' ';
                    }
                }
                
                if (tempLine) {
                    currentChunk = tempLine + '\n';
                }
            }
        }
    }
    
    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks;
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        activeRequests: processingRequests.size
    });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    
    // Đợi tất cả requests hiện tại hoàn thành
    if (processingRequests.size > 0) {
        console.log(`Waiting for ${processingRequests.size} active requests to complete...`);
        await Promise.allSettled([...processingRequests.values()]);
    }
    
    // Đóng database pool
    await pool.end();
    console.log('Database pool closed');
    
    process.exit(0);
});

app.listen(port, () => {
    console.log(`Chatbot server is running on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
