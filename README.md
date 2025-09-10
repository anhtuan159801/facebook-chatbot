# Chatbot RAG với Gemini và Facebook Messenger

Đây là một ứng dụng chatbot tích hợp Facebook Messenger, sử dụng mô hình ngôn ngữ Gemini của Google và kỹ thuật Retrieval-Augmented Generation (RAG) để trả lời câu hỏi dựa trên một nguồn kiến thức được cung cấp sẵn.

## Yêu cầu hệ thống

- Python 3.8 trở lên
- `pip` (trình quản lý gói của Python)
- Tài khoản [Render](https://render.com/) (miễn phí cho các dịch vụ cơ bản)
- Tài khoản [GitHub](https://github.com/)

## Hướng dẫn cài đặt

### Bước 1: Clone repository và cài đặt thư viện

1.  **Tải mã nguồn:**
    (Nếu bạn đã có các tệp, hãy bỏ qua bước này)

2.  **Tạo môi trường ảo (khuyến khích):**
    ```bash
    python -m venv venv
    ```
    Kích hoạt môi trường ảo:
    -   Trên Windows: `venv\Scripts\activate`
    -   Trên macOS/Linux: `source venv/bin/activate`

3.  **Cài đặt các thư viện cần thiết:**
    ```bash
    pip install -r requirements.txt
    ```

### Bước 2: Cấu hình biến môi trường

1.  **Đổi tên tệp `.env.template` thành `.env`:**
    ```bash
    # Trên Windows
    rename .env.template .env

    # Trên macOS/Linux
    mv .env.template .env
    ```

2.  **Điền các thông tin cần thiết vào tệp `.env`:**
    -   `FB_ACCESS_TOKEN`: Lấy từ trang Facebook Developer của bạn (xem Bước 4).
    -   `FB_VERIFY_TOKEN`: Một chuỗi bí mật do bạn tự tạo (ví dụ: `my-secret-chatbot-token-123`). Chuỗi này sẽ được dùng để xác thực webhook.
    -   `GEMINI_API_KEY`: Lấy từ [Google AI Studio](https://aistudio.google.com/app/apikey).

### Bước 3: Chuẩn bị nguồn kiến thức

1.  Mở tệp `FAQ.xlsx`.
2.  Nhập kiến thức của bạn vào các hàng và cột. Ứng dụng sẽ đọc tất cả dữ liệu văn bản từ tệp này để làm cơ sở trả lời.
    - Ví dụ: Bạn có thể tạo hai cột, một cho câu hỏi và một cho câu trả lời.
3.  Lưu tệp lại. Tệp `FAQ.xlsx` phải nằm cùng cấp với tệp `app.py`.

### Bước 4: Đưa mã nguồn lên GitHub

1.  **Tạo một repository mới trên GitHub:**
    -   Truy cập [GitHub](https://github.com/) và tạo một repository mới (có thể để ở chế độ Public hoặc Private).
2.  **Đẩy mã nguồn của bạn lên repository này:**
    -   Mở terminal trong thư mục dự án và chạy các lệnh sau:
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    git branch -M main
    git remote add origin <URL_REPOSITORY_CUA_BAN.git>
    git push -u origin main
    ```
    (Hãy thay `<URL_REPOSITORY_CUA_BAN.git>` bằng URL thật của repository bạn vừa tạo).

### Bước 5: Triển khai ứng dụng lên Render

1.  **Tạo Dịch vụ Web mới (New Web Service):**
    -   Đăng nhập vào [Render](https://render.com/).
    -   Trên Dashboard, nhấn "New +" và chọn "Web Service".
    -   Kết nối với tài khoản GitHub của bạn và chọn repository bạn vừa tạo ở Bước 4.
2.  **Cấu hình Dịch vụ:**
    -   **Name:** Đặt tên cho ứng dụng của bạn (ví dụ: `my-facebook-chatbot`).
    -   **Region:** Chọn khu vực gần bạn nhất (ví dụ: `Singapore`).
    -   **Branch:** Chọn `main`.
    -   **Runtime:** Chọn `Python 3`.
    -   **Build Command:** `pip install -r requirements.txt`
    -   **Start Command:** `gunicorn app:app`
3.  **Thêm Biến môi trường (Environment Variables):**
    -   Trong phần "Environment", nhấn "Add Environment Variable".
    -   Thêm 3 biến sau, lấy giá trị từ tệp `.env` của bạn:
        -   **Key:** `FB_ACCESS_TOKEN`, **Value:** `(dán giá trị của bạn vào đây)`
        -   **Key:** `FB_VERIFY_TOKEN`, **Value:** `(dán giá trị của bạn vào đây)`
        -   **Key:** `GEMINI_API_KEY`, **Value:** `(dán giá trị của bạn vào đây)`
4.  **Tạo Dịch vụ:**
    -   Nhấn nút "Create Web Service". Render sẽ bắt đầu quá trình xây dựng và triển khai ứng dụng của bạn. Quá trình này có thể mất vài phút.
    -   Sau khi hoàn tất, Render sẽ cung cấp cho bạn một URL công khai có dạng `https://<ten-ung-dung>.onrender.com`. **Hãy sao chép URL này.**

### Bước 6: Cấu hình Webhook trên Facebook

1.  **Truy cập Cài đặt Ứng dụng Facebook:**
    -   Quay lại trang [Facebook for Developers](https://developers.facebook.com/), vào ứng dụng của bạn và mở cài đặt Messenger.
2.  **Cập nhật Webhook:**
    -   Trong phần "Webhooks", nhấn "Thêm URL gọi lại" (Add Callback URL).
    -   **URL gọi lại:** Dán URL `.onrender.com` bạn vừa sao chép ở trên.
    -   **Mã xác minh (Verify Token):** Nhập chính xác giá trị bạn đã đặt cho `FB_VERIFY_TOKEN` trong biến môi trường trên Render.
    -   Nhấn "Xác minh và Lưu".
3.  **Thêm quyền cho Webhook:**
    -   Nhấn "Thêm gói đăng ký" (Add Subscriptions) và chọn `messages` và `messaging_postbacks`.

### Bước 7: Chạy và kiểm tra Chatbot

-   Mọi thứ đã sẵn sàng! Hãy vào Trang Facebook của bạn, gửi một tin nhắn và chatbot đang chạy trên Render sẽ trả lời dựa trên kiến thức trong tệp `FAQ.xlsx`.
