# Hướng dẫn lấy Google Custom Search API Key và Search Engine ID

Để bật tính năng tìm kiếm web nâng cao cho chatbot, bạn cần cung cấp hai thông tin sau vào file `.env` của dự án. Dưới đây là các bước chi tiết:

## Bước 1: Tạo hoặc chọn một dự án trên Google Cloud

1.  Truy cập [Google Cloud Console](https://console.cloud.google.com/).
2.  Nếu bạn chưa có dự án, hãy tạo một dự án mới. Nếu đã có, hãy chọn dự án bạn muốn sử dụng.

## Bước 2: Bật Custom Search API

1.  Trong giao diện Google Cloud Console của dự án, đi đến menu **APIs & Services** > **Library**.
2.  Tìm kiếm "Custom Search API".
3.  Chọn kết quả và nhấn **Enable** để kích hoạt API này cho dự án của bạn.

## Bước 3: Lấy API Key

1.  Vẫn trong **APIs & Services**, đi đến mục **Credentials**.
2.  Nhấn vào **+ CREATE CREDENTIALS** và chọn **API key**.
3.  Một API key sẽ được tạo ra. Hãy sao chép (copy) key này. Đây chính là giá trị cho `GOOGLE_SEARCH_API_KEY`.

## Bước 4: Tạo một Programmable Search Engine

1.  Truy cập trang [Programmable Search Engine](https://programmablesearchengine.google.com/).
2.  Nhấn **Add** để tạo một bộ máy tìm kiếm mới.
3.  Đặt tên cho bộ máy tìm kiếm của bạn (ví dụ: "Chatbot Search").
4.  Trong phần "What to search?", chọn **Search the entire web**.
5.  Hoàn tất các bước tạo.

## Bước 5: Lấy Search Engine ID (CX)

1.  Sau khi tạo xong, bạn sẽ được chuyển đến trang quản lý của bộ máy tìm kiếm vừa tạo.
2.  Trong tab **Basics**, tìm mục **Search engine ID** và sao chép (copy) giá trị này. Đây chính là giá trị cho `GOOGLE_SEARCH_CX`.

## Bước 6: Cập nhật file `.env`

1.  Mở file `.env` trong thư mục dự án của bạn.
2.  Thêm hai dòng sau vào cuối file, thay thế các giá trị `YOUR_API_KEY_HERE` và `YOUR_SEARCH_ENGINE_ID_HERE` bằng các giá trị bạn đã sao chép ở các bước trên:

    ```
    GOOGLE_SEARCH_API_KEY=YOUR_API_KEY_HERE
    GOOGLE_SEARCH_CX=YOUR_SEARCH_ENGINE_ID_HERE
    ```

## Bước 7: Khởi động lại Server

1.  Dừng server hiện tại bằng cách nhấn tổ hợp phím `Ctrl + C` trong cửa sổ terminal đang chạy.
2.  Chạy lại server bằng lệnh: `node server.js`.
3.  Kiểm tra log khởi động, bạn sẽ thấy dòng `Google Custom Search API: ENABLED` thay vì `FALLBACK MODE`.

