# Facebook Chatbot

A simple Facebook Messenger chatbot designed for deployment on Render.

## Deployment Steps on Render

1.  **Create a New Web Service:** Log in to your Render account and click "New +", then select "Web Service".

2.  **Connect Repository:** Connect your GitHub account and select the `anhtuan159801/facebook-chatbot` repository.

3.  **Configure Settings:**
    *   **Name:** Give your service a unique name (e.g., `my-facebook-bot`).
    *   **Region:** Choose a suitable region.
    *   **Branch:** Select your main branch (likely `main` or `master`).
    *   **Build Command:** `npm install`
    *   **Start Command:** `node index.js`

4.  **Add Environment Variables:** This is the most important step. Go to the "Environment" tab and add all the secrets from your local `.env` file one by one (e.g., `VERIFY_TOKEN`, `PAGE_ACCESS_TOKEN`). **DO NOT PUSH YOUR `.env` FILE.**

5.  **Deploy:** Click "Create Web Service". Render will automatically build and deploy your application. Your chatbot will be live at the URL provided by Render.
