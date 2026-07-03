# ContractGuard AI Demo

Prototype local cho luồng rà soát hợp đồng của ContractGuard AI.

## Chạy dự án

```bash
npm run dev
```

Mở `http://localhost:4173`.

## OCR cho PDF scan

Trên macOS, cài Tesseract và bộ ngôn ngữ:

```bash
brew install tesseract tesseract-lang
```

Backend sẽ tự tìm `/opt/homebrew/bin/tesseract` hoặc `/usr/local/bin/tesseract`. Nếu cần chỉ định thủ công:

```bash
CONTRACTGUARD_TESSERACT=/opt/homebrew/bin/tesseract npm run dev
```

## Tính năng trong bản MVP

- Upload DOCX/TXT/PDF tối đa 80MB hoặc dùng hợp đồng mẫu.
- PDF dài 30-40 trang được trích xuất bằng `pdfplumber`/`pypdf`; PDF scan ảnh fallback sang Tesseract OCR `vie+eng`.
- Ẩn thông tin nhạy cảm như CCCD, số điện thoại, số tài khoản và mã số thuế.
- Quét deterministic rule engine theo checklist 40 hạng mục.
- Hiển thị split-view: văn bản hợp đồng có highlight và thẻ hành động Đỏ/Vàng/Xanh.
- Phân tích sâu: readiness, exposure tài chính, timeline nghĩa vụ, điều khoản còn thiếu và ưu tiên sửa.
- Chuyển động UI mượt hơn khi quét, hover, filter và nhảy tới đoạn highlight.
- Xuất báo cáo bằng chức năng in của trình duyệt.

Lưu ý: đây là demo hỗ trợ rà soát rủi ro, chưa thay thế tư vấn pháp lý chuyên nghiệp.

## Cấu hình Git & Đẩy dự án lên GitHub/GitLab

Dự án đã được cấu hình sẵn tệp `.gitignore` để loại bỏ các tệp nhạy cảm (như `.env` chứa API Key), các thư mục tạm và tệp build.

Để đẩy dự án lên kho chứa từ xa (remote repository):

1. **Khởi tạo và commit các tệp hiện tại:**
   ```bash
   git add .
   git commit -m "Initial commit: Setup project for Git"
   ```

2. **Liên kết với repo từ xa (Ví dụ trên GitHub):**
   - Tạo một repository mới trên GitHub (không tạo README hay .gitignore mới).
   - Chạy lệnh sau để đổi tên nhánh mặc định thành `main` và thêm URL repo của bạn:
     ```bash
     git branch -M main
     git remote add origin <URL_REPOSITORY_CỦA_BẠN>
     ```

3. **Đẩy mã nguồn lên:**
   ```bash
   git push -u origin main
   ```

## Triển khai (Deploy) lên Render.com qua Docker

Dự án đã được cấu hình sẵn [Dockerfile](file:///home/tunslee/Projects/CONTRACTGUARD-AI-/Dockerfile) và [.dockerignore](file:///home/tunslee/Projects/CONTRACTGUARD-AI-/.dockerignore) để có thể deploy trực tiếp lên Render.com bằng môi trường Docker.

### Các bước triển khai:

1. **Đăng ký/Đăng nhập Render.com**: Truy cập [Render Dashboard](https://dashboard.render.com/) và kết nối với tài khoản GitHub của bạn.
2. **Tạo Web Service**:
   - Nhấn **New +** ở góc trên cùng bên phải và chọn **Web Service**.
   - Chọn kho lưu trữ chứa mã nguồn dự án này mà bạn đã đẩy lên GitHub ở bước trên.
3. **Cấu hình dịch vụ**:
   - **Name**: Nhập tên dự án tùy chọn (ví dụ: `contractguard-ai`).
   - **Region**: Chọn vùng (Region) gần Việt Nam nhất (ví dụ: `Singapore` hoặc `Oregon`).
   - **Runtime**: Chọn **Docker** (Render sẽ tự động phát hiện và đọc `Dockerfile` ở thư mục gốc).
   - **Instance Type**: Chọn gói **Free**.
4. **Thiết lập biến môi trường (Environment Variables)**:
   - Nhấp vào phần **Advanced** -> **Add Environment Variable**.
   - Thêm các API Key cấu hình cho backend AI:
     - `GEMINI_API_KEY`: API Key cho mô hình Google Gemini (nếu dùng).
     - `GROQ_API_KEY`: API Key cho mô hình Groq (nếu dùng).
5. **Triển khai**:
   - Nhấn nút **Deploy Web Service**.
   - Quá trình build Docker và deploy sẽ mất khoảng vài phút. Khi thành công, Render sẽ cung cấp một đường dẫn URL công khai có dạng `https://ten-du-an.onrender.com` để bạn truy cập chạy thử.

*Lưu ý*: Với gói Free của Render, server sẽ tự động tạm dừng hoạt động (ngủ đông) nếu không có lượt truy cập trong 15 phút. Lượt truy cập tiếp theo sẽ mất khoảng 30-50 giây để server khởi động lại.


