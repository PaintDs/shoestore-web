# ShoeStore Web

Hệ thống quản lý và bán giày: React (Vite) + FastAPI + SQLite.

## Yêu cầu

- Node.js 18+
- Python 3.10+

## Chạy development (frontend + backend tách)

**Terminal 1 — Backend:**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 2 — Frontend:**

```bash
npm install
npm run dev
```

Mở http://localhost:5173 — Vite proxy `/api` sang backend port 8000.

## Chạy production-like (một server)

```bash
npm install && npm run build
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

Mở http://localhost:8000 (FastAPI phục vụ API + file build trong `dist/`).

## Tài khoản mẫu

Mật khẩu mặc định: `123456`

| Email | Vai trò |
|-------|---------|
| admin@shoestore.vn | admin |
| sale@shoestore.vn | sale |
| kho@shoestore.vn | kho |
| ketoan@shoestore.vn | ketoan |
| it@shoestore.vn | it |

## Biến môi trường (tùy chọn)

| Biến | Mô tả |
|------|--------|
| `SHOESTORE_SECRET_KEY` | Khóa ký JWT (mặc định: dev key trong code) |
| `SHOESTORE_DEBUG` | `1` hoặc `true` — trả OTP trong response quên mật khẩu (chỉ dev) |

## Payroll API (tóm tắt)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/api/users/employees` | Danh sách nhân viên tính lương |
| POST | `/api/salaries/setup` | Thiết lập lương cơ bản |
| GET | `/api/salaries/setup/{user_id}` | Xem cấu hình lương |
| POST | `/api/salaries/timesheet` | Chấm công (giờ/ngày) |
| GET | `/api/salaries/commission/{user_id}/{year}/{month}` | Hoa hồng sale |
| POST | `/api/salaries/bonus-penalty` | Thưởng / phạt (có audit log) |
| POST | `/api/salaries/finalize/{year}/{month}` | Chốt & khóa bảng lương |
| GET | `/api/salaries/payroll/{year}/{month}` | Bảng lương (preview hoặc đã chốt) |
| GET | `/api/salaries/payroll/{year}/{month}/summary` | Tổng hợp kỳ lương |
| GET | `/api/salaries/payroll/{year}/{month}/employee/{user_id}` | Phiếu lương 1 nhân viên |
| GET | `/api/salaries/payroll/history/{user_id}` | Lịch sử lương theo nhân viên |
| GET | `/api/salaries/adjustments/{year}/{month}` | Lịch sử thưởng/phạt |
| GET | `/api/salaries/export?year=&month=` | Xuất CSV bảng lương |

Công thức: `(lương_cơ_bản × hệ_số / 26) × ngày_công + hoa_hồng + thưởng − phạt`.

## Tài liệu test

Xem `docs/architecture/test_design.md`.
