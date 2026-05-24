import sqlite3
from datetime import datetime


def _column_exists(cursor, table: str, column: str) -> bool:
    cursor.execute(f"PRAGMA table_info({table})")
    return column in [row[1] for row in cursor.fetchall()]


def _ensure_column(cursor, table: str, column: str, definition: str) -> None:
    if not _column_exists(cursor, table, column):
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def _migrate_payroll_schema(cursor) -> None:
    """Additive migrations for payroll-related tables and columns."""
    _ensure_column(cursor, "orders", "user_id", "INTEGER")
    _ensure_column(cursor, "orders", "sales_person_id", "INTEGER")
    _ensure_column(cursor, "orders", "order_type", "TEXT")
    _ensure_column(cursor, "orders", "cancel_reason", "TEXT")
    _ensure_column(cursor, "products", "sku", "TEXT")
    _ensure_column(cursor, "products", "status", "TEXT DEFAULT 'active'")
    cursor.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON products(sku) WHERE sku IS NOT NULL AND sku != ''"
    )

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS payroll_periods (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            year INTEGER NOT NULL,
            month INTEGER NOT NULL,
            status TEXT DEFAULT 'draft',
            locked_at DATETIME,
            locked_by INTEGER,
            UNIQUE(year, month),
            FOREIGN KEY(locked_by) REFERENCES users(id)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS payroll_adjustments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            month INTEGER NOT NULL,
            year INTEGER NOT NULL,
            amount INTEGER NOT NULL,
            adjustment_type TEXT NOT NULL,
            reason TEXT NOT NULL,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(created_by) REFERENCES users(id)
        )
    """)
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_payrolls_period ON payrolls(year, month)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_timesheets_user_date ON timesheets(user_id, work_date)"
    )
    cursor.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_timesheets_user_date_unique "
        "ON timesheets(user_id, work_date)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_period "
        "ON payroll_adjustments(year, month, user_id)"
    )
    cursor.execute(
        "UPDATE payrolls SET status = 'draft' WHERE status IN ('open', 'unlocked')"
    )


def init_db():
    # Import cục bộ để tránh lỗi Circular Import. pwd_context đã được chuyển vào routers/auth.py
    from routers.auth import pwd_context
    
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
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT UNIQUE NOT NULL,
            loyalty_points INTEGER DEFAULT 0, rank TEXT DEFAULT 'Normal'
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
            user_id INTEGER,
            sales_person_id INTEGER,
            cancel_reason TEXT,
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
            product_id INTEGER NOT NULL,
            customer_name TEXT NOT NULL,
            rating INTEGER NOT NULL,
            comment TEXT,
            status TEXT DEFAULT 'pending', -- pending, processed, hidden
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(product_id) REFERENCES products(id)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS promotions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT UNIQUE NOT NULL,
            discount_type TEXT NOT NULL, -- 'percentage' hoặc 'fixed'
            discount_value REAL NOT NULL,
            max_discount_amount INTEGER, -- Bắt buộc nếu type là 'percentage'
            min_order_value INTEGER DEFAULT 0,
            usage_limit INTEGER NOT NULL,
            used_count INTEGER DEFAULT 0,
            start_date DATETIME NOT NULL,
            end_date DATETIME NOT NULL,
            status TEXT DEFAULT 'active' -- 'active' hoặc 'inactive'
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS voucher_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL, voucher_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL, discount_amount_saved INTEGER NOT NULL, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(order_id) REFERENCES orders(id), FOREIGN KEY(voucher_id) REFERENCES promotions(id), FOREIGN KEY(user_id) REFERENCES users(id)
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

    _migrate_payroll_schema(cursor)

    # Khởi tạo/Khôi phục các tài khoản nhân viên thiết yếu (Idempotent Seeding)
    hashed_default_pwd = pwd_context.hash("123456")
    essential_users = [
        {"name": "Nguyễn Văn Khải", "email": "admin@shoestore.vn", "role": "admin"},
        {"name": "Trần Thị Sale", "email": "sale@shoestore.vn", "role": "sale"},
        {"name": "Lê Văn Kho", "email": "kho@shoestore.vn", "role": "kho"},
        {"name": "Kế Toán Viên", "email": "ketoan@shoestore.vn", "role": "ketoan"},
        {"name": "IT Admin", "email": "it@shoestore.vn", "role": "it"}
    ]
    for user_data in essential_users:
        cursor.execute("SELECT id, role FROM users WHERE email = ?", (user_data["email"],))
        user_record = cursor.fetchone()
        
        if user_record is None:
            # Nếu chưa có thì chèn mới
            cursor.execute(
                "INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, 'active')",
                (user_data["name"], user_data["email"], hashed_default_pwd, user_data["role"])
            )
        else:
            # Nếu đã có nhưng sai role (ví dụ bị kẹt ở 'custom'), phải ép cập nhật lại role chuẩn!
            user_id, current_role = user_record
            if current_role != user_data["role"]:
                cursor.execute(
                    "UPDATE users SET role = ?, status = 'active' WHERE id = ?",
                    (user_data["role"], user_id)
                )

    # NHIỆM VỤ 1.2: Chèn cấu hình lương mặc định
    cursor.execute("SELECT COUNT(*) FROM salaries")
    if cursor.fetchone()[0] == 0:
        salaries_data = [
            (1, 15000000, 2.0), # Nguyễn Văn Khải
            (2, 6000000, 1.0),  # Trần Thị Sale
            (3, 7500000, 1.2)   # Lê Văn Kho
        ]
        cursor.executemany("INSERT INTO salaries (user_id, base_salary, coefficient) VALUES (?, ?, ?)", salaries_data)

    # NHIỆM VỤ 1.3: Chèn sẵn lịch sử công tháng 5/2026
    cursor.execute("SELECT COUNT(*) FROM payrolls WHERE year = 2026 AND month = 5")
    if cursor.fetchone()[0] == 0:
        payrolls_data = [
            (1, 5, 2026, 26), # Khải
            (2, 5, 2026, 24), # Sale
            (3, 5, 2026, 25)  # Kho
        ]
        cursor.executemany("INSERT INTO payrolls (user_id, month, year, work_days) VALUES (?, ?, ?, ?)", payrolls_data)
        
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
        
    cursor.execute("SELECT COUNT(*) FROM feedback")
    if cursor.fetchone()[0] == 0:
        feedback_data = [
            (1, "Nguyễn Văn A", 5, "Sản phẩm rất tốt, giao hàng nhanh!", "pending"),
            (1, "Trần Thị B", 3, "Chất lượng ổn, nhưng giao hàng hơi lâu.", "pending"),
            (2, "Lê Hữu C", 1, "Hàng bị lỗi, yêu cầu đổi trả.", "pending"),
        ]
        cursor.executemany("INSERT INTO feedback (product_id, customer_name, rating, comment, status) VALUES (?, ?, ?, ?, ?)", feedback_data)

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

def get_db():
    conn = sqlite3.connect('shoestore.db', check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()