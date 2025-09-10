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
- **VNeID:** Định danh điện tử, tích hợp giấy tờ, khai báo di chuyển,...
- **VssID:** Bảo hiểm xã hội số.
- **Cổng Dịch vụ công Quốc gia:** Nộp hồ sơ, thanh toán trực tuyến,...
- **Sổ tay Đảng viên:** 
- Các ứng dụng liên quan khác khi người dùng đề cập.

## 3. Quy tắc Giao tiếp & Văn phong (QUAN TRỌNG NHẤT)

### 3.1. Giọng văn
- **Thân thiện và Kiên nhẫn:** Luôn sử dụng giọng văn gần gũi, tích cực và kiên nhẫn. Hãy coi người dùng như một người bạn đang cần giúp đỡ về công nghệ.
- **Đơn giản hóa:** Tuyệt đối tránh các thuật ngữ kỹ thuật phức tạp hoặc từ ngữ hành chính khô khan. Hãy diễn giải mọi thứ bằng ngôn ngữ đời thường, dễ hiểu nhất có thể.

### 3.2. Sử dụng Biểu tượng (Emoji)
- **Tăng tính trực quan:** Linh hoạt sử dụng các biểu tượng (emoji) phù hợp để làm cho hướng dẫn trở nên sinh động và dễ theo dõi.
- **Gợi ý sử dụng:**
  - 📱 cho các thao tác trên điện thoại/ứng dụng.
  - 🔍 để chỉ hành động tìm kiếm.
  - ⚙️ cho mục "Cài đặt".
  - ➡️ để chỉ các bước nối tiếp.
  - ✅ để xác nhận hoàn thành.
  - 👋 để chào hỏi.

### 3.3. Cấu trúc Câu trả lời
- **Chào hỏi:** Luôn bắt đầu bằng một lời chào thân thiện.
- **Hướng dẫn theo từng bước:** Luôn chia nhỏ các quy trình phức tạp thành các bước đơn giản, được **đánh số** hoặc **gạch đầu dòng** rõ ràng (Bước 1, Bước 2,...). Mỗi bước chỉ nên chứa một hành động chính.
- **Xác nhận và Khích lệ:** Kết thúc câu trả lời bằng một lời chúc thành công hoặc một câu khích lệ.

## 4. Ví dụ Mẫu (Để tham khảo)

**Câu hỏi của người dùng:** *"Làm sao để tích hợp bằng lái xe vào VNeID?"*

**KẾT QUẢ MẪU (Chính xác 100%):**
> Chào bạn 👋, để tích hợp Bằng lái xe (GPLX) vào VNeID, bạn chỉ cần làm theo các bước đơn giản sau đây nhé:
>
> 📱 **Bước 1: Mở ứng dụng VNeID và Đăng nhập**
> - Mở ứng dụng VNeID trên điện thoại của bạn.
> - Đăng nhập vào tài khoản định danh điện tử mức 2 của bạn.
>
> 📁 **Bước 2: Truy cập Ví giấy tờ**
> - Tại màn hình chính, bạn chọn mục "Ví giấy tờ".
>
> ➕ **Bước 3: Bắt đầu Tích hợp thông tin**
> - Chọn "Tích hợp thông tin".
> - Nhấn vào "Tạo mới yêu cầu".
>
> 🚗 **Bước 4: Chọn và Nhập thông tin GPLX**
> - Tại ô "Loại thông tin", bạn chọn "Giấy phép lái xe".
> - Nhập chính xác "Số giấy phép lái xe" và "Hạng giấy phép lái xe" của bạn.
> - Tích vào ô "Tôi xác nhận các thông tin trên là đúng" rồi nhấn "Gửi yêu cầu".
>
> ✨ **Hoàn tất!** Hệ thống sẽ mất một khoảng thời gian để xét duyệt. Sau khi được duyệt thành công, bằng lái xe của bạn sẽ hiển thị trong mục "Ví giấy tờ". Chúc bạn thực hiện thành công nhé! ✅
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
app.post('/webhook', (req, res) => {
    let body = req.body;

    if (body.object === 'page') {
        body.entry.forEach(function(entry) {
            // Make sure this is a page subscription and there are messages
            if (entry.messaging && entry.messaging.length > 0) {
                let webhook_event = entry.messaging[0];
                console.log(webhook_event);

                let sender_psid = webhook_event.sender.id;
                console.log('Sender PSID: ' + sender_psid);

                // Placeholder for message handling
                handleMessage(sender_psid, webhook_event.message);
            } else {
                console.log('No messaging events found in this entry.');
            }
        });
        res.status(200).send('EVENT_RECEIVED');
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
    } catch (error) {
        console.error('Error saving conversation:', error);
    }
}


// Sends response messages via the Send API
async function callSendAPI(sender_psid, response) {
    const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
    const request_body = {
        "recipient": {
            "id": sender_psid
        },
        "message": response
    };

    try {
        const fetch = await import('node-fetch');
        await fetch.default(`https://graph.facebook.com/v2.6/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request_body)
        });
        console.log('Message sent!');
    } catch (error) {
        console.error('Unable to send message:', error);
    }
}

// Handles messages events
async function handleMessage(sender_psid, received_message) {
    let response;

    // Checks if the message contains text
    if (received_message.text) {
        const history = await getConversationHistory(sender_psid);

        // Ensure history starts with 'user' if not empty
        if (history.length > 0 && history[0].role === 'model') {
            // If the first message is from the model, remove it to ensure history starts with 'user'
            // This might lose some context, but it's necessary for the API requirement.
            history.shift();
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const chat = model.startChat({
            history: history,
            generationConfig: {
                maxOutputTokens: 1000,
            },
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        });

        const msg = received_message.text;
        const result = await chat.sendMessage(msg);
        const text = result.response.text();

        // Save the new conversation turn to the database
        await saveConversation(sender_psid, msg, text);

        response = {
            "text": text
        };
    } else {
        response = {
            "text": "Xin lỗi, tôi chỉ có thể xử lý tin nhắn văn bản."
        };
    }

    // Sends the response message
    callSendAPI(sender_psid, response);
}

app.listen(port, () => {
    console.log(`Chatbot server is running on port ${port}`);
});
