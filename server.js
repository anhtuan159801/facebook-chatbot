require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = process.env.PORT || 3000;
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const mammoth = require('mammoth');
const path = require('path');

const SYSTEM_PROMPT = `OPERATING PRINCIPLES

## 1. Persona & Role

You are the 'Public Service Assistant,' developed by the Management Board of Quarter 69, Tan Thoi Nhat Ward, Ho Chi Minh City. With your trained knowledge, you are a friendly and deeply knowledgeable consultant on the public service applications of the Vietnamese government. Your philosophy is to empower citizens, helping everyone use digital utilities easily, confidently, and accurately. If you encounter any issues during usage, you can contact Zalo 0778649573 - Mr. Tuan for support.

---

## 2. Knowledge Base

Your knowledge focuses deeply on the most popular applications and portals, including:
- VNeID: Electronic identification, document integration, travel declarations, etc.
- VssID: Digital Social Insurance.
- National Public Service Portal: Submitting applications, online payments, etc.
- Party Member's Handbook:
- Other related applications when mentioned by the user.

You have access to detailed documentation that will be provided as context. Always prioritize information from the provided context when answering questions.

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

### 4.5. Conversational Context
- Always consider the user's previous question when answering the current one.
- If the current question is a follow-up or clarification of the previous topic, tailor your response to that specific context.
- Do not provide general information if a more specific answer related to the prior conversation is possible.

---

## 5. Context Usage Instructions

When provided with relevant context from documentation:
1. ALWAYS prioritize information from the provided context
2. If the context contains specific steps or procedures, follow them exactly
3. If the context doesn't fully answer the question, supplement with your general knowledge
4. Always maintain the friendly, emoji-rich communication style even when using context information
5. Adapt the context information to the user's specific question

---

## 6. Sample Example (For Text-Based Questions)

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

## 7. Sample Example (For Image Handling)

When the user sends an error image:

📷 I have seen the image you sent! I see that you are encountering [DESCRIBE THE SPECIFIC ERROR] while using the [APPLICATION NAME] app.

🔧 HOW TO FIX:

STEP 1: [Specific instruction]
STEP 2: [Specific instruction]
...

✅ After completing these steps, this error should be resolved. If you still face issues, please take a new screenshot so I can assist you further!

---

## 8. Important Notes
- Always analyze the image carefully before providing instructions
- Ensure you correctly understand the error from the image before advising
- Provide specific guidance based on the actual interface shown in the image
- The response content should be around 250-300 words when an image is involved.
- When context is provided, integrate it naturally into your response while maintaining the friendly tone.
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

// ==== RAG SYSTEM IMPLEMENTATION ====

class DocumentChunker {
    constructor() {
        this.chunks = [];
        this.initialized = false;
    }

    async loadAndChunkDocument(filePath) {
        try {
            console.log('📚 Loading document from:', filePath);
            
            // Read DOCX file
            const result = await mammoth.extractRawText({ path: filePath });
            const fullText = result.value;
            
            console.log(`📄 Document loaded, length: ${fullText.length} characters`);
            
            // Split into chapters and sections
            this.chunks = this.chunkByStructure(fullText);
            this.initialized = true;
            
            console.log(`✅ Document chunked into ${this.chunks.length} chunks`);
            return this.chunks;
        } catch (error) {
            console.error('❌ Error loading document:', error);
            throw error;
        }
    }

    chunkByStructure(text) {
        const chunks = [];
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        let currentChapter = '';
        let currentSection = '';
        let currentContent = '';
        
        for (const line of lines) {
            // Detect chapter headers (contains "Chương")
            if (line.includes('Chương') && line.includes(':')) {
                // Save previous chunk if exists
                if (currentContent.trim()) {
                    chunks.push({
                        chapter: currentChapter,
                        section: currentSection,
                        content: currentContent.trim(),
                        metadata: {
                            type: 'content',
                            chapter: currentChapter,
                            section: currentSection
                        }
                    });
                }
                
                currentChapter = line;
                currentSection = '';
                currentContent = '';
                
                // Add chapter introduction chunk
                chunks.push({
                    chapter: currentChapter,
                    section: 'Giới thiệu chương',
                    content: line,
                    metadata: {
                        type: 'chapter_intro',
                        chapter: currentChapter
                    }
                });
            }
            // Detect section headers (starts with number like "1.1", "2.3", etc.)
            else if (/^\d+\.\d+\.?\s/.test(line)) {
                // Save previous section content
                if (currentContent.trim()) {
                    chunks.push({
                        chapter: currentChapter,
                        section: currentSection,
                        content: currentContent.trim(),
                        metadata: {
                            type: 'content',
                            chapter: currentChapter,
                            section: currentSection
                        }
                    });
                }
                
                currentSection = line;
                currentContent = '';
                
                // Add section header chunk
                chunks.push({
                    chapter: currentChapter,
                    section: currentSection,
                    content: line,
                    metadata: {
                        type: 'section_header',
                        chapter: currentChapter,
                        section: currentSection
                    }
                });
            }
            // Regular content
            else {
                currentContent += line + '\n';
                
                // If content gets too long, create a chunk
                if (currentContent.length > 1500) {
                    chunks.push({
                        chapter: currentChapter,
                        section: currentSection,
                        content: currentContent.trim(),
                        metadata: {
                            type: 'content',
                            chapter: currentChapter,
                            section: currentSection
                        }
                    });
                    currentContent = '';
                }
            }
        }
        
        // Don't forget the last chunk
        if (currentContent.trim()) {
            chunks.push({
                chapter: currentChapter,
                section: currentSection,
                content: currentContent.trim(),
                metadata: {
                    type: 'content',
                    chapter: currentChapter,
                    section: currentSection
                }
            });
        }
        
        return chunks;
    }

    searchRelevantChunks(query, topK = 5) {
        if (!this.initialized || this.chunks.length === 0) {
            console.log('⚠️ Document not loaded or no chunks available');
            return [];
        }

        const queryLower = query.toLowerCase();
        const scoredChunks = [];

        for (const chunk of this.chunks) {
            let score = 0;
            const chapterLower = chunk.chapter.toLowerCase();
            const sectionLower = chunk.section.toLowerCase();
            const contentLower = chunk.content.toLowerCase();

            // Keyword matching với trọng số
            const keywords = this.extractKeywords(queryLower);
            
            for (const keyword of keywords) {
                // Chapter title has highest weight
                if (chapterLower.includes(keyword)) score += 3;
                // Section title has medium weight  
                if (sectionLower.includes(keyword)) score += 2;
                // Content has base weight
                if (contentLower.includes(keyword)) score += 1;
            }

            // Bonus for specific app names
            if (queryLower.includes('vneid') && chapterLower.includes('vneid')) score += 5;
            if (queryLower.includes('cổng dịch vụ') && chapterLower.includes('cổng dịch vụ')) score += 5;
            if (queryLower.includes('sổ tay đảng') && chapterLower.includes('sổ tay đảng')) score += 5;

            // Penalty for very short content
            if (chunk.content.length < 50) score *= 0.5;

            if (score > 0) {
                scoredChunks.push({
                    ...chunk,
                    relevanceScore: score
                });
            }
        }

        // Sort by score and return top K
        return scoredChunks
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, topK);
    }

    extractKeywords(text) {
        // Remove stopwords and extract meaningful terms
        const stopwords = new Set([
            'là', 'của', 'và', 'có', 'được', 'trong', 'để', 'với', 'từ', 'tôi', 'bạn',
            'làm', 'như', 'thế', 'nào', 'gì', 'đâu', 'sao', 'khi', 'nếu', 'mà',
            'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with'
        ]);

        return text.split(/\s+/)
            .filter(word => word.length > 2)
            .filter(word => !stopwords.has(word))
            .filter(word => !/^\d+$/.test(word)); // Remove pure numbers
    }

    getChunksByChapter(chapterName) {
        return this.chunks.filter(chunk => 
            chunk.chapter.toLowerCase().includes(chapterName.toLowerCase())
        );
    }

    getAllChapters() {
        const chapters = new Set();
        this.chunks.forEach(chunk => {
            if (chunk.chapter) chapters.add(chunk.chapter);
        });
        return Array.from(chapters);
    }
}

// Initialize document chunker
const documentChunker = new DocumentChunker();

// Load document on startup
async function initializeRAGSystem() {
    try {
        const docPath = path.join(__dirname, 'data.docx');
        
        // Check if file exists
        if (fs.existsSync(docPath)) {
            await documentChunker.loadAndChunkDocument(docPath);
            console.log('✅ RAG system initialized successfully');
        } else {
            console.log('⚠️ data.docx not found. RAG system will work without document context.');
            console.log('Expected path:', docPath);
        }
    } catch (error) {
        console.error('❌ Failed to initialize RAG system:', error);
        console.log('⚠️ Chatbot will continue without document context');
    }
}

// ==== ENHANCED MESSAGE PROCESSING WITH RAG ====

async function processMessageWithRAG(sender_psid, received_message, requestKey) {
    console.log('=== PROCESS MESSAGE WITH RAG START ===');
    console.log('Sender PSID:', sender_psid);
    console.log('Message text:', received_message.text);
    
    let response;

    try {
        if (received_message.text && received_message.text.trim()) {
            const userMessage = received_message.text.trim();
            console.log(`🔍 Searching for relevant context for: "${userMessage}"`);
            
            // Search for relevant chunks
            const relevantChunks = documentChunker.searchRelevantChunks(userMessage, 3);
            console.log(`📚 Found ${relevantChunks.length} relevant chunks`);
            
            // Build context string
            let contextString = '';
            if (relevantChunks.length > 0) {
                contextString = 'RELEVANT CONTEXT FROM DOCUMENTATION:\n\n';
                relevantChunks.forEach((chunk, index) => {
                    contextString += `CONTEXT ${index + 1}:\n`;
                    contextString += `Chapter: ${chunk.chapter}\n`;
                    contextString += `Section: ${chunk.section}\n`;
                    contextString += `Content: ${chunk.content}\n`;
                    contextString += `Relevance Score: ${chunk.relevanceScore}\n\n`;
                });
                contextString += '---\n\nPlease use the above context to provide a comprehensive and accurate answer. If the context doesn\'t fully cover the question, supplement with your general knowledge while prioritizing the context information.\n\n';
            }

            // Get conversation history
            const history = await getConversationHistory(sender_psid);
            
            // Ensure history starts with 'user' if not empty
            if (history.length > 0 && history[0].role === 'model') {
                history.shift();
            }

            // Create enhanced prompt with context
            const enhancedMessage = contextString + `USER QUESTION: ${userMessage}`;
            
            console.log('🤖 Sending enhanced prompt to Gemini...');
            console.log('Context length:', contextString.length);
            console.log('Enhanced message preview:', enhancedMessage.substring(0, 200) + '...');

            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
            
            const chat = model.startChat({
                history: history,
                generationConfig: {
                    maxOutputTokens: 5000,
                    temperature: 0.7,
                },
                systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            });

            // Send message with context
            const result = await Promise.race([
                chat.sendMessage(enhancedMessage),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Gemini API timeout')), 30000)
                )
            ]);
            
            const text = result.response.text();
            console.log(`✅ Received response from Gemini, length: ${text.length}`);

            // Send response (with chunking if needed)
            if (text.length > 2000) {
                const chunks = splitMessage(text, 2000);
                for (let i = 0; i < chunks.length; i++) {
                    response = { "text": chunks[i] };
                    await callSendAPI(sender_psid, response);
                    if (i < chunks.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
            } else {
                response = { "text": text };
                await callSendAPI(sender_psid, response);
            }

            // Save conversation
            await saveConversation(sender_psid, userMessage, text);
            console.log(`✅ Successfully processed message with RAG for ${sender_psid}`);

        } else {
            console.log('❌ Invalid message - no text content');
            response = {
                "text": "Xin lỗi, tôi chỉ có thể xử lý tin nhắn văn bản. Bạn có thể gửi câu hỏi bằng chữ để tôi hỗ trợ bạn nhé! 😊"
            };
            await callSendAPI(sender_psid, response);
        }

    } catch (error) {
        console.error(`❌ ERROR in processMessageWithRAG for ${sender_psid}:`, error);
        
        const errorResponse = {
            "text": "Xin lỗi, hiện tại tôi đang gặp sự cố kỹ thuật. Bạn vui lòng thử lại sau ít phút nhé! 🙏"
        };
        
        try {
            await callSendAPI(sender_psid, errorResponse);
        } catch (sendError) {
            console.error(`Failed to send error message to ${sender_psid}:`, sendError);
        }
    }
    
    console.log('=== PROCESS MESSAGE WITH RAG END ===\n');
}

// ==== REST OF THE ORIGINAL CODE ====

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
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
    return false;
}

// Handle incoming messages with enhanced debugging
app.post('/webhook', async (req, res) => {
    let body = req.body;

    console.log('====================================');
    console.log('🔔 FULL WEBHOOK REQUEST RECEIVED');
    console.log('Time:', new Date().toISOString());
    console.log('Body:', JSON.stringify(body, null, 2));
    console.log('====================================');

    if (body.object === 'page') {
        res.status(200).send('EVENT_RECEIVED');
        console.log('✅ Sent EVENT_RECEIVED response to Facebook');

        for (let i = 0; i < body.entry.length; i++) {
            const entry = body.entry[i];
            console.log(`\n📝 Processing entry ${i + 1}:`, JSON.stringify(entry, null, 2));

            if (entry.messaging && entry.messaging.length > 0) {
                console.log('✅ Found messaging events!');
                
                for (let j = 0; j < entry.messaging.length; j++) {
                    const webhook_event = entry.messaging[j];
                    console.log(`\n📬 Message event ${j + 1}:`, JSON.stringify(webhook_event, null, 2));

                    let sender_psid = webhook_event.sender.id;
                    console.log('🔄 Processing message for PSID:', sender_psid);

                    const requestKey = `${sender_psid}_${Date.now()}`;
                    
                    if (webhook_event.message && webhook_event.message.text) {
                        console.log('📤 Valid text message found, processing with RAG...');
                        
                        try {
                            await handleMessage(sender_psid, webhook_event.message, requestKey);
                            console.log('✅ Message processed successfully');
                        } catch (error) {
                            console.error('❌ Error processing message:', error);
                        }
                    } else {
                        console.log('⚠️ Skipping - no text message found');
                    }
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
    if (processingRequests.has(sender_psid)) {
        console.log(`User ${sender_psid} is already being processed, queuing request...`);
        await processingRequests.get(sender_psid);
    }

    const processingPromise = processMessageWithRAG(sender_psid, received_message, requestKey);
    processingRequests.set(sender_psid, processingPromise);

    try {
        await processingPromise;
    } finally {
        processingRequests.delete(sender_psid);
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

// ==== RAG TESTING ENDPOINTS ====

// Test RAG search functionality
app.post('/test-rag', async (req, res) => {
    const { query, topK = 5 } = req.body;
    
    if (!query) {
        return res.status(400).json({ error: 'Missing query parameter' });
    }
    
    try {
        const relevantChunks = documentChunker.searchRelevantChunks(query, topK);
        
        res.json({
            success: true,
            query: query,
            foundChunks: relevantChunks.length,
            chunks: relevantChunks,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ RAG test error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all available chapters
app.get('/rag/chapters', (req, res) => {
    try {
        const chapters = documentChunker.getAllChapters();
        res.json({
            success: true,
            chapters: chapters,
            totalChapters: chapters.length,
            initialized: documentChunker.initialized
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get chunks by chapter
app.get('/rag/chapter/:chapterName', (req, res) => {
    const { chapterName } = req.params;
    
    try {
        const chunks = documentChunker.getChunksByChapter(chapterName);
        res.json({
            success: true,
            chapterName: chapterName,
            chunks: chunks,
            totalChunks: chunks.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reload document
app.post('/rag/reload', async (req, res) => {
    try {
        const docPath = path.join(__dirname, 'data.docx');
        await documentChunker.loadAndChunkDocument(docPath);
        
        res.json({
            success: true,
            message: 'Document reloaded successfully',
            totalChunks: documentChunker.chunks.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ RAG reload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==== ORIGINAL TEST ENDPOINTS ====

// Test endpoints for debugging
app.get('/test', (req, res) => {
    console.log('🧪 Test endpoint called at:', new Date().toISOString());
    res.json({ 
        status: 'Server is working!', 
        timestamp: new Date().toISOString(),
        url: req.originalUrl,
        ragStatus: {
            initialized: documentChunker.initialized,
            totalChunks: documentChunker.chunks.length,
            availableChapters: documentChunker.getAllChapters().length
        },
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

// Test message processing with RAG
app.post('/test-message', async (req, res) => {
    const { psid, message } = req.body;
    
    console.log('🧪 Manual test message with RAG triggered');
    console.log('PSID:', psid);
    console.log('Message:', message);
    
    if (!psid || !message) {
        return res.status(400).json({ error: 'Missing psid or message' });
    }
    
    try {
        const fakeMessage = { text: message };
        await handleMessage(psid, fakeMessage, `test_${Date.now()}`);
        res.json({ 
            success: true, 
            message: 'Test message processed with RAG', 
            timestamp: new Date().toISOString() 
        });
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
            full: {
                url: 'https://facebook-chatbot-a1t6.onrender.com/webhook',
                description: 'Full processing with AI, RAG, and database'
            },
            facebook_setup: 'Update webhook URL in Facebook Developer Console → Products → Messenger → Settings → Webhooks'
        },
        ragStatus: {
            initialized: documentChunker.initialized,
            totalChunks: documentChunker.chunks.length
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
        memory: process.memoryUsage(),
        ragSystem: {
            initialized: documentChunker.initialized,
            totalChunks: documentChunker.chunks.length,
            availableChapters: documentChunker.getAllChapters().length
        }
    });
});

// ==== RAG MANAGEMENT ENDPOINTS ====

// Get RAG system statistics
app.get('/rag/stats', (req, res) => {
    try {
        const stats = {
            initialized: documentChunker.initialized,
            totalChunks: documentChunker.chunks.length,
            chapterCount: documentChunker.getAllChapters().length,
            chapters: documentChunker.getAllChapters(),
        };

        if (documentChunker.chunks.length > 0) {
            // Calculate chunk size statistics
            const chunkSizes = documentChunker.chunks.map(chunk => chunk.content.length);
            stats.chunkStats = {
                minSize: Math.min(...chunkSizes),
                maxSize: Math.max(...chunkSizes),
                avgSize: Math.round(chunkSizes.reduce((a, b) => a + b, 0) / chunkSizes.length),
                totalContentLength: chunkSizes.reduce((a, b) => a + b, 0)
            };

            // Count chunks by type
            const typeCount = {};
            documentChunker.chunks.forEach(chunk => {
                const type = chunk.metadata.type;
                typeCount[type] = (typeCount[type] || 0) + 1;
            });
            stats.chunkTypes = typeCount;
        }

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Search with detailed results
app.post('/rag/search-detailed', async (req, res) => {
    const { query, topK = 5, includeContent = true } = req.body;
    
    if (!query) {
        return res.status(400).json({ error: 'Missing query parameter' });
    }
    
    try {
        const relevantChunks = documentChunker.searchRelevantChunks(query, topK);
        
        const results = {
            success: true,
            query: query,
            searchStats: {
                totalChunksSearched: documentChunker.chunks.length,
                relevantChunksFound: relevantChunks.length,
                topK: topK
            },
            results: relevantChunks.map((chunk, index) => ({
                rank: index + 1,
                relevanceScore: chunk.relevanceScore,
                chapter: chunk.chapter,
                section: chunk.section,
                metadata: chunk.metadata,
                contentLength: chunk.content.length,
                content: includeContent ? chunk.content : chunk.content.substring(0, 200) + '...'
            })),
            timestamp: new Date().toISOString()
        };
        
        res.json(results);
    } catch (error) {
        console.error('❌ RAG search error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Preview context that would be sent to AI
app.post('/rag/preview-context', async (req, res) => {
    const { query, topK = 3 } = req.body;
    
    if (!query) {
        return res.status(400).json({ error: 'Missing query parameter' });
    }
    
    try {
        const relevantChunks = documentChunker.searchRelevantChunks(query, topK);
        
        let contextString = '';
        if (relevantChunks.length > 0) {
            contextString = 'RELEVANT CONTEXT FROM DOCUMENTATION:\n\n';
            relevantChunks.forEach((chunk, index) => {
                contextString += `CONTEXT ${index + 1}:\n`;
                contextString += `Chapter: ${chunk.chapter}\n`;
                contextString += `Section: ${chunk.section}\n`;
                contextString += `Content: ${chunk.content}\n`;
                contextString += `Relevance Score: ${chunk.relevanceScore}\n\n`;
            });
            contextString += '---\n\nPlease use the above context to provide a comprehensive and accurate answer.\n\n';
        }
        
        const enhancedMessage = contextString + `USER QUESTION: ${query}`;
        
        res.json({
            success: true,
            originalQuery: query,
            foundChunks: relevantChunks.length,
            contextPreview: contextString,
            fullPrompt: enhancedMessage,
            promptLength: enhancedMessage.length,
            chunks: relevantChunks.map(chunk => ({
                chapter: chunk.chapter,
                section: chunk.section,
                relevanceScore: chunk.relevanceScore,
                contentPreview: chunk.content.substring(0, 100) + '...'
            })),
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ RAG preview error:', error);
        res.status(500).json({ error: error.message });
    }
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

// Initialize RAG system and start server
async function startServer() {
    try {
        // Initialize RAG system first
        await initializeRAGSystem();
        
        app.listen(port, () => {
            console.log(`🚀 Enhanced Chatbot server with RAG is running on port ${port}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔑 PAGE_ACCESS_TOKEN loaded: ${process.env.PAGE_ACCESS_TOKEN ? 'YES' : 'NO'}`);
            if (process.env.PAGE_ACCESS_TOKEN) {
                console.log(`PAGE_ACCESS_TOKEN starts with: ${process.env.PAGE_ACCESS_TOKEN.substring(0, 5)}...`);
            }
            console.log('🔧 Available endpoints:');
            console.log('   ✅ GET  /webhook - Facebook verification');
            console.log('   🤖 POST /webhook - Full AI processing with RAG');
            console.log('   🧪 GET  /test - Server status with RAG info');
            console.log('   📨 POST /test-webhook - Manual webhook test');
            console.log('   💬 POST /test-message - Test message processing with RAG');
            console.log('   📤 POST /send-test-message - Test Facebook send');
            console.log('   🔄 GET  /switch-webhook/:mode - Webhook mode info');
            console.log('   ❤️  GET  /health - Health check with RAG status');
            console.log('');
            console.log('🧠 RAG System endpoints:');
            console.log('   🔍 POST /test-rag - Test RAG search functionality');
            console.log('   📚 GET  /rag/chapters - List all available chapters');
            console.log('   📖 GET  /rag/chapter/:name - Get chunks by chapter');
            console.log('   🔄 POST /rag/reload - Reload document');
            console.log('   📊 GET  /rag/stats - RAG system statistics');
            console.log('   🔍 POST /rag/search-detailed - Detailed search results');
            console.log('   👁️  POST /rag/preview-context - Preview AI context');
            console.log('');
            console.log(`📚 RAG System Status:`);
            console.log(`   Initialized: ${documentChunker.initialized ? '✅' : '❌'}`);
            console.log(`   Total Chunks: ${documentChunker.chunks.length}`);
            console.log(`   Available Chapters: ${documentChunker.getAllChapters().length}`);
            console.log('🎯 Enhanced chatbot with RAG system ready!');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();
