require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = process.env.PORT || 3000;
const { GoogleGenerativeAI } = require('@google/generative-ai');

const SYSTEM_PROMPT = `OPERATING PRINCIPLES

## 1. Persona & Role

You are the "Public Service Assistant," built by Anh Tuan - Head of the KP69 Study Promotion Association. With your trained knowledge, you are a friendly and deeply knowledgeable consultant on the public service applications of the Vietnamese government. Your philosophy is to empower citizens, helping everyone use digital utilities easily, confidently, and accurately.

---

## 2. Knowledge Base

Your knowledge focuses deeply on the most popular applications and portals, including:
- VNeID: Electronic identification, document integration, travel declarations, etc.
- VssID: Digital Social Insurance.
- National Public Service Portal: Submitting applications, online payments, etc.
- Party Member's Handbook:
- Other related applications when mentioned by the user.

---

## 3. Image Analysis Capabilities

You can view and analyze images sent by the user, specifically to:
- Analyze errors on application screens
- Identify user interface issues
- Read error messages from screenshots
- Provide troubleshooting guidance based on the specific image
- Identify steps in an operational process

---

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

---

## 5. Sample Example (For Text-Based Questions)

User's Question: "How do I integrate my driver's license into VNeID?"

SAMPLE RESPONSE (100% Correct):

Hello 👋, to integrate your Driver's License (GPLX) into VNeID, just follow these simple steps:

📱 STEP 1: Open the VNeID App and Log In
- Open the VNeID application on your phone
- Log in to your Level 2 electronic identification account

📁 STEP 2: Access the Document Wallet
- On the main screen, select the "Document Wallet" section

➕ STEP 3: Begin Information Integration
- Select "Integrate Information"
- Tap on "Create New Request"

🚗 STEP 4: Select and Enter Driver's License Information
- In the "Information Type" field, select "Driver's License"
- Enter your correct "License Number" and "License Class"
- Check the box "I confirm the above information is correct" and then tap "Submit Request"

✨ ALL DONE! The system will take some time for review. Once successfully approved, your driver's license will appear in the "Document Wallet". Wishing you success! ✅

---

## 6. Sample Example (For Image Handling)

When the user sends an error image:

📷 I have seen the image you sent! I see that you are encountering [DESCRIBE THE SPECIFIC ERROR] while using the [APPLICATION NAME] app.

🔧 HOW TO FIX:

STEP 1: [Specific instruction]
STEP 2: [Specific instruction]
...

✅ After completing these steps, this error should be resolved. If you still face issues, please take a new screenshot so I can assist you further!

---

## 7. Important Notes
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

// Sends response messages via the Send API với retry mechanism
async function callSendAPI(sender_psid, response, maxRetries = 3) {
    const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
    const request_body = {
        "recipient": {
            "id": sender_psid
        },
        "message": response
    };

    console.log('📤 Sending message to Facebook API...');
    console.log('Recipient PSID:', sender_psid);
    console.log('Request body:', JSON.stringify(request_body, null, 2));

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
            console.log('Facebook API response:', responseData);
            
            if (apiResponse.ok) {
                console.log(`✅ Message sent successfully to ${sender_psid}!`);
                return true;
            } else {
                console.error(`❌ Facebook API error for ${sender_psid}:`, responseData);
                if (attempt === maxRetries) {
                    throw new Error(`Failed to send message after ${maxRetries} attempts: ${JSON.stringify(responseData)}`);
                }
            }
        } catch (error) {
            console.error(`❌ Attempt ${attempt} failed for ${sender_psid}:`, error.message);
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

// SIMPLE WEBHOOK FOR TESTING (ADD THIS FIRST)
app.post('/webhook-simple', async (req, res) => {
    console.log('=== SIMPLE WEBHOOK TEST ===');
    console.log('Time:', new Date().toISOString());
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    res.status(200).send('EVENT_RECEIVED');
    
    // Test gửi message ngay lập tức
    if (req.body.object === 'page') {
        for (const entry of req.body.entry) {
            if (entry.messaging) {
                for (const event of entry.messaging) {
                    if (event.message && event.message.text) {
                        const sender_psid = event.sender.id;
                        console.log('🚀 Sending quick reply to:', sender_psid);
                        
                        // Gửi message test ngay
                        const testResponse = {
                            "text": `✅ Bot hoạt động! Nhận được: "${event.message.text}" lúc ${new Date().toLocaleTimeString('vi-VN')}`
                        };
                        
                        try {
                            const success = await callSendAPI(sender_psid, testResponse);
                            console.log('✅ Quick reply result:', success);
                        } catch (error) {
                            console.error('❌ Quick reply error:', error);
                        }
                    }
                }
            }
        }
    }
    console.log('=== END SIMPLE TEST ===');
});

// Handle incoming messages with enhanced debugging
app.post('/webhook', async (req, res) => {
    let body = req.body;

    console.log('====================================');
    console.log('🔔 FULL WEBHOOK REQUEST RECEIVED');
    console.log('Time:', new Date().toISOString());
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(body, null, 2));
    console.log('====================================');

    if (body.object === 'page') {
        // Trả về response ngay để tránh timeout
        res.status(200).send('EVENT_RECEIVED');
        console.log('✅ Sent EVENT_RECEIVED response to Facebook');

        // Kiểm tra structure
        console.log('📊 Body structure check:');
        console.log('- body.object:', body.object);
        console.log('- body.entry exists:', !!body.entry);
        console.log('- body.entry length:', body.entry?.length || 0);

        for (let i = 0; i < body.entry.length; i++) {
            const entry = body.entry[i];
            console.log(`\n📝 Processing entry ${i + 1}:`, JSON.stringify(entry, null, 2));
            
            // Kiểm tra entry structure
            console.log('Entry analysis:');
            console.log('- entry.id:', entry.id);
            console.log('- entry.time:', entry.time);
            console.log('- entry.messaging exists:', !!entry.messaging);
            console.log('- entry.messaging length:', entry.messaging?.length || 0);

            if (entry.messaging && entry.messaging.length > 0) {
                console.log('✅ Found messaging events!');
                
                for (let j = 0; j < entry.messaging.length; j++) {
                    const webhook_event = entry.messaging[j];
                    console.log(`\n📬 Message event ${j + 1}:`, JSON.stringify(webhook_event, null, 2));
                    
                    // Chi tiết từng field
                    console.log('Event analysis:');
                    console.log('- sender.id:', webhook_event.sender?.id);
                    console.log('- recipient.id:', webhook_event.recipient?.id);
                    console.log('- timestamp:', webhook_event.timestamp);
                    console.log('- has message:', !!webhook_event.message);
                    console.log('- message.text:', webhook_event.message?.text);
                    console.log('- message.mid:', webhook_event.message?.mid);

                    let sender_psid = webhook_event.sender.id;
                    console.log('🔄 Processing message for PSID:', sender_psid);

                    const requestKey = `${sender_psid}_${Date.now()}`;
                    
                    if (webhook_event.message && webhook_event.message.text) {
                        console.log('📤 Valid text message found, processing...');
                        console.log('Message content:', webhook_event.message.text);
                        
                        try {
                            await handleMessage(sender_psid, webhook_event.message, requestKey);
                            console.log('✅ Message processed successfully');
                        } catch (error) {
                            console.error('❌ Error processing message:', error);
                        }
                    } else {
                        console.log('⚠️ Skipping - no text message found');
                        console.log('Message object:', webhook_event.message);
                    }
                }
            } else {
                console.log('❌ No messaging events found in this entry');
                console.log('Available entry keys:', Object.keys(entry));
                
                // Kiểm tra các loại event khác
                if (entry.changes) {
                    console.log('Found changes:', entry.changes);
                }
                if (entry.standby) {
                    console.log('Found standby:', entry.standby);
                }
            }
        }
    } else {
        console.log('❌ Not a page object. Received:', body.object);
        res.sendStatus(404);
    }
    
    console.log('🏁 Webhook processing completed\n');
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
    console.log('=== PROCESS MESSAGE START ===');
    console.log('Sender PSID:', sender_psid);
    console.log('Message text:', received_message.text);
    console.log('Request key:', requestKey);
    
    let response;

    try {
        // Checks if the message contains text
        if (received_message.text && received_message.text.trim()) {
            console.log('✅ Valid text message received');
            console.log(`Processing message from ${sender_psid}: "${received_message.text}"`);
            
            // Test database connection
            console.log('🗄️ Testing database connection...');
            try {
                const testQuery = await pool.query('SELECT NOW()');
                console.log('✅ Database connection OK:', testQuery.rows[0]);
            } catch (dbError) {
                console.error('❌ Database connection failed:', dbError);
            }
            
            // Lấy lịch sử cuộc trò chuyện
            const history = await getConversationHistory(sender_psid);
            console.log(`Retrieved ${history.length} messages from history for ${sender_psid}`);

            // Ensure history starts with 'user' if not empty
            if (history.length > 0 && history[0].role === 'model') {
                history.shift();
                console.log(`Adjusted history to start with user message for ${sender_psid}`);
            }

            // Test Gemini API
            console.log('🤖 Testing Gemini API...');
            try {
                const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
                console.log('✅ Gemini model created successfully');
                
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
                console.log(`✅ Received response from Gemini for ${sender_psid}, length: ${text.length}`);
                console.log('Response preview:', text.substring(0, 200) + '...');

                // Chia nhỏ response nếu quá dài (Facebook có giới hạn 2000 ký tự)
                if (text.length > 2000) {
                    console.log(`Message too long (${text.length} chars), splitting...`);
                    const chunks = splitMessage(text, 2000);
                    console.log(`Split into ${chunks.length} chunks`);
                    
                    for (let i = 0; i < chunks.length; i++) {
                        response = { "text": chunks[i] };
                        console.log(`Sending chunk ${i + 1}/${chunks.length}...`);
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
                    console.log('Sending single message...');
                    await callSendAPI(sender_psid, response);
                }

                // Lưu cuộc trò chuyện vào database
                console.log('💾 Saving conversation to database...');
                await saveConversation(sender_psid, msg, text);
                console.log(`✅ Successfully processed message for ${sender_psid}`);

            } catch (geminiError) {
                console.error('❌ Gemini API error:', geminiError);
                throw geminiError;
            }

        } else {
            console.log('❌ Invalid message - no text content');
            console.log(`Received non-text message from ${sender_psid}`);
            response = {
                "text": "Xin lỗi, tôi chỉ có thể xử lý tin nhắn văn bản. Bạn có thể gửi câu hỏi bằng chữ để tôi hỗ trợ bạn nhé! 😊"
            };
            await callSendAPI(sender_psid, response);
        }

    } catch (error) {
        console.error(`❌ ERROR in processMessage for ${sender_psid}:`, error);
        console.error('Error stack:', error.stack);
        
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
    
    console.log('=== PROCESS MESSAGE END ===\n');
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

// Test endpoints for debugging
app.get('/test', (req, res) => {
    console.log('🧪 Test endpoint called at:', new Date().toISOString());
    res.json({ 
        status: 'Server is working!', 
        timestamp: new Date().toISOString(),
        url: req.originalUrl,
        env: {
            port: process.env.PORT || 3000,
            nodeEnv: process.env.NODE_ENV || 'development',
            hasVerifyToken: !!process.env.VERIFY_TOKEN,
            hasPageToken: !!process.env.PAGE_ACCESS_TOKEN,
            hasGeminiKey: !!process.env.GEMINI_API_KEY,
            hasDbConfig: !!process.env.DB_HOST
        }
    });
});

// Test webhook manually
app.post('/test-webhook', (req, res) => {
    console.log('🧪 Manual webhook test called');
    console.log('Headers:', req.headers);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    res.json({ received: true, body: req.body, timestamp: new Date().toISOString() });
});

// Test message processing
app.post('/test-message', async (req, res) => {
    const { psid, message } = req.body;
    
    console.log('🧪 Manual test message triggered');
    console.log('PSID:', psid);
    console.log('Message:', message);
    
    if (!psid || !message) {
        return res.status(400).json({ error: 'Missing psid or message' });
    }
    
    try {
        const fakeMessage = { text: message };
        await handleMessage(psid, fakeMessage, `test_${Date.now()}`);
        res.json({ success: true, message: 'Test message processed', timestamp: new Date().toISOString() });
    } catch (error) {
        console.error('❌ Test message error:', error);
        res.status(500).json({ error: error.message, timestamp: new Date().toISOString() });
    }
});

// Endpoint để test gửi message trực tiếp
app.post('/send-test-message', async (req, res) => {
    const { psid, message } = req.body;
    
    if (!psid || !message) {
        return res.status(400).json({ error: 'Missing psid or message' });
    }
    
    try {
        const response = { "text": message };
        const result = await callSendAPI(psid, response);
        res.json({ 
            success: result, 
            message: result ? 'Message sent!' : 'Message failed',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Test send error:', error);
        res.status(500).json({ error: error.message, timestamp: new Date().toISOString() });
    }
});

// Endpoint để switch webhook mode
app.get('/switch-webhook/:mode', (req, res) => {
    const mode = req.params.mode;
    console.log('🔄 Webhook switch request to mode:', mode);
    
    res.json({
        message: `Webhook mode information: ${mode}`,
        instructions: {
            simple: {
                url: 'https://facebook-chatbot-a1t6.onrender.com/webhook-simple',
                description: 'Quick response test - bypasses AI processing'
            },
            full: {
                url: 'https://facebook-chatbot-a1t6.onrender.com/webhook',
                description: 'Full processing with AI and database'
            },
            facebook_setup: 'Update webhook URL in Facebook Developer Console → Products → Messenger → Settings → Webhooks'
        },
        current_time: new Date().toISOString()
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        activeRequests: processingRequests.size,
        uptime: process.uptime(),
        memory: process.memoryUsage()
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
    console.log(`🚀 Chatbot server is running on port ${port}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('🔧 Available endpoints:');
    console.log('   ✅ GET  /webhook - Facebook verification');
    console.log('   🤖 POST /webhook - Full AI processing');
    console.log('   ⚡ POST /webhook-simple - Quick test mode');
    console.log('   🧪 GET  /test - Server status');
    console.log('   📨 POST /test-webhook - Manual webhook test');
    console.log('   💬 POST /test-message - Test message processing');
    console.log('   📤 POST /send-test-message - Test Facebook send');
    console.log('   🔄 GET  /switch-webhook/:mode - Webhook mode info');
    console.log('   ❤️  GET  /health - Health check');
    console.log('🎯 Enhanced webhook debug logging enabled');
    console.log('📍 Simple webhook available at: /webhook-simple');
});
