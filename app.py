import os
import sys
import logging
from dotenv import load_dotenv
from flask import Flask, request
import google.generativeai as genai
from pymessenger import Bot
import pandas as pd

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Get environment variables
FB_ACCESS_TOKEN = os.getenv('FB_ACCESS_TOKEN')
FB_VERIFY_TOKEN = os.getenv('FB_VERIFY_TOKEN')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

# Check for required environment variables
if not FB_ACCESS_TOKEN:
    sys.exit("FB_ACCESS_TOKEN is not defined in .env")
if not FB_VERIFY_TOKEN:
    sys.exit("FB_VERIFY_TOKEN is not defined in .env")
if not GEMINI_API_KEY:
    sys.exit("GEMINI_API_KEY is not defined in .env")

# Initialize PyMessenger Bot and Gemini
bot = Bot(FB_ACCESS_TOKEN)
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-pro-latest')

# --- RAG Core ---
def extract_text_from_xlsx(xlsx_path):
    """Extracts text from an XLSX file and formats it as a single string."""
    try:
        df = pd.read_excel(xlsx_path, header=None)
        text = ""
        for index, row in df.iterrows():
            row_text = " | ".join([str(cell) for cell in row.dropna()])
            if row_text:
                text += row_text + "\\n---\\n"
        return text
    except FileNotFoundError:
        print(f"Error: The file '{xlsx_path}' was not found.")
        return None
    except Exception as e:
        print(f"An error occurred while reading the XLSX file: {e}")
        return None

def get_gemini_response(question, context):
    """Generates a response from Gemini based on a question and context."""
    prompt = f"""
    Bạn là một trợ lý ảo thông minh. Dựa vào thông tin được cung cấp dưới đây, hãy trả lời câu hỏi của người dùng một cách chính xác và ngắn gọn.
    Nếu thông tin không có trong tài liệu, hãy trả lời: 'Xin lỗi, tôi không tìm thấy thông tin bạn cần trong tài liệu của mình.'

    **Tài liệu:**
    {context}

    **Câu hỏi:**
    {question}
    """
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Error generating response from Gemini: {e}")
        return "Xin lỗi, đã có lỗi xảy ra khi tôi cố gắng trả lời bạn."

# Load knowledge source
KNOWLEDGE_FILE = "FAQ.xlsx"
knowledge_base = extract_text_from_xlsx(KNOWLEDGE_FILE)
if knowledge_base is None:
    sys.exit(f"Could not load knowledge base from '{KNOWLEDGE_FILE}'. Exiting.")

# --- Flask Webserver ---
@app.route('/', methods=['GET'])
def verify():
    """Verifies the webhook with Facebook."""
    if request.args.get("hub.mode") == "subscribe" and request.args.get("hub.challenge"):
        if not request.args.get("hub.verify_token") == FB_VERIFY_TOKEN:
            return "Verification token mismatch", 403
        return request.args["hub.challenge"], 200
    return "Hello world", 200

@app.route('/', methods=['POST'])
def webhook():
    """Handles incoming messages from Facebook Messenger."""
    data = request.get_json()
    if data['object'] == 'page':
        for entry in data['entry']:
            for messaging_event in entry['messaging']:
                if messaging_event.get('message'):
                    sender_id = messaging_event['sender']['id']
                    message_text = messaging_event['message'].get('text')
                    if message_text:
                        # Get response from RAG core
                        response_text = get_gemini_response(message_text, knowledge_base)
                        # Send the response back to the user
                        bot.send_text_message(sender_id, response_text)
    return "ok", 200

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=False)