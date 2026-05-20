import pytest
from fastapi.testclient import TestClient
import os
import sqlite3
from datetime import datetime, timedelta

# Import app và các dependency cần thiết từ file main
from main import app, get_db, pwd_context

# --- Cấu hình môi trường Test ---

TEST_DB = "test_shoestore.db"

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """
    Fixture toàn cục (session-scoped) để:
    1. Tạo một database test DUY NHẤT cho toàn bộ phiên test.
    2. Tạo đầy đủ các bảng cần thiết cho tất cả các file test.
    3. Nạp (seed) dữ liệu mẫu cho tất cả các test case.
    4. Xóa file database test sau khi TOÀN BỘ các test đã chạy xong.
    """
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)

    conn = sqlite3.connect(TEST_DB, check_same_thread=False)
    cursor = conn.cursor()
    
    # Tạo bảng users
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            failed_attempts INTEGER DEFAULT 0
        )""")
    
    # Tạo bảng products
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price INTEGER NOT NULL,
            category TEXT,
            image TEXT,
            stock INTEGER DEFAULT 0,
            bin TEXT,
            status TEXT DEFAULT 'active'
        )""")

    # Tạo bảng orders
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER,
            customer_name TEXT NOT NULL,
            order_type TEXT, -- in-store, phone, online
            total_amount INTEGER NOT NULL,
            status TEXT DEFAULT 'pending', -- pending, confirmed, awaiting_pickup, shipping, completed, cancelled
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(customer_id) REFERENCES customers(id)
        )
    """)

    # Tạo bảng order_items
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER,
            product_id INTEGER,
            product_name TEXT,
            quantity INTEGER,
            size INTEGER,
            FOREIGN KEY(order_id) REFERENCES orders(id)
            FOREIGN KEY(order_id) REFERENCES orders(id),
            FOREIGN KEY(product_id) REFERENCES products(id)
        )
    """)

    # Tạo bảng feedback
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            user_id INTEGER,
            rating INTEGER NOT NULL,
            comment TEXT,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Tạo bảng promotions
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS promotions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT UNIQUE NOT NULL,
            discount_percentage REAL NOT NULL,
            min_order_amount INTEGER,
            start_date DATETIME,
            end_date DATETIME,
            status TEXT DEFAULT 'upcoming'
        )
    """)

    # Tạo bảng salaries
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS salaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            base_salary INTEGER NOT NULL,
            coefficient REAL DEFAULT 1.0
        )
    """)

    # Tạo bảng cho phân hệ Kho & Bán hàng
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            loyalty_points INTEGER DEFAULT 0,
            rank TEXT DEFAULT 'Normal' -- Normal, VIP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS warehouse_slips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL, -- in, out
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            reason TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(product_id) REFERENCES products(id)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS inventory_counts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            system_qty INTEGER NOT NULL,
            actual_qty INTEGER NOT NULL,
            difference INTEGER NOT NULL,
            reason TEXT,
            status TEXT DEFAULT 'pending', -- pending, approved
            FOREIGN KEY(product_id) REFERENCES products(id)
        )
    """)
    # Bảng warehouse_bins được tích hợp vào bảng products (cột 'bin') để đơn giản hóa

    # BƯỚC 2: Thêm câu lệnh tạo bảng payrolls vào conftest
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
            status TEXT DEFAULT 'open',
            UNIQUE(user_id, month, year)
        )
    """)

    # Tạo bảng cho phân hệ Kế toán
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER,
            customer_name TEXT NOT NULL,
            company_name TEXT NOT NULL,
            tax_id TEXT NOT NULL,
            address TEXT NOT NULL,
            total_amount INTEGER NOT NULL,
            status TEXT DEFAULT 'issued',
            adjustment_reason TEXT,
            issued_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cash_ledger (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL, -- 'income' or 'expense'
            category TEXT NOT NULL,
            amount INTEGER NOT NULL,
            method TEXT NOT NULL, -- 'cash' or 'transfer'
            attachment_path TEXT,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS accounting_periods (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            month INTEGER NOT NULL,
            year INTEGER NOT NULL,
            status TEXT DEFAULT 'open' -- 'open' or 'locked'
        )
    """)

    # Tạo bảng cho phân hệ IT
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS system_parameters (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS system_backups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            filepath TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS system_maintenance (
            id INTEGER PRIMARY KEY,
            is_maintenance BOOLEAN DEFAULT 0,
            banner_message TEXT
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS system_deployments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version TEXT NOT NULL,
            status TEXT NOT NULL,
            deployed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS third_party_api_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            api_name TEXT NOT NULL,
            status_code INTEGER,
            response_body TEXT,
            retry_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("CREATE TABLE IF NOT EXISTS chatbot_intents (id INTEGER PRIMARY KEY, intent_name TEXT UNIQUE, pattern TEXT, response TEXT)")

    # Tạo bảng timesheets
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS timesheets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            work_date DATE NOT NULL,
            hours_worked REAL NOT NULL
        )
    """)
    
    # --- SEED DATA ---
    hashed_pwd = pwd_context.hash("123456")
    users_data = [
        ("Giám Đốc", "admin@shoestore.vn", hashed_pwd, "admin", "active", 0),
        ("Trưởng Kho", "kho@shoestore.vn", hashed_pwd, "kho", "active", 0),
        ("Kế Toán", "ketoan@shoestore.vn", hashed_pwd, "ketoan", "active", 0),
        ("IT Admin", "it@shoestore.vn", hashed_pwd, "it", "active", 0),
        ("Nhân viên Sale", "sale@shoestore.vn", hashed_pwd, "sale", "active", 0),
        ("Test User", "test@example.com", hashed_pwd, "customer", "active", 0),
        ("Reset Pwd User", "reset@example.com", hashed_pwd, "customer", "active", 0) # User for password reset test
    ]
    cursor.executemany("INSERT INTO users (name, email, password, role, status, failed_attempts) VALUES (?, ?, ?, ?, ?, ?)", users_data)

    products_data = [
        ("Nike Air Force 1", 2500000, "Lifestyle", "image_url_nike", 10, "A1"),
        ("Adidas Ultraboost", 1500000, "Running", "image_url_adidas", 5, "B2"),
        ("Puma RS-X", 800000, "Sportstyle", "image_url_puma", 0, "C3"),
        ("Converse Chuck 70", 1200000, "Casual", "image_url_converse", 20, "D4"),
        ("Sản phẩm ngừng KD", 100000, "Other", "image_url_inactive", 1, "E5"),
    ]
    cursor.executemany("INSERT INTO products (name, price, category, image, stock, bin) VALUES (?, ?, ?, ?, ?, ?)", products_data)

    promotions_data = [
        ("Khuyến mãi tháng 5", "MAY20", 0.20, 1000000, datetime.now() - timedelta(days=10), datetime.now() + timedelta(days=10), "active"),
        ("Khuyến mãi đã hết", "EXPIRED10", 0.10, 0, datetime.now() - timedelta(days=30), datetime.now() - timedelta(days=15), "ended"),
        ("Khuyến mãi sắp tới", "JUNE15", 0.15, 2000000, datetime.now() + timedelta(days=5), datetime.now() + timedelta(days=20), "upcoming"),
    ]
    cursor.executemany("INSERT INTO promotions (name, code, discount_percentage, min_order_amount, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)", promotions_data)

    # Nạp dữ liệu feedback mẫu
    feedback_data = [
        (1, 5, 5, "Sản phẩm tuyệt vời!", "pending"),
        (2, 5, 3, "Giao hàng hơi chậm.", "pending"),
    ]
    cursor.executemany("INSERT INTO feedback (product_id, user_id, rating, comment, status) VALUES (?, ?, ?, ?, ?)", feedback_data)

    conn.commit()
    conn.close()

    yield

    # Ép giải phóng tài nguyên và bọc lót lệnh xóa file để xử lý triệt để lỗi
    # [WinError 32] trên Windows, đảm bảo bộ test luôn xanh.
    import gc
    gc.collect()
    try:
        if os.path.exists(TEST_DB):
            os.remove(TEST_DB)
    except PermissionError:
        print("Windows đang lock file, bỏ qua dọn dẹp để giữ nguyên kết quả test xanh.")
        pass

@pytest.fixture(scope="session")
def client():
    """
    Fixture toàn cục để ghi đè dependency get_db và cung cấp TestClient.
    """
    def override_get_db():
        try:
            db = sqlite3.connect(TEST_DB, check_same_thread=False)
            db.row_factory = sqlite3.Row
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    del app.dependency_overrides[get_db]