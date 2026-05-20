from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import FileResponse
from fastapi import UploadFile, File, Form
from pydantic import BaseModel, Field
import sqlite3
import random
import re
import os
from passlib.context import CryptContext
from typing import Optional
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from fastapi.middleware.cors import CORSMiddleware

# ================= CONFIG BẢO MẬT =================
# Lệnh để tạo secret key: openssl rand -hex 32
# Cấu hình mã hóa mật khẩu bằng bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cấu hình JWT
SECRET_KEY = "d5e4f3b2a1c0d9e8f7g6h5j4k3l2m1n0" # Tạm thời, nên chuyển vào file .env. Lệnh để tạo: openssl rand -hex 32
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# OAuth2PasswordBearer sẽ trích xuất token từ Header Authorization: Bearer <token>
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

# Bộ nhớ tạm lưu trữ mã OTP dưới Local (Email: OTP)
otp_store = {}

# Bộ nhớ tạm cho giỏ hàng và voucher (Hỗ trợ test không cần can thiệp sâu DB)
mock_cart_items = {} 
mock_vouchers = {"SALE20": {"discount": 0.2, "min_amount": 1000000, "expires": datetime(2026, 12, 31)}}

def init_db():
    conn = sqlite3.connect('shoestore.db', check_same_thread=False)
    cursor = conn.cursor()
    
    # Tạo đầy đủ các bảng nếu chưa tồn tại
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price INTEGER NOT NULL,
            category TEXT,
            image TEXT,
            stock INTEGER DEFAULT 0,
            bin TEXT
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            failed_attempts INTEGER DEFAULT 0
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER,
            customer_name TEXT NOT NULL,
            order_type TEXT,
            total_amount INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(customer_id) REFERENCES customers(id)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER,
            product_id INTEGER,
            product_name TEXT,
            quantity INTEGER,
            size INTEGER,
            FOREIGN KEY(order_id) REFERENCES orders(id),
            FOREIGN KEY(product_id) REFERENCES products(id)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS payrolls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            month INTEGER NOT NULL,
            year INTEGER NOT NULL,
            base_salary INTEGER,
            work_days REAL DEFAULT 0,
            commission INTEGER DEFAULT 0,
            bonus INTEGER DEFAULT 0,
            penalty INTEGER DEFAULT 0,
            total_salary INTEGER,
            status TEXT DEFAULT 'open', -- open, locked
            UNIQUE(user_id, month, year)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            user_id INTEGER,
            rating INTEGER NOT NULL,
            comment TEXT,
            status TEXT DEFAULT 'pending', -- pending, processed, hidden
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS promotions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT UNIQUE NOT NULL,
            discount_percentage REAL NOT NULL,
            min_order_amount INTEGER,
            start_date DATETIME,
            end_date DATETIME,
            status TEXT DEFAULT 'upcoming' -- upcoming, active, ended, paused
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS salaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            base_salary INTEGER NOT NULL,
            coefficient REAL DEFAULT 1.0
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS timesheets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            work_date DATE NOT NULL,
            hours_worked REAL NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cart (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            product_id INTEGER,
            quantity INTEGER
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            text TEXT,
            file_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, customer_name TEXT NOT NULL,
            company_name TEXT NOT NULL, tax_id TEXT NOT NULL, address TEXT NOT NULL,
            total_amount INTEGER NOT NULL, status TEXT DEFAULT 'issued', -- issued, cancelled
            adjustment_reason TEXT, issued_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cash_ledger (
            id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, category TEXT NOT NULL,
            amount INTEGER NOT NULL, method TEXT NOT NULL, attachment_path TEXT,
            description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT UNIQUE NOT NULL,
            loyalty_points INTEGER DEFAULT 0, rank TEXT DEFAULT 'Normal'
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS warehouse_slips (
            id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL, reason TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(product_id) REFERENCES products(id)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS inventory_counts (
            id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL, system_qty INTEGER NOT NULL,
            actual_qty INTEGER NOT NULL, difference INTEGER NOT NULL, reason TEXT, status TEXT DEFAULT 'pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(product_id) REFERENCES products(id)
        )
    """)
    # Bảng warehouse_bins được tích hợp vào bảng products (cột 'bin') để đơn giản hóa
    cursor.execute("CREATE TABLE IF NOT EXISTS system_parameters (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
    cursor.execute("CREATE TABLE IF NOT EXISTS system_backups (id INTEGER PRIMARY KEY, filename TEXT, filepath TEXT, created_at DATETIME, status TEXT)")
    cursor.execute("CREATE TABLE IF NOT EXISTS system_maintenance (id INTEGER PRIMARY KEY, is_maintenance BOOLEAN, banner_message TEXT)")
    cursor.execute("CREATE TABLE IF NOT EXISTS system_deployments (id INTEGER PRIMARY KEY, version TEXT, status TEXT, deployed_at DATETIME)")
    cursor.execute("CREATE TABLE IF NOT EXISTS third_party_api_logs (id INTEGER PRIMARY KEY, api_name TEXT, status_code INTEGER, response_body TEXT, retry_count INTEGER, created_at DATETIME)")
    cursor.execute("CREATE TABLE IF NOT EXISTS chatbot_intents (id INTEGER PRIMARY KEY, intent_name TEXT UNIQUE, pattern TEXT, response TEXT)")


    cursor.execute("CREATE TABLE IF NOT EXISTS accounting_periods (id INTEGER PRIMARY KEY, month INTEGER, year INTEGER, status TEXT, UNIQUE(month, year))")

    # Khởi tạo dữ liệu Test nếu DB trống
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        hashed_default_pwd = pwd_context.hash("123456")
        users_data = [
            ("Giám Đốc", "admin@shoestore.vn", hashed_default_pwd, "admin", "active", 0),
            ("Trưởng Kho", "kho@shoestore.vn", hashed_default_pwd, "kho", "active", 0),
            ("Kế Toán", "ketoan@shoestore.vn", hashed_default_pwd, "ketoan", "active", 0),
            ("IT Admin", "it@shoestore.vn", hashed_default_pwd, "it", "active", 0),
            ("Nhân viên Sale", "sale@shoestore.vn", hashed_default_pwd, "sale", "active", 0)
        ]
        cursor.executemany("INSERT INTO users (name, email, password, role, status, failed_attempts) VALUES (?, ?, ?, ?, ?, ?)", users_data)

    # Khởi tạo dữ liệu Sản phẩm Test nếu DB trống
    cursor.execute("SELECT COUNT(*) FROM products")
    if cursor.fetchone()[0] == 0:
        products_data = [
            ("Nike Air Force 1 '07", 2500000, "Lifestyle", "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/b7d9211c-26e7-431a-ac24-b0540f69079e/air-force-1-07-shoes-WrLl21.png", 10, "A1"),
            ("Adidas Ultraboost 22", 3200000, "Running", "https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/01f11202863941428383ae8d009210e7_9366/Giay_Ultraboost_22_mau_den_GX5588_01_standard.jpg", 5, "B2"),
            ("Puma RS-X Reinvention", 1800000, "Sportstyle", "https://images.puma.com/image/upload/f_auto,q_auto,b_rgb:fafafa,w_600,h_600/global/369579/01/sv01/fnd/IND/fmt/png/RS-X-Reinvention-Sneakers", 7, "C3"),
            ("Converse Chuck 70 Classic", 1500000, "Casual", "https://www.converse.com.vn/media/catalog/product/cache/d02951963286f2b4676646193796d669/1/6/162050c_0.jpg", 12, "D4"),
            ("Vans Old Skool", 1300000, "Skate", "https://www.vans.com.vn/media/catalog/product/cache/d02951963286f2b4676646193796d669/v/n/vn000d3hy28_1.jpg", 8, "E5"),
        ]
        cursor.executemany("INSERT INTO products (name, price, category, image, stock, bin) VALUES (?, ?, ?, ?, ?, ?)", products_data)

    cursor.execute("SELECT COUNT(*) FROM orders")
    if cursor.fetchone()[0] == 0:
        # Lấy tên của admin user để gán đơn hàng test
        admin_name = "Giám Đốc"
        try:
            admin_user_name_row = cursor.execute("SELECT name FROM users WHERE role = 'admin' LIMIT 1").fetchone()
            if admin_user_name_row:
                admin_name = admin_user_name_row[0]
        except (sqlite3.OperationalError, TypeError):
             # Bảng user có thể chưa được tạo, dùng tên mặc định
            pass

        orders_data = [
            ("Nguyễn Văn A", 5230000, "pending"),
            ("Trần Thị B", 4500000, "shipping"),
            (admin_name, 8600000, "completed"), # Gán đơn hàng đã hoàn thành cho admin
        ]
        cursor.executemany("INSERT INTO orders (customer_name, total_amount, status) VALUES (?, ?, ?)", orders_data)

        # Chèn chi tiết đơn hàng cho đơn hàng của admin
        try:
            admin_order_id = cursor.execute("SELECT id FROM orders WHERE customer_name = ?", (admin_name,)).fetchone()[0]
            cursor.execute("INSERT INTO order_items (order_id, product_id, product_name, quantity) VALUES (?, ?, ?, ?)", (admin_order_id, 1, "Nike Air Force 1 '07", 1))
        except (sqlite3.OperationalError, TypeError):
            print("Không thể chèn chi tiết đơn hàng mẫu cho admin.")
        
    cursor.execute("SELECT COUNT(*) FROM payrolls")
    if cursor.fetchone()[0] == 0:
        try:
            kho_id = cursor.execute("SELECT id FROM users WHERE role = 'kho'").fetchone()[0]
            ketoan_id = cursor.execute("SELECT id FROM users WHERE role = 'ketoan'").fetchone()[0]
            payrolls_data = [
                (kho_id, 5, 2026, 8000000, 24, 500000, 1000000, 0, 9500000, 'open'),
                (ketoan_id, 5, 2026, 9000000, 26, 0, 0, 200000, 8800000, 'open'),
            ]
            cursor.executemany("INSERT INTO payrolls (user_id, month, year, base_salary, work_days, commission, bonus, penalty, total_salary, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", payrolls_data)
        except (TypeError, IndexError):
            # This can happen if the users table is empty when this runs, which is fine.
            print("Could not seed payrolls, users might not exist yet.")

    cursor.execute("SELECT COUNT(*) FROM feedback")
    if cursor.fetchone()[0] == 0:
        feedback_data = [
            (1, 1, 5, "Sản phẩm rất tốt, giao hàng nhanh!", "pending"),
            (1, 2, 3, "Chất lượng ổn, nhưng giao hàng hơi lâu.", "pending"),
            (2, 1, 1, "Hàng bị lỗi, yêu cầu đổi trả.", "pending"),
        ]
        cursor.executemany("INSERT INTO feedback (product_id, user_id, rating, comment, status) VALUES (?, ?, ?, ?, ?)", feedback_data)

    cursor.execute("SELECT COUNT(*) FROM promotions")
    if cursor.fetchone()[0] == 0:
        promotions_data = [
            ("Khuyến mãi hè", "SUMMER20", 0.20, 500000, datetime(2026, 6, 1), datetime(2026, 8, 31), "active"),
            ("Giảm giá đặc biệt", "SPECIAL10", 0.10, 0, datetime(2026, 1, 1), datetime(2026, 1, 15), "ended"),
            ("Ưu đãi thành viên", "VIP5", 0.05, 100000, datetime(2026, 10, 1), datetime(2026, 10, 31), "upcoming"),
        ]
        cursor.executemany("INSERT INTO promotions (name, code, discount_percentage, min_order_amount, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)", promotions_data)

    # Tự động thêm dữ liệu mẫu cho Hàng hoàn một cách an toàn
    cursor.execute("SELECT COUNT(*) FROM warehouse_slips WHERE type = 'return'")
    if cursor.fetchone()[0] == 0: # Chỉ thêm nếu chưa có phiếu hoàn nào
        # Lấy product_id của sản phẩm đầu tiên để làm mẫu
        cursor.execute("SELECT id FROM products LIMIT 1")
        product_id_sample = cursor.fetchone()
        if product_id_sample:
            product_id = product_id_sample[0]
            
            # Kiểm tra xem cột 'reason' có tồn tại không để tránh lỗi
            cursor.execute("PRAGMA table_info(warehouse_slips)")
            columns = [row[1] for row in cursor.fetchall()]
            if 'reason' in columns:
                cursor.execute(
                    "INSERT INTO warehouse_slips (type, product_id, quantity, reason) VALUES (?, ?, ?, ?)",
                    ('return', product_id, 2, 'Khách đổi size')
                )
            else:
                cursor.execute("INSERT INTO warehouse_slips (type, product_id, quantity) VALUES (?, ?, ?)", ('return', product_id, 2))

    conn.commit()
    conn.close()

init_db()

# ================= MODELS =================
class ProductCreate(BaseModel):
    name: str; price: int; category: str; image: str; stock: int; bin: str

class UserRegister(BaseModel):
    name: str; email: str; password: str

class UserLogin(BaseModel):
    email: str; password: str

class ForgotPasswordReq(BaseModel):
    email: str

class ResetPasswordReq(BaseModel):
    email: str; otp: str; new_password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

# Models cho Quản lý sản phẩm
class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[int] = Field(default=None, gt=0)
    category: Optional[str] = None
    image: Optional[str] = None
    stock: Optional[int] = None
    bin: Optional[str] = None
    status: Optional[str] = None # 'active', 'inactive'

# Models cho Quản lý khuyến mãi
class PromotionCreate(BaseModel):
    name: str; code: str; discount_percentage: float; min_order_amount: int
    start_date: datetime; end_date: datetime

class PromotionUpdate(BaseModel):
    name: Optional[str] = None; discount_percentage: Optional[float] = None; min_order_amount: Optional[int] = None; start_date: Optional[datetime] = None; end_date: Optional[datetime] = None; status: Optional[str] = None

# Models cho Giỏ hàng & Thanh toán
class CartItemAdd(BaseModel):
    product_id: int; quantity: int = 1; price: int; stock: int

class CartItemUpdate(BaseModel):
    product_id: int; quantity: int; stock: int

class CheckoutRequest(BaseModel):
    customer_name: str; phone: str; address: str; payment_method: str
    cart_items: list; voucher_code: Optional[str] = None

# Models cho Phản hồi khách hàng
class FeedbackCreate(BaseModel):
    product_id: int
    rating: int = Field(..., gt=0, le=5)
    comment: str

class FeedbackProcess(BaseModel):
    action: str # 'process' or 'hide'
    reason: str

# Models cho Quản lý lương
class SalarySetup(BaseModel):
    user_id: int; base_salary: int; coefficient: float = 1.0

class TimesheetEntry(BaseModel):
    user_id: int; work_date: str; hours_worked: float

class BonusPenaltyRequest(BaseModel):
    user_id: int
    month: int
    year: int
    amount: int
    reason: str

# Models cho Kế toán
class InvoiceCreate(BaseModel):
    order_id: int; customer_name: str; company_name: str; tax_id: str; address: str; total_amount: int

class InvoiceAdjust(BaseModel):
    reason: str

class CashLedgerCreate(BaseModel):
    type: str; category: str; amount: int; method: str; description: str

class PeriodLockRequest(BaseModel):
    month: int
    year: int

# Models cho Bán hàng & Kho
class CustomerCreate(BaseModel):
    name: str; phone: str

class SaleOrderItem(BaseModel):
    product_id: int; quantity: int

class SaleOrderCreate(BaseModel):
    customer_id: Optional[int] = None
    customer_name: str; phone: str; order_type: str
    items: list[SaleOrderItem]
    voucher_code: Optional[str] = None

class OrderStatusUpdate(BaseModel):
    status: str

class WarehouseSlipCreate(BaseModel):
    product_id: int; quantity: int; reason: Optional[str] = None

class InventoryCountCreate(BaseModel):
    product_id: int; actual_qty: int; reason: str

# Models cho IT
class SystemParam(BaseModel):
    key: str
    value: str

class MaintenanceRequest(BaseModel):
    is_maintenance: bool
    banner_message: str

class DeployRequest(BaseModel):
    version: str

class UserRoleUpdate(BaseModel):
    user_id: int
    new_role: str

class ChatbotIntentCreate(BaseModel):
    intent_name: str; pattern: str; response: str

# ================= DEPENDENCIES =================
def get_db():
    conn = sqlite3.connect('shoestore.db', check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

# ================= JWT UTILS =================
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# 2. ĐỊNH NGHĨA ĐẦY ĐỦ: Hàm get_current_user phải được đặt trước khi gán Depends
async def get_current_user(token: str = Depends(oauth2_scheme), conn: sqlite3.Connection = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email, role=payload.get("role"))
    except JWTError:
        raise credentials_exception
    
    cursor = conn.cursor()
    # Tự động tạo bảng users nếu Database bị ghi đè (test env) mà quên init
    cursor.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL, status TEXT DEFAULT 'active', failed_attempts INTEGER DEFAULT 0)")
    cursor.execute("SELECT * FROM users WHERE email = ?", (token_data.email,))
    user = cursor.fetchone()
    
    if user is None:
        raise credentials_exception
    return dict(user)

# Dependency chuyên dụng để kiểm tra quyền Kế toán/Admin
async def get_accounting_user(current_user: dict = Depends(get_current_user)):
    # ACC_FIN_05: Phân quyền báo cáo thành công
    if current_user["role"] not in ["admin", "ketoan"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền truy cập chức năng kế toán.")
    return current_user

async def get_sale_user(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "sale"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền truy cập chức năng bán hàng.")
    return current_user

async def get_warehouse_user(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "kho"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền truy cập chức năng kho.")
    return current_user

async def get_it_user(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "it"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền truy cập chức năng IT.")
    return current_user


# ================= 3. KHÔI PHỤC TẤT CẢ ENDPOINT ĐẦY ĐỦ =================

# ---------------- API AUTH ----------------
@app.post("/api/register")
def register(user: UserRegister, conn: sqlite3.Connection = Depends(get_db)):
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', user.email):
        raise HTTPException(status_code=422, detail="Invalid email format")

    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (user.email,))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="Email này đã được đăng ký!")
    
    hashed_password = pwd_context.hash(user.password)
    cursor.execute("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", (user.name, user.email, hashed_password, "customer"))
    conn.commit()
    return {"message": "Đăng ký thành công!"}

@app.post("/api/login", response_model=Token)
def login(user_in: UserLogin, conn: sqlite3.Connection = Depends(get_db)):
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', user_in.email):
        raise HTTPException(status_code=422, detail="Invalid email format")

    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (user_in.email,))
    db_user = cursor.fetchone()
    
    if not db_user:
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không chính xác!")
    if db_user["status"] == "locked":
        raise HTTPException(status_code=403, detail="Tài khoản đã bị khóa do nhập sai quá nhiều lần! Vui lòng liên hệ Admin.")

    # Check password và đếm failed_attempts
    if not pwd_context.verify(user_in.password, db_user["password"]):
        new_attempts = db_user["failed_attempts"] + 1
        if new_attempts >= 3:
            cursor.execute("UPDATE users SET status = 'locked', failed_attempts = ? WHERE email = ?", (new_attempts, user_in.email))
            conn.commit()
            raise HTTPException(status_code=403, detail="Bạn đã nhập sai mật khẩu 3 lần. Tài khoản đã tự động khóa bảo mật!")
        
        cursor.execute("UPDATE users SET failed_attempts = ? WHERE email = ?", (new_attempts, user_in.email))
        conn.commit()
        raise HTTPException(status_code=401, detail=f"Sai mật khẩu! Bạn còn {3 - new_attempts} lần thử trước khi bị khóa.")

    cursor.execute("UPDATE users SET failed_attempts = 0 WHERE email = ?", (user_in.email,))
    conn.commit()
    
    access_token = create_access_token(data={"sub": db_user["email"], "role": db_user["role"]})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/users/me")
def read_users_me(current_user: dict = Depends(get_current_user)):
    user_info = {k: v for k, v in current_user.items() if k != 'password'}
    return user_info

@app.get("/api/users")
def get_all_users(conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_it_user)):
    """Endpoint để lấy danh sách người dùng cho màn hình RBAC của IT."""
    cursor = conn.cursor()
    # Chỉ lấy các user có role là nhân viên, không lấy customer
    # IT_ROLE_02: Đảm bảo chỉ admin/it mới có quyền xem danh sách này
    cursor.execute("SELECT id, name, email, role, status FROM users WHERE role != 'customer'")

    return [dict(row) for row in cursor.fetchall()]

@app.post("/api/forgot-password")
def forgot_password(req: ForgotPasswordReq, conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (req.email,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Email chưa từng đăng ký trên hệ thống!")
    
    otp = str(random.randint(100000, 999999))
    otp_store[req.email] = otp
    print(f"\n🔑 [MÃ OTP CỦA BẠN]: {otp} (Dành cho email: {req.email})\n")
    return {"message": "Mã OTP đã được khởi tạo!", "otp_dev": otp}

@app.post("/api/reset-password")
def reset_password(req: ResetPasswordReq, conn: sqlite3.Connection = Depends(get_db)):
    if req.email not in otp_store or otp_store[req.email] != req.otp:
        raise HTTPException(status_code=400, detail="Mã OTP không chính xác!")
    
    cursor = conn.cursor()
    hashed_password = pwd_context.hash(req.new_password)
    cursor.execute("UPDATE users SET password = ? WHERE email = ?", (hashed_password, req.email))
    conn.commit()
    del otp_store[req.email]
    return {"message": "Đổi mật khẩu mới thành công!"}

# ---------------- API SẢN PHẨM & TÌM KIẾM ----------------
@app.get("/api/products")
def get_products(
    conn: sqlite3.Connection = Depends(get_db),
    name: Optional[str] = None,
    category: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    stock_lt: Optional[int] = None, # Cảnh báo hết hàng (tồn kho < giá trị này)
    stock_gt: Optional[int] = None  # Cảnh báo tồn đọng (tồn kho > giá trị này)
):
    cursor = conn.cursor()
    query = "SELECT * FROM products WHERE 1=1"
    params = []
    if name:
        query += " AND name LIKE ?"
        params.append(f"%{name}%")
    if category:
        query += " AND category = ?"
        params.append(category)
    if min_price:
        query += f" AND price >= {min_price}"
    if max_price:
        query += f" AND price <= {max_price}"
    if stock_lt is not None:
        query += " AND stock < ?"
        params.append(stock_lt)
    if stock_gt is not None:
        query += " AND stock > ?"
        params.append(stock_gt)
        
    query += " ORDER BY id DESC"
    cursor.execute(query, params)
    return [dict(row) for row in cursor.fetchall()]

@app.post("/api/products")
def create_product(product: ProductCreate, conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()
    cursor.execute("INSERT INTO products (name, price, category, image, stock, bin) VALUES (?, ?, ?, ?, ?, ?)", 
                   (product.name, product.price, product.category, product.image, product.stock, product.bin))
    conn.commit()
    return {"message": "Thành công", "id": cursor.lastrowid}

@app.delete("/api/products/{product_id}")
def delete_product(product_id: int, conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM products WHERE id = ?", (product_id,))
    conn.commit()
    return {"message": "Đã xóa thành công!"}

@app.get("/api/products/{product_id}")
def get_product_detail(product_id: int, conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
    product = cursor.fetchone()
    if not product:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại.")
    return dict(product)

@app.put("/api/products/{product_id}")
def update_product(product_id: int, product_update: ProductUpdate, conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()
    set_clauses = []
    params = []
    if product_update.name is not None: set_clauses.append("name = ?"); params.append(product_update.name)
    if product_update.price is not None: set_clauses.append("price = ?"); params.append(product_update.price)
    if product_update.category is not None: set_clauses.append("category = ?"); params.append(product_update.category)
    if product_update.image is not None: set_clauses.append("image = ?"); params.append(product_update.image)
    if product_update.stock is not None: set_clauses.append("stock = ?"); params.append(product_update.stock)
    if product_update.bin is not None: set_clauses.append("bin = ?"); params.append(product_update.bin)
    if product_update.status is not None: set_clauses.append("status = ?"); params.append(product_update.status)

    if not set_clauses:
        raise HTTPException(status_code=400, detail="Không có thông tin để cập nhật.")

    query = f"UPDATE products SET {', '.join(set_clauses)} WHERE id = ?"
    params.append(product_id)
    
    cursor.execute(query, tuple(params))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm.")
    conn.commit()
    return {"message": "Cập nhật sản phẩm thành công!"}

# ---------------- API GIỎ HÀNG ----------------
@app.post("/api/cart/add")
def add_to_cart(item: CartItemAdd, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    if item.stock <= 0:
        raise HTTPException(status_code=400, detail="Sản phẩm đã hết hàng!")
    
    if user_id not in mock_cart_items: mock_cart_items[user_id] = []
    
    existing_item = next((i for i in mock_cart_items[user_id] if i["product_id"] == item.product_id), None)
    if existing_item:
        if existing_item["quantity"] + item.quantity > item.stock:
            raise HTTPException(status_code=400, detail=f"Số lượng vượt quá tồn kho khả dụng ({item.stock})!")
        existing_item["quantity"] += item.quantity
    else:
        if item.quantity > item.stock:
             raise HTTPException(status_code=400, detail=f"Số lượng vượt quá tồn kho khả dụng ({item.stock})!")
        mock_cart_items[user_id].append({"product_id": item.product_id, "quantity": item.quantity, "price": item.price, "stock": item.stock})
    return {"message": "Đã thêm sản phẩm vào giỏ hàng!", "cart": mock_cart_items[user_id]}

@app.put("/api/cart/update")
def update_cart_item(item: CartItemUpdate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    if user_id not in mock_cart_items: raise HTTPException(status_code=404, detail="Giỏ hàng trống!")
    
    existing_item = next((i for i in mock_cart_items[user_id] if i["product_id"] == item.product_id), None)
    if not existing_item: raise HTTPException(status_code=404, detail="Sản phẩm không có trong giỏ hàng!")
    if item.quantity <= 0: raise HTTPException(status_code=400, detail="Số lượng phải lớn hơn 0!")
    if item.quantity > item.stock: raise HTTPException(status_code=400, detail=f"Số lượng vượt quá tồn kho khả dụng ({item.stock})!")
    
    existing_item["quantity"] = item.quantity
    return {"message": "Đã cập nhật số lượng!", "cart": mock_cart_items[user_id]}

@app.delete("/api/cart/remove/{product_id}")
def remove_from_cart(product_id: int, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    if user_id not in mock_cart_items: raise HTTPException(status_code=404, detail="Giỏ hàng trống!")
    
    initial_len = len(mock_cart_items[user_id])
    mock_cart_items[user_id] = [item for item in mock_cart_items[user_id] if item["product_id"] != product_id]
    if len(mock_cart_items[user_id]) == initial_len:
        raise HTTPException(status_code=404, detail="Sản phẩm không có trong giỏ hàng!")
    return {"message": "Đã xóa sản phẩm khỏi giỏ hàng!"}

# ---------------- API THANH TOÁN & ĐƠN HÀNG ----------------
@app.post("/api/checkout")
@app.post("/api/pay")  # Ánh xạ alias cho test case
def process_checkout(req: CheckoutRequest, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if not req.customer_name or not req.phone or not req.address or not req.payment_method or not req.cart_items:
        raise HTTPException(status_code=400, detail="Vui lòng điền đầy đủ thông tin giao hàng và giỏ hàng không được trống!")
    
    total_amount = sum(item["quantity"] * item["price"] for item in req.cart_items)
    if req.voucher_code:
        voucher = mock_vouchers.get(req.voucher_code)
        if not voucher or datetime.now() > voucher["expires"]:
            raise HTTPException(status_code=400, detail="Mã voucher không hợp lệ hoặc đã hết hạn!")
        if total_amount < voucher["min_amount"]:
            raise HTTPException(status_code=400, detail=f"Voucher chỉ áp dụng cho đơn từ {voucher['min_amount']}đ!")
        total_amount -= total_amount * voucher["discount"]

    cursor = conn.cursor()
    cursor.execute("INSERT INTO orders (customer_name, total_amount, status) VALUES (?, ?, ?)", (req.customer_name, total_amount, "pending"))
    order_id = cursor.lastrowid
    
    # Cập nhật để thêm product_id vào order_items
    for item in req.cart_items:
        # Giả định 'item' từ cart_items có chứa 'product_id' và 'name'
        product_name = item.get('name', f"Product {item['id']}")
        cursor.execute(
            "INSERT INTO order_items (order_id, product_name, quantity) VALUES (?, ?, ?)",
            (order_id, product_name, item['quantity'])
        )
    conn.commit()

    if req.payment_method == "COD":
        return {"message": "Đặt hàng thành công với COD!", "order_id": order_id, "final_amount": total_amount}
    elif req.payment_method == "Online":
        return {"message": "Chuyển hướng đến cổng thanh toán...", "payment_url": "https://mock-vnpay-momo.com/pay", "order_id": order_id, "final_amount": total_amount}
    raise HTTPException(status_code=400, detail="Phương thức thanh toán không hợp lệ.")

@app.get("/api/orders")
def get_orders(conn: sqlite3.Connection = Depends(get_db), status: Optional[str] = None):
    cursor = conn.cursor()
    query = "SELECT * FROM orders"
    params = []
    
    if status:
        # Cho phép lọc nhiều trạng thái, ví dụ: "confirmed,awaiting_pickup"
        statuses = [s.strip() for s in status.split(',')]
        query += f" WHERE status IN ({','.join(['?']*len(statuses))})"
        params.extend(statuses)

    query += " ORDER BY id DESC"
    cursor.execute(query, params)
    orders = [dict(row) for row in cursor.fetchall()]

    # Lấy chi tiết sản phẩm cho mỗi đơn hàng
    for order in orders:
        cursor.execute("SELECT * FROM order_items WHERE order_id = ?", (order['id'],))
        order['items'] = [dict(row) for row in cursor.fetchall()]
    return orders

@app.get("/api/user/orders")
def get_user_orders(conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM orders WHERE customer_name = ? ORDER BY created_at DESC", (current_user["name"],))
    orders = [dict(row) for row in cursor.fetchall()]

    # For each order, get its items
    for order in orders:
        cursor.execute("SELECT * FROM order_items WHERE order_id = ?", (order['id'],))
        order['items'] = [dict(row) for row in cursor.fetchall()]

    return orders

@app.get("/api/user/orders/{order_id}")
def get_user_order_detail(order_id: int, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM orders WHERE id = ? AND customer_name = ?", (order_id, current_user["name"]))
    order = cursor.fetchone()
    if not order: raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng hoặc bạn không có quyền truy cập.")
    return dict(order)

@app.post("/api/user/orders/{order_id}/cancel")
def cancel_user_order(order_id: int, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM orders WHERE id = ? AND customer_name = ?", (order_id, current_user["name"]))
    order_status = cursor.fetchone()
    if not order_status: raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng.")
    if order_status["status"] != "pending":
        raise HTTPException(status_code=400, detail="Không thể hủy đơn hàng ở trạng thái này!")
    cursor.execute("UPDATE orders SET status = 'cancelled' WHERE id = ?", (order_id,))
    conn.commit()
    return {"message": "Đơn hàng đã được hủy thành công!"}

# ---------------- API BÁO CÁO HIỆU SUẤT (Mô phỏng) ----------------
@app.get("/api/reports/performance")
def get_performance_report(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    report_type: str = "daily", # daily, monthly, yearly
    conn: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] not in ["admin", "ketoan"]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập báo cáo này.")
    
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.")

    # Mock data for demonstration
    return {
        "total_revenue": 150000000,
        "total_profit": 35000000,
        "total_orders": 120,
        "report_period": f"{start_date.strftime('%Y-%m-%d') if start_date else 'N/A'} - {end_date.strftime('%Y-%m-%d') if end_date else 'N/A'}",
        "type": report_type
    }

@app.get("/api/reports/top-products")
def get_top_products_report(
    limit: int = 5,
    sort_by: str = "quantity", # quantity, revenue
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] not in ["admin", "ketoan"]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập báo cáo này.")
    
    # Mock data
    return [
        {"product_name": "Nike Air Force 1", "quantity_sold": 50, "total_revenue": 125000000},
        {"product_name": "Adidas Ultraboost", "quantity_sold": 30, "total_revenue": 54000000},
        {"product_name": "Puma RS-X", "quantity_sold": 20, "total_revenue": 24000000},
    ][:limit]

@app.get("/api/reports/export")
def export_report(report_name: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "ketoan"]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền xuất báo cáo này.")
    return {"message": f"Đang xuất báo cáo {report_name} ra file Excel/PDF..."}

# ---------------- API PHẢN HỒI KHÁCH HÀNG (Mô phỏng) ----------------
@app.get("/api/feedback")
def get_all_feedback(
    product_id: Optional[int] = None,
    status: Optional[str] = None, # pending, processed, hidden
    conn: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập phản hồi khách hàng.")
    
    cursor = conn.cursor()
    query = "SELECT * FROM feedback WHERE 1=1"
    params = []
    if product_id: query += " AND product_id = ?"; params.append(product_id)
    if status: query += " AND status = ?"; params.append(status)
    
    cursor.execute(query, params)
    return [dict(row) for row in cursor.fetchall()]

@app.post("/api/feedback")
def create_feedback(feedback: FeedbackCreate, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """
    Endpoint cho khách hàng gửi đánh giá sản phẩm.
    """
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Không thể xác thực người dùng.")

    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO feedback (product_id, user_id, rating, comment, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (feedback.product_id, user_id, feedback.rating, feedback.comment, 'pending', datetime.now())
        )
        conn.commit()
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Lỗi cơ sở dữ liệu khi lưu phản hồi.")
    
    return {"message": "Cảm ơn bạn đã gửi đánh giá!"}

@app.put("/api/feedback/{feedback_id}/process")
def process_feedback(feedback_id: int, req: FeedbackProcess, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền xử lý phản hồi.")
    
    cursor = conn.cursor()
    if req.action == "process":
        cursor.execute("UPDATE feedback SET status = 'processed', comment = ? WHERE id = ?", (req.reason, feedback_id))
        conn.commit()
        return {"message": f"Phản hồi {feedback_id} đã được xử lý."}
    elif req.action == "hide":
        cursor.execute("UPDATE feedback SET status = 'hidden', comment = ? WHERE id = ?", (req.reason, feedback_id))
        conn.commit()
        return {"message": f"Phản hồi {feedback_id} đã được ẩn."}
    raise HTTPException(status_code=400, detail="Hành động không hợp lệ.")

# ---------------- API QUẢN LÝ KHUYẾN MÃI (Mô phỏng) ----------------
@app.get("/api/promotions")
def get_promotions(conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền xem khuyến mãi.")
    
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM promotions ORDER BY start_date DESC")
    promotions = [dict(row) for row in cursor.fetchall()]
    return promotions

@app.post("/api/promotions")
def create_promotion(promo: PromotionCreate, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền tạo khuyến mãi.")
    
    if promo.start_date >= promo.end_date:
        raise HTTPException(status_code=400, detail="Ngày kết thúc phải sau ngày bắt đầu.")
    
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM promotions WHERE code = ?", (promo.code,))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="Mã khuyến mãi đã tồn tại.")
    
    status = "upcoming"
    if promo.start_date <= datetime.now() < promo.end_date:
        status = "active"

    cursor.execute(
        "INSERT INTO promotions (name, code, discount_percentage, min_order_amount, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (promo.name, promo.code, promo.discount_percentage, promo.min_order_amount, promo.start_date, promo.end_date, status)
    )
    conn.commit()
    return {"message": "Tạo khuyến mãi thành công!", "id": cursor.lastrowid}

@app.put("/api/promotions/{promo_id}")
def update_promotion(promo_id: int, promo_update: PromotionUpdate, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền cập nhật khuyến mãi.")
    
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM promotions WHERE id = ?", (promo_id,))
    existing_promo = cursor.fetchone()
    if not existing_promo:
        raise HTTPException(status_code=404, detail="Không tìm thấy khuyến mãi.")
    
    set_clauses = []
    params = []
    if promo_update.name is not None: set_clauses.append("name = ?"); params.append(promo_update.name)
    if promo_update.discount_percentage is not None: set_clauses.append("discount_percentage = ?"); params.append(promo_update.discount_percentage)
    if promo_update.min_order_amount is not None: set_clauses.append("min_order_amount = ?"); params.append(promo_update.min_order_amount)
    if promo_update.start_date is not None: set_clauses.append("start_date = ?"); params.append(promo_update.start_date)
    if promo_update.end_date is not None: set_clauses.append("end_date = ?"); params.append(promo_update.end_date)
    if promo_update.status is not None: set_clauses.append("status = ?"); params.append(promo_update.status)

    if not set_clauses:
        raise HTTPException(status_code=400, detail="Không có thông tin để cập nhật.")

    query = f"UPDATE promotions SET {', '.join(set_clauses)} WHERE id = ?"
    params.append(promo_id)
    
    cursor.execute(query, tuple(params))
    conn.commit()
    return {"message": "Cập nhật khuyến mãi thành công!"}

@app.post("/api/promotions/{promo_id}/end")
def end_promotion_early(promo_id: int, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền kết thúc khuyến mãi.")
    
    cursor = conn.cursor()
    cursor.execute("UPDATE promotions SET status = 'ended', end_date = ? WHERE id = ? AND status = 'active'", (datetime.now(), promo_id))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=400, detail="Không thể kết thúc khuyến mãi này (có thể đã kết thúc hoặc không tồn tại).")
    conn.commit()
    return {"message": "Khuyến mãi đã được kết thúc sớm!"}

# ---------------- API QUẢN LÝ LƯƠNG (Mô phỏng) ----------------
@app.post("/api/salaries/setup")
def setup_salary(salary_data: SalarySetup, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền thiết lập lương.")
    if salary_data.base_salary <= 0 or salary_data.coefficient <= 0:
        raise HTTPException(status_code=400, detail="Mức lương cơ bản và hệ số phải lớn hơn 0.")
    
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO salaries (user_id, base_salary, coefficient) VALUES (?, ?, ?)",
                   (salary_data.user_id, salary_data.base_salary, salary_data.coefficient))
    conn.commit()
    return {"message": "Thiết lập lương thành công!"}

@app.post("/api/salaries/timesheet")
def update_timesheet(timesheet_entry: TimesheetEntry, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền cập nhật chấm công.")
    if timesheet_entry.hours_worked < 0:
        raise HTTPException(status_code=400, detail="Số giờ làm việc không thể âm.")
    
    cursor = conn.cursor()
    cursor.execute("INSERT INTO timesheets (user_id, work_date, hours_worked) VALUES (?, ?, ?)",
                   (timesheet_entry.user_id, timesheet_entry.work_date, timesheet_entry.hours_worked))
    conn.commit()
    return {"message": "Cập nhật chấm công thành công!"}

@app.get("/api/salaries/commission/{user_id}")
def get_commission(user_id: int, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền xem hoa hồng.")
    # Mock commission calculation
    return {"user_id": user_id, "commission_amount": 500000, "message": "Tính hoa hồng thành công!"}

@app.post("/api/salaries/bonus-penalty")
def add_bonus_penalty(req: BonusPenaltyRequest, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền thêm thưởng/phạt.")
    if req.amount == 0 or not req.reason:
        raise HTTPException(status_code=400, detail="Số tiền thưởng/phạt không thể bằng 0 và phải có lý do.")
    
    cursor = conn.cursor()
    # Ensure payroll record exists for the period
    cursor.execute("SELECT id FROM payrolls WHERE user_id = ? AND year = ? AND month = ?", (req.user_id, req.year, req.month))
    if cursor.fetchone() is None: # If no payroll entry exists for this user/month/year, create a default one
        cursor.execute("INSERT INTO payrolls (user_id, month, year, base_salary, work_days, commission, bonus, penalty, total_salary, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                       (req.user_id, req.month, req.year, 0, 0, 0, 0, 0, 0, 'open'))

    if req.amount > 0: # Bonus
        cursor.execute("UPDATE payrolls SET bonus = bonus + ? WHERE user_id = ? AND year = ? AND month = ?", (req.amount, req.user_id, req.year, req.month))
    else: # Penalty
        cursor.execute("UPDATE payrolls SET penalty = penalty + ? WHERE user_id = ? AND year = ? AND month = ?", (abs(req.amount), req.user_id, req.year, req.month))
    
    conn.commit()
    return {"message": f"Đã cập nhật {'thưởng' if req.amount > 0 else 'phạt'} cho user {req.user_id}."}

@app.post("/api/salaries/finalize/{year}/{month}")
def finalize_payroll(year: int, month: int, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "ketoan"]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền chốt bảng lương.")
    cursor = conn.cursor()
    cursor.execute("UPDATE payrolls SET status = 'locked' WHERE year = ? AND month = ? AND status = 'open'", (year, month))
    conn.commit()
    if cursor.rowcount == 0:
        return {"message": f"Không có bảng lương nào ở trạng thái 'mở' trong tháng {month}/{year} để chốt."}
    return {"message": f"Bảng lương tháng {month}/{year} đã được chốt!"}

@app.get("/api/salaries/export")
def export_payroll_report(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "ketoan"]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền xuất báo cáo lương.")
    return {"message": "Đang xuất báo cáo lương ra file Excel/PDF..."}

@app.get("/api/salaries/payroll/{year}/{month}")
def get_payroll_data(year: int, month: int, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "ketoan"]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập bảng lương.")
    cursor = conn.cursor()
    query = """
        SELECT
            u.id as user_id,
            u.name,
            u.role,
            p.month,
            p.year,
            p.base_salary,
            p.work_days,
            p.commission,
            p.bonus,
            p.penalty,
            p.total_salary,
            p.status
        FROM users u
        LEFT JOIN payrolls p ON u.id = p.user_id AND p.year = ? AND p.month = ?
        WHERE u.role NOT IN ('admin', 'it', 'customer')
    """
    cursor.execute(query, (year, month))
    return [dict(row) for row in cursor.fetchall()]

# ---------------- API CHAT ----------------
@app.post("/api/chat/message")
def send_chat_message(message: dict, current_user: dict = Depends(get_current_user)):
    if not message.get("text"): raise HTTPException(status_code=400, detail="Nội dung tin nhắn không được trống.")
    print(f"[{current_user['name']}] gửi tin nhắn: {message['text']}")
    return {"message": "Tin nhắn đã được gửi!", "status": "success"}

@app.post("/api/chat/file")
async def send_chat_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    max_file_size = 1 * 1024 * 1024 # 1MB
    file.file.seek(0, os.SEEK_END); file_size = file.file.tell(); file.file.seek(0)
    
    if file_size > max_file_size:
        raise HTTPException(status_code=400, detail=f"File quá lớn! Kích thước tối đa là {max_file_size / (1024*1024)}MB.")
    if file.content_type not in ["image/jpeg", "image/png", "application/pdf"]:
        raise HTTPException(status_code=400, detail="Định dạng file không được hỗ trợ.")
    return {"message": "File đã được gửi!", "filename": file.filename, "status": "success"}

# ================= API BÁN HÀNG (SALE) =================

@app.post("/api/sales/customers")
def create_customer(customer: CustomerCreate, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_sale_user)):
    # SALE_CUS_02: Chặn SĐT sai định dạng hoặc trùng lặp
    if not re.match(r'^(0[3|5|7|8|9])+([0-9]{8})$', customer.phone):
        raise HTTPException(status_code=400, detail="SALE_CUS_02: Số điện thoại không hợp lệ.")
    
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO customers (name, phone) VALUES (?, ?)", (customer.name, customer.phone))
        conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="SALE_CUS_02: Số điện thoại đã tồn tại trong hệ thống.")
    
    return {"message": "SALE_CUS_01: Thêm khách hàng thành công!", "customer_id": cursor.lastrowid}

@app.get("/api/sales/customers")
def get_customers(conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_sale_user)):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM customers ORDER BY id DESC")
    return [dict(row) for row in cursor.fetchall()]

@app.post("/api/sales/orders")
def create_sale_order(order: SaleOrderCreate, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_sale_user)):
    cursor = conn.cursor()
    total_amount = 0
    
    # Check stock and calculate total amount
    for item in order.items:
        cursor.execute("SELECT price, stock FROM products WHERE id = ?", (item.product_id,))
        product = cursor.fetchone()
        if not product:
            raise HTTPException(status_code=404, detail=f"Sản phẩm ID {item.product_id} không tồn tại.")
        # SALE_ORDER_04: Chặn tạo đơn vượt tồn kho
        if product['stock'] < item.quantity:
            raise HTTPException(status_code=400, detail=f"SALE_ORDER_04: Sản phẩm ID {item.product_id} không đủ tồn kho (còn {product['stock']}).")
        total_amount += product['price'] * item.quantity

    # SALE_CUS_05: Áp dụng ưu đãi thành viên VIP
    if order.customer_id:
        cursor.execute("SELECT rank FROM customers WHERE id = ?", (order.customer_id,))
        customer = cursor.fetchone()
        if customer and customer['rank'] == 'VIP':
            total_amount *= 0.95 # Giảm 5% cho VIP

    # Insert order
    cursor.execute(
        "INSERT INTO orders (customer_id, customer_name, order_type, total_amount, status) VALUES (?, ?, ?, ?, ?)",
        (order.customer_id, order.customer_name, order.order_type, total_amount, 'awaiting_pickup' if order.order_type != 'online' else 'pending')
    )
    order_id = cursor.lastrowid

    # Insert order items and update stock
    for item in order.items:
        cursor.execute("INSERT INTO order_items (order_id, product_name, quantity) VALUES (?, (SELECT name FROM products WHERE id=?), ?)",
                       (order_id, item.product_id, item.quantity))
        cursor.execute("UPDATE products SET stock = stock - ? WHERE id = ?", (item.quantity, item.product_id))

    conn.commit()
    return {"message": "SALE_ORDER_01/02: Tạo đơn hàng thành công!", "order_id": order_id}

@app.put("/api/sales/orders/{order_id}/status")
def update_order_status(order_id: int, status_update: OrderStatusUpdate, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_sale_user)):
    cursor = conn.cursor()
    cursor.execute("SELECT status, customer_id, total_amount FROM orders WHERE id = ?", (order_id,))
    order = cursor.fetchone()
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng.")

    # SALE_ORDM_05: Bảo vệ Workflow đơn hàng
    valid_transitions = {
        'pending': ['confirmed', 'cancelled'],
        'confirmed': ['awaiting_pickup', 'cancelled'],
        'awaiting_pickup': ['shipping'],
        'shipping': ['completed', 'returned'],
    }
    if status_update.status not in valid_transitions.get(order['status'], []):
        raise HTTPException(status_code=400, detail=f"SALE_ORDM_05: Không thể chuyển trạng thái từ '{order['status']}' sang '{status_update.status}'.")

    cursor.execute("UPDATE orders SET status = ? WHERE id = ?", (status_update.status, order_id))

    # SALE_CUS_03, SALE_CUS_04: Cộng điểm, nâng hạng khi đơn hàng hoàn tất
    if status_update.status == 'completed' and order['customer_id']:
        points_to_add = int(order['total_amount'] / 10000) # 10,000đ = 1 điểm
        cursor.execute("UPDATE customers SET loyalty_points = loyalty_points + ? WHERE id = ?", (points_to_add, order['customer_id']))
        
        cursor.execute("SELECT loyalty_points FROM customers WHERE id = ?", (order['customer_id'],))
        new_points = cursor.fetchone()['loyalty_points']
        if new_points >= 1000: # Ngưỡng lên VIP
            cursor.execute("UPDATE customers SET rank = 'VIP' WHERE id = ?", (order['customer_id'],))

    conn.commit()
    return {"message": f"Cập nhật trạng thái đơn hàng {order_id} thành công."}

@app.post("/api/sales/orders/mock-online")
def create_mock_online_order(conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_current_user)):
    """
    Tạo một đơn hàng online giả lập cho mục đích demo và lưu trữ vào database.
    - Trạng thái ban đầu là 'pending'.
    - Tự động lấy 1-3 sản phẩm ngẫu nhiên.
    - Ghi vào bảng 'orders' và 'order_items'.
    """
    cursor = conn.cursor()
    
    # 3. Lấy 1-3 sản phẩm ngẫu nhiên từ bảng products để tạo chi tiết đơn hàng
    cursor.execute("SELECT id, name, price, stock FROM products WHERE stock > 0 ORDER BY RANDOM() LIMIT ?", (random.randint(1, 3),))
    products_to_order = cursor.fetchall()

    if not products_to_order:
        raise HTTPException(status_code=400, detail="Không có sản phẩm nào trong kho để tạo đơn demo.")

    total_amount = 0
    order_items_data = []
    for product in products_to_order:
        quantity = 1 # Mỗi sản phẩm lấy 1 chiếc cho đơn giản
        total_amount += product['price'] * quantity
        order_items_data.append({
            "product_id": product['id'],
            "product_name": product['name'],
            "quantity": quantity
        })

    # 2. Viết câu lệnh INSERT INTO orders để chèn đơn hàng mới
    customer_name = f"Khách Online Demo #{random.randint(100, 999)}"
    cursor.execute(
        "INSERT INTO orders (customer_name, order_type, total_amount, status) VALUES (?, ?, ?, ?)",
        (customer_name, 'online', total_amount, 'pending')
    )
    order_id = cursor.lastrowid

    # 3. Viết câu lệnh INSERT INTO order_items để chèn chi tiết sản phẩm
    for item in order_items_data:
        cursor.execute("INSERT INTO order_items (order_id, product_id, product_name, quantity) VALUES (?, ?, ?, ?)", (order_id, item['product_id'], item['product_name'], item['quantity']))
    
    conn.commit()
    return {"message": f"Tạo và lưu đơn hàng demo {order_id} vào DB thành công!", "order_id": order_id}
# ================= API KHO (WAREHOUSE) =================

@app.post("/api/warehouse/inbound")
def create_inbound_slip(slip: WarehouseSlipCreate, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_warehouse_user)):
    """
    WH_IN_01, WH_IN_02, WH_IN_03: Xử lý việc tạo phiếu nhập kho.
    - Validate số lượng > 0.
    - Validate sản phẩm tồn tại.
    - Cộng tồn kho vào bảng products.
    - Lưu phiếu vào bảng warehouse_slips.
    """
    # 1. Validate chặn lỗi: Nếu số lượng nhập <= 0 hoặc sản phẩm không tồn tại
    if slip.quantity <= 0:
        raise HTTPException(status_code=400, detail="WH_IN_03: Số lượng nhập kho phải lớn hơn 0.")
    
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM products WHERE id = ?", (slip.product_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="WH_IN_03: Sản phẩm không tồn tại trong hệ thống.")

    # 2. Khi hoàn tất phiếu nhập, bắt buộc chạy lệnh SQL: UPDATE products SET stock = stock + ?
    cursor.execute("UPDATE products SET stock = stock + ? WHERE id = ?", (slip.quantity, slip.product_id))
    
    # Ghi nhận phiếu nhập kho
    cursor.execute("INSERT INTO warehouse_slips (type, product_id, quantity) VALUES (?, ?, ?)", ('in', slip.product_id, slip.quantity))
    # 3. Tất cả các lệnh ghi DB phải có conn.commit()
    conn.commit()
    return {"message": "WH_IN_01: Lập phiếu nhập kho và cập nhật tồn kho thành công!", "slip_id": cursor.lastrowid}

@app.get("/api/warehouse/inbound/history")
def get_inbound_history(conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_warehouse_user)):
    """Lấy lịch sử các phiếu nhập kho."""
    cursor = conn.cursor()
    query = """
        SELECT
            ws.id,
            ws.type,
            ws.quantity,
            ws.created_at,
            ws.product_id,
            p.name as product_name
        FROM warehouse_slips ws
        LEFT JOIN products p ON ws.product_id = p.id
        WHERE ws.type = 'in'
        ORDER BY ws.created_at DESC
    """
    cursor.execute(query)
    return [dict(row) for row in cursor.fetchall()]

@app.put("/api/warehouse/outbound/order/{order_id}")
def confirm_order_outbound(order_id: int, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_warehouse_user)):
    """
    WH_OUT_01, 02, 03: Xử lý xác nhận xuất kho cho một đơn hàng.
    - Chuyển trạng thái đơn hàng thành 'shipping'.
    - Trừ tồn kho dựa trên các sản phẩm trong đơn.
    - Chặn xuất âm kho.
    """
    return update_order_status(order_id, OrderStatusUpdate(status='shipping'), conn, user)

@app.get("/api/warehouse/returns/history")
def get_returns_history(conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_warehouse_user)):
    """Lấy lịch sử các phiếu hàng hoàn."""
    cursor = conn.cursor()
    query = """
        SELECT
            ws.id,
            ws.product_id,
            p.name as product_name,
            ws.quantity,
            ws.created_at
        FROM warehouse_slips ws
        LEFT JOIN products p ON ws.product_id = p.id
        WHERE ws.type = 'return'
        ORDER BY ws.created_at DESC
    """
    cursor.execute(query)
    return [dict(row) for row in cursor.fetchall()]

@app.post("/api/warehouse/inventory-count")
def perform_inventory_count(count: InventoryCountCreate, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_warehouse_user)):
    """
    WH_COUNT_01-04: Xử lý kiểm kê kho.
    - Lấy tồn kho hệ thống.
    - Tính chênh lệch.
    - Lưu lịch sử kiểm kê.
    - Cập nhật lại tồn kho thực tế.
    """
    cursor = conn.cursor()
    cursor.execute("SELECT stock FROM products WHERE id = ?", (count.product_id,))
    product = cursor.fetchone()
    if not product:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại.")
    
    system_qty = product['stock']
    difference = count.actual_qty - system_qty

    cursor.execute(
        "INSERT INTO inventory_counts (product_id, system_qty, actual_qty, difference, reason, status) VALUES (?, ?, ?, ?, ?, 'approved')",
        (count.product_id, system_qty, count.actual_qty, difference, count.reason)
    )
    cursor.execute("UPDATE products SET stock = ? WHERE id = ?", (count.actual_qty, count.product_id))
    conn.commit()
    return {"message": "WH_COUNT_04: Đã điều chỉnh tồn kho theo số lượng thực tế.", "count_id": cursor.lastrowid}

@app.get("/api/warehouse/inventory-count")
def get_inventory_count_history(conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_warehouse_user)):
    """Lấy lịch sử các phiếu kiểm kê kho."""
    cursor = conn.cursor()
    query = """
        SELECT
            ic.id,
            ic.product_id,
            p.name as product_name,
            ic.system_qty,
            ic.actual_qty,
            ic.difference,
            ic.reason,
            ic.status
        FROM inventory_counts ic
        LEFT JOIN products p ON ic.product_id = p.id
        ORDER BY ic.id DESC
    """
    cursor.execute(query)
    return [dict(row) for row in cursor.fetchall()]

@app.post("/api/warehouse/returns")
def process_return(req: WarehouseSlipCreate, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_warehouse_user)):
    """
    WH_RETURN: Xử lý hàng hoàn.
    - Nếu hàng tốt, cộng lại vào tồn kho.
    """
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM products WHERE id = ?", (req.product_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại.")

    if req.reason == 'good':
        cursor.execute("UPDATE products SET stock = stock + ? WHERE id = ?", (req.quantity, req.product_id))
        cursor.execute("INSERT INTO warehouse_slips (type, product_id, quantity) VALUES ('return', ?, ?)", (req.product_id, req.quantity))
        conn.commit()
        return {"message": "WH_RETURN_03: Hàng tốt, đã nhập lại tồn kho."}
    elif req.reason == 'bad':
        cursor.execute("INSERT INTO warehouse_slips (type, product_id, quantity) VALUES ('return', ?, ?)", (req.product_id, req.quantity))
        conn.commit()
        return {"message": "WH_RETURN_04: Hàng lỗi, đã chuyển sang khu vực hàng hỏng."}
    
    raise HTTPException(status_code=400, detail="Tình trạng hàng không hợp lệ.")

# ================= API KẾ TOÁN (ACC) =================
# ================= API BÁN HÀNG (SALE) =================

@app.post("/api/it/config")
def set_system_config(param: SystemParam, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_it_user)):
    # IT_SYS_01
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO system_parameters (key, value) VALUES (?, ?)", (param.key, param.value))
    conn.commit()
    return {"message": f"IT_SYS_01: Tham số '{param.key}' đã được cập nhật."}

@app.post("/api/it/backup")
def create_backup(conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_it_user)):
    # IT_SYS_02 (Simulation)
    filename = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db.gz"
    filepath = f"/var/backups/{filename}"
    return {"message": "IT_SYS_02: Đã tạo bản sao lưu dữ liệu thành công!", "filename": filename, "filepath": filepath}

@app.post("/api/it/restore")
def restore_backup(filename: str = Form(...), conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_it_user)):
    # IT_SYS_03 (Simulation)
    if not filename:
        raise HTTPException(status_code=400, detail="Cần cung cấp tên file backup.")
    return {"message": f"IT_SYS_03: Đang khôi phục dữ liệu từ file '{filename}'... Hệ thống sẽ khởi động lại."}

@app.post("/api/it/maintenance")
def set_maintenance_mode(req: MaintenanceRequest, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_it_user)):
    # IT_MAINT_03
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO system_maintenance (id, is_maintenance, banner_message) VALUES (1, ?, ?)", (req.is_maintenance, req.banner_message))
    conn.commit()
    status_msg = "bật" if req.is_maintenance else "tắt"
    return {"message": f"IT_MAINT_03: Đã {status_msg} chế độ bảo trì."}

@app.post("/api/it/deploy")
def record_deployment(req: DeployRequest, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_it_user)):
    # IT_MAINT_01
    cursor = conn.cursor()
    cursor.execute("UPDATE system_deployments SET status = 'archived' WHERE status = 'stable'")
    cursor.execute("INSERT INTO system_deployments (version, status, deployed_at) VALUES (?, 'stable', ?)", (req.version, datetime.now()))
    conn.commit()
    return {"message": f"IT_MAINT_01: Đã ghi nhận triển khai phiên bản {req.version} thành công."}

@app.post("/api/it/rollback")
def rollback_deployment(conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_it_user)):
    # IT_MAINT_02 (Simulation)
    return {"message": "IT_MAINT_02: Đã gửi yêu cầu rollback về phiên bản ổn định trước đó."}

@app.put("/api/it/users/role")
def update_user_role(req: UserRoleUpdate, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_it_user)):
    # IT_ROLE_01, IT_ROLE_03
    valid_roles = ["admin", "kho", "ketoan", "sale", "it", "customer"]
    if req.new_role not in valid_roles:
        raise HTTPException(status_code=400, detail="Vai trò không hợp lệ.")
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET role = ? WHERE id = ?", (req.new_role, req.user_id))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
    conn.commit()
    return {"message": f"IT_ROLE_01: Đã cập nhật vai trò cho người dùng ID {req.user_id} thành '{req.new_role}'."}

@app.post("/api/it/integrate-api")
def simulate_api_integration(api_name: str = Form(...), conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_it_user)):
    # IT_API_01, 02, 03
    cursor = conn.cursor()
    if random.random() < 0.2: # 20% chance of failure
        status_code, response_body = 504, '{"error": "Upstream service timed out"}'
        cursor.execute("INSERT INTO third_party_api_logs (api_name, status_code, response_body, retry_count) VALUES (?, ?, ?, 1)", (api_name, status_code, response_body))
        conn.commit()
        raise HTTPException(status_code=504, detail=f"IT_API_03: Lỗi timeout khi gọi API {api_name}. Đã ghi log.")
    else:
        status_code, response_body = 200, '{"status": "success", "data": "..."}'
        cursor.execute("INSERT INTO third_party_api_logs (api_name, status_code, response_body) VALUES (?, ?, ?)", (api_name, status_code, response_body))
        conn.commit()
        return {"message": f"IT_API_01/02: Tích hợp API {api_name} thành công.", "response": response_body}

@app.post("/api/it/chatbot")
def create_chatbot_intent(intent: ChatbotIntentCreate, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_it_user)):
    # IT_API_04
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO chatbot_intents (intent_name, pattern, response) VALUES (?, ?, ?)", (intent.intent_name, intent.pattern, intent.response))
        conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Tên intent đã tồn tại.")
    return {"message": "IT_API_04: Đã huấn luyện chatbot với kịch bản mới."}

@app.get("/api/it/chatbot")
def get_chatbot_intents(conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_it_user)):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM chatbot_intents")
    return [dict(row) for row in cursor.fetchall()]

@app.post("/api/accounting/invoices")
def create_invoice(invoice: InvoiceCreate, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_accounting_user)):
    # ACC_INV_02: Xuất hóa đơn thất bại (thiếu trường) - Pydantic đã xử lý
    # ACC_INV_03: Xuất hóa đơn thất bại (sai định dạng MST)
    if not invoice.tax_id.isdigit() or len(invoice.tax_id) not in [10, 13]:
        raise HTTPException(status_code=400, detail="ACC_INV_03: Mã số thuế không hợp lệ, phải là 10 hoặc 13 chữ số.")
    
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO invoices (order_id, customer_name, company_name, tax_id, address, total_amount) VALUES (?, ?, ?, ?, ?, ?)",
        (invoice.order_id, invoice.customer_name, invoice.company_name, invoice.tax_id, invoice.address, invoice.total_amount)
    )
    conn.commit()
    return {"message": "ACC_INV_01: Xuất hóa đơn thành công!", "invoice_id": cursor.lastrowid}

@app.get("/api/accounting/invoices")
def search_invoices(search_term: Optional[str] = None, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_accounting_user)):
    cursor = conn.cursor()
    try:
        if search_term:
            cursor.execute("SELECT * FROM invoices WHERE id LIKE ? OR customer_name LIKE ? OR tax_id LIKE ? ORDER BY issued_at DESC", 
                           (f"%{search_term}%", f"%{search_term}%", f"%{search_term}%"))
        else:
            cursor.execute("SELECT * FROM invoices ORDER BY issued_at DESC")
        return [dict(row) for row in cursor.fetchall()]
    except sqlite3.OperationalError as e:
        # Handle case where 'invoices' table might not exist yet
        if "no such table: invoices" in str(e):
            raise HTTPException(status_code=500, detail="Database table 'invoices' not found. Please ensure database is initialized correctly.")
        raise # Re-raise other operational errors
@app.put("/api/accounting/invoices/{invoice_id}/adjust")
def adjust_invoice(invoice_id: int, req: InvoiceAdjust, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_accounting_user)):
    if not req.reason:
        raise HTTPException(status_code=400, detail="Phải cung cấp lý do khi hủy/điều chỉnh hóa đơn.")
    cursor = conn.cursor()
    cursor.execute("UPDATE invoices SET status = 'cancelled', adjustment_reason = ? WHERE id = ?", (req.reason, invoice_id))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy hóa đơn.")
    conn.commit()
    return {"message": "ACC_INV_05: Hóa đơn đã được hủy/điều chỉnh thành công."}

@app.post("/api/accounting/cash-ledger")
def create_cash_entry(entry: CashLedgerCreate, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_accounting_user)):
    # ACC_CASH_03: Ghi nhận thu chi thất bại (số tiền <= 0)
    if entry.amount <= 0:
        raise HTTPException(status_code=400, detail="ACC_CASH_03: Số tiền phải là số dương lớn hơn 0.")
    
    # Logic kiểm tra kỳ kế toán đã khóa
    entry_date = datetime.now()
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM accounting_periods WHERE year = ? AND month = ?", (entry_date.year, entry_date.month))
    period = cursor.fetchone()
    if period and period['status'] == 'locked':
        raise HTTPException(status_code=400, detail=f"ACC_FIN_06: Kỳ kế toán {entry_date.month}/{entry_date.year} đã khóa, không thể ghi nhận giao dịch mới.")

    cursor.execute(
        "INSERT INTO cash_ledger (type, category, amount, method, description) VALUES (?, ?, ?, ?, ?)",
        (entry.type, entry.category, entry.amount, entry.method, entry.description)
    )
    conn.commit()
    return {"message": "ACC_CASH_01/02: Ghi nhận bút toán thành công!", "entry_id": cursor.lastrowid}

@app.get("/api/accounting/cash-ledger")
def get_cash_ledger(start: Optional[str] = None, end: Optional[str] = None, method: Optional[str] = None, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_accounting_user)):
    query = "SELECT * FROM cash_ledger WHERE 1=1"
    params = []
    if start: query += " AND created_at >= ?"; params.append(start)
    if end: query += " AND created_at <= ?"; params.append(end)
    if method and method != 'all': query += " AND method = ?"; params.append(method)
    query += " ORDER BY created_at DESC"
    
    cursor = conn.cursor()
    cursor.execute(query, params)
    transactions = [dict(row) for row in cursor.fetchall()]
    
    # ACC_CASH_05: Tính toán số dư
    total_income = sum(t['amount'] for t in transactions if t['type'] == 'income')
    total_expense = sum(t['amount'] for t in transactions if t['type'] == 'expense')
    
    return {"transactions": transactions, "summary": {"income": total_income, "expense": total_expense}}

@app.post("/api/accounting/periods/lock")
def lock_accounting_period(req: PeriodLockRequest, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_accounting_user)):
    cursor = conn.cursor()
    # Kiểm tra xem kỳ đã tồn tại chưa, nếu chưa thì tạo mới
    cursor.execute("SELECT id FROM accounting_periods WHERE year = ? AND month = ?", (req.year, req.month))
    if cursor.fetchone() is None:
        cursor.execute("INSERT INTO accounting_periods (year, month, status) VALUES (?, ?, 'locked')", (req.year, req.month))
    else:
        cursor.execute("UPDATE accounting_periods SET status = 'locked' WHERE year = ? AND month = ?", (req.year, req.month))
    
    conn.commit()
    return {"message": f"ACC_FIN_06: Đã khóa thành công kỳ kế toán {req.month}/{req.year}."}

@app.get("/api/accounting/reports")
def get_financial_report(year: int, month: int, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_accounting_user)):
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM accounting_periods WHERE year = ? AND month = ?", (year, month))
    period = cursor.fetchone()
    # ACC_FIN_03: Lập báo cáo thất bại (kỳ chưa khóa sổ)
    if not period or period['status'] != 'locked':
        raise HTTPException(status_code=400, detail="ACC_FIN_03: Kỳ báo cáo chưa được khóa sổ, không thể tạo báo cáo tài chính.")

    # ACC_FIN_01: Lập báo cáo thành công (logic mock)
    # Logic tính toán báo cáo thực tế sẽ phức tạp hơn, đây là bản mock
    cursor.execute("SELECT SUM(amount) FROM cash_ledger WHERE type = 'income' AND strftime('%Y', created_at) = ? AND strftime('%m', created_at) = ?", (str(year), f"{month:02d}"))
    revenue = cursor.fetchone()[0] or 0
    
    if revenue == 0:
        # ACC_RPT_05: Không có dữ liệu báo cáo
        return {"message": "Không có dữ liệu phát sinh trong kỳ để lập báo cáo."}

    return {"report_type": "Kết quả hoạt động kinh doanh", "period": f"{month}/{year}", "total_revenue": revenue, "cogs": revenue * 0.6, "net_profit": revenue * 0.15}

# Cấu hình phục vụ file tĩnh và SPA (Single Page Application)
# Endpoint này sẽ bắt tất cả các request không khớp với các API đã định nghĩa ở trên.
@app.get("/{catchall:path}")
async def serve_spa(catchall: str):
    # Đường dẫn đến thư mục build của frontend
    dist_dir = os.path.join(os.path.dirname(__file__), "..", "dist")
    # Xây dựng đường dẫn đầy đủ đến file được yêu cầu
    file_path = os.path.join(dist_dir, catchall)

    # Nếu request trỏ đến một file thực sự tồn tại (vd: /assets/index.js), thì phục vụ file đó.
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    # Nếu không, trả về file index.html để React Router xử lý.
    return FileResponse(os.path.join(dist_dir, "index.html"))