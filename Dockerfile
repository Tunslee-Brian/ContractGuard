# Sử dụng Node.js 20 làm Base Image (Debian Bookworm)
FROM node:20-bookworm-slim

# Cài đặt các gói hệ thống cần thiết (Python, pip, venv, Tesseract OCR và Poppler)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    tesseract-ocr \
    tesseract-ocr-vie \
    tesseract-ocr-eng \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Thiết lập thư mục làm việc
WORKDIR /app

# Tạo môi trường ảo Python (.venv) và cấu hình PATH để ưu tiên dùng python của .venv
RUN python3 -m venv .venv
ENV PATH="/app/.venv/bin:$PATH"

# Sao chép file requirements.txt và cài đặt thư viện Python
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Sao chép toàn bộ mã nguồn của dự án (trừ các mục trong .dockerignore)
COPY . .

# Expose port (Render tự động gán cổng qua biến PORT, server.js mặc định lắng nghe)
EXPOSE 4173

# Lệnh khởi chạy ứng dụng
CMD ["node", "server.js"]
