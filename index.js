require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = process.env.PORT || 3000;
const { GoogleGenerativeAI } = require('@google/generative-ai');

const SYSTEM_PROMPT = `OPERATING PRINCIPLES

## 1. Persona & Role

You are the "Public Service Assistant," built by Anh Tuan - Head of the KP69 Study Promotion Association. With your trained knowledge, you are a friendly and deeply knowledgeable consultant on the public service applications of the Vietnamese government. Your philosophy is to empower citizens, helping everyone use digital utilities easily, confidently, and accurately.

## 2. Knowledge Base

Your knowledge focuses deeply on the most popular applications and portals, including:
- VNeID: Electronic identification, document integration, travel declarations, etc.
- VssID: Digital Social Insurance.
- National Public Service Portal: Submitting applications, online payments, etc.
- Party Member's Handbook:
- Other related applications when mentioned by the user.

## 3. Image Analysis Capabilities

You can view and analyze images sent by the user, specifically to:
- Analyze errors on application screens
- Identify user interface issues
- Read error messages from screenshots
- Provide troubleshooting guidance based on the specific image
- Identify steps in an operational process

## 4. Communication Rules & Tone (MOST IMPORTANT)

### 4.1. Text Formatting
IMPORTANT: Facebook Messenger does NOT support markdown. Absolutely DO NOT use:
- \`**\` or \`*\` for bold/italics
- \`#\` for headings
- \`\\\`\\\`\\\`\` for code
- Any other markdown symbols

Instead:
- Use ALL CAPS to emphasize important keywords
- Use a colon (:) after headings
- Use a hyphen (-) or bullet (•) for lists
- Write in plain text, with no formatting

### 4.2. Tone of Voice
- Friendly and Patient: Always use a friendly, positive, and patient tone. Treat the user like a friend who needs help with technology.
- Simplify: Absolutely avoid complex technical terms or dry administrative jargon. Explain everything in everyday language that is as easy to understand as possible.

### 4.3. Use of Emojis
- Enhance Visuals: Flexibly use appropriate emojis to make instructions more lively and easier to follow.
- Suggested Use:
  - 📱 for actions on a phone/app
  - 🔍 to indicate a search action
  - ⚙️ for the "Settings" section
  - ➡️ to indicate sequential steps
  - ✅ to confirm completion
  - 👋 for greetings
  - 📷 for responding to images
  - 🔧 to indicate error fixing

### 4.4. Answer Structure for Image Responses
- Acknowledge receipt of the image: "I have seen the image you sent..."
- Analyze the specific error from the image
- Provide step-by-step troubleshooting instructions
- End with a confirmation and encouragement
- The response must be concise but complete (around 300 words)
- Whatever language the user uses, you must use the same language to respond.

## 5. Sample Example for Image Handling

When the user sends an error image:

📷 I have seen the image you sent! I see that you are encountering [DESCRIBE THE SPECIFIC ERROR] while using the [APPLICATION NAME] app.

🔧 HOW TO FIX:

STEP 1: [Specific instruction]
STEP 2: [Specific instruction]
...

✅ After completing these steps, this error should be resolved. If you still face issues, please take a new screenshot so I can assist you further!

## 6. Important Notes
- Always analyze the image carefully before providing instructions
- Ensure you correctly understand the error from the image before advising
- Provide specific guidance based on the actual interface shown in the image
- The response content should be around 250-300 words when an image is involved.
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
                    
                    // Xử lý message nếu có (text hoặc attachments)
                    if (webhook_event.message) {
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

// Function to download image from Facebook
async function downloadImage(imageUrl, accessToken) {
    try {
        const fetch = await import('node-fetch');
        const response = await fetch.default(`${imageUrl}?access_token=${accessToken}`);
        
        if (!response.ok) {
            throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
        }
        
        const buffer = await response.buffer();
        return buffer;
    } catch (error) {
        console.error('Error downloading image:', error);
        throw error;
    }
}

// Function to convert image buffer to base64
function bufferToBase64(buffer, mimeType = 'image/jpeg') {
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

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
        // Xử lý tin nhắn có hình ảnh
        if (received_message.attachments && received_message.attachments.length > 0) {
            const imageAttachments = received_message.attachments.filter(
                attachment => attachment.type === 'image'
            );

            if (imageAttachments.length > 0) {
                console.log(`Processing ${imageAttachments.length} image(s) from ${sender_psid}`);
                
                // Lấy lịch sử cuộc trò chuyện
                const history = await getConversationHistory(sender_psid);
                
                // Ensure history starts with 'user' if not empty
                if (history.length > 0 && history[0].role === 'model') {
                    history.shift();
                }

                // Tạo model với khả năng xử lý hình ảnh
                const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
                
                // Xử lý từng hình ảnh
                for (const imageAttachment of imageAttachments) {
                    try {
                        const imageUrl = imageAttachment.payload.url;
                        console.log(`Downloading image from: ${imageUrl}`);
                        
                        // Download hình ảnh
                        const imageBuffer = await downloadImage(imageUrl, process.env.PAGE_ACCESS_TOKEN);
                        const base64Image = bufferToBase64(imageBuffer);
                        
                        // Tạo chat với history
                        const chat = model.startChat({
                            history: history,
                            generationConfig: {
                                maxOutputTokens: 5000,
                                temperature: 0.7,
                            },
                            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                        });

                        // Tạo message với hình ảnh và text (nếu có)
                        const messageParts = [
                            {
                                inlineData: {
                                    data: base64Image.split(',')[1], // Remove data:image/jpeg;base64, prefix
                                    mimeType: 'image/jpeg'
                                }
                            }
                        ];

                        // Thêm text nếu có
                        const messageText = received_message.text ? 
                            received_message.text.trim() : 
                            "Hãy phân tích hình ảnh này và giúp tôi khắc phục lỗi nếu có.";
                        
                        messageParts.push({ text: messageText });

                        console.log(`Sending image analysis request to Gemini for ${sender_psid}...`);
                        
                        // Gửi message với hình ảnh đến Gemini
                        const result = await Promise.race([
                            chat.sendMessage(messageParts),
                            new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('Gemini API timeout')), 45000)
                            )
                        ]);
                        
                        const text = result.response.text();
                        console.log(`Received image analysis from Gemini for ${sender_psid}, length: ${text.length}`);

                        // Chia nhỏ response nếu quá dài
                        if (text.length > 2000) {
                            const chunks = splitMessage(text, 2000);
                            for (let i = 0; i < chunks.length; i++) {
                                response = { "text": chunks[i] };
                                const success = await callSendAPI(sender_psid, response);
                                if (!success) {
                                    console.error(`Failed to send chunk ${i + 1}/${chunks.length} to ${sender_psid}`);
                                }
                                if (i < chunks.length - 1) {
                                    await new Promise(resolve => setTimeout(resolve, 500));
                                }
                            }
                        } else {
                            response = { "text": text };
                            await callSendAPI(sender_psid, response);
                        }

                        // Lưu cuộc trò chuyện
                        await saveConversation(sender_psid, "[Đã gửi hình ảnh] " + messageText, text);
                        console.log(`Successfully processed image for ${sender_psid}`);

                    } catch (imageError) {
                        console.error(`Error processing image for ${sender_psid}:`, imageError);
                        const errorResponse = {
                            "text": "Xin lỗi, tôi không thể xử lý hình ảnh này. Có thể do hình ảnh quá lớn hoặc định dạng không hỗ trợ. Bạn thử gửi lại hình ảnh khác hoặc mô tả vấn đề bằng văn bản nhé! 📷"
                        };
                        await callSendAPI(sender_psid, errorResponse);
                    }
                }
                return; // Kết thúc xử lý hình ảnh
            }
        }

        // Xử lý tin nhắn văn bản thông thường
        if (received_message.text && received_message.text.trim()) {
            console.log(`Processing text message from ${sender_psid}: "${received_message.text}"`);
            
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

            // Chia nhỏ response nếu quá dài
            if (text.length > 2000) {
                const chunks = splitMessage(text, 2000);
                for (let i = 0; i < chunks.length; i++) {
                    response = { "text": chunks[i] };
                    const success = await callSendAPI(sender_psid, response);
                    if (!success) {
                        console.error(`Failed to send chunk ${i + 1}/${chunks.length} to ${sender_psid}`);
                    }
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

        } else if (!received_message.attachments || received_message.attachments.length === 0) {
            // Không có text và không có attachments
            console.log(`Received empty message from ${sender_psid}`);
            response = {
                "text": "Xin chào! 👋 Tôi có thể giúp bạn giải quyết các vấn đề về dịch vụ công trực tuyến. Bạn có thể:\n\n📝 Gửi câu hỏi bằng văn bản\n📷 Chụp ảnh màn hình lỗi để tôi hỗ trợ cụ thể hơn\n\nBạn cần hỗ trợ gì nhé? 😊"
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
        activeRequests: processingRequests.size,
        features: ['text_processing', 'image_analysis', 'error_detection']
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
    console.log('Features: Text processing + Image analysis for error detection');
});
