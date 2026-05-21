# 👟 SHOESTORE - HỆ THỐNG QUẢN LÝ CỬA HÀNG GIÀY THÔNG MINH

> Hệ thống quản lý bán hàng toàn diện áp dụng kiến trúc Monorepo, tích hợp Trợ lý ảo AI phục vụ chăm sóc khách hàng và đổi trả tự động.

---

## 🚀 Công nghệ sử dụng (Tech Stack)

| Hạng mục | Công nghệ & Thư viện |
| :--- | :--- |
| **💻 Frontend** | `ReactJS`, `Vite`, `Tailwind CSS`, `Lucide Icons` |
| **⚙️ Backend** | `FastAPI` (Python), `Uvicorn Server`, `Pydantic` (Validation) |
| **🗃️ Database** | `SQLite` (Quản lý dữ liệu tập trung qua `shoestore.db`) |
| **🤖 AI Integration** | `Google Gemini 1.5 Flash API` (Tích hợp xử lý ngôn ngữ tự nhiên) |
| **🌐 Networking** | `Ngrok` (Băng thông kiểm thử luồng mạng diện rộng) |

---

## ✨ Điểm sáng dự án & Luồng nghiệp vụ cốt lõi

> Dự án đã thông mạch hoàn toàn các luồng nghiệp vụ quan trọng, đảm bảo tính toàn vẹn và tự động hóa cao.

#### **👤 Luồng Khách hàng (Customer Flow)**
- **Trải nghiệm người dùng:** Duyệt sản phẩm, thêm vào giỏ hàng, đặt hàng và thanh toán (COD, VietQR).
- **Quản lý cá nhân:** Cập nhật hồ sơ, xem lại lịch sử đơn hàng theo trạng thái, gửi đánh giá (feedback) cho sản phẩm đã mua.

#### **📦 Luồng Quản lý Kho & Logistics (Return Flow)**
- **Quy trình hoàn hàng khép kín:**
  1.  **Khách hàng:** Gửi yêu cầu hoàn hàng trên giao diện Lịch sử đơn hàng. Trạng thái đơn chuyển thành `pending_return`.
  2.  **Thủ kho:** Nhìn thấy yêu cầu trên màn hình Quản lý Kho, kiểm tra hàng hóa vật lý.
  3.  **Hệ thống:** Khi thủ kho xác nhận, hệ thống tự động cộng lại số lượng vào tồn kho (`products.stock`) và ghi nhật ký vào bảng `warehouse_slips`. Trạng thái đơn hàng được cập nhật thành `returned_received`.

#### **💰 Luồng Kế toán tài chính (Accounting Flow)**
- **Quản lý thu chi:** Ghi nhận các khoản thu (từ đơn hàng) và chi (chi phí vận hành, lương...).
- **Xử lý đơn hoàn:** Tự động ghi nhận chi phí âm (giảm doanh thu) khi một đơn hàng được hoàn trả thành công, đảm bảo báo cáo tài chính luôn chính xác.

#### **💬 Trợ lý ảo AI Gemini (AI Assistant)**
- **Tư vấn thông minh:** Tích hợp bong bóng chat trực tuyến, sử dụng Google Gemini để trả lời các câu hỏi về sản phẩm.
- **Hỗ trợ theo ngữ cảnh:** Hướng dẫn khách hàng thực hiện các quy trình phức tạp như đổi trả, tra cứu đơn hàng một cách tự nhiên.

---

## 📂 Cấu trúc thư mục dự án (Monorepo)

```
shoestore-web/
├── 📂 backend/         # Chứa mã nguồn FastAPI, routers, database...
│   ├── routers/
│   ├── main.py
│   └── requirements.txt
├── 📂 src/             # Chứa mã nguồn React, components, pages...
│   ├── components/
│   ├── pages/
│   └── App.jsx
├── 📂 docs/            # Tài liệu thiết kế, kiến trúc
├── 📄 package.json
├── 📄 vite.config.js
└── 🗃️ shoestore.db      # File cơ sở dữ liệu SQLite
```

---

## 🛠️ Hướng dẫn cài đặt & Chạy dự án

### Bước 1: Clone dự án & Cấu hình môi trường
1.  Clone repository về máy của bạn.
2.  Tạo file `.env` ở thư mục gốc của dự án và thêm vào API Key của Google Gemini.
    ```env
    # File: .env
    GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"
    ```

### Bước 2: Khởi động Backend (Python)
Mở một terminal và chạy các lệnh sau:
```bash
# Di chuyển vào thư mục backend
cd backend

# Tạo và kích hoạt môi trường ảo
python -m venv .venv
.venv\Scripts\activate  # Trên Windows
# source .venv/bin/activate  # Trên macOS/Linux

# Cài đặt các thư viện cần thiết
pip install -r requirements.txt

# Khởi động server FastAPI với chế độ auto-reload
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Bước 3: Khởi động Frontend (Node.js)
Mở một terminal **thứ hai** và chạy các lệnh sau:
```bash
# Cài đặt các package từ package.json
npm install

# Chạy server development của Vite
npm run dev
```
> Truy cập vào `http://localhost:5173`. Giao diện Frontend sẽ tự động kết nối với Backend qua proxy.

---

## 🔑 Tài khoản mẫu

Mật khẩu mặc định cho tất cả các tài khoản: `123456`

| Email | Vai trò |
| :--- | :--- |
| `admin@shoestore.vn` | **Admin** (Toàn quyền hệ thống) |
| `sale@shoestore.vn` | **Nhân viên Sale** (Tạo đơn, quản lý khách hàng) |
| `kho@shoestore.vn` | **Thủ kho** (Quản lý nhập/xuất/hoàn kho) |
| `ketoan@shoestore.vn` | **Kế toán** (Quản lý tài chính, hóa đơn, lương) |
| `it@shoestore.vn` | **IT** (Quản lý hệ thống, phân quyền, bảo trì) |
