import sqlite3
from datetime import datetime

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
    cursor.execute("DROP TABLE IF EXISTS order_items;") # Đảm bảo bảng được tạo lại với schema mới nhất
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
    cursor.execute("DROP TABLE IF EXISTS promotions;") # Xóa bảng cũ để tạo lại với schema mới
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
        # NHIỆM VỤ 1.1: Chèn 3 nhân viên mẫu và các vai trò khác
        users_data = [
            (1, "Nguyễn Văn Khải", "admin@shoestore.vn", hashed_default_pwd, "admin"),
            (2, "Trần Thị Sale", "sale@shoestore.vn", hashed_default_pwd, "sale"),
            (3, "Lê Văn Kho", "kho@shoestore.vn", hashed_default_pwd, "kho"),
            (4, "Kế Toán Viên", "ketoan@shoestore.vn", hashed_default_pwd, "ketoan"),
            (5, "IT Admin", "it@shoestore.vn", hashed_default_pwd, "it")
        ]
        cursor.executemany("INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)", users_data)

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
            (1, 1, 5, "Sản phẩm rất tốt, giao hàng nhanh!", "pending"),
            (1, 2, 3, "Chất lượng ổn, nhưng giao hàng hơi lâu.", "pending"),
            (2, 1, 1, "Hàng bị lỗi, yêu cầu đổi trả.", "pending"),
        ]
        cursor.executemany("INSERT INTO feedback (product_id, user_id, rating, comment, status) VALUES (?, ?, ?, ?, ?)", feedback_data)

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